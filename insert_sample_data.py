import sqlite3
import datetime

# データベース接続
conn = sqlite3.connect('task_manager.db')
cursor = conn.cursor()

# ユーザーデータ
cursor.execute('''
INSERT INTO users (email, password_hash, name, auth_provider, google_sub_id, created_at) VALUES 
('user1@example.com', 'hashed_password_1', '中村彦一郎', 'email', NULL, CURRENT_TIMESTAMP),
('user2@example.com', 'hashed_password_2', '田中太郎', 'google', 'google_sub_123', CURRENT_TIMESTAMP)
''')

# ユーザー設定
cursor.execute('''
INSERT INTO user_settings (user_id, daily_task_limit, theme_mode, medication_effect_mode_on, ai_aggressiveness_level) VALUES 
(1, 5, 'dark', 1, 1),
(2, 3, 'default', 0, 0)
''')

# カテゴリ
cursor.execute('''
INSERT INTO categories (user_id, name, color, is_default) VALUES 
(1, '仕事', '#FF0000', 0),
(1, '個人', '#00FF00', 1),
(2, '家事', '#0000FF', 1)
''')

# タスク
cursor.execute('''
INSERT INTO tasks (
    user_id, name, description, due_date, importance, 
    estimated_duration_minutes, progress, category_id, 
    is_today_task, status, suggested_by_ai, priority_score
) VALUES 
(1, '報告書作成', '月次報告書の作成', '2024-06-15', 'high', 120, 0, 1, 1, 'pending', 0, 0.8),
(1, '運動', '30分ジョギング', '2024-06-10', 'medium', 30, 0, 2, 1, 'pending', 1, 0.5),
(2, '洗濯', '週末の洗濯', '2024-06-08', 'low', 45, 0, 3, 0, 'pending', 0, 0.2)
''')

# 繰り返しタスク
cursor.execute('''
INSERT INTO recurring_tasks (
    user_id, name, description, start_date, 
    recurrence_rule, category_id, importance, 
    estimated_duration_minutes, default_reminder_offset_minutes
) VALUES 
(1, '朝のストレッチ', '毎朝のストレッチルーティン', '2024-06-01', 'daily', 2, 'medium', 15, 10),
(2, '週末の掃除', '定期的な家の掃除', '2024-06-08', 'weekly:sat', 3, 'medium', 60, 30)
''')

# リマインダー
cursor.execute('''
INSERT INTO reminders (
    task_id, user_id, scheduled_time, 
    delivery_status, retry_count
) VALUES 
(1, 1, '2024-06-15 09:00:00', 'pending', 0),
(2, 1, '2024-06-10 06:30:00', 'pending', 0)
''')

# 薬効情報
cursor.execute('''
INSERT INTO medication_effects (
    user_id, date, is_effect_mode_on, 
    is_medication_taken, effect_start_time, 
    effect_duration_minutes
) VALUES 
(1, '2024-06-01', 1, 1, '09:00:00', 240),
(2, '2024-06-02', 0, 0, NULL, NULL)
''')

# 変更をコミット
conn.commit()

# 接続を閉じる
conn.close()

print("サンプルデータの挿入が完了しました。")
