// users テーブル
export interface User {
  id: number;
  email: string;
  password_hash?: string;
  name?: string;
  auth_provider: string; // 'email', 'google', 'apple'
  google_sub_id?: string;
  apple_sub_id?: string;
  created_at: Date;
  last_login_at?: Date;
}

// user_settings テーブル
export interface UserSetting {
  id: number;
  user_id: number;
  daily_task_limit?: number;
  theme_mode?: string; // 'default', 'dark'
  medication_effect_mode_on?: boolean;
  default_sort_option?: 'deadline' | 'hurdle' | 'importance' | 'created_at_desc';
  ai_aggressiveness_level?: number; // 0:控えめ, 1:普通, 2:積極的
}

// medication_effects テーブル
export interface MedicationEffect {
  id: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  is_effect_mode_on?: boolean;
  is_medication_taken?: boolean;
  effect_start_time?: string; // HH:MM:SS
  effect_duration_minutes?: number;
  time_to_max_effect_minutes?: number;
  time_to_fade_minutes?: number;
}

// daily_conditions テーブル
export interface DailyCondition {
  id: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  condition: string; // 'good', 'normal', 'bad'
}

// activity_logs テーブル
export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  target_id?: number;
  target_type?: string;
  timestamp: Date;
  details?: string;
}

// ai_suggestion_logs テーブル
export interface AiSuggestionLog {
  id: number;
  user_id: number;
  task_id?: number | null;
  suggestion_type: string;
  input_context: string;
  output_summary: string;
  output_details?: string;
  suggested_at: Date;
  user_feedback?: string;
  feedback_comment?: string;
  feedback_timestamp?: Date;
}

// reminders テーブル
export interface Reminder {
  id: number;
  user_id: number;
  task_id: number;
  scheduled_time: Date;
  sent_time?: Date;
  delivery_status?: string; // 'pending', 'sent', 'failed', 'cancelled'
  delivery_method?: string; // 'in_app', 'email', 'push'
  retry_count?: number;
  last_error_message?: string;
}

// recurring_tasks テーブル
export interface RecurringTask {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  start_date: string; // YYYY-MM-DD
  recurrence_rule: string;
  recurrence_end_date?: string;
  category_id?: number;
  importance?: string;
  estimated_duration_minutes?: number;
  default_reminder_offset_minutes?: number;
  created_at: Date;
}

// tasks テーブル
export interface Task {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  due_date?: string; // YYYY-MM-DD
  created_at: Date;
  importance?: string; // 'low', 'medium', 'high'
  estimated_duration_minutes?: number;
  progress?: number;
  parent_task_id?: number;
  category_id?: number;
  is_deleted?: boolean;
  deleted_at?: Date;
  is_today_task?: boolean;
  status?: string; // 'pending', 'completed'
  completed_at?: Date;
  recurrence_rule?: string;
  suggested_by_ai?: boolean;
  priority_score?: number;
  child_order?: number;
  task_depth?: number;
  task_path?: string;
  parent_recurring_task_id?: number;
}

// categories テーブル
export interface Category {
  id: number;
  user_id: number;
  name: string;
  color: string;
  is_default?: boolean;
}
