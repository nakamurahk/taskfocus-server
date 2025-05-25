import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const EmailVerification: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { verifyEmail, sendVerificationEmail, error: authError, loading } = useAuth();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');

  useEffect(() => {
    const handleVerification = async () => {
      const code = searchParams.get('oobCode');
      if (code) {
        try {
          await verifyEmail(code);
          setVerificationStatus('success');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } catch (error) {
          setVerificationStatus('error');
        }
      }
    };

    handleVerification();
  }, [searchParams, verifyEmail, navigate]);

  const handleResendVerification = async () => {
    try {
      await sendVerificationEmail();
      alert('認証メールを再送信しました。メールをご確認ください。');
    } catch (error) {
      // エラーはAuthContextで処理される
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            メールアドレスの認証
          </h2>
        </div>

        <div className="mt-8 space-y-6">
          {verificationStatus === 'pending' && (
            <div className="text-center">
              <p className="text-gray-600">メールアドレスの認証を確認中です...</p>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="text-center">
              <p className="text-green-600">メールアドレスの認証が完了しました！</p>
              <p className="text-gray-600 mt-2">3秒後にログイン画面に移動します...</p>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="text-center">
              <p className="text-red-600">メールアドレスの認証に失敗しました。</p>
              <p className="text-gray-600 mt-2">認証メールの有効期限が切れている可能性があります。</p>
              <button
                onClick={handleResendVerification}
                disabled={loading}
                className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '送信中...' : '認証メールを再送信'}
              </button>
            </div>
          )}

          {authError && (
            <div className="text-red-500 text-sm text-center">{authError}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification; 