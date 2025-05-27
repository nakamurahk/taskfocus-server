import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,  // redirectからpopupに戻す
  // signInWithRedirect,  // 一時的にコメントアウト
  // getRedirectResult,   // 一時的にコメントアウト
  OAuthProvider,
  sendEmailVerification,
  applyActionCode,
  confirmPasswordReset,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { categoryApi, focusViewSettingsApi, userSettingsApi } from '../lib/api';
import { useAppStore } from '../lib/useAppStore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ユーザー初期化API呼び出し
const callInitializeNewUser = async (user: User) => {
  try {
    const token = await user.getIdToken();
    await fetch('/api/auth/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ ユーザー初期化API呼び出し完了');
  } catch (error) {
    console.error('❌ ユーザー初期化APIエラー:', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setUserSettings = useAppStore(s => s.setUserSettings);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          console.log('👤 ユーザー検出:', user.email);
          console.log('📧 メール認証状態:', user.emailVerified);
          
          if (!user.emailVerified) {
            console.log('❌ 未認証ユーザー - setError実行');
            setError('認証メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。※迷惑メールフォルダもご確認ください。');
            console.log('✅ setError完了');
            
            await signOut(auth);
            console.log('✅ signOut完了');
            return;
          }
          
          await callInitializeNewUser(user);
          // ユーザー設定を取得してストアに反映
          const settings = await userSettingsApi.getUserSettings();
          setUserSettings(settings);
        }
        setUser(user);
      } catch (err) {
        console.error('onAuthStateChanged error:', err);
        setError('初期化に失敗しました');
      } finally {
        setLoading(false);
      }
    });
  
    return () => unsubscribe();
  }, []);

  // リダイレクト結果チェックを一時的にコメントアウト
  // useEffect(() => {
  //   const checkRedirectResult = async () => {
  //     try {
  //       const result = await getRedirectResult(auth);
  //       if (result) {
  //         console.log('Google認証成功:', result.user);
  //       }
  //     } catch (error) {
  //       console.error('リダイレクト認証エラー:', error);
  //       setError('Google認証中にエラーが発生しました');
  //     }
  //   };
  //   
  //   checkRedirectResult();
  // }, []);

  const signup = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await sendEmailVerification(user);
      await signOut(auth);
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error instanceof Error ? error.message : 'サインアップ中にエラーが発生しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔄 ログイン開始:', email);
      setLoading(true);
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      console.log('✅ ログイン成功');
      console.log('📧 メール認証状態:', user.emailVerified);
  
      if (!user.emailVerified) {
        console.log('❌ メール認証未完了 - ログアウト実行');
        setError('メールアドレスの認証が完了していません。認証メールをご確認ください。');
        await signOut(auth);
        return false;
      }
  
      console.log('✅ メール認証済み - ログイン許可');
      return true;
    } catch (error) {
      console.error('Error logging in:', error);
      setError(error instanceof Error ? error.message : 'ログイン中にエラーが発生しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut(auth);

    } catch (error) {
      console.error('Error logging out:', error);
      setError(error instanceof Error ? error.message : 'ログアウト中にエラーが発生しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // popup方式に戻したGoogle認証
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({
        prompt: 'select_account',
        access_type: 'offline'
      });
      const result = await signInWithPopup(auth, provider);
      console.log('Google認証成功:', result.user);
      
      await callInitializeNewUser(result.user);
      // ユーザー設定を取得してストアに反映
      const settings = await userSettingsApi.getUserSettings();
      setUserSettings(settings);
      await createInitialData(result.user.uid);
      
    } catch (error: any) {
      console.error('Google login error:', error);
      // ポップアップが閉じられた場合はエラーメッセージを表示しない
      if (error.code !== 'auth/popup-closed-by-user') {
        setError(error instanceof Error ? error.message : 'Googleログイン中にエラーが発生しました');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithApple = async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new OAuthProvider('apple.com');
      await signInWithPopup(auth, provider);  // popupのまま
    } catch (error) {
      console.error('Apple login error:', error);
      setError(error instanceof Error ? error.message : 'Appleログイン中にエラーが発生しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) throw new Error('ユーザーがログインしていません');
      await sendEmailVerification(user);
    } catch (error) {
      console.error('Verification email error:', error);
      setError(error instanceof Error ? error.message : '認証メールの送信中にエラーが発生しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (code: string) => {
    try {
      setLoading(true);
      setError(null);
      await applyActionCode(auth, code);
    } catch (error) {
      console.error('Email verification error:', error);
      setError(error instanceof Error ? error.message : 'メール認証中にエラーが発生しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error instanceof Error ? error.message : 'パスワードリセットメールの送信中にエラーが発生しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const confirmResetPassword = async (code: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      await confirmPasswordReset(auth, code, newPassword);
    } catch (error) {
      console.error('Confirm reset password error:', error);
      setError(error instanceof Error ? error.message : 'パスワードのリセット中にエラーが発生しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createInitialData = async (userId: string) => {
    try {
      // デフォルトカテゴリーの作成
      await categoryApi.createCategory({
        name: '仕事',
        color: '#4CAF50',
        is_default: true
      });

      // デフォルトビューの作成
      await focusViewSettingsApi.updateFocusViewSettings([
        {
          view_key: 'all',
          label: 'すべて',
          visible: true,
          view_order: 1
        },
        {
          view_key: 'today',
          label: '今日',
          visible: true,
          view_order: 2
        },
        {
          view_key: 'week',
          label: '今週',
          visible: true,
          view_order: 3
        }
      ], 3);
    } catch (error) {
      console.error('初期データの作成に失敗しました:', error);
    }
  };

  const value = {
    user,
    loading,
    error,
    signup,
    login,
    logout,
    loginWithGoogle,
    loginWithApple,
    sendVerificationEmail,
    verifyEmail,
    resetPassword,
    confirmResetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};