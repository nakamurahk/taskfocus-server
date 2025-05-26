import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppStore, AppState } from '../../lib/useAppStore';
import { userSettingsApi } from '../../lib/api';

const MedicationSettingsPage: React.FC = () => {
  const userSettings = useAppStore((s: AppState) => s.userSettings);
  const setUserSettings = useAppStore((s: AppState) => s.setUserSettings);
  const [localConfig, setLocalConfig] = useState({
    defaultTime: '',
    onsetTime: 0.5,
    totalEffectDuration: 2
  });
  const [localSkipped, setLocalSkipped] = useState(false);
  const [isEffectModeOn, setIsEffectModeOn] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();
  const [peakTime, setPeakTime] = useState({ start: '', end: '' });

  // 初回マウント時、ストアにデータがなければAPIから取得
//  useEffect(() => {
//    const fetchSettings = async () => {
     // userSettings が既に存在する場合はAPIを呼ばない
 //     if (userSettings) {
 //       return;
 //     }
      
//      try {
//        const settings = await userSettingsApi.getUserSettings();
//        setUserSettings(settings);
//      } catch (error) {
//        console.error('設定の取得に失敗しました:', error);
        // デフォルト値を設定
//        setUserSettings({
//          medication_effect_mode_on: 0,
//          effect_start_time: '08:00',
//          effect_duration_minutes: 600,
//          time_to_max_effect_minutes: 60
//        });
//      }
//    };

//    fetchSettings();
//  }, []);

  useEffect(() => {
    if (userSettings) {
      setLocalConfig({
        defaultTime: userSettings.effect_start_time || '',
        onsetTime: userSettings.time_to_max_effect_minutes ? userSettings.time_to_max_effect_minutes / 60 : 0.5,
        totalEffectDuration: userSettings.effect_duration_minutes ? userSettings.effect_duration_minutes / 60 : 2
      });
      setLocalSkipped(userSettings.is_medication_taken === 0);
      setIsEffectModeOn(userSettings.medication_effect_mode_on === 1);
    }
  }, [userSettings]);

  useEffect(() => {
    if (localConfig.defaultTime && localConfig.onsetTime && localConfig.totalEffectDuration) {
      const startTime = new Date(`2000-01-01T${localConfig.defaultTime}`);
      const peakStart = new Date(startTime.getTime() + localConfig.onsetTime * 60 * 60 * 1000);
      const peakEnd = new Date(peakStart.getTime() + localConfig.totalEffectDuration * 60 * 60 * 1000);
      setPeakTime({
        start: peakStart.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        end: peakEnd.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      });
    }
  }, [localConfig]);

  useEffect(() => {
    if (!userSettings) return;
    const hasConfigChanges =
      localConfig.defaultTime !== (userSettings.effect_start_time || '') ||
      localConfig.onsetTime !== (userSettings.time_to_max_effect_minutes ? userSettings.time_to_max_effect_minutes / 60 : 0.5) ||
      localConfig.totalEffectDuration !== (userSettings.effect_duration_minutes ? userSettings.effect_duration_minutes / 60 : 2);
    const hasSkippedChanges = localSkipped !== (userSettings.is_medication_taken === 0);
    const hasModeChanges = isEffectModeOn !== (userSettings.medication_effect_mode_on === 1);
    setHasChanges(hasConfigChanges || hasSkippedChanges || hasModeChanges);
  }, [localConfig, localSkipped, isEffectModeOn, userSettings]);

  const handleSetCurrentTime = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    setLocalConfig({ ...localConfig, defaultTime: timeString });
  };

  const handleLocalConfigChange = (newConfig: typeof localConfig) => {
    setLocalConfig(newConfig);
  };

  // トグル切り替え時に即DB保存
  const handleToggleEffectMode = async (checked: boolean) => {
    setIsEffectModeOn(checked);
    try {
      await userSettingsApi.updateMedicationEffectMode(checked);
      setUserSettings({
        ...userSettings,
        medication_effect_mode_on: checked ? 1 : 0
      });
      toast.success('薬効モードを' + (checked ? 'ON' : 'OFF') + 'にしました');
    } catch (error) {
      toast.error('薬効モードの切り替えに失敗しました');
    }
  };

  const handleSave = async () => {
    try {
      const configPayload = {
        effect_start_time: localConfig.defaultTime,
        effect_duration_minutes: Math.round(localConfig.totalEffectDuration * 60),
        time_to_max_effect_minutes: Math.round(localConfig.onsetTime * 60),
        time_to_fade_minutes: 0,
        medication_effect_mode_on: isEffectModeOn ? 1 : 0,
        is_medication_taken: localSkipped ? 0 : 1
      };

      const updated = await userSettingsApi.updateMedicationConfig(configPayload);

      setUserSettings(updated); // ← APIが返す更新後データでzustand更新

      toast.success('薬効設定を保存しました');
      setHasChanges(false);
    } catch (error) {
      console.error('薬効設定の保存に失敗しました:', error);
      toast.error('保存に失敗しました');
    }
  };

  return (
    <div className="w-full px-6 py-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="text-gray-600 hover:text-gray-800 flex items-center"
        >
          <span className="mr-2">←</span>
          戻る
        </button>
      </div>

      <h2 className="section-title">薬効設定</h2>

      <div className="bg-gray-50 rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">薬効モード設定</span>
          <label className="relative inline-flex items-center h-6 rounded-full w-11 transition-all duration-300 ease-in-out cursor-pointer"
                 style={{ backgroundColor: isEffectModeOn ? '#3B82F6' : '#E5E7EB' }}>
            <input
              type="checkbox"
              checked={isEffectModeOn}
              onChange={e => handleToggleEffectMode(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full transition-all duration-300 ease-in-out ${
                isEffectModeOn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </label>
        </div>
        {/* アコーディオン：ONのときだけ表示 */}
        {isEffectModeOn && (
          <div className="mt-4 space-y-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-base font-medium mb-4 flex items-center">
                <span className="text-xl mr-2">⏰</span>
                服薬スケジュール
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    服薬した時間
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="time"
                      value={localConfig.defaultTime}
                      onChange={(e) => handleLocalConfigChange({ ...localConfig, defaultTime: e.target.value })}
                      className="flex-1 h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    />
                    <button
                      onClick={handleSetCurrentTime}
                      className="px-6 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-base"
                    >
                      今飲んだ
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    効き始めまでの時間
                  </label>
                  <div className="flex items-center gap-4 w-full">
                    <input
                      type="range"
                      min="0.25"
                      max="1.5"
                      step="0.25"
                      value={localConfig.onsetTime}
                      onChange={(e) => handleLocalConfigChange({ ...localConfig, onsetTime: Number(e.target.value) })}
                      className="flex-1 h-2"
                    />
                    <span className="text-base text-gray-600 w-16 text-right">
                      {Math.round(localConfig.onsetTime * 60)}分
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    効果の長さ
                  </label>
                  <div className="flex items-center gap-4 w-full">
                    <input
                      type="range"
                      min="2"
                      max="12"
                      step="2"
                      value={localConfig.totalEffectDuration}
                      onChange={(e) => handleLocalConfigChange({ ...localConfig, totalEffectDuration: Number(e.target.value) })}
                      className="flex-1 h-2"
                    />
                    <span className="text-base text-gray-600 w-16 text-right">
                      {localConfig.totalEffectDuration}時間
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {peakTime.start && peakTime.end && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700 flex items-center">
                  <span className="text-lg mr-2">👉</span>
                  ピーク時間：{peakTime.start}〜{peakTime.end}
                </p>
              </div>
            )}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-base font-medium mb-4 flex items-center">
                <span className="text-xl mr-2">📅</span>
                特別な日
              </h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localSkipped}
                  onChange={(e) => setLocalSkipped(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  今日は薬を飲んでいない
                </span>
              </label>
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`px-6 py-2 rounded-md text-white ${hasChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicationSettingsPage; 