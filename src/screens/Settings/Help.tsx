import React from 'react';
import { useNavigate } from 'react-router-dom';

const Help: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full px-6 py-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 text-gray-600 hover:text-gray-800"
        >
          ←
        </button>
        <h2 className="text-xl font-bold">ヘルプとフィードバック</h2>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">お問い合わせ</h3>
          <p className="text-gray-600 mb-4">
            ご連絡がある場合は、以下のいずれかにお願いいたします。
          </p>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-gray-500 mr-2">・</span>
              <a
                href="https://twitter.com/Fitty2501"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                X @Fitty2501
              </a>
              <span className="text-gray-500 ml-2">宛てにDM</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500 mr-2">・</span>
              <a
                href="mailto:nnito9546@gmail.com"
                className="text-blue-600 hover:text-blue-800"
              >
                メール：nnito9546@gmail.com
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">よくある質問</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Q: アカウントの削除方法は？</h4>
              <p className="text-gray-600">
                実装予定です。それまでにアカウントの削除をご希望の場合は、上記の連絡先までご連絡ください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help; 