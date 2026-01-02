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
    this._unsub = null;
    this._initialized = false;

    this._lastPushedHash = '';
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
    this.onStatus({ state: 'ready', uid: this._uid });

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
