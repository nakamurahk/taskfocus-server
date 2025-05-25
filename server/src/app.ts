import express from 'express';
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import axios from 'axios';
import { Client, Pool } from 'pg';

// Request型の拡張
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Firebase Admin SDKの初期化
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://172.25.112.66:5173'
];

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// OPTIONSリクエスト用（プリフライト対応）
app.options('*', cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// JSONパーサーの設定
app.use(express.json());

// 全APIレスポンスにキャッシュ無効化ヘッダーを付与
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const isDevelopment = process.env.NODE_ENV === 'development';

// ログ出力用のユーティリティ関数
const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);
  }
};

// データベース接続の設定
const dbPath = process.env.DB_PATH || 'server/data/task_manager.db';
const db = new Database(dbPath, { verbose: isDevelopment ? console.log : undefined });

// PostgreSQL接続プールの作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// PostgreSQL疎通確認
if (process.env.DATABASE_URL) {
  pool.query('SELECT 1')
    .then(() => {
    })
    .catch((err) => {
      console.error('❌ PostgreSQLへの接続に失敗しました:', err);
    });
}

// デフォルトカテゴリーの登録
const defaultCategories = [
  { name: '仕事', color: '#FF6B6B', is_default: 1 },
  { name: '私用', color: '#4ECDC4', is_default: 1 },
  { name: 'その他', color: '#FFD93D', is_default: 1 }
];

try {
  const checkCategories = db.prepare('SELECT COUNT(*) as count FROM categories WHERE is_default = 1').get() as { count: number };
  if (checkCategories.count === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name, color, is_default) VALUES (?, ?, ?)');
    defaultCategories.forEach(category => {
      insertCategory.run(category.name, category.color, category.is_default);
    });
  }
} catch (err) {
  console.error('❌ デフォルトカテゴリー登録中にエラー:', err);
}

// リクエストログ
app.use((req, res, next) => {
  logger.debug(`[${req.method}] ${req.path}`);
  next();
});

// 認証ミドルウェア
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '認証が必要です' });
  }

  getAuth().verifyIdToken(token)
    .then(decodedToken => {
      req.user = decodedToken;
      const uid = decodedToken.uid;
      const email = decodedToken.email;

      // ✅ users テーブルに存在しなければ登録
      try {
        const checkUser = db.prepare('SELECT COUNT(*) as count FROM users WHERE id = ?').get(uid) as { count: number };
        if (checkUser.count === 0) {
          db.prepare('INSERT INTO users (id, email, auth_provider) VALUES (?, ?, ?)').run(
            uid,
            email,
            decodedToken.firebase?.sign_in_provider || 'email'
          );

          // ⚙️ user_settings テーブルにも初期レコード作成
          db.prepare(`
            INSERT INTO user_settings (
              user_id,
              daily_task_limit,
              theme_mode,
              medication_effect_mode_on,
              default_sort_option,
              ai_aggressiveness_level,
              is_medication_taken,
              effect_start_time,
              effect_duration_minutes,
              time_to_max_effect_minutes,
              time_to_fade_minutes,
              ai_suggestion_enabled,
              onboarding_completed,
              show_completed_tasks,
              daily_reminder_enabled,
              show_hurdle,
              show_importance,
              show_deadline_alert,
              show_category,
              viewMode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            uid,
            5,              // daily_task_limit
            'default',      // theme_mode
            0,              // medication_effect_mode_on
            'created_at_desc', // default_sort_option
            1,              // ai_aggressiveness_level
            1,              // is_medication_taken
            '08:00',        // effect_start_time
            600,            // effect_duration_minutes
            60,             // time_to_max_effect_minutes
            540,            // time_to_fade_minutes
            1,              // ai_suggestion_enabled
            0,              // onboarding_completed
            1,              // show_completed_tasks
            1,              // daily_reminder_enabled
            1,              // show_hurdle
            0,              // show_importance
            0,              // show_deadline_alert
            1,              // show_category
            0               // viewMode
          );
        }
      } catch (err) {
        console.error('❌ usersテーブル登録中にエラー:', err);
      }

      // ★ focus_view_settingsの初期化
      try {
        let settings = db.prepare('SELECT * FROM focus_view_settings WHERE user_id = ?').all(uid);
        if (settings.length === 0) {
          const insertStmt = db.prepare(`
            INSERT INTO focus_view_settings (user_id, view_key, label, visible, view_order)
            VALUES (?, ?, ?, ?, ?)
          `);
          const insertMany = db.transaction((presets, customViews) => {
            presets.forEach(preset => {
              insertStmt.run(uid, preset.view_key, preset.label, Number(preset.visible), Number(preset.view_order));
            });
            customViews.forEach((view, idx) => {
              insertStmt.run(uid, view.id, view.name, 1, presets.length + idx + 1);
            });
          });
          // プリセット（today, deadline のみ）
          const presets = [
            { view_key: 'today', label: '今日の締め切り', visible: 1, view_order: 1 },
            { view_key: 'deadline', label: '期限を過ぎたタスク', visible: 1, view_order: 2 },
          ];
          const customViews = db.prepare('SELECT id, name FROM custom_focus_views WHERE user_id = ?').all(uid);
          insertMany(presets, customViews);
        }
      } catch (err) {
        console.error('❌ focus_view_settings初期化エラー:', err);
      }

      next();
    })
    .catch(error => {
      return res.status(403).json({ error: '無効なトークンです' });
    });
};

// タスク関連のエンドポイント
app.get('/tasks', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;

  // PostgreSQL利用フラグ
  const usePostgres = process.env.USE_POSTGRES === 'true';

  if (usePostgres && process.env.DATABASE_URL) {
    // PostgreSQLから取得
    try {
      const result = await pool.query(`
        SELECT t.*, c.name as category_name, c.color as category_color, c.is_default as category_is_default
        FROM tasks t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 AND t.is_deleted = 0
      `, [userId]);
      const tasks = result.rows;
      // カテゴリー情報を整形
      const formattedTasks = tasks.map(task => ({
        ...task,
        category: task.category_id ? {
          id: task.category_id,
          name: task.category_name,
          color: task.category_color,
          is_default: task.category_is_default
        } : null
      }));
      return res.json(formattedTasks);
    } catch (err) {
      console.error('❌ PostgreSQLからのタスク取得エラー:', err);
      return res.status(500).json({ error: 'PostgreSQLからのタスク取得に失敗しました', details: err });
    }
  } else {
    // SQLiteから取得（従来通り）
    interface TaskWithCategory {
      id: number;
      user_id: string;
      name: string;
      description: string | null;
      due_date: string | null;
      importance: string | null;
      estimated_duration_minutes: number | null;
      progress: number;
      category_id: number | null;
      status: string;
      is_deleted: number;
      is_today_task: number;
      suggested_by_ai: number;
      priority_score: number;
      child_order: number;
      task_depth: number;
      created_at: string;
      updated_at: string | null;
      completed_at: string | null;
      deleted_at: string | null;
      category_name: string | null;
      category_color: string | null;
      category_is_default: number | null;
    }

    const tasks = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.is_default as category_is_default
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.is_deleted = 0
    `).all(userId) as TaskWithCategory[];

    // カテゴリー情報を整形
    const formattedTasks = tasks.map(task => ({
      ...task,
      category: task.category_id ? {
        id: task.category_id,
        name: task.category_name,
        color: task.category_color,
        is_default: task.category_is_default
      } : null
    }));

    res.json(formattedTasks);
  }
});

app.post('/tasks', authenticateToken, async (req, res) => {
  try {

    if (!req.user) {
      return res.status(401).json({ error: '認証が必要です' });
    }
    const userId = req.user.uid;
    const task = {
      ...req.body,
      user_id: userId,
      status: 'pending',
      progress: 0,
      is_deleted: 0,
      is_today_task: req.body.is_today_task ? 1 : 0,
      suggested_by_ai: 0,
      priority_score: 0.0,
      child_order: req.body.child_order !== undefined ? req.body.child_order : 0,
      task_depth: 0,
      importance: req.body.importance || 'medium',
      estimated_duration_minutes: req.body.estimated_duration_minutes || 30,
      hurdle_level: req.body.hurdle_level || 1,
      memo: req.body.memo || null,
      parent_task_id: req.body.parent_task_id || null
    };

    // PostgreSQL利用フラグ
    const usePostgres = process.env.USE_POSTGRES === 'true';

    if (usePostgres && process.env.DATABASE_URL) {
      // PostgreSQLにINSERT
      const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
      try {
        await pgClient.connect();
        const insertQuery = `
          INSERT INTO tasks (
            user_id, name, description, due_date, importance,
            estimated_duration_minutes, progress, category_id,
            status, is_deleted, is_today_task, suggested_by_ai,
            priority_score, child_order, task_depth, hurdle_level, memo,
            parent_task_id
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8,
            $9, $10, $11, $12,
            $13, $14, $15, $16, $17,
            $18
          ) RETURNING *;
        `;
        const values = [
          task.user_id,
          task.name,
          task.description,
          task.due_date,
          task.importance,
          task.estimated_duration_minutes,
          task.progress,
          task.category_id,
          task.status,
          task.is_deleted,
          task.is_today_task,
          task.suggested_by_ai,
          task.priority_score,
          task.child_order,
          task.task_depth,
          task.hurdle_level,
          task.memo,
          task.parent_task_id
        ];
        const result = await pgClient.query(insertQuery, values);
        await pgClient.end();
        const insertedTask = result.rows[0];
        res.status(201).json(insertedTask);
      } catch (err) {
        await pgClient.end();
        console.error('❌ PostgreSQLタスク登録エラー:', err);
        res.status(500).json({ error: 'PostgreSQLタスク登録に失敗しました', details: err });
      }
    } else {
      // SQLiteにINSERT（従来通り）
      const stmt = db.prepare(`
        INSERT INTO tasks (
          user_id, name, description, due_date, importance,
          estimated_duration_minutes, progress, category_id,
          status, is_deleted, is_today_task, suggested_by_ai,
          priority_score, child_order, task_depth, hurdle_level, memo,
          parent_task_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        task.user_id,
        task.name,
        task.description,
        task.due_date,
        task.importance,
        task.estimated_duration_minutes,
        task.progress,
        task.category_id,
        task.status,
        task.is_deleted,
        task.is_today_task,
        task.suggested_by_ai,
        task.priority_score,
        task.child_order,
        task.task_depth,
        task.hurdle_level,
        task.memo,
        task.parent_task_id
      );

      res.status(201).json({ ...task, id: result.lastInsertRowid });
    }
  } catch (err) {
    console.error('❌ タスク作成中にエラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

app.patch('/tasks/:id', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }

  const taskId = req.params.id;
  const userId = req.user.uid;
  const updates = req.body;

  const usePostgres = process.env.USE_POSTGRES === 'true';


  if (usePostgres && process.env.DATABASE_URL) {
    // PostgreSQLで更新
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await pgClient.connect();
      // 動的にSET句を生成
      const fields = [];
      const values = [];
      let idx = 1;
      for (const key in updates) {
        fields.push(`${key} = $${idx}`);
        values.push(updates[key]);
        idx++;
      }
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(taskId);
      values.push(userId);
      const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} AND is_deleted = 0 RETURNING *`;
      const result = await pgClient.query(sql, values);
      await pgClient.end();
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'タスクが見つかりません' });
      }
      res.json({ ...updates, id: taskId });
    } catch (error) {
      await pgClient.end();
      console.error('PostgreSQLタスク更新エラー:', error);
      res.status(500).json({ error: 'PostgreSQLタスク更新に失敗しました', details: error });
    }
  } else {
    // SQLiteで更新（従来通り）
    const stmt = db.prepare(`
      UPDATE tasks SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        due_date = COALESCE(?, due_date),
        importance = COALESCE(?, importance),
        estimated_duration_minutes = COALESCE(?, estimated_duration_minutes),
        progress = COALESCE(?, progress),
        category_id = COALESCE(?, category_id),
        status = COALESCE(?, status),
        is_today_task = COALESCE(?, is_today_task),
        completed_at = COALESCE(?, completed_at),
        memo = COALESCE(?, memo),
        hurdle_level = COALESCE(?, hurdle_level),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND is_deleted = 0
    `);

    try {
      const result = stmt.run(
        updates.name,
        updates.description,
        updates.due_date,
        updates.importance,
        updates.estimated_duration_minutes,
        updates.progress,
        updates.category_id,
        updates.status,
        updates.is_today_task,
        updates.completed_at,
        updates.memo,
        updates.hurdle_level,
        taskId,
        userId
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: 'タスクが見つかりません' });
      }

      res.json({ ...updates, id: taskId });
    } catch (error) {
      console.error('タスク更新中にエラー:', error);
      res.status(500).json({ error: '更新中にサーバーエラーが発生しました' });
    }
  }
});

app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const taskId = req.params.id;
  const userId = req.user.uid;

  const usePostgres = process.env.USE_POSTGRES === 'true';

  if (usePostgres && process.env.DATABASE_URL) {
    // PostgreSQLで削除（論理削除）
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await pgClient.connect();
      const sql = `UPDATE tasks SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`;
      const result = await pgClient.query(sql, [taskId, userId]);
      await pgClient.end();
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'タスクが見つかりません' });
      }
      res.status(204).send();
    } catch (error) {
      await pgClient.end();
      console.error('PostgreSQLタスク削除エラー:', error);
      res.status(500).json({ error: 'PostgreSQLタスク削除に失敗しました', details: error });
    }
  } else {
    // SQLiteで削除（従来通り）
    const stmt = db.prepare(`
      UPDATE tasks 
      SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `);

    const result = stmt.run(taskId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }
    res.status(204).send();
  }
});

app.patch('/tasks/:id/toggle', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const taskId = req.params.id;
  const userId = req.user.uid;
  const { completed } = req.body;

  const stmt = db.prepare(`
    UPDATE tasks SET
      status = ?,
      completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ? AND is_deleted = 0
  `);

  const result = stmt.run(
    completed ? 'completed' : 'pending',
    completed ? 'completed' : 'pending',
    taskId,
    userId
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'タスクが見つかりません' });
  }
  res.json({ id: taskId, status: completed ? 'completed' : 'pending' });
});

// カテゴリー一覧の取得
app.get('/categories', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT id, name, color, is_default
      FROM categories
      WHERE user_id IS NULL OR user_id = ?
    `);
    
    const categories = stmt.all(req.user?.uid);
    res.json(categories);
  } catch (err) {
    console.error('カテゴリー取得中にエラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// ユーザー設定関連のエンドポイント
app.get('/user-settings', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;

  const usePostgres = process.env.USE_POSTGRES === 'true';

  if (usePostgres && process.env.DATABASE_URL) {
    // PostgreSQLから取得
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await pgClient.connect();
      const result = await pgClient.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
      await pgClient.end();
      const settings = result.rows[0];
      if (!settings) {
        return res.status(404).json({ error: 'user_settingsが見つかりません' });
      }
      res.json(settings);
    } catch (err) {
      await pgClient.end();
      console.error('❌ PostgreSQL user_settings取得エラー:', err);
      res.status(500).json({ error: 'PostgreSQL user_settings取得に失敗しました', details: err });
    }
  } else {
    let settings = db.prepare(`
      SELECT * FROM user_settings WHERE user_id = ?
    `).get(userId);

    if (!settings) {
      // 初期レコードを作成
      db.prepare(`
        INSERT INTO user_settings (
          user_id, daily_task_limit, theme_mode, medication_effect_mode_on, default_sort_option,
          ai_aggressiveness_level, is_medication_taken, effect_start_time, effect_duration_minutes,
          time_to_max_effect_minutes, time_to_fade_minutes, ai_suggestion_enabled, onboarding_completed,
          show_completed_tasks, daily_reminder_enabled, show_hurdle, show_importance, show_deadline_alert,
          show_category,
          viewMode
        ) VALUES (?, 5, 'default', 0, 'created_at_desc', 1, 1, '08:00', 600, 60, 540, 1, 0, 1, 1, 1, 0, 0, 1, 0)
      `).run(userId);
      settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
    }

    res.json(settings);
  }
});

// ★ 新規追加: ユーザー設定の表示項目をまとめて更新
app.patch('/user-settings', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { show_hurdle, show_importance, show_deadline_alert, show_category, focusViewLimit, default_sort_option } = req.body;

  // バリデーション
  const isBool = (v: any) => v === 0 || v === 1 || v === true || v === false;
  if (
    (show_hurdle !== undefined && !isBool(show_hurdle)) ||
    (show_importance !== undefined && !isBool(show_importance)) ||
    (show_deadline_alert !== undefined && !isBool(show_deadline_alert)) ||
    (show_category !== undefined && !isBool(show_category))
  ) {
    return res.status(400).json({ error: '値は0/1またはtrue/falseで指定してください' });
  }

  const usePostgres = process.env.USE_POSTGRES === 'true';

  if (usePostgres && process.env.DATABASE_URL) {
    // PostgreSQLで更新
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await pgClient.connect();
      // 動的にSET句を生成
      const fields = [];
      const values = [];
      let idx = 1;
      if (show_hurdle !== undefined) {
        fields.push(`show_hurdle = $${idx}`);
        values.push(show_hurdle ? 1 : 0);
        idx++;
      }
      if (show_importance !== undefined) {
        fields.push(`show_importance = $${idx}`);
        values.push(show_importance ? 1 : 0);
        idx++;
      }
      if (show_deadline_alert !== undefined) {
        fields.push(`show_deadline_alert = $${idx}`);
        values.push(show_deadline_alert ? 1 : 0);
        idx++;
      }
      if (show_category !== undefined) {
        fields.push(`show_category = $${idx}`);
        values.push(show_category ? 1 : 0);
        idx++;
      }
      if (focusViewLimit !== undefined) {
        fields.push(`focus_view_limit = $${idx}`);
        values.push(focusViewLimit);
        idx++;
      }
      if (default_sort_option !== undefined) {
        fields.push(`default_sort_option = $${idx}`);
        values.push(default_sort_option);
        idx++;
      }
      if (fields.length === 0) {
        await pgClient.end();
        return res.status(400).json({ error: '更新する項目がありません' });
      }
      values.push(userId);
      const sql = `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = $${idx} RETURNING *`;
      const result = await pgClient.query(sql, values);
      await pgClient.end();
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'user_settingsが見つかりません' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      await pgClient.end();
      console.error('❌ PostgreSQL user_settings更新エラー:', err);
      res.status(500).json({ error: 'PostgreSQL user_settings更新に失敗しました', details: err });
    }
  } else {
    // SQLiteで更新（従来通り）
    // SQL動的生成
    const fields = [];
    const values = [];
    if (show_hurdle !== undefined) {
      fields.push('show_hurdle = ?');
      values.push(show_hurdle ? 1 : 0);
    }
    if (show_importance !== undefined) {
      fields.push('show_importance = ?');
      values.push(show_importance ? 1 : 0);
    }
    if (show_deadline_alert !== undefined) {
      fields.push('show_deadline_alert = ?');
      values.push(show_deadline_alert ? 1 : 0);
    }
    if (show_category !== undefined) {
      fields.push('show_category = ?');
      values.push(show_category ? 1 : 0);
    }
    if (focusViewLimit !== undefined) {
      fields.push('focus_view_limit = ?');
      values.push(focusViewLimit);
    }
    if (default_sort_option !== undefined) {
      fields.push('default_sort_option = ?');
      values.push(default_sort_option);
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: '更新する項目がありません' });
    }

    const sql = `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`;
    values.push(userId);

    try {
      const stmt = db.prepare(sql);
      stmt.run(...values);
      // 更新後の値を返す
      const updated = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
      res.json(updated);
    } catch (err) {
      console.error('❌ ユーザー設定更新中にエラー:', err);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  }
});

app.patch('/user-settings/medication-effect-mode', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { medication_effect_mode_on } = req.body;

  if (typeof medication_effect_mode_on !== 'number' || ![0, 1].includes(medication_effect_mode_on)) {
    return res.status(400).json({ error: '無効な値です' });
  }

  const usePostgres = process.env.USE_POSTGRES === 'true';
  if (usePostgres && process.env.DATABASE_URL) {
    // PostgreSQLで更新
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await pgClient.connect();
      const sql = `UPDATE user_settings SET medication_effect_mode_on = $1 WHERE user_id = $2 RETURNING *`;
      const result = await pgClient.query(sql, [medication_effect_mode_on, userId]);
      await pgClient.end();
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'user_settingsが見つかりません' });
      }
      res.json({ medication_effect_mode_on });
    } catch (err) {
      await pgClient.end();
      console.error('❌ PostgreSQL 薬効モード更新エラー:', err);
      res.status(500).json({ error: 'PostgreSQL 薬効モード更新に失敗しました', details: err });
    }
  } else {
    // SQLiteで更新（従来通り）
    const stmt = db.prepare(`
      UPDATE user_settings 
      SET medication_effect_mode_on = ?
      WHERE user_id = ?
    `);

    try {
      stmt.run(medication_effect_mode_on, userId);
      res.json({ medication_effect_mode_on });
    } catch (err) {
      console.error('❌ 薬効モード更新中にエラー:', err);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  }
});

// 薬効モードの設定値を更新するエンドポイント
app.patch('/user-settings/medication-config', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const {
    effect_start_time,
    effect_duration_minutes,
    time_to_max_effect_minutes,
    time_to_fade_minutes,
    medication_effect_mode_on,
    is_medication_taken
  } = req.body;

  const usePostgres = process.env.USE_POSTGRES === 'true';
  if (usePostgres && process.env.DATABASE_URL) {
    // PostgreSQLで更新
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await pgClient.connect();
      const sql = `UPDATE user_settings \
        SET effect_start_time = $1,\
            effect_duration_minutes = $2,\
            time_to_max_effect_minutes = $3,\
            time_to_fade_minutes = $4,\
            medication_effect_mode_on = $5,\
            is_medication_taken = $6\
        WHERE user_id = $7 RETURNING *`;
      const values = [
        effect_start_time,
        effect_duration_minutes,
        time_to_max_effect_minutes,
        time_to_fade_minutes,
        medication_effect_mode_on,
        is_medication_taken,
        userId
      ];
      const result = await pgClient.query(sql, values);
      await pgClient.end();
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'user_settingsが見つかりません' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      await pgClient.end();
      console.error('❌ PostgreSQL 薬効モード設定値更新エラー:', err);
      res.status(500).json({ error: 'PostgreSQL 薬効モード設定値更新に失敗しました', details: err });
    }
  } else {
    // SQLiteで更新（従来通り）
    const stmt = db.prepare(`
      UPDATE user_settings 
      SET effect_start_time = ?,
          effect_duration_minutes = ?,
          time_to_max_effect_minutes = ?,
          time_to_fade_minutes = ?,
          medication_effect_mode_on = ?,
          is_medication_taken = ?
      WHERE user_id = ?
    `);

    try {
      stmt.run(
        effect_start_time,
        effect_duration_minutes,
        time_to_max_effect_minutes,
        time_to_fade_minutes,
        medication_effect_mode_on,
        is_medication_taken,
        userId
      );
      // 更新後の値を返す
      const updated = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
      res.json(updated);
    } catch (err) {
      console.error('❌ 薬効モード設定値更新中にエラー:', err);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  }
});

// GPTによるタスク分解API
app.post('/gpt-split-task', authenticateToken, async (req, res) => {
  const { taskName, estimatedDuration, hurdleLevel } = req.body;
  if (!taskName) {
    return res.status(400).json({ error: 'taskNameは必須です' });
  }
  try {
    const prompt = `あなたは優秀なタスク分解アシスタントです。以下のタスクを、実行可能な小さなサブタスクに分解してください。各サブタスクには「タスク名」「内容（説明）」「所要時間（分）」を付けてください。分解結果は必ずJSON配列で、各要素は{name, description, estimated_duration_minutes, child_order}の形式で返してください。\n\nタスク: ${taskName}\n所要時間の目安: ${estimatedDuration || '未指定'}分\nハードルレベル: ${hurdleLevel || '未指定'}\n\n【出力例】\n[\n  {"name": "資料を集める", "description": "必要な資料をネットや書籍で集める", "estimated_duration_minutes": 30, "child_order": 1},\n  {"name": "要点をまとめる", "description": "集めた資料から要点をピックアップしてまとめる", "estimated_duration_minutes": 45, "child_order": 2}\n]\n\n【出力】`;

    const openaiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'あなたは優秀なタスク分解アシスタントです。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.4
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const text = openaiRes.data.choices[0].message.content;
    // JSON部分だけ抽出
    const match = text.match(/\[.*\]/s);
    if (!match) {
      return res.status(200).json({ raw: text, subtasks: [] });
    }
    let subtasks: Array<{ name: string; description: string; estimated_duration_minutes: number; child_order: number }>;
    try {
      subtasks = JSON.parse(match[0]);
    } catch (e) {
      return res.status(200).json({ raw: text, subtasks: [] });
    }
    // child_orderがない場合は1から順に振る
    subtasks = subtasks.map((st: any, idx: number) => ({
      ...st,
      child_order: st.child_order || idx + 1
    }));
    res.json({ subtasks });
  } catch (err: any) {
    console.error('❌ GPT分解APIエラー:', err);
    res.status(500).json({ error: 'GPT分解APIでエラーが発生しました', details: err.message });
  }
});

// ビューモードの更新用エンドポイント
app.patch('/user-settings/view-mode', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { viewMode } = req.body;

  if (typeof viewMode !== 'number') {
    return res.status(400).json({ error: '無効な値です' });
  }

  const usePostgres = process.env.USE_POSTGRES === 'true';
  if (usePostgres && process.env.DATABASE_URL) {
    // PostgreSQLで更新
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await pgClient.connect();
      const sql = `UPDATE user_settings SET "viewMode" = $1 WHERE user_id = $2 RETURNING *`;
      const result = await pgClient.query(sql, [viewMode, userId]);
      await pgClient.end();
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'user_settingsが見つかりません' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      await pgClient.end();
      console.error('❌ PostgreSQL ビューモード更新エラー:', err);
      res.status(500).json({ error: 'PostgreSQL ビューモード更新に失敗しました', details: err });
    }
  } else {
    // SQLiteで更新（従来通り）
    const stmt = db.prepare(`
      UPDATE user_settings 
      SET viewMode = ?
      WHERE user_id = ?
    `);

    try {
      stmt.run(viewMode, userId);
      // 更新後の値を返す
      const updated = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
      res.json(updated);
    } catch (err) {
      console.error('❌ ビューモード更新中にエラー:', err);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  }
});

// カスタムビューの取得
app.get('/custom-views', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;

  const usePostgres = process.env.USE_POSTGRES === 'true';

  try {
    if (usePostgres && process.env.DATABASE_URL) {
      // PostgreSQLから取得
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            cfv.*,
            fvs.visible,
            fvs.view_order
          FROM custom_focus_views cfv
          LEFT JOIN focus_view_settings fvs ON cfv.id = fvs.view_key AND fvs.user_id = $1
          WHERE cfv.user_id = $1
          ORDER BY fvs.view_order ASC NULLS LAST, cfv.created_at ASC
        `, [userId]);


        // custom_focus_viewsテーブルの内容も確認
        const customViewsResult = await client.query(`
          SELECT * FROM custom_focus_views WHERE user_id = $1
        `, [userId]);

        let settings = result.rows;

        // もしなければ初期化
        if (settings.length === 0) {
          await client.query('BEGIN');

          // プリセットビュー
          const presets = [
            { view_key: 'today', label: '今日の締め切り', visible: 1, view_order: 1 },
            { view_key: 'deadline', label: '期限を過ぎたタスク', visible: 1, view_order: 2 }
          ];

          // プリセットを挿入
          for (const preset of presets) {
            await client.query(`
              INSERT INTO focus_view_settings (user_id, view_key, label, visible, view_order)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (user_id, view_key) DO NOTHING
            `, [userId, preset.view_key, preset.label, preset.visible, preset.view_order]);
          }

          // カスタムビューも追加
          const customViews = await client.query(`
            SELECT id, name, filter_due, filters_importance, filters_hurdle 
            FROM custom_focus_views 
            WHERE user_id = $1
          `, [userId]);

          for (let i = 0; i < customViews.rows.length; i++) {
            const view = customViews.rows[i];
            await client.query(`
              INSERT INTO focus_view_settings (user_id, view_key, label, visible, view_order)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (user_id, view_key) DO NOTHING
            `, [userId, view.id, view.name, 1, presets.length + i + 1]);
          }

          await client.query('COMMIT');

          // 更新後の設定を取得
          const updatedResult = await client.query(`
            SELECT 
              fvs.*,
              cv.filter_due,
              cv.filters_importance,
              cv.filters_hurdle,
              cv.name as custom_view_name
            FROM focus_view_settings fvs
            LEFT JOIN custom_focus_views cv ON fvs.view_key = cv.id
            WHERE fvs.user_id = $1 
            ORDER BY fvs.view_order ASC
          `, [userId]);

          settings = updatedResult.rows;
        }

        // JSONデータのパース
        const formattedSettings = settings.map(s => {

          try {
            const importance = s.filters_importance ? 
              (typeof s.filters_importance === 'string' ? JSON.parse(s.filters_importance) : s.filters_importance) : 
              [];
            
            const hurdle = s.filters_hurdle ? 
              (typeof s.filters_hurdle === 'string' ? JSON.parse(s.filters_hurdle) : s.filters_hurdle) : 
              [];


            return {
              ...s,
              filters_importance: importance,
              filters_hurdle: hurdle,
              created_at: s.created_at,
              updated_at: s.updated_at
            };
          } catch (err) {
            console.error('❌ JSONパースエラー:', {
              view_key: s.view_key,
              error: err,
              raw_importance: s.filters_importance,
              raw_hurdle: s.filters_hurdle
            });
            return {
              ...s,
              filters_importance: [],
              filters_hurdle: [],
              created_at: s.created_at,
              updated_at: s.updated_at
            };
          }
        });

        res.json(formattedSettings);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // SQLiteから取得
      const views = db.prepare(`
        SELECT 
          cfv.*,
          fvs.visible,
          fvs.view_order
        FROM custom_focus_views cfv
        LEFT JOIN focus_view_settings fvs ON cfv.id = fvs.view_key AND fvs.user_id = ?
        WHERE cfv.user_id = ?
        ORDER BY fvs.view_order ASC NULLS LAST, cfv.created_at ASC
      `).all(userId, userId);

      // JSONパースして返す
      const result = views.map(v => ({
        ...v,
        filters_importance: JSON.parse(v.filters_importance || '[]'),
        filters_hurdle: JSON.parse(v.filters_hurdle || '[]'),
        visible: v.visible === 1
      }));

      res.json(result);
    }
  } catch (err) {
    console.error('❌ カスタムビューの取得中にエラー:', err);
    res.status(500).json({ error: 'カスタムビューの取得に失敗しました', details: err });
  }
});

// カスタムビューの追加
app.post('/custom-views', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { name, filter_due, filters_importance, filters_hurdle } = req.body;

  const usePostgres = process.env.USE_POSTGRES === 'true';

  try {
    // UUID生成（idはVARCHAR(64)）
    const uuid = require('crypto').randomUUID();

    if (usePostgres && process.env.DATABASE_URL) {
      // PostgreSQLの場合、トランザクションを使用
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // custom_focus_viewsに挿入
        const customViewResult = await client.query(`
          INSERT INTO custom_focus_views (id, user_id, name, filter_due, filters_importance, filters_hurdle)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          uuid,
          userId,
          name,
          filter_due || null,
          JSON.stringify(filters_importance || []),
          JSON.stringify(filters_hurdle || [])
        ]);

        // 最大のview_orderを取得
        const maxOrderResult = await client.query(`
          SELECT MAX(view_order) as max_order FROM focus_view_settings WHERE user_id = $1
        `, [userId]);
        const viewOrder = (maxOrderResult.rows[0]?.max_order ?? 0) + 1;

        // focus_view_settingsに挿入
        await client.query(`
          INSERT INTO focus_view_settings (user_id, view_key, label, visible, view_order)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, view_key) DO NOTHING
        `, [userId, uuid, name, 1, viewOrder]);

        await client.query('COMMIT');

        const newView = customViewResult.rows[0];
        newView.filters_importance = JSON.parse(newView.filters_importance);
        newView.filters_hurdle = JSON.parse(newView.filters_hurdle);

        res.status(201).json(newView);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // SQLiteの場合、トランザクションを使用
      db.transaction(() => {
        // custom_focus_viewsに挿入
        db.prepare(`
          INSERT INTO custom_focus_views (id, user_id, name, filter_due, filters_importance, filters_hurdle)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          uuid,
          userId,
          name,
          filter_due || null,
          JSON.stringify(filters_importance || []),
          JSON.stringify(filters_hurdle || [])
        );

        // 最大のview_orderを取得
        const maxOrder = db.prepare(`
          SELECT MAX(view_order) as max_order FROM focus_view_settings WHERE user_id = ?
        `).get(userId);
        const viewOrder = (maxOrder?.max_order ?? 0) + 1;

        // focus_view_settingsに挿入
        db.prepare(`
          INSERT INTO focus_view_settings (user_id, view_key, label, visible, view_order)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, uuid, name, 1, viewOrder);

        // 挿入したカスタムビューを取得
        const newView = db.prepare(`
          SELECT * FROM custom_focus_views WHERE id = ?
        `).get(uuid);

        newView.filters_importance = JSON.parse(newView.filters_importance);
        newView.filters_hurdle = JSON.parse(newView.filters_hurdle);

        res.status(201).json(newView);
      })();
    }
  } catch (err) {
    console.error('❌ カスタムビューの追加中にエラー:', err);
    res.status(500).json({ error: 'カスタムビューの追加に失敗しました' });
  }
});

// カスタムビューの削除
app.delete('/custom-views/:id', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const viewId = req.params.id;

  const usePostgres = process.env.USE_POSTGRES === 'true';

  try {
    if (usePostgres && process.env.DATABASE_URL) {
      // PostgreSQLで削除（トランザクション使用）
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // focus_view_settings から先に削除
        const settingsResult = await client.query(`
          DELETE FROM focus_view_settings
          WHERE user_id = $1 AND view_key = $2
        `, [userId, viewId]);

        // custom_focus_viewsから削除
        const viewResult = await client.query(`
          DELETE FROM custom_focus_views
          WHERE id = $1 AND user_id = $2
        `, [viewId, userId]);

        if (viewResult.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'カスタムビューが見つかりません' });
        }

        await client.query('COMMIT');
        res.status(204).send();
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // SQLiteで削除（トランザクション使用）
      db.transaction(() => {
        // focus_view_settings から先に削除
        db.prepare(`
          DELETE FROM focus_view_settings
          WHERE user_id = ? AND view_key = ?
        `).run(userId, viewId);

        // custom_focus_viewsから削除
        const result = db.prepare(`
          DELETE FROM custom_focus_views
          WHERE id = ? AND user_id = ?
        `).run(viewId, userId);

        if (result.changes === 0) {
          throw new Error('カスタムビューが見つかりません');
        }
      })();

      res.status(204).send();
    }
  } catch (err) {
    console.error('❌ カスタムビューの削除中にエラー:', err);
    if (err.message === 'カスタムビューが見つかりません') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'カスタムビューの削除に失敗しました' });
    }
  }
});

// カスタムビューの並び替え
app.patch('/custom-views/reorder', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { views } = req.body; // [{ id: number, display_order: number }]

  try {
    const updateOrder = db.prepare(`
      UPDATE custom_focus_views 
      SET display_order = ? 
      WHERE id = ? AND user_id = ?
    `);

    views.forEach((view: { id: number, display_order: number }) => {
      updateOrder.run(view.display_order, view.id, userId);
    });

    const updatedViews = db.prepare(`
      SELECT * FROM custom_focus_views 
      WHERE user_id = ? 
      ORDER BY display_order ASC
    `).all(userId);

    res.json(updatedViews);
  } catch (err) {
    console.error('❌ カスタムビューの並び替え中にエラー:', err);
    res.status(500).json({ error: 'カスタムビューの並び替えに失敗しました' });
  }
});

// ビューモードの更新用エンドポイント
app.patch('/user-settings/view-mode', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { viewMode } = req.body;

  if (typeof viewMode !== 'number') {
    return res.status(400).json({ error: '無効な値です' });
  }

  const usePostgres = process.env.USE_POSTGRES === 'true';
  if (usePostgres && process.env.DATABASE_URL) {
    // PostgreSQLで更新
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await pgClient.connect();
      const sql = `UPDATE user_settings SET "viewMode" = $1 WHERE user_id = $2 RETURNING *`;
      const result = await pgClient.query(sql, [viewMode, userId]);
      await pgClient.end();
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'user_settingsが見つかりません' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      await pgClient.end();
      console.error('❌ PostgreSQL ビューモード更新エラー:', err);
      res.status(500).json({ error: 'PostgreSQL ビューモード更新に失敗しました', details: err });
    }
  } else {
    // SQLiteで更新（従来通り）
    const stmt = db.prepare(`
      UPDATE user_settings 
      SET viewMode = ?
      WHERE user_id = ?
    `);

    try {
      stmt.run(viewMode, userId);
      // 更新後の値を返す
      const updated = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
      res.json(updated);
    } catch (err) {
      console.error('❌ ビューモード更新中にエラー:', err);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  }
});

// ビュー設定（focus_view_settings）の初期化＆取得API
app.get('/focus-view-settings', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;

  const usePostgres = process.env.USE_POSTGRES === 'true';

  try {
    if (usePostgres && process.env.DATABASE_URL) {
      // PostgreSQLから取得
      const client = await pool.connect();
      try {
        // 既存設定を取得
        // まず、view_keyを更新
        await client.query(`
          UPDATE focus_view_settings fvs
          SET view_key = cv.id
          FROM custom_focus_views cv
          WHERE fvs.label = cv.name
          AND fvs.user_id = $1
          AND cv.user_id = $1
        `, [userId]);

        // 更新後のデータを取得
        const result = await client.query(`
          SELECT 
            fvs.*,
            cv.filter_due,
            cv.filters_importance,
            cv.filters_hurdle,
            cv.name as custom_view_name
          FROM focus_view_settings fvs
          LEFT JOIN custom_focus_views cv ON fvs.view_key = cv.id
          WHERE fvs.user_id = $1 
          ORDER BY fvs.view_order ASC
        `, [userId]);



        // custom_focus_viewsテーブルの内容も確認
        const customViewsResult = await client.query(`
          SELECT * FROM custom_focus_views WHERE user_id = $1
        `, [userId]);

        let settings = result.rows;

        // もしなければ初期化
        if (settings.length === 0) {
          await client.query('BEGIN');

          // プリセットビュー
          const presets = [
            { view_key: 'today', label: '今日の締め切り', visible: 1, view_order: 1 },
            { view_key: 'deadline', label: '期限を過ぎたタスク', visible: 1, view_order: 2 }
          ];

          // プリセットを挿入
          for (const preset of presets) {
            await client.query(`
              INSERT INTO focus_view_settings (user_id, view_key, label, visible, view_order)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (user_id, view_key) DO NOTHING
            `, [userId, preset.view_key, preset.label, preset.visible, preset.view_order]);
          }

          // カスタムビューも追加
          const customViews = await client.query(`
            SELECT id, name, filter_due, filters_importance, filters_hurdle 
            FROM custom_focus_views 
            WHERE user_id = $1
          `, [userId]);

          for (let i = 0; i < customViews.rows.length; i++) {
            const view = customViews.rows[i];
            await client.query(`
              INSERT INTO focus_view_settings (user_id, view_key, label, visible, view_order)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (user_id, view_key) DO NOTHING
            `, [userId, view.id, view.name, 1, presets.length + i + 1]);
          }

          await client.query('COMMIT');

          // 更新後の設定を取得
          const updatedResult = await client.query(`
            SELECT 
              fvs.*,
              cv.filter_due,
              cv.filters_importance,
              cv.filters_hurdle,
              cv.name as custom_view_name
            FROM focus_view_settings fvs
            LEFT JOIN custom_focus_views cv ON fvs.view_key = cv.id
            WHERE fvs.user_id = $1 
            ORDER BY fvs.view_order ASC
          `, [userId]);

          settings = updatedResult.rows;
        }

        // JSONデータのパース
        const formattedSettings = settings.map(s => {
          console.log('🔍 処理中のビュー設定:', {
            view_key: s.view_key,
            filters_importance: s.filters_importance,
            filters_hurdle: s.filters_hurdle
          });

          try {
            const importance = s.filters_importance ? 
              (typeof s.filters_importance === 'string' ? JSON.parse(s.filters_importance) : s.filters_importance) : 
              [];
            
            const hurdle = s.filters_hurdle ? 
              (typeof s.filters_hurdle === 'string' ? JSON.parse(s.filters_hurdle) : s.filters_hurdle) : 
              [];

            console.log('✅ パース後のフィルター:', {
              view_key: s.view_key,
              importance,
              hurdle
            });

            return {
              ...s,
              filters_importance: importance,
              filters_hurdle: hurdle,
              created_at: s.created_at,
              updated_at: s.updated_at
            };
          } catch (err) {
            console.error('❌ JSONパースエラー:', {
              view_key: s.view_key,
              error: err,
              raw_importance: s.filters_importance,
              raw_hurdle: s.filters_hurdle
            });
            return {
              ...s,
              filters_importance: [],
              filters_hurdle: [],
              created_at: s.created_at,
              updated_at: s.updated_at
            };
          }
        });

        console.log('📦 取得したfocus_view_settings:', formattedSettings);
        res.json(formattedSettings);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // SQLiteから取得（従来通り）
      let settings = db.prepare(`
        SELECT 
          fvs.*,
          cv.filter_due,
          cv.filters_importance,
          cv.filters_hurdle,
          cv.name as custom_view_name
        FROM focus_view_settings fvs
        LEFT JOIN custom_focus_views cv ON fvs.view_key = cv.id AND cv.user_id = ?
        WHERE fvs.user_id = ? 
        ORDER BY fvs.view_order ASC
      `).all(userId, userId);

      // もしなければ初期化
      if (settings.length === 0) {
        db.transaction(() => {
          // プリセットビュー
          const presets = [
            { view_key: 'today', label: '今日の締め切り', visible: 1, view_order: 1 },
            { view_key: 'deadline', label: '期限を過ぎたタスク', visible: 1, view_order: 2 }
          ];

          const insertStmt = db.prepare(`
            INSERT INTO focus_view_settings (user_id, view_key, label, visible, view_order)
            VALUES (?, ?, ?, ?, ?)
          `);

          // プリセットを挿入
          presets.forEach(preset => {
            insertStmt.run(userId, preset.view_key, preset.label, preset.visible, preset.view_order);
          });

          // カスタムビューも追加
          const customViews = db.prepare(`
            SELECT id, name, filter_due, filters_importance, filters_hurdle 
            FROM custom_focus_views 
            WHERE user_id = ?
          `).all(userId);

          customViews.forEach((view, idx) => {
            insertStmt.run(userId, view.id, view.name, 1, presets.length + idx + 1);
          });
        })();

        // 更新後の設定を取得
        settings = db.prepare(`
          SELECT 
            fvs.*,
            cv.filter_due,
            cv.filters_importance,
            cv.filters_hurdle,
            cv.name as custom_view_name
          FROM focus_view_settings fvs
          LEFT JOIN custom_focus_views cv ON fvs.view_key = cv.id AND cv.user_id = ?
          WHERE fvs.user_id = ? 
          ORDER BY fvs.view_order ASC
        `).all(userId, userId);
      }

      // JSONデータのパース
      const formattedSettings = settings.map(s => {
        console.log('🔍 処理中のビュー設定:', {
          view_key: s.view_key,
          filters_importance: s.filters_importance,
          filters_hurdle: s.filters_hurdle
        });

        try {
          const importance = s.filters_importance ? 
            (typeof s.filters_importance === 'string' ? JSON.parse(s.filters_importance) : s.filters_importance) : 
            [];
          
          const hurdle = s.filters_hurdle ? 
            (typeof s.filters_hurdle === 'string' ? JSON.parse(s.filters_hurdle) : s.filters_hurdle) : 
            [];

          console.log('✅ パース後のフィルター:', {
            view_key: s.view_key,
            importance,
            hurdle
          });

          return {
            ...s,
            filters_importance: importance,
            filters_hurdle: hurdle,
            created_at: s.created_at,
            updated_at: s.updated_at
          };
        } catch (err) {
          console.error('❌ JSONパースエラー:', {
            view_key: s.view_key,
            error: err,
            raw_importance: s.filters_importance,
            raw_hurdle: s.filters_hurdle
          });
          return {
            ...s,
            filters_importance: [],
            filters_hurdle: [],
            created_at: s.created_at,
            updated_at: s.updated_at
          };
        }
      });

      console.log('📦 取得したfocus_view_settings:', formattedSettings);
      res.json(formattedSettings);
    }
  } catch (err) {
    console.error('❌ focus_view_settings取得エラー:', err);
    res.status(500).json({ error: 'focus_view_settings取得に失敗しました', details: err });
  }
});

// ビュー設定の削除API
app.delete('/focus-view-settings/:viewKey', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const viewKey = req.params.viewKey;

  try {
    // focus_view_settingsから削除
    const result = db.prepare(`
      DELETE FROM focus_view_settings
      WHERE user_id = ? AND view_key = ?
    `).run(userId, viewKey);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'ビュー設定が見つかりません' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('❌ ビュー設定の削除中にエラー:', err);
    res.status(500).json({ error: 'ビュー設定の削除に失敗しました' });
  }
});

// ビュー設定（focus_view_settings）の更新API
app.patch('/focus-view-settings', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { settings, focusViewLimit } = req.body;

  console.log('📥 focus-view-settings更新リクエスト:', { settings, focusViewLimit });

  if (!Array.isArray(settings)) {
    return res.status(400).json({ error: 'settingsは配列で指定してください' });
  }

  const usePostgres = process.env.USE_POSTGRES === 'true';
  console.log('USE_POSTGRES:', usePostgres);

  try {
    if (usePostgres) {
      // PostgreSQLの場合
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 既存の設定を更新または新規挿入
        for (const setting of settings) {
          await client.query(
            `INSERT INTO focus_view_settings 
            (user_id, view_key, label, visible, view_order)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, view_key) 
            DO UPDATE SET 
              label = EXCLUDED.label,
              visible = EXCLUDED.visible,
              view_order = EXCLUDED.view_order`,
            [
              userId,
              setting.view_key,
              setting.label,
              setting.visible ? 1 : 0,
              setting.view_order
            ]
          );
        }

        // 不要なレコードを削除
        await client.query(
          `DELETE FROM focus_view_settings 
           WHERE user_id = $1 
           AND view_key NOT IN (${settings.map((_, i) => `$${i + 2}`).join(',')})`,
          [userId, ...settings.map(s => s.view_key)]
        );

        // focus_view_limitの更新
        if (focusViewLimit !== undefined) {
          console.log('focusViewLimit更新:', { focusViewLimit });
          try {
            const result = await client.query(
              `UPDATE user_settings 
               SET focus_view_limit = $1 
               WHERE user_id = $2 
               RETURNING *`,
              [focusViewLimit, req.user.uid]
            );
            console.log('focusViewLimit更新結果:', result.rows[0]);
          } catch (error) {
            console.error('focusViewLimit更新エラー:', error);
            throw error;
          }
        }

        await client.query('COMMIT');

        // 更新後の設定を取得して返却
        const result = await client.query(
          `SELECT fvs.*, cv.filter_due, cv.filters_importance, cv.filters_hurdle
          FROM focus_view_settings fvs
          LEFT JOIN custom_focus_views cv ON fvs.view_key = cv.id
          WHERE fvs.user_id = $1 
          ORDER BY fvs.view_order ASC`,
          [userId]
        );

        res.json(result.rows);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // SQLiteの場合
      db.transaction(() => {
        // 既存の設定を削除
        db.prepare('DELETE FROM focus_view_settings WHERE user_id = ?').run(userId);

        // 新しい設定を一括挿入
        const insertStmt = db.prepare(`
          INSERT INTO focus_view_settings (user_id, view_key, label, visible, view_order)
          VALUES (?, ?, ?, ?, ?)
        `);

        settings.forEach(setting => {
          insertStmt.run(
            userId,
            setting.view_key,
            setting.label,
            setting.visible ? 1 : 0,
            setting.view_order
          );
        });

        // focus_view_limitの更新
        if (focusViewLimit !== undefined) {
          db.prepare(`
            UPDATE user_settings 
            SET focus_view_limit = ? 
            WHERE user_id = ?
          `).run(focusViewLimit, userId);
        }
      })();

      // 更新後の設定を取得して返却
      const updatedSettings = db.prepare(`
        SELECT fvs.*, cv.filter_due, cv.filters_importance, cv.filters_hurdle
        FROM focus_view_settings fvs
        LEFT JOIN custom_focus_views cv ON fvs.view_key = cv.id
        WHERE fvs.user_id = ? 
        ORDER BY fvs.view_order ASC
      `).all(userId);

      res.json(updatedSettings);
    }
  } catch (err) {
    console.error('❌ focus_view_settings更新エラー:', err);
    res.status(500).json({ error: 'focus_view_settings更新に失敗しました', details: err });
  }
});

// カスタムビューの更新
app.patch('/custom-views/:id', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const viewId = req.params.id;
  const { name, filter_due, filters_importance, filters_hurdle } = req.body;

  const usePostgres = process.env.USE_POSTGRES === 'true';
  console.log('USE_POSTGRES:', usePostgres);

  try {
    if (usePostgres && process.env.DATABASE_URL) {
      // PostgreSQLで更新
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // custom_focus_viewsを更新
        const result = await client.query(`
          UPDATE custom_focus_views
          SET name = $1, filter_due = $2, filters_importance = $3, filters_hurdle = $4
          WHERE id = $5 AND user_id = $6
          RETURNING *
        `, [
          name,
          filter_due || null,
          JSON.stringify(filters_importance || []),
          JSON.stringify(filters_hurdle || []),
          viewId,
          userId
        ]);

        if (result.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'カスタムビューが見つかりません' });
        }

        // focus_view_settingsも更新
        await client.query(`
          UPDATE focus_view_settings
          SET label = $1
          WHERE view_key = $2 AND user_id = $3
        `, [name, viewId, userId]);

        await client.query('COMMIT');

        const updatedView = result.rows[0];
        updatedView.filters_importance = JSON.parse(updatedView.filters_importance);
        updatedView.filters_hurdle = JSON.parse(updatedView.filters_hurdle);

        res.json(updatedView);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // SQLiteで更新
      db.transaction(() => {
        // custom_focus_viewsを更新
        const result = db.prepare(`
          UPDATE custom_focus_views
          SET name = ?, filter_due = ?, filters_importance = ?, filters_hurdle = ?
          WHERE id = ? AND user_id = ?
        `).run(
          name,
          filter_due || null,
          JSON.stringify(filters_importance || []),
          JSON.stringify(filters_hurdle || []),
          viewId,
          userId
        );

        if (result.changes === 0) {
          return res.status(404).json({ error: 'カスタムビューが見つかりません' });
        }

        // focus_view_settingsも更新
        db.prepare(`
          UPDATE focus_view_settings
          SET label = ?
          WHERE view_key = ? AND user_id = ?
        `).run(name, viewId, userId);

        // 更新後のカスタムビューを取得
        const updatedView = db.prepare(`
          SELECT * FROM custom_focus_views
          WHERE id = ? AND user_id = ?
        `).get(viewId, userId);

        updatedView.filters_importance = JSON.parse(updatedView.filters_importance);
        updatedView.filters_hurdle = JSON.parse(updatedView.filters_hurdle);

        res.json(updatedView);
      })();
    }
  } catch (err) {
    console.error('❌ カスタムビューの更新中にエラー:', err);
    res.status(500).json({ error: 'カスタムビューの更新に失敗しました' });
  }
});

// エラーハンドリング
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('アプリケーションエラー:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// サーバー起動
app.listen(port, () => {
  console.log(`サーバーがポート${port}で起動しました`);
});