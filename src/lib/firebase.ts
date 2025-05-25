import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onIdTokenChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { useAppStore } from './useAppStore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// 認証とFirestoreのインスタンスを取得
export const auth = getAuth(app);
export const db = getFirestore(app);

// Firebase Authの永続化設定
setPersistence(auth, browserLocalPersistence);

// ユーザー状態の監視とzustandストアへの反映
onIdTokenChanged(auth, (user) => {
  if (user) {
    useAppStore.getState().setUser({
      id: user.uid,
      name: user.displayName ?? '',
      email: user.email ?? '',
      // ...他のプロパティも必要に応じて
    });
  } else {
    useAppStore.getState().setUser(null);
  }
});

export default app; 