import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE public.users (
	id text NOT NULL,
	email text NOT NULL,
	password_hash text NULL,
	"name" text NULL,
	auth_provider text NOT NULL,
	google_sub_id text NULL,
	apple_sub_id text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	last_login_at timestamp NULL,
	CONSTRAINT users_pkey PRIMARY KEY (id)
);

      CREATE TABLE public.categories (
	id serial4 NOT NULL,
	user_id varchar(255) NULL,
	"name" varchar(100) NOT NULL,
	color varchar(20) NOT NULL,
	is_default int4 DEFAULT 0 NULL,
	CONSTRAINT categories_pkey PRIMARY KEY (id)
);


-- public.categories foreign keys

ALTER TABLE public.categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE TABLE public.user_settings (
	id serial4 NOT NULL,
	user_id varchar(255) NOT NULL,
	daily_task_limit int4 DEFAULT 5 NULL,
	theme_mode varchar(20) DEFAULT 'default'::character varying NULL,
	medication_effect_mode_on int4 DEFAULT 0 NULL,
	default_sort_option varchar(50) DEFAULT 'created_at_desc'::character varying NULL,
	ai_aggressiveness_level int4 DEFAULT 1 NULL,
	is_medication_taken int4 DEFAULT 1 NULL,
	effect_start_time varchar(5) DEFAULT '08:00'::character varying NULL,
	effect_duration_minutes int4 DEFAULT 600 NULL,
	time_to_max_effect_minutes int4 DEFAULT 60 NULL,
	time_to_fade_minutes int4 NULL,
	ai_suggestion_enabled int4 DEFAULT 1 NULL,
	onboarding_completed int4 DEFAULT 0 NULL,
	show_completed_tasks int4 DEFAULT 1 NULL,
	daily_reminder_enabled int4 DEFAULT 1 NULL,
	show_hurdle int4 DEFAULT 1 NOT NULL,
	show_importance int4 DEFAULT 0 NOT NULL,
	show_deadline_alert int4 DEFAULT 0 NOT NULL,
	show_category int4 DEFAULT 1 NULL,
	"viewMode" int4 DEFAULT 0 NULL,
	focus_view_limit int4 DEFAULT 3 NOT NULL,
	CONSTRAINT user_settings_pkey PRIMARY KEY (id)
);


-- public.user_settings foreign keys

ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE TABLE public.tasks (
	id serial4 NOT NULL,
	user_id varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	description text NULL,
	due_date date NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	importance varchar(20) DEFAULT 'medium'::character varying NULL,
	estimated_duration_minutes int4 NULL,
	progress int4 DEFAULT 0 NULL,
	parent_task_id int4 NULL,
	category_id int4 NULL,
	is_deleted int4 DEFAULT 0 NULL,
	deleted_at timestamp NULL,
	is_today_task int4 DEFAULT 0 NULL,
	status varchar(20) DEFAULT 'pending'::character varying NULL,
	completed_at timestamp NULL,
	recurrence_rule text NULL,
	suggested_by_ai int4 DEFAULT 0 NULL,
	priority_score float4 DEFAULT 0.0 NULL,
	child_order int4 DEFAULT 0 NULL,
	task_depth int4 DEFAULT 0 NULL,
	task_path text NULL,
	parent_recurring_task_id int4 NULL,
	hurdle_level int4 NULL,
	updated_at timestamp NULL,
	memo text NULL,
	CONSTRAINT tasks_hurdle_level_check CHECK (((hurdle_level >= 1) AND (hurdle_level <= 3))),
	CONSTRAINT tasks_pkey PRIMARY KEY (id)
);


-- public.tasks foreign keys

ALTER TABLE public.tasks ADD CONSTRAINT tasks_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE TABLE public.custom_focus_views (
	id varchar(64) NOT NULL,
	user_id varchar(255) NOT NULL,
	"name" varchar(32) NOT NULL,
	filter_due text NULL,
	filters_importance text NOT NULL,
	filters_hurdle text NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT custom_focus_views_pkey PRIMARY KEY (id)
);

CREATE TABLE public.focus_view_settings (
	id serial4 NOT NULL,
	user_id varchar(255) NOT NULL,
	view_key varchar(64) NOT NULL,
	"label" varchar(32) NOT NULL,
	visible int4 DEFAULT 1 NOT NULL,
	view_order int4 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT focus_view_settings_pkey PRIMARY KEY (id),
	CONSTRAINT focus_view_settings_user_id_view_key_key UNIQUE (user_id, view_key)
);

CREATE TABLE public.ai_suggestion_logs (
	id serial4 NOT NULL,
	user_id varchar(255) NULL,
	task_id int4 NULL,
	suggestion_type varchar(50) NOT NULL,
	input_context text NOT NULL,
	output_summary text NOT NULL,
	output_details text NULL,
	suggested_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	user_feedback varchar(20) NULL,
	feedback_comment text NULL,
	feedback_timestamp timestamp NULL,
	CONSTRAINT ai_suggestion_logs_pkey PRIMARY KEY (id)
);


-- public.ai_suggestion_logs foreign keys

ALTER TABLE public.ai_suggestion_logs ADD CONSTRAINT ai_suggestion_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.ai_suggestion_logs ADD CONSTRAINT ai_suggestion_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 
CREATE TABLE public.activity_logs (
	id serial4 NOT NULL,
	user_id varchar(255) NULL,
	"action" varchar(50) NOT NULL,
	target_id int4 NULL,
	target_type varchar(50) NULL,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	details text NULL,
	CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);


-- public.activity_logs foreign keys

ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE TABLE public.reminders (
	id serial4 NOT NULL,
	user_id varchar(255) NULL,
	task_id int4 NULL,
	scheduled_time timestamp NOT NULL,
	sent_time timestamp NULL,
	delivery_status varchar(20) DEFAULT 'pending'::character varying NULL,
	delivery_method varchar(20) DEFAULT 'in_app'::character varying NULL,
	retry_count int4 DEFAULT 0 NULL,
	last_error_message text NULL,
	CONSTRAINT reminders_pkey PRIMARY KEY (id)
);


-- public.reminders foreign keys

ALTER TABLE public.reminders ADD CONSTRAINT reminders_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.reminders ADD CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 他のテーブルも必要であれば追加可
    `);
    console.log('✅ データベース初期化完了');
  } catch (err) {
    console.error('❌ データベース初期化失敗:', err);
  } finally {
    client.release();
  }
}