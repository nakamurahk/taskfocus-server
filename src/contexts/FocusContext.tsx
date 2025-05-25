import React, { createContext, useContext, useState, useEffect } from 'react';
import { FocusContextType, MedicationEffectConfig, MedicationStatus, PhysicalCondition } from '../types/focus';
import { userSettingsApi } from '../lib/api';
import { useAppStore } from '../lib/useAppStore';

// 薬効状態を計算する関数
const calculateMedicationStatus = (
  config: MedicationEffectConfig,
  skipped: boolean,
  isEffectModeOn: boolean
): MedicationStatus => {
  if (!isEffectModeOn || skipped) return 'off';

  const now = new Date();
  const [hours, minutes] = config.defaultTime.split(':').map(Number);
  const medicationTime = new Date();
  medicationTime.setHours(hours, minutes, 0, 0);

  const diffHours = (now.getTime() - medicationTime.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) return 'off';
  if (diffHours < config.onsetTime) return 'before_peak';
  if (diffHours < config.peakOutTime) return 'peak';
  if (diffHours < config.totalEffectDuration) return 'fading';
  return 'off';
};

// 初期設定値
const initialConfig: MedicationEffectConfig = {
  defaultTime: '08:00',
  totalEffectDuration: 10,
  onsetTime: 2,
  peakOutTime: 8
};

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [physicalCondition, setPhysicalCondition] = useState<PhysicalCondition>('normal');
  const [medicationConfig, setMedicationConfig] = useState<MedicationEffectConfig>(initialConfig);
  const [medicationSkipped, setMedicationSkipped] = useState<boolean>(false);
  const [medicationStatus, setMedicationStatus] = useState<MedicationStatus>('off');
  const [isEffectModeOn, setIsEffectModeOn] = useState<boolean>(false);
  const setUserSettings = useAppStore(s => s.setUserSettings);

  // 初期設定の読み込み
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await userSettingsApi.getUserSettings();
        setUserSettings(settings);
        setIsEffectModeOn(settings.medication_effect_mode_on === 1);
        
        // 薬効モードの設定値を読み込む
        if (settings.effect_start_time) {
          setMedicationConfig({
            defaultTime: settings.effect_start_time,
            totalEffectDuration: settings.effect_duration_minutes / 60,
            onsetTime: settings.time_to_max_effect_minutes / 60,
            peakOutTime: (settings.time_to_max_effect_minutes + settings.time_to_fade_minutes) / 60
          });
        }
      } catch (error) {
        console.error('ユーザー設定の読み込みに失敗しました:', error);
      }
    };
    loadUserSettings();
  }, [setUserSettings]);

  // 薬効モードの更新
  const handleEffectModeChange = async (isOn: boolean) => {
    setIsEffectModeOn(isOn);
    try {
      await userSettingsApi.updateMedicationEffectMode(isOn);
      const settings = await userSettingsApi.getUserSettings();
      setUserSettings(settings);
      setIsEffectModeOn(settings.medication_effect_mode_on === 1);
      if (settings.effect_start_time) {
        setMedicationConfig({
          defaultTime: settings.effect_start_time,
          totalEffectDuration: settings.effect_duration_minutes / 60,
          onsetTime: settings.time_to_max_effect_minutes / 60,
          peakOutTime: (settings.time_to_max_effect_minutes + settings.time_to_fade_minutes) / 60
        });
      }
    } catch (error) {
      console.error('薬効モードの更新に失敗しました:', error);
      // エラー時は元に戻すなどの処理も検討
    }
  };

  // 設定値の更新
  const handleConfigChange = async (newConfig: MedicationEffectConfig) => {
    try {
      await userSettingsApi.updateMedicationConfig({
        effect_start_time: newConfig.defaultTime,
        effect_duration_minutes: newConfig.totalEffectDuration * 60,
        time_to_max_effect_minutes: newConfig.onsetTime * 60,
        time_to_fade_minutes: (newConfig.totalEffectDuration - newConfig.onsetTime) * 60
      });
      const settings = await userSettingsApi.getUserSettings();
      setUserSettings(settings);
      setMedicationConfig(newConfig);
    } catch (error) {
      console.error('薬効モードの設定値の更新に失敗しました:', error);
    }
  };

  // 5分ごとに薬効状態を更新
  useEffect(() => {
    const updateStatus = () => {
      setMedicationStatus(calculateMedicationStatus(medicationConfig, medicationSkipped, isEffectModeOn));
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [medicationConfig, medicationSkipped, isEffectModeOn]);

  return (
    <FocusContext.Provider
      value={{
        physicalCondition,
        setPhysicalCondition,
        medicationStatus,
        medicationConfig,
        setMedicationConfig: handleConfigChange,
        medicationSkipped,
        setMedicationSkipped,
        isEffectModeOn,
        setIsEffectModeOn,
        handleEffectModeChange
      }}
    >
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = () => {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}; 