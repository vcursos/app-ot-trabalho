// js/syncFirebase.js
// Sincronização (desktop <-> mobile) usando Firebase (Auth por Google/Email + Firestore).
// Mantém localStorage como cache offline: sempre lemos local, e depois aplicamos remoto.
//
// IMPORTANTE:
// 1) Você precisa preencher firebaseConfig abaixo.
// 2) No Firebase Console: habilite Authentication -> Google e/ou Email/Password
// 3) Crie um Firestore Database (modo produção/teste conforme sua preferência)
// 4) Regras sugeridas estão no README/DEPLOY (vamos adicionar depois se você quiser)

// IMPORTANT: Este projeto é estático (GitHub Pages). Para funcionar no navegador
// sem bundler, usamos os módulos ESM via CDN oficial do Firebase.
// (Isso evita o erro: Failed to resolve module specifier "firebase/app".)

// ATENÇÃO: este app roda como site estático (GitHub Pages), então NÃO dá pra usar
// imports do tipo "firebase/app" (isso só funciona com bundler).
// Aqui usamos os módulos ESM do Firebase via CDN.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  linkWithCredential,
  signOut,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// Preencha com as credenciais do seu projeto Firebase.
// (Config do Firebase Console -> Project settings -> SDK setup and configuration)
export const firebaseConfig = {
  apiKey: 'AIzaSyDrXDix0uoEX6Cw9REZrNY3gMQgBlCLfYQ',
  authDomain: 'ottrabalho-34c3f.firebaseapp.com',
  projectId: 'ottrabalho-34c3f',
  storageBucket: 'ottrabalho-34c3f.firebasestorage.app',
  messagingSenderId: '415192260216',
  appId: '1:415192260216:web:1624289493c64f7b17d78d',
  measurementId: 'G-NJN6QXGD6X'
};

const STORAGE_KEYS = [
  'ordensTrabalho',
  'registrosLogistica',
  'premiosFestivosPorDia',
  'historicoOTPorMes',
  'configuracaoVeiculo'
];

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function getLocalSnapshot() {
  const snap = {};
  for (const k of STORAGE_KEYS) {
    snap[k] = safeParse(localStorage.getItem(k), k === 'configuracaoVeiculo' ? null : (k.endsWith('PorMes') ? {} : []));
  }
  return snap;
}

function applySnapshotToLocalStorage(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  for (const k of STORAGE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(snapshot, k)) {
      localStorage.setItem(k, JSON.stringify(snapshot[k]));
    }
  }
}

function mergePreferNewest(localSnap, remoteSnap) {
  // Estratégia simples e previsível:
  // - Se remoto tem updatedAt mais novo => aplicar remoto.
  // - Se local é mais novo => manter local.
  // - Se algum lado não tem updatedAt => preferir o que tiver mais dados (fallback), senão remoto.
  const localAt = localSnap?.meta?.updatedAt ? new Date(localSnap.meta.updatedAt).getTime() : 0;
  const remoteAt = remoteSnap?.meta?.updatedAt ? new Date(remoteSnap.meta.updatedAt).getTime() : 0;

  if (localAt && remoteAt) {
    return remoteAt >= localAt ? remoteSnap : localSnap;
  }

  // Fallback: se remoto existe, usar remoto; senão local.
  if (remoteSnap && Object.keys(remoteSnap).length > 0) return remoteSnap;
  return localSnap;
}

function hasAnyData(snapshot) {
  try {
    if (!snapshot || typeof snapshot !== 'object') return false;
    const ots = Array.isArray(snapshot.ordensTrabalho) ? snapshot.ordensTrabalho.length : 0;
    const log = Array.isArray(snapshot.registrosLogistica) ? snapshot.registrosLogistica.length : 0;
    const hist = snapshot.historicoOTPorMes && typeof snapshot.historicoOTPorMes === 'object'
      ? Object.keys(snapshot.historicoOTPorMes).length
      : 0;
    const fest = snapshot.premiosFestivosPorDia && typeof snapshot.premiosFestivosPorDia === 'object'
      ? Object.keys(snapshot.premiosFestivosPorDia).length
      : 0;
    const veic = snapshot.configuracaoVeiculo ? 1 : 0;
    return (ots + log + hist + fest + veic) > 0;
  } catch {
    return false;
  }
}

export class FirebaseSync {
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
    this.onRemoteApplied = options.onRemoteApplied || (() => {});
    this.onStatus = options.onStatus || (() => {});

    this._app = null;
    this._auth = null;
    this._db = null;
    this._uid = null;
    this._isAnonymous = true;
    this._unsub = null;
  this._authUnsub = null;
    this._initialized = false;

    this._lastPushedHash = '';
  }

  getUserInfo() {
    const u = this._auth?.currentUser;
    return {
      uid: this._uid,
      isAnonymous: !!u?.isAnonymous,
      email: u?.email || null,
      providerIds: (u?.providerData || []).map(p => p?.providerId).filter(Boolean)
    };
  }

  isConfigured() {
    // Config mínimo p/ funcionar.
    return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
  }

  async init() {
    if (!this.enabled) {
      this.onStatus({ state: 'disabled' });
      return;
    }

    if (!this.isConfigured()) {
      this.onStatus({ state: 'not-configured' });
      return;
    }

    if (this._initialized) return;

    this.onStatus({ state: 'initializing' });

    this._app = initializeApp(firebaseConfig);
    this._auth = getAuth(this._app);
    this._db = getFirestore(this._app);

    // Mantém sessão no IndexedDB (melhor p/ PWA)
    try {
      await setPersistence(this._auth, indexedDBLocalPersistence);
    } catch {
      // Fallback: alguns ambientes (principalmente iOS/PWA) podem falhar com IndexedDB.
      // browserLocalPersistence costuma funcionar melhor e ainda persiste entre reloads.
      try {
        await setPersistence(this._auth, browserLocalPersistence);
      } catch {
        // Se falhar, continua com o default do Firebase
      }
    }

    // Se veio de redirect (mobile/PWA), precisamos capturar o resultado.
    try {
      const res = await getRedirectResult(this._auth);
      if (res && this._auth.currentUser) {
        this._uid = this._auth.currentUser.uid;
        this._isAnonymous = !!this._auth.currentUser.isAnonymous;
      }
    } catch (e) {
      // Em alguns casos pode falhar (ex.: sem resultado). Não é fatal.
      this.onStatus({ state: 'redirect-error', error: this._formatError(e) });
    }

  // Mantém um listener de auth ativo: evita que o app "perca" sessão após login/reload
  // por race conditions. (E também detecta logout real.)
  await this._ensureAuthListener();

    this._initialized = true;
    if (!this._uid) {
      this.onStatus({ state: 'logged-out' });
      return;
    }

    this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });

    // Começa a escutar remoto e faz push inicial
    this._startRealtimeListener();
    await this.pushLocal('init');
  }

  async _ensureAuthListener() {
    if (this._authUnsub) return;

    await new Promise((resolve) => {
      let first = true;
      this._authUnsub = onAuthStateChanged(this._auth, (user) => {
        const prevUid = this._uid;
        this._uid = user?.uid || null;
        this._isAnonymous = !!user?.isAnonymous;

        // Primeiro evento: só sinaliza que já sabemos se existe sessão.
        if (first) {
          first = false;
          resolve();
        }

        // Eventos subsequentes: refletem login/logout real
        if (!this._initialized) return;

        if (!this._uid) {
          this._unsub?.();
          this._unsub = null;
          this.onStatus({ state: 'logged-out' });
          return;
        }

        // Se mudou de usuário (ou recuperou sessão), garantir listener e status ready.
        if (this._uid !== prevUid) {
          try {
            this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });
          } catch {}
          this._startRealtimeListener();
        }
      });
    });
  }

  _docRef() {
    // Documento por usuário.
    // Coleção: users/{uid}/appData/main
    return doc(this._db, 'users', this._uid, 'appData', 'main');
  }

  async _readDocForUid(uid) {
    try {
      const ref = doc(this._db, 'users', uid, 'appData', 'main');
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : null;
    } catch {
      return null;
    }
  }

  async _writeDocForUid(uid, payload) {
    try {
      const ref = doc(this._db, 'users', uid, 'appData', 'main');
      await setDoc(ref, payload, { merge: true });
      return true;
    } catch {
      return false;
    }
  }

  async _migrateFromAnonymousIfNeeded(prevAnonUid, newUid) {
    // Migra dados do doc do UID anônimo para o UID da conta, sem perder dados locais.
    if (!prevAnonUid || !newUid || prevAnonUid === newUid) return;

    const anonRemote = await this._readDocForUid(prevAnonUid);
    const newRemote = await this._readDocForUid(newUid);

    // Base: sempre respeita o localStorage (offline-first)
    const localData = getLocalSnapshot();
    const mergedPayload = {
      meta: {
        updatedAt: new Date().toISOString(),
        updatedReason: 'migrate',
        serverUpdatedAt: serverTimestamp()
      },
      data: localData
    };

    // Se existia anonRemote, e ele tem dados mais recentes que local, aplica nele
    if (anonRemote && anonRemote.data) {
      // preferir "novo" pelo meta.updatedAt
      const localWrap = { meta: { updatedAt: mergedPayload.meta.updatedAt } };
      const choice = mergePreferNewest(localWrap, anonRemote);
      if (choice === anonRemote) {
        mergedPayload.data = anonRemote.data;
      }
    }

    // Se o newRemote já tem coisa, preferir o mais novo entre newRemote e mergedPayload
    if (newRemote && newRemote.meta) {
      const choice = mergePreferNewest(mergedPayload, newRemote);
      if (choice === newRemote) {
        // Já tem mais novo, não sobrescreve
        applySnapshotToLocalStorage(newRemote.data || {});
        this.onRemoteApplied(newRemote.data || {});
        return;
      }
    }

    await this._writeDocForUid(newUid, mergedPayload);
    applySnapshotToLocalStorage(mergedPayload.data || {});
    this.onRemoteApplied(mergedPayload.data || {});
  }

  async entrarGoogle() {
    if (!this._initialized) await this.init();

  const prevAnonUid = this._uid;

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      // Preferência: sempre popup para manter o usuário na mesma página.
      // Só usar redirect como fallback quando o popup for bloqueado.
      try {
        await signInWithPopup(this._auth, provider);
      } catch (ePopup) {
        const code = String(ePopup?.code || '');
        const msg = String(ePopup?.message || ePopup);

        // Somente fallback quando realmente for erro de popup.
        if (code.includes('popup') || msg.toLowerCase().includes('popup')) {
          await signInWithRedirect(this._auth, provider);
          return;
        }
        throw ePopup;
      }
    } catch (e) {
      this.onStatus({ state: 'auth-error', error: this._formatError(e) });
      throw e;
    }

    // Após login
    const u = this._auth.currentUser;
    if (!u) return;
    this._uid = u.uid;
    this._isAnonymous = !!u.isAnonymous;

    // Puxa dados da conta antes de fazer qualquer push.
    await this._pullRemoteOnLogin();

    this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });
    this._startRealtimeListener();

    // Mantido por compatibilidade (mas agora não existe mais anon automático)
    await this._migrateFromAnonymousIfNeeded(prevAnonUid, this._uid);

    // Só faz push se o local for mais novo (ou se remoto não existir)
    await this._pushLocalIfNewer('login-google');
  }

  async criarContaEmailSenha(email, senha) {
    if (!this._initialized) await this.init();

    const prevAnonUid = this._uid;

    try {
      // Se o usuário atual é anônimo, nós LINKAMOS para não perder dados
      const current = this._auth.currentUser;
      if (current && current.isAnonymous) {
        const cred = EmailAuthProvider.credential(email, senha);
        await linkWithCredential(current, cred);
      } else {
        await createUserWithEmailAndPassword(this._auth, email, senha);
      }
    } catch (e) {
      this.onStatus({ state: 'auth-error', error: this._formatError(e) });
      throw e;
    }

    const u = this._auth.currentUser;
    if (!u) return;
    this._uid = u.uid;
    this._isAnonymous = !!u.isAnonymous;

    await this._pullRemoteOnLogin();

    this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });
    this._startRealtimeListener();
    await this._migrateFromAnonymousIfNeeded(prevAnonUid, this._uid);
    await this._pushLocalIfNewer('signup-email');
  }

  async entrarEmailSenha(email, senha) {
    if (!this._initialized) await this.init();

    const prevAnonUid = this._uid;

    try {
      await signInWithEmailAndPassword(this._auth, email, senha);
    } catch (e) {
      this.onStatus({ state: 'auth-error', error: this._formatError(e) });
      throw e;
    }

    const u = this._auth.currentUser;
    if (!u) return;
    this._uid = u.uid;
    this._isAnonymous = !!u.isAnonymous;

    await this._pullRemoteOnLogin();

    this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });
    this._startRealtimeListener();
    await this._migrateFromAnonymousIfNeeded(prevAnonUid, this._uid);
    await this._pushLocalIfNewer('login-email');
  }

  async _pullRemoteOnLogin() {
    try {
      if (!this._initialized || !this._uid) return;
      this.onStatus({ state: 'syncing', phase: 'pull' });
      const remote = await this.fetchRemoteOnce();
      if (!remote || !remote.data) {
        this.onStatus({ state: 'syncing', phase: 'pull', result: 'no-remote' });
        return;
      }

      const localData = getLocalSnapshot();
      const localHas = hasAnyData(localData);
      const remoteHas = hasAnyData(remote.data);

      // Regra simples:
      // - Se remoto tem dados e local está vazio => aplicar remoto SEMPRE.
      // - Se ambos têm dados, aplicar o mais novo por updatedAt.
      if (remoteHas && !localHas) {
        // Local está vazio, aplicar remoto incondicionalmente
        applySnapshotToLocalStorage(remote.data || {});
        this.onRemoteApplied(remote.data || {});
        this.onStatus({ state: 'remote-applied', at: remote?.meta?.updatedAt || null });
      } else if (localHas && remoteHas) {
        // Ambos têm dados, comparar timestamps
        const localWrap = { meta: { updatedAt: new Date().toISOString() }, data: localData };
        const merged = mergePreferNewest(localWrap, remote);
        if (merged === remote) {
          applySnapshotToLocalStorage(remote.data || {});
          this.onRemoteApplied(remote.data || {});
          this.onStatus({ state: 'remote-applied', at: remote?.meta?.updatedAt || null });
        }
      }
      // Se local tem dados e remoto está vazio, não faz nada (mantém local)
    } catch (e) {
      console.warn('Falha ao puxar remoto no login:', e);
      this.onStatus({ state: 'read-error', error: this._formatError(e) });
    }
  }

  async _pushLocalIfNewer(reason) {
    try {
      if (!this._initialized || !this._uid) return;
      const remote = await this.fetchRemoteOnce();
      const localData = getLocalSnapshot();
      const localWrap = { meta: { updatedAt: new Date().toISOString() }, data: localData };

      if (!remote || !remote.meta) {
        await this.pushLocal(reason);
        return;
      }

      const merged = mergePreferNewest(localWrap, remote);
      if (merged === localWrap) {
        await this.pushLocal(reason);
      }
    } catch {
      // não bloqueia o usuário
    }
  }

  async sair() {
    if (!this._initialized) return;
    try {
      await signOut(this._auth);
    } catch {}
    // Volta a ficar DESLOGADO (sem criar conta anônima)
    this._uid = null;
    this._isAnonymous = false;
    this._unsub?.();
    this._unsub = null;
    this.onStatus({ state: 'logged-out' });
  }

  _computeHash(obj) {
    // Hash bem simples para evitar pushes repetidos.
    // Não precisa ser criptográfico.
    try {
      return String(
        (JSON.stringify(obj).length || 0) + ':' +
        (obj?.meta?.updatedAt || '')
      );
    } catch {
      return '';
    }
  }

  async fetchRemoteOnce() {
    if (!this._initialized || !this._uid) return null;
    try {
      const snap = await getDoc(this._docRef());
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.warn('Falha ao ler remoto:', e);
      this.onStatus({ state: 'read-error', error: String(e) });
      return null;
    }
  }

  _startRealtimeListener() {
    if (this._unsub) return;
    this._unsub = onSnapshot(
      this._docRef(),
      (snap) => {
        if (!snap.exists()) return;

        const remote = snap.data();
        const local = { ...getLocalSnapshot(), meta: { updatedAt: new Date().toISOString() } };
        const merged = mergePreferNewest(local, remote);

        // Se o merged escolheu remoto, aplicamos no localStorage + chamamos callback.
        // Se escolheu local, não faz nada (pushLocal cuidará disso quando houver mudanças).
        const choseRemote = merged === remote;
        if (choseRemote) {
          applySnapshotToLocalStorage(remote?.data || {});
          this.onRemoteApplied(remote?.data || {});
          this.onStatus({ state: 'remote-applied', at: remote?.meta?.updatedAt || null });
        }
      },
      (err) => {
        console.warn('Listener Firestore falhou:', err);
        this.onStatus({ state: 'listen-error', error: String(err) });
      }
    );
  }

  async pushLocal(reason = 'change') {
    if (!this._initialized || !this._uid) return;

    const data = getLocalSnapshot();
    const payload = {
      meta: {
        updatedAt: new Date().toISOString(),
        updatedReason: reason,
        serverUpdatedAt: serverTimestamp()
      },
      data
    };

    const h = this._computeHash(payload);
    if (h && h === this._lastPushedHash) return;
    this._lastPushedHash = h;

    try {
      await setDoc(this._docRef(), payload, { merge: true });
      this.onStatus({ state: 'pushed', at: payload.meta.updatedAt, reason });
    } catch (e) {
      console.warn('Falha ao enviar remoto:', e);
      this.onStatus({ state: 'push-error', error: this._formatError(e) });
    }
  }

  // Força sincronização agora (útil em PWA instalado quando o listener demora a disparar).
  // Fluxo:
  // 1) Puxa o remoto e aplica se for mais novo.
  // 2) Em seguida, envia o local (se for mais novo) para garantir consistência.
  async forceSync(reason = 'manual') {
    if (!this._initialized) await this.init();
    if (!this._uid) {
      this.onStatus({ state: 'logged-out' });
      return;
    }

    try {
      this.onStatus({ state: 'syncing', phase: 'force-pull' });
      await this._pullRemoteOnLogin();
    } catch {}

    try {
      this.onStatus({ state: 'syncing', phase: 'force-push' });
      await this._pushLocalIfNewer(`force-${reason}`);
      this.onStatus({ state: 'sync-ok' });
    } catch (e) {
      this.onStatus({ state: 'sync-error', error: this._formatError(e) });
    }
  }

  _formatError(e) {
    try {
      const parts = [];
      if (e?.code) parts.push(String(e.code));
      if (e?.message) parts.push(String(e.message));
      const base = parts.filter(Boolean).join(' | ');
      return base || String(e);
    } catch {
      return String(e);
    }
  }
}
