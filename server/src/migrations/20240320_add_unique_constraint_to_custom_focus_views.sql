-- custom_focus_viewsテーブルに一意性制約を追加
ALTER TABLE custom_focus_views
ADD CONSTRAINT custom_focus_views_user_id_name_key UNIQUE (user_id, name); 