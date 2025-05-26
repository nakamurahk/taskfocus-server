import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { auth } from '../../lib/firebase';

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const signup = async (email: string, password: string) => {
    try {
      console.log('🔄 signup開始:', email);
      setLoading(true);
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ ユーザー作成完了:', user.uid);
      
      await sendEmailVerification(user);
      console.log('✅ 認証メール送信完了');
      
      await signOut(auth);
      console.log('✅ 強制ログアウト完了');
    } catch (error) {
      console.error('❌ signup error:', error);
      setError(error instanceof Error ? error.message : 'サインアップ中にエラーが発生しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ユーザーがログイン済みの場合はホーム画面に遷移
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      console.error('パスワードが一致しません');
      return;
    }
  
    try {
      console.log('🔄 handleSubmit開始');
      await signup(email, password);
      console.log('✅ signup関数完了 - setSignupSuccess(true)実行');
      setSignupSuccess(true);
    } catch (err) {
      console.error('❌ handleSubmit error:', err);
    }
  };

  // 登録成功後の表示
  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              📧 認証メールを送信しました
            </h2>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-blue-800">
                <p className="text-sm font-medium">
                  <strong>{email}</strong> に認証メールを送信しました。
                </p>
                <p className="text-sm mt-2">
                  メール内のリンクをクリックして、アカウントを有効化してください。
                </p>
                <p className="text-sm mt-2 text-blue-600">
                  ※ 迷惑メールフォルダもご確認ください
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ログイン画面に戻る
              </button>
              <p className="text-xs text-gray-500">
                認証完了後、上記ボタンでログイン画面に移動してください
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            新規登録
          </h2>
        </div>

        {/* メール登録フォーム */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={loading}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={loading}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                パスワード（確認）
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                disabled={loading}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="パスワード（確認）"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {/* パスワード一致チェックエラー */}
          {password !== confirmPassword && confirmPassword !== '' && (
            <div className="text-red-500 text-sm text-center">
              パスワードが一致しません
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || password !== confirmPassword}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '読み込み中...' : '登録'}
            </button>
          </div>
        </form>

        {/* ログインリンク */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            すでにアカウントをお持ちの方は
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 ml-1"
            >
              ログイン
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
