import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  onIdTokenChanged,
  GoogleAuthProvider,  // 追加
  signInWithPopup,     // 追加
  signOut             // 追加
} from 'firebase/auth';
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

// Google認証プロバイダーの設定
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Google認証用の関数
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google認証エラー:', error);
    throw error;
  }
};

// ログアウト関数
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('ログアウトエラー:', error);
    throw error;
  }
};
export default app; 