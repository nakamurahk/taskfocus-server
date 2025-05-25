import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { taskApi } from './api';
import { Task } from '../types/task';

// 型定義（必要に応じて拡張）
export interface User {
  id: number;
  name: string;
  email: string;
  // ...他のプロパティ
}

export interface UserSettings {
  effect_start_time?: string;
  effect_duration_minutes?: number;
  time_to_max_effect_minutes?: number;
  time_to_fade_minutes?: number;
  is_medication_taken?: number;
  medication_effect_mode_on?: number;
  show_hurdle?: number;
  show_importance?: number;
  show_category?: number;
  viewMode?: number;
  default_sort_option?: 'deadline' | 'hurdle' | 'importance' | 'created_at_desc';
  // 必要に応じて他のプロパティも追加
}

// 集中モード設定用の型
export interface FocusViewSetting {
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface CustomFocusView {
  id: string;
  name: string;
  filters: {
    due: string[];
    importance: string[];
    hurdle: number[];
  };
}

export interface AppState {
  user: User | null;
  tasks: Task[];
  userSettings: UserSettings | null;
  isEffectModeOn: boolean;
  medicationConfig: {
    defaultTime: string;
    totalEffectDuration: number;
    onsetTime: number;
    peakOutTime: number;
  };
  focusViewSettings: FocusViewSetting[];
  customFocusViews: CustomFocusView[];
  setUser: (user: User | null) => void;
  setTasks: (tasks: Task[]) => void;
  setUserSettings: (settings: UserSettings | null) => void;
  setIsEffectModeOn: (on: boolean) => void;
  setMedicationConfig: (config: {
    defaultTime: string;
    totalEffectDuration: number;
    onsetTime: number;
    peakOutTime: number;
  }) => void;
  setFocusViewSettings: (settings: FocusViewSetting[]) => void;
  setCustomFocusViews: (views: CustomFocusView[]) => void;
  toggleTask: (taskId: number) => Promise<void>;
  updateTask: (taskId: number, updates: Partial<Task> & { category?: string }) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
  focusViewLimit: number;
  setFocusViewLimit: (limit: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      tasks: [],
      userSettings: null,
      isEffectModeOn: false,
      medicationConfig: {
        defaultTime: '08:00',
        totalEffectDuration: 10,
        onsetTime: 2,
        peakOutTime: 8
      },
      focusViewSettings: [
        { key: 'today_due', label: '今日の締め切り', visible: true, order: 1 },
        { key: 'deadline', label: '期限切れタスク', visible: true, order: 2 },
      ],
      customFocusViews: [],
      setUser: (user) => set({ user }),
      setTasks: (tasks) => set({ tasks }),
      setUserSettings: (userSettings) => {
        set({ userSettings });
        // userSettingsの値からisEffectModeOnやmedicationConfigも更新
        if (userSettings) {
          set({
            isEffectModeOn: userSettings.medication_effect_mode_on === 1,
            medicationConfig: userSettings.effect_start_time ? {
              defaultTime: userSettings.effect_start_time,
              totalEffectDuration: (userSettings.effect_duration_minutes ?? 600) / 60,
              onsetTime: (userSettings.time_to_max_effect_minutes ?? 60) / 60,
              peakOutTime: ((userSettings.time_to_max_effect_minutes ?? 60) + (userSettings.time_to_fade_minutes ?? 540)) / 60
            } : get().medicationConfig
          });
        }
      },
      setIsEffectModeOn: (on) => set({ isEffectModeOn: on }),
      setMedicationConfig: (config) => set({ medicationConfig: config }),
      setFocusViewSettings: (settings) => set({ focusViewSettings: settings }),
      setCustomFocusViews: (views) => set({ customFocusViews: views }),
      toggleTask: async (taskId: number) => {
        // API呼び出し
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;
        const updatedTask = await taskApi.toggleTask(taskId, task.status !== 'completed');
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updatedTask } : t
          ),
        }));
      },
      updateTask: async (taskId: number, updates: Partial<Task> & { category?: string }) => {
        await taskApi.updateTask(taskId, updates);
        const refreshedTasks = await taskApi.getTasks();
        set({ tasks: refreshedTasks });
      },
      deleteTask: async (taskId: number) => {
        await taskApi.deleteTask(taskId);
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        }));
      },
      addTask: async (task) => {
        await taskApi.createTask(task);
        const refreshedTasks = await taskApi.getTasks();
        set({ tasks: refreshedTasks });
      },
      focusViewLimit: 3,
      setFocusViewLimit: (limit) => set({ focusViewLimit: limit }),
    }),
    { name: 'app-storage' }
  )
); 