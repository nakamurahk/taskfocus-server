import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFocus } from '../../contexts/FocusContext';
import { Popover } from '@headlessui/react';
import { Info } from 'lucide-react';

// バッジ風アイコン付き設定項目コンポーネント
interface SettingsItemProps {
  icon: string;
  label: string;
  to: string;
  bgClass?: string; // バッジ背景色クラス
}
const SettingsItem: React.FC<SettingsItemProps> = ({ icon, label, to, bgClass = 'bg-gray-100' }) => (
  <Link
    to={to}
    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-md w-full cursor-pointer"
  >
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center justify-center w-8 h-8 ${bgClass} rounded-lg text-xl shadow-sm`}>
        {icon}
      </span>
      <span className="text-sm text-gray-800">{label}</span>
    </div>
    <span className="ml-2 text-gray-400">＞</span>
  </Link>
);

const Settings: React.FC = () => {
  const { logout } = useAuth();
  const { isEffectModeOn } = useFocus();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      // エラーはAuthContextで処理される
    }
  };

  return (
      <div className="w-full px-6 py-6">
          <h2 className="section-title">設定</h2>

          <div className="divide-y divide-gray-100">
            <SettingsItem icon="💊" label="服薬効果設定" to="/settings/medication" />
            <SettingsItem icon="📄" label="利用規約" to="/settings/terms" />
            <SettingsItem icon="🔐" label="プライバシーポリシー" to="/settings/privacy" />
            <SettingsItem icon="💬" label="ヘルプとフィードバック" to="#" />
            <a 
              href="https://note.com/inclusive2501/n/n027284f5344f"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-md w-full cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-xl shadow-sm">
                  ℹ️
                </span>
                <span className="text-sm text-gray-800">このアプリについて</span>
              </div>
              <span className="ml-2 text-gray-400">＞</span>
            </a>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full text-red-500 py-2 px-4 active:bg-red-50 focus:outline-none"
              style={{
                border: '1.5px solid #E74C3C',
                borderRadius: 8,
                fontWeight: 'bold',
              }}
            >
              ログアウト
            </button>
          </div>
      </div>
  );
};

export default Settings; 