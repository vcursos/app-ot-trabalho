// js/syncFirebase.js
// Sincronização (desktop <-> mobile) usando Firebase (Auth por Google/Email + Firestore).
// Mantém localStorage como cache offline: sempre lemos local, e depois aplicamos remoto.

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
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

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
  'configuracaoVeiculo',
  'tabelasCustomizadas',
  'multiplicadores',
  'tiposTrabalhoCustom'
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
    let fallback;
    if (k === 'configuracaoVeiculo' || k === 'tabelasCustomizadas' || k === 'multiplicadores') {
      fallback = null;
    } else if (k.endsWith('PorMes') || k.endsWith('PorDia')) {
      fallback = {};
    } else {
      fallback = [];
    }
    snap[k] = safeParse(localStorage.getItem(k), fallback);
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

function saveSessionCache(uid, email) {
  try {
    if (uid) {
      localStorage.setItem('__syncSessionUid', uid);
      localStorage.setItem('__syncSessionEmail', email || '');
    } else {
      localStorage.removeItem('__syncSessionUid');
      localStorage.removeItem('__syncSessionEmail');
    }
  } catch {}
}

function loadSessionCache() {
  try {
    const uid = localStorage.getItem('__syncSessionUid') || null;
    const email = localStorage.getItem('__syncSessionEmail') || '';
    return uid ? { uid, email } : null;
  } catch {
    return null;
  }
}

function mergePreferNewest(localSnap, remoteSnap) {
  const localAt = localSnap?.meta?.updatedAt ? new Date(localSnap.meta.updatedAt).getTime() : 0;
  const remoteAt = remoteSnap?.meta?.updatedAt ? new Date(remoteSnap.meta.updatedAt).getTime() : 0;

  if (localAt && remoteAt) {
    return remoteAt >= localAt ? remoteSnap : localSnap;
  }

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
    this._storage = null;
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

    const cached = loadSessionCache();
    if (cached) {
      this.onStatus({ state: 'ready', uid: cached.uid, email: cached.email, fromCache: true });
    }

    this._app = initializeApp(firebaseConfig);
    this._auth = getAuth(this._app);
    this._db = getFirestore(this._app);
    this._storage = getStorage(this._app);

    let persistenceOk = false;
    try {
      await setPersistence(this._auth, indexedDBLocalPersistence);
      persistenceOk = true;
    } catch {
      try {
        await setPersistence(this._auth, browserLocalPersistence);
        persistenceOk = true;
      } catch {}
    }
    if (!persistenceOk) {
      try { localStorage.setItem('__syncPersistFallback', '1'); } catch {}
    }

    try {
      const res = await getRedirectResult(this._auth);
      if (res && this._auth.currentUser) {
        this._uid = this._auth.currentUser.uid;
        this._isAnonymous = !!this._auth.currentUser.isAnonymous;
      }
    } catch (e) {
      this.onStatus({ state: 'redirect-error', error: this._formatError(e) });
    }

    await this._ensureAuthListener();

    this._initialized = true;
    if (!this._uid) {
      saveSessionCache(null);
      this.onStatus({ state: 'logged-out' });
      return;
    }

    this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });

    this._startRealtimeListener();
    await this._pullRemoteOnLogin();
    await this._pushLocalIfNewer('init');
  }

  async _ensureAuthListener() {
    if (this._authUnsub) return;

    await new Promise((resolve) => {
      let first = true;
      this._authUnsub = onAuthStateChanged(this._auth, (user) => {
        const prevUid = this._uid;
        this._uid = user?.uid || null;
        this._isAnonymous = !!user?.isAnonymous;

        if (this._uid) {
          saveSessionCache(this._uid, user?.email || '');
        } else {
          saveSessionCache(null);
        }

        if (first) {
          first = false;
          resolve();
        }

        if (!this._initialized) return;

        if (!this._uid) {
          this._unsub?.();
          this._unsub = null;
          this.onStatus({ state: 'logged-out', explicit: true });
          return;
        }

        if (this._uid !== prevUid) {
          try {
            this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });
          } catch {}
          this._startRealtimeListener();
          Promise.resolve()
            .then(() => this._pullRemoteOnLogin())
            .then(() => this._pushLocalIfNewer('session-restored'))
            .catch(() => {});
        }
      });
    });
  }

  _docRef() {
    return doc(this._db, 'users', this._uid, 'appData', 'main');
  }

  // ── Upload de Fotos ─────────────────────────────────────────────────────
  async uploadFoto(file, otId) {
    if (!this._initialized || !this._uid) {
      throw new Error('Usuário não está logado. Faça login com Google antes de enviar fotos.');
    }
    if (!file) throw new Error('Nenhum arquivo fornecido.');

    const safeOtId = String(otId || 'sem-ot').replace(/[^a-zA-Z0-9_-]/g, '_');
    const nomeSeguro = String(file.name || 'foto.jpg').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const caminho = `users/${this._uid}/fotos/${safeOtId}/${Date.now()}_${nomeSeguro}`;

    const ref = storageRef(this._storage, caminho);
    await uploadBytes(ref, file, { contentType: file.type || 'image/jpeg' });
    const url = await getDownloadURL(ref);

    return { url, caminho, uid: this._uid, nomeArquivo: nomeSeguro, criadoEm: new Date().toISOString() };
  }

  async removerFoto(caminho) {
    if (!this._initialized || !this._uid) return false;
    if (!caminho) return false;
    try {
      const ref = storageRef(this._storage, caminho);
      await deleteObject(ref);
      return true;
    } catch (e) {
      console.warn('Falha ao remover foto:', e);
      return false;
    }
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
    if (!prevAnonUid || !newUid || prevAnonUid === newUid) return;

    const anonRemote = await this._readDocForUid(prevAnonUid);
    const newRemote = await this._readDocForUid(newUid);

    const localData = getLocalSnapshot();
    const mergedPayload = {
      meta: {
        updatedAt: new Date().toISOString(),
        updatedReason: 'migrate',
        serverUpdatedAt: serverTimestamp()
      },
      data: localData
    };

    if (anonRemote && anonRemote.data) {
      const localWrap = { meta: { updatedAt: mergedPayload.meta.updatedAt } };
      const choice = mergePreferNewest(localWrap, anonRemote);
      if (choice === anonRemote) {
        mergedPayload.data = anonRemote.data;
      }
    }

    if (newRemote && newRemote.meta) {
      const choice = mergePreferNewest(mergedPayload, newRemote);
      if (choice === newRemote) {
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
      try {
        await signInWithPopup(this._auth, provider);
      } catch (ePopup) {
        const code = String(ePopup?.code || '');
        const msg = String(ePopup?.message || ePopup);

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

    const u = this._auth.currentUser;
    if (!u) return;
    this._uid = u.uid;
    this._isAnonymous = !!u.isAnonymous;
    saveSessionCache(this._uid, u.email || '');

    await this._pullRemoteOnLogin();

    this.onStatus({ state: 'ready', uid: this._uid, ...this.getUserInfo() });
    this._startRealtimeListener();

    await this._migrateFromAnonymousIfNeeded(prevAnonUid, this._uid);

    await this._pushLocalIfNewer('login-google');
  }

  async criarContaEmailSenha(email, senha) {
    if (!this._initialized) await this.init();

    const prevAnonUid = this._uid;

    try {
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
    saveSessionCache(this._uid, u.email || '');

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
    saveSessionCache(this._uid, u.email || '');

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
      const localUpdatedAt = localStorage.getItem('__syncLocalUpdatedAt') || null;
      const localWrap = { meta: { updatedAt: localUpdatedAt || '1970-01-01T00:00:00.000Z' }, data: localData };
      const merged = mergePreferNewest(localWrap, remote);
      const localHas = hasAnyData(localData);
      const remoteHas = hasAnyData(remote.data);

      const shouldApplyRemote = (remoteHas && !localHas) || (merged === remote);
      if (shouldApplyRemote) {
        applySnapshotToLocalStorage(remote.data || {});
        try { localStorage.setItem('__syncLocalUpdatedAt', remote?.meta?.updatedAt || new Date().toISOString()); } catch {}
        this.onRemoteApplied(remote.data || {});
        this.onStatus({ state: 'remote-applied', at: remote?.meta?.updatedAt || null });
      }
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
    saveSessionCache(null);
    try {
      await signOut(this._auth);
    } catch {}
    this._uid = null;
    this._isAnonymous = false;
    this._unsub?.();
    this._unsub = null;
    this.onStatus({ state: 'logged-out', explicit: true });
  }

  _computeHash(obj) {
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
    const now = new Date().toISOString();
    const payload = {
      meta: {
        updatedAt: now,
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
      try { localStorage.setItem('__syncLocalUpdatedAt', now); } catch {}
      this.onStatus({ state: 'pushed', at: now, reason });
    } catch (e) {
      console.warn('Falha ao enviar remoto:', e);
      this.onStatus({ state: 'push-error', error: this._formatError(e) });
    }
  }

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

// ── Auto-inicialização ────────────────────────────────────────────────────────
(async function autoInitFirebaseSync() {
  try {
    let callbacks = null;
    for (let i = 0; i < 50; i++) {
      if (window.__syncCallbacks) { callbacks = window.__syncCallbacks; break; }
      await new Promise(r => setTimeout(r, 100));
    }

    const onRemoteApplied = callbacks?.onRemoteApplied || (() => {});
    const onStatus = callbacks?.onStatus || (() => {});

    window.__firebaseSync = new FirebaseSync({
      enabled: true,
      onRemoteApplied,
      onStatus
    });

    await window.__firebaseSync.init();

    window.uploadFotoParaNuvem = async function (file, otId) {
      if (!window.__firebaseSync) throw new Error('Sync não inicializado.');
      return await window.__firebaseSync.uploadFoto(file, otId);
    };
    window.removerFotoDaNuvem = async function (caminho) {
      if (!window.__firebaseSync) return false;
      return await window.__firebaseSync.removerFoto(caminho);
    };

    if (typeof document !== 'undefined') {
      const autoSave = () => {
        try { window.salvarAgora?.(true); } catch {}
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') autoSave();
      });
      window.addEventListener('beforeunload', autoSave);
      window.addEventListener('pagehide', autoSave);
    }

    try { window.__syncReady = true; } catch {}
  } catch (e) {
    console.warn('[syncFirebase] auto-init falhou:', e);
    try {
      if (window.__syncCallbacks?.onStatus) {
        window.__syncCallbacks.onStatus({ state: 'init-error', error: String(e?.message || e) });
      }
    } catch {}
  }
})();
