// js/syncFirebase.js
// Sincronização automática (desktop <-> mobile) usando Firebase (Auth anônimo + Firestore).
// Mantém localStorage como cache offline: sempre lemos local, e depois aplicamos remoto.
//
// IMPORTANTE:
// 1) Você precisa preencher firebaseConfig abaixo.
// 2) No Firebase Console: habilite Authentication -> Anonymous
// 3) Crie um Firestore Database (modo produção/teste conforme sua preferência)
// 4) Regras sugeridas estão no README/DEPLOY (vamos adicionar depois se você quiser)

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
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
  indexedDBLocalPersistence
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

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
      // Se falhar (Safari/iOS), continua com default
    }

    await this._ensureSignedIn();

    this._initialized = true;
    this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });

    // Se veio de redirect (mobile), capturar resultado
    try {
      await getRedirectResult(this._auth);
    } catch {
      // ignora
    }

    // Começa a escutar remoto
    this._startRealtimeListener();

    // Primeiro push: garante que o documento exista
    await this.pushLocal('init');
  }

  async _ensureSignedIn() {
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(this._auth, async (user) => {
        if (user) {
          this._uid = user.uid;
          this._isAnonymous = !!user.isAnonymous;
          unsub();
          resolve();
          return;
        }

        try {
          await signInAnonymously(this._auth);
        } catch (e) {
          console.warn('Firebase auth falhou:', e);
          this.onStatus({ state: 'auth-error', error: String(e) });
          unsub();
          resolve();
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
      // Desktop: popup; Mobile/PWA: redirect costuma funcionar melhor
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
      if (isMobile) {
        await signInWithRedirect(this._auth, provider);
        return;
      }
      await signInWithPopup(this._auth, provider);
    } catch (e) {
      this.onStatus({ state: 'auth-error', error: String(e) });
      throw e;
    }

    // Após login
    const u = this._auth.currentUser;
    if (!u) return;
    this._uid = u.uid;
    this._isAnonymous = !!u.isAnonymous;
    this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });
    this._startRealtimeListener();
    await this._migrateFromAnonymousIfNeeded(prevAnonUid, this._uid);
    await this.pushLocal('login-google');
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
      this.onStatus({ state: 'auth-error', error: String(e) });
      throw e;
    }

    const u = this._auth.currentUser;
    if (!u) return;
    this._uid = u.uid;
    this._isAnonymous = !!u.isAnonymous;
    this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });
    this._startRealtimeListener();
    await this._migrateFromAnonymousIfNeeded(prevAnonUid, this._uid);
    await this.pushLocal('signup-email');
  }

  async entrarEmailSenha(email, senha) {
    if (!this._initialized) await this.init();

    const prevAnonUid = this._uid;

    try {
      await signInWithEmailAndPassword(this._auth, email, senha);
    } catch (e) {
      this.onStatus({ state: 'auth-error', error: String(e) });
      throw e;
    }

    const u = this._auth.currentUser;
    if (!u) return;
    this._uid = u.uid;
    this._isAnonymous = !!u.isAnonymous;
    this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });
    this._startRealtimeListener();
    await this._migrateFromAnonymousIfNeeded(prevAnonUid, this._uid);
    await this.pushLocal('login-email');
  }

  async sair() {
    if (!this._initialized) return;
    try {
      await signOut(this._auth);
    } catch {}
    // Volta a ficar anônimo
    this._initialized = false;
    this._uid = null;
    this._isAnonymous = true;
    this._unsub?.();
    this._unsub = null;
    await this.init();
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
      this.onStatus({ state: 'push-error', error: String(e) });
    }
  }
}
