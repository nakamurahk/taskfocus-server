// 体調の状態を表す型
export type PhysicalCondition = 'good' | 'normal' | 'bad';

// 薬効状態を表す型
export type MedicationStatus = 'before_peak' | 'peak' | 'fading' | 'off' | 'skipped';

// 薬効設定の型
export interface MedicationEffectConfig {
  defaultTime: string; // 初期服用時刻: "08:00"
  totalEffectDuration: number; // 効果持続時間（時間単位、初期値:10）
  onsetTime: number; // 効き始めまでの時間（時間単位、初期値:2）
  peakOutTime: number; // ピーク終了時間（服用後の時間単位、初期値:8）
}

// 薬効状態のコンテキストの型
export interface FocusContextType {
  physicalCondition: PhysicalCondition;
  setPhysicalCondition: (condition: PhysicalCondition) => void;
  medicationStatus: MedicationStatus;
  medicationConfig: MedicationEffectConfig;
  setMedicationConfig: (config: MedicationEffectConfig) => void;
  medicationSkipped: boolean;
  setMedicationSkipped: (skipped: boolean) => void;
  isEffectModeOn: boolean;
  setIsEffectModeOn: (isOn: boolean) => void;
  handleEffectModeChange: (isOn: boolean) => Promise<void>;
} 