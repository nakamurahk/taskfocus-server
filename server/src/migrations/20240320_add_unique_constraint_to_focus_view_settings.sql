-- focus_view_settingsテーブルに一意制約を追加
ALTER TABLE focus_view_settings
ADD CONSTRAINT focus_view_settings_user_id_view_key_key UNIQUE (user_id, view_key); 