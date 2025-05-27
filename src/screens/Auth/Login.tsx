// src/screens/Auth/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { user, login, loginWithGoogle, loginWithApple, error: authError, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await login(email, password);
      if (success) {
        // 少し待ってから画面遷移
        await new Promise(resolve => setTimeout(resolve, 100));
        navigate('/');
      }
    } catch (err) {
      // エラーはAuthContextで処理される
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      // エラーはAuthContextで処理される
    }
  };

  const handleAppleLogin = async () => {
    try {
      await loginWithApple();
      navigate('/');
    } catch (err) {
      // エラーはAuthContextで処理される
    }
  };

  return (
    <div className="flex items-start justify-center bg-gray-50 pt-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            ログイン
          </h2>
        </div>

        {/* メールログインフォーム */}
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
                autoComplete="email"
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
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {authError && (
            <div className="text-red-500 text-sm text-center">{authError}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 active:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '読み込み中...' : 'ログイン'}
            </button>
          </div>
        </form>

        {/* ソーシャルログインボタン */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">または</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md bg-white text-sm font-medium text-[#3c4043] hover:bg-gray-100 transition-colors active:bg-gray-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Googleログイン</span>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                <g>
                  <path fill="#4285F4" d="M24 9.5c3.54 0 6.36 1.53 7.82 2.81l5.8-5.8C34.64 3.36 29.74 1 24 1 14.82 1 6.98 6.98 3.69 15.09l6.77 5.25C12.13 14.09 17.56 9.5 24 9.5z"/>
                  <path fill="#34A853" d="M46.1 24.5c0-1.64-.15-3.22-.43-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.98 37.36 46.1 31.36 46.1 24.5z"/>
                  <path fill="#FBBC05" d="M10.46 28.34A14.5 14.5 0 0 1 9.5 24c0-1.51.26-2.97.72-4.34l-6.77-5.25A23.98 23.98 0 0 0 1 24c0 3.77.9 7.34 2.45 10.59l7.01-6.25z"/>
                  <path fill="#EA4335" d="M24 46.5c6.48 0 11.92-2.15 15.89-5.86l-7.19-5.59c-2.01 1.35-4.59 2.15-8.7 2.15-6.44 0-11.87-4.59-13.54-10.59l-7.01 6.25C6.98 41.02 14.82 46.5 24 46.5z"/>
                  <path fill="none" d="M1 1h46v46H1z"/>
                </g>
              </svg>
              <span>Googleログイン</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleAppleLogin}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-500 active:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Appleでログイン（一時無効）</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M17.05 20.28c-.98.95-2.05.88-3.08.41-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.41C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.31-.89 3.51-.84 1.54.07 2.7.61 3.44 1.57-3.14 1.88-2.29 5.13.22 6.41-.5 1.21-1.15 2.41-2.25 3.03zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                />
              </svg>
              <span className="ml-2">Apple（準備中）</span>
            </button>
          </div>
        </div>

        {/* 新規登録リンク */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は
            <a
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              新規登録
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;