export interface Category {
  id: number;
  name: string;
  color: string;
  is_default: boolean;
}

export interface Task {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  due_date?: string; // YYYY-MM-DD
  created_at: Date;
  importance: string; // 'low', 'medium', 'high'
  estimated_duration_minutes?: number;
  progress: number;
  parent_task_id?: number;
  category_id?: number;
  category?: Category;  // カテゴリー情報を追加
  is_deleted: boolean;
  deleted_at?: Date;
  is_today_task: boolean;
  status: string; // 'pending', 'completed'
  completed_at?: Date;
  recurrence_rule?: string;
  suggested_by_ai: boolean;
  priority_score: number;
  child_order: number;
  task_depth: number;
  task_path?: string;
  parent_recurring_task_id?: number;
  hurdle_level?: number; // 1-3の値を持つハードルレベル
  memo?: string;
  estimated_duration?: number;
}

export type TaskPriority = 'high' | 'medium' | 'low'; 