import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../lib/useAppStore';
import { userSettingsApi } from '../../lib/api';

const DisplaySettingsPage: React.FC = () => {
  const userSettings = useAppStore((s) => s.userSettings);
  const setUserSettings = useAppStore((s) => s.setUserSettings);
  const [localSettings, setLocalSettings] = useState({
    show_hurdle: true,
    show_importance: false,
    show_category: true,
    default_sort_option: 'deadline' as 'deadline' | 'hurdle' | 'importance' | 'created_at_desc'
  });
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();

  // 初回マウント時、ストアにデータがなければAPIから取得
  useEffect(() => {
    if (!userSettings) {
      userSettingsApi.getUserSettings().then(settings => {
        setUserSettings(settings);
      }).catch(console.error);
    }
  }, [userSettings, setUserSettings]);

  // ローカル設定の初期化
  useEffect(() => {
    if (userSettings) {
      setLocalSettings({
        show_hurdle: userSettings.show_hurdle === 1,
        show_importance: userSettings.show_importance === 1,
        show_category: userSettings.show_category === 1,
        default_sort_option: userSettings.default_sort_option || 'deadline'
      });
    }
  }, [userSettings]);

  // 変更の検出
  useEffect(() => {
    if (!userSettings) return;
    const hasSettingsChanges =
      localSettings.show_hurdle !== (userSettings.show_hurdle === 1) ||
      localSettings.show_importance !== (userSettings.show_importance === 1) ||
      localSettings.show_category !== (userSettings.show_category === 1) ||
      localSettings.default_sort_option !== userSettings.default_sort_option;
    setHasChanges(hasSettingsChanges);
  }, [localSettings, userSettings]);

  const handleSave = async () => {
    try {
      const updatedSettings = await userSettingsApi.updateDisplaySettings({
        show_hurdle: localSettings.show_hurdle,
        show_importance: localSettings.show_importance,
        show_category: localSettings.show_category,
        default_sort_option: localSettings.default_sort_option
      });
      setUserSettings(updatedSettings);
      setHasChanges(false);
      toast.success('設定を保存しました');
    } catch (error) {
      toast.error('設定の保存に失敗しました');
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">表示設定</h1>
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">表示項目</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.show_hurdle}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, show_hurdle: e.target.checked }))}
                className="mr-2"
              />
              ハードルレベルを表示
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.show_importance}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, show_importance: e.target.checked }))}
                className="mr-2"
              />
              重要度を表示
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.show_category}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, show_category: e.target.checked }))}
                className="mr-2"
              />
              カテゴリーを表示
            </label>
          </div>
        </div>

      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">ハードル表示</h3>
            <p className="text-sm text-gray-500">タスクの難易度を表示します</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={localSettings.show_hurdle}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, show_hurdle: e.target.checked }))}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">重要度表示</h3>
            <p className="text-sm text-gray-500">タスクの重要度を表示します</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={localSettings.show_importance}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, show_importance: e.target.checked }))}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">カテゴリ表示</h3>
            <p className="text-sm text-gray-500">タスクのカテゴリを表示します</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={localSettings.show_category}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, show_category: e.target.checked }))}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`w-full py-2 px-4 rounded-lg font-bold ${
            hasChanges
              ? 'bg-blue-600 text-white active:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          保存
        </button>
      </div>
    </div>
  );
};

export default DisplaySettingsPage; 