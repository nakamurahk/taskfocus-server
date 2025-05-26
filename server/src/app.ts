import express from 'express';
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import axios from 'axios';
import { Pool } from 'pg';
import crypto from 'crypto';


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

const allowedOrigin = 'https://taskfocus-frontend.onrender.com';

// CORSの設定を修正
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// プリフライト対応（OPTIONS）
app.options('*', cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

// PostgreSQL接続プールの作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// PostgreSQL疎通確認
if (process.env.DATABASE_URL) {
  pool.query('SELECT 1')
    .then(() => {
      console.log('✅ PostgreSQLへの接続に成功しました');
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

// 初期化関数
async function initializeDatabase() {
  try {
    const checkCategories = await pool.query('SELECT COUNT(*) as count FROM categories WHERE is_default = 1');
    if (checkCategories.rows[0].count === '0') {
      for (const category of defaultCategories) {
        await pool.query(
          'INSERT INTO categories (name, color, is_default) VALUES ($1, $2, $3)',
          [category.name, category.color, category.is_default]
        );
      }
    }
  } catch (err) {
    console.error('❌ デフォルトカテゴリー登録中にエラー:', err);
  }
}

// データベースの初期化を実行
initializeDatabase().catch(console.error);

// リクエストログ
app.use((req, res, next) => {
  logger.debug(`[${req.method}] ${req.path}`);
  next();
});

// 認証ミドルウェア
const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '認証が必要です' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = decodedToken;
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // ✅ users テーブルに存在しなければ登録
    const checkUser = await pool.query('SELECT COUNT(*) as count FROM users WHERE id = $1', [uid]);
    if (checkUser.rows[0].count === '0') {
      await pool.query(
        'INSERT INTO users (id, email, auth_provider) VALUES ($1, $2, $3)',
        [uid, email, decodedToken.firebase?.sign_in_provider || 'email']
      );

      // ⚙️ user_settings テーブルにも初期レコード作成
      await pool.query(`
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
          "viewMode"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `, [
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
        600,            // time_to_fade_minutes
        1,              // ai_suggestion_enabled
        0,              // onboarding_completed
        1,              // show_completed_tasks
        1,              // daily_reminder_enabled
        1,              // show_hurdle
        0,              // show_importance
        0,              // show_deadline_alert
        1,              // show_category
        0               // viewMode
      ]);
    }

    // ★ focus_view_settingsの初期化
    const settings = await pool.query('SELECT view_key FROM focus_view_settings WHERE user_id = $1', [uid]);
    const existingKeys = settings.rows.map(row => row.view_key);
    const requiredKeys = ['today', 'deadline'];
    const missingKeys = requiredKeys.filter(key => !existingKeys.includes(key));

    if (missingKeys.length > 0) {
      const insertValues = missingKeys.map((key) => {
        const label = key === 'today' ? '今日の締め切り' : '期限を過ぎたタスク';
        const order = key === 'today' ? 1 : 2;
        return `($1, '${key}', '${label}', 1, ${order})`;
      }).join(',');

      await pool.query(`
        INSERT INTO focus_view_settings (user_id, view_key, label, visible, view_order)
        VALUES ${insertValues}
      `, [uid]);
    }

    next();
  } catch (err) {
    console.error('❌ 認証エラー:', err);
    return res.status(401).json({ error: '認証に失敗しました' });
  }
};

// タスク関連のエンドポイント
app.get('/tasks', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;

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

    const client = await pool.connect();
    try {
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
      const result = await client.query(insertQuery, values);
      const insertedTask = result.rows[0];
      res.status(201).json(insertedTask);
    } finally {
      client.release();
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

  try {
    const client = await pool.connect();
    try {
      // 動的にSET句を生成
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const key in updates) {
        // memoフィールドの特別処理
        if (key === 'memo') {
          fields.push(`${key} = $${idx}`);
          values.push(updates[key] === '' ? null : updates[key]);  // 空文字列の場合はnullに
        }
        // due_dateフィールドの特別処理
        else if (key === 'due_date') {
          fields.push(`${key} = $${idx}`);
          values.push(updates[key] === '' ? null : updates[key]);  // 空文字列の場合はnullに
        }
        else {
          fields.push(`${key} = $${idx}`);
          values.push(updates[key]);
        }
        idx++;
      }

      // updated_atを必ず更新
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(taskId);
      values.push(userId);

      const sql = `
        UPDATE tasks 
        SET ${fields.join(', ')} 
        WHERE id = $${idx} AND user_id = $${idx + 1} AND is_deleted = 0 
        RETURNING *
      `;

      console.log('SQL:', sql);  // デバッグ用
      console.log('Values:', values);  // デバッグ用

      const result = await client.query(sql, values);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'タスクが見つかりません' });
      }

      // 更新されたデータを整形して返却
      const updatedTask = result.rows[0];
      res.json({
        ...updatedTask,
        memo: updatedTask.memo || '',  // nullの場合は空文字列に変換
        due_date: updatedTask.due_date || '',  // nullの場合は空文字列に変換
        updated_at: updatedTask.updated_at
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('PostgreSQLタスク更新エラー:', error);
    res.status(500).json({ error: 'PostgreSQLタスク更新に失敗しました', details: error });
  }
});

app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const taskId = req.params.id;
  const userId = req.user.uid;

  try {
    const client = await pool.connect();
    try {
      const sql = `UPDATE tasks SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`;
      const result = await client.query(sql, [taskId, userId]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'タスクが見つかりません' });
      }
      res.status(204).send();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('PostgreSQLタスク削除エラー:', error);
    res.status(500).json({ error: 'PostgreSQLタスク削除に失敗しました', details: error });
  }
});

app.patch('/tasks/:id/toggle', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const taskId = req.params.id;
  const userId = req.user.uid;
  const { completed } = req.body;

  try {
    const client = await pool.connect();
    try {
      const sql = `
        UPDATE tasks SET
          status = $1,
          completed_at = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4 AND is_deleted = 0
        RETURNING *
      `;
      const result = await client.query(sql, [
        completed ? 'completed' : 'pending',
        completed ? 'completed' : 'pending',
        taskId,
        userId
      ]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'タスクが見つかりません' });
      }
      res.json({ id: taskId, status: completed ? 'completed' : 'pending' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('タスクの完了状態切り替え中にエラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// カテゴリー一覧の取得
app.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, color, is_default
      FROM categories
      WHERE user_id IS NULL OR user_id = $1
      ORDER BY is_default DESC, name ASC
    `, [req.user?.uid]);
    
    res.json(result.rows);
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

  try {
    const result = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
    const settings = result.rows[0];
    if (!settings) {
      // 初期レコードを作成
      const insertResult = await pool.query(`
        INSERT INTO user_settings (
          user_id, daily_task_limit, theme_mode, medication_effect_mode_on, default_sort_option,
          ai_aggressiveness_level, is_medication_taken, effect_start_time, effect_duration_minutes,
          time_to_max_effect_minutes, time_to_fade_minutes, ai_suggestion_enabled, onboarding_completed,
          show_completed_tasks, daily_reminder_enabled, show_hurdle, show_importance, show_deadline_alert,
          show_category,
          "viewMode"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `, [
        userId,
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
      ]);
      return res.json(insertResult.rows[0]);
    }
    res.json(settings);
  } catch (err) {
    console.error('❌ PostgreSQL user_settings取得エラー:', err);
    res.status(500).json({ error: 'PostgreSQL user_settings取得に失敗しました', details: err });
  }
});

// フォーカスビュー設定の取得
app.get('/focus-view-settings', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;

  try {
    const client = await pool.connect();
    try {
      // 特定のビューキーの存在確認
      const checkResult = await client.query(`
        SELECT view_key 
        FROM focus_view_settings 
        WHERE user_id = $1 AND view_key IN ('today', 'deadline')
      `, [userId]);

      const existingKeys = checkResult.rows.map(row => row.view_key);
      const missingKeys = ['today', 'deadline'].filter(key => !existingKeys.includes(key));

      // 存在しないビューキーに対して初期値を登録
      if (missingKeys.length > 0) {
        const insertValues = missingKeys.map((key, index) => {
          const label = key === 'today' ? '今日の締め切り' : '期限を過ぎたタスク';
          const order = key === 'today' ? 1 : 2;
          return `($1, '${key}', '${label}', 1, ${order}, CURRENT_TIMESTAMP)`;
        }).join(',');

        await client.query(`
          INSERT INTO focus_view_settings 
            (user_id, view_key, label, visible, view_order, created_at)
          VALUES ${insertValues}
        `, [userId]);
      }

      // ビュー設定を取得
      const result = await client.query(`
        SELECT 
          id,
          view_key,
          label,
          visible,
          view_order,
          created_at,
          updated_at
        FROM focus_view_settings
        WHERE user_id = $1
        ORDER BY view_order ASC
      `, [userId]);

      // レスポンスデータの整形
      const views = result.rows.map(view => ({
        id: view.id,
        view_key: view.view_key,
        label: view.label,
        visible: view.visible === 1,
        view_order: view.view_order,
        created_at: view.created_at,
        updated_at: view.updated_at
      }));

      res.json(views);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ フォーカスビュー設定取得エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// フォーカスビュー設定の更新
app.patch('/focus-view-settings/:id', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const settingId = req.params.id;
  const { visible, view_order } = req.body;

  try {
    const client = await pool.connect();
    try {
      // visibleの値を確実に0/1に変換
      const visibleInt = visible === true ? 1 : 0;

      const result = await client.query(`
        UPDATE focus_view_settings
        SET 
          visible = $1,
          view_order = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4
        RETURNING *
      `, [
        visibleInt,
        view_order,
        settingId,
        userId
      ]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: '設定が見つかりません' });
      }

      // レスポンスデータの整形（IntegerをBooleanに変換）
      const updatedSetting = result.rows[0];
      res.json({
        id: updatedSetting.id,
        view_key: updatedSetting.view_key,
        label: updatedSetting.label,
        visible: updatedSetting.visible === 1,
        view_order: updatedSetting.view_order,
        created_at: updatedSetting.created_at,
        updated_at: updatedSetting.updated_at
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ フォーカスビュー設定更新エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// フォーカスビュー設定の一括更新
app.patch('/focus-view-settings', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { settings, focusViewLimit } = req.body;

  if (!settings || !Array.isArray(settings)) {
    return res.status(400).json({ error: '無効なリクエストデータ' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // focusViewLimitの更新
      if (typeof focusViewLimit === 'number') {
        await client.query(`
          UPDATE user_settings
          SET focus_view_limit = $1
          WHERE user_id = $2
        `, [focusViewLimit, userId]);
      }

      // 各設定の更新
      for (const setting of settings) {
        if (!setting.view_key || typeof setting.view_order !== 'number') {
          throw new Error('無効な設定データ');
        }

        // visibleの値を確実に0/1に変換
        const visibleInt = setting.visible === true ? 1 : 0;

        console.log('Updating setting:', {
          view_key: setting.view_key,
          visible: setting.visible,
          visibleInt: visibleInt,
          view_order: setting.view_order
        });

        await client.query(`
          UPDATE focus_view_settings
          SET 
            visible = $1,
            view_order = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $3 AND view_key = $4
        `, [
          visibleInt,
          setting.view_order,
          userId,
          setting.view_key
        ]);
      }

      await client.query('COMMIT');

      // 更新後の設定を取得
      const result = await client.query(`
        SELECT 
          id,
          view_key,
          label,
          visible,
          view_order,
          created_at,
          updated_at
        FROM focus_view_settings
        WHERE user_id = $1
        ORDER BY view_order ASC
      `, [userId]);

      // レスポンスデータの整形（IntegerをBooleanに変換）
      const updatedSettings = result.rows.map(setting => ({
        id: setting.id,
        view_key: setting.view_key,
        label: setting.label,
        visible: setting.visible === 1,
        view_order: setting.view_order,
        created_at: setting.created_at,
        updated_at: setting.updated_at
      }));

      res.json(updatedSettings);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ フォーカスビュー設定一括更新エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// カスタムビューの取得
app.get('/custom-views', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          id,
          name,
          filter_due,
          filters_importance,
          filters_hurdle,
          created_at,
          updated_at
        FROM custom_focus_views
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);

      // フィルター情報をJSONとしてパース
      const views = result.rows.map(view => ({
        ...view,
        filter_due: view.filter_due ? JSON.parse(view.filter_due) : null,
        filters_importance: JSON.parse(view.filters_importance),
        filters_hurdle: JSON.parse(view.filters_hurdle)
      }));

      res.json(views);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ カスタムビュー取得エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// カスタムビューの作成
app.post('/custom-views', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { name, filter_due, filters_importance, filters_hurdle, focus_view_limit } = req.body;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // カスタムビューのIDを生成
      const viewId = crypto.randomUUID();
      const viewKey = `custom_${viewId}`; // カスタムビュー用の一意のview_keyを生成

      // カスタムビューの作成
      const viewResult = await client.query(`
        INSERT INTO custom_focus_views (
          id,
          user_id,
          name,
          filter_due,
          filters_importance,
          filters_hurdle
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        ) RETURNING *
      `, [
        viewId,
        userId,
        name,
        filter_due || null,  // 空文字列の場合はnull
        JSON.stringify(filters_importance || []),
        JSON.stringify(filters_hurdle || [])
      ]);

      // focus_view_settingsの作成
      await client.query(`
        INSERT INTO focus_view_settings (
          user_id,
          view_key,
          label,
          visible,
          view_order
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )
      `, [
        userId,
        viewKey,
        name,
        1, // デフォルトで表示
        focus_view_limit || 1 // デフォルトの表示順
      ]);

      // user_settingsのfocus_view_limitを更新
      if (typeof focus_view_limit === 'number') {
        await client.query(`
          UPDATE user_settings
          SET focus_view_limit = $1
          WHERE user_id = $2
        `, [focus_view_limit, userId]);
      }

      await client.query('COMMIT');

      // レスポンスデータの整形
      const createdView = viewResult.rows[0];
      res.status(201).json({
        ...createdView,
        view_key: viewKey,
        filter_due: createdView.filter_due || '',
        filters_importance: JSON.parse(createdView.filters_importance),
        filters_hurdle: JSON.parse(createdView.filters_hurdle)
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ カスタムビュー作成エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
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

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // custom_プレフィックスを除去
      const cleanViewId = viewId.startsWith('custom_') ? viewId.slice(7) : viewId;
      console.log('リクエストされたID:', viewId);
      console.log('クリーンなID:', cleanViewId);
      console.log('ユーザーID:', userId);

      // カスタムビューの存在確認
      const viewCheck = await client.query(`
        SELECT id FROM custom_focus_views
        WHERE id = $1 AND user_id = $2
      `, [cleanViewId, userId]);

      console.log('存在確認結果:', viewCheck.rows);

      if (viewCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'カスタムビューが見つかりません' });
      }

      // カスタムビューの更新
      const result = await client.query(`
        UPDATE custom_focus_views
        SET 
          name = $1,
          filter_due = $2,
          filters_importance = $3,
          filters_hurdle = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND user_id = $6
        RETURNING *
      `, [
        name,
        filter_due || null,
        JSON.stringify(filters_importance || []),
        JSON.stringify(filters_hurdle || []),
        cleanViewId,
        userId
      ]);

      // focus_view_settingsのラベルも更新
      await client.query(`
        UPDATE focus_view_settings
        SET 
          label = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE view_key = $2 AND user_id = $3
      `, [name, `custom_${cleanViewId}`, userId]);

      await client.query('COMMIT');

      // レスポンスデータの整形
      const updatedView = result.rows[0];
      res.json({
        id: updatedView.id,
        name: updatedView.name,
        filters: {
          due: updatedView.filter_due ? [updatedView.filter_due] : [],
          importance: JSON.parse(updatedView.filters_importance || '[]'),
          hurdle: JSON.parse(updatedView.filters_hurdle || '[]')
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ カスタムビュー更新エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// カスタムビューの削除
app.delete('/custom-views/:id', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const viewId = req.params.id;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // custom_プレフィックスを除去
      const cleanViewId = viewId.startsWith('custom_') ? viewId.slice(7) : viewId;
      console.log('リクエストされたID:', viewId);
      console.log('クリーンなID:', cleanViewId);
      console.log('ユーザーID:', userId);

      // フォーカスビュー設定の削除
      await client.query(`
        DELETE FROM focus_view_settings
        WHERE view_key = $1 AND user_id = $2
      `, [`custom_${cleanViewId}`, userId]);

      // カスタムビューの削除
      const result = await client.query(`
        DELETE FROM custom_focus_views
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [cleanViewId, userId]);

      if (result.rowCount === 0) {
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
  } catch (err) {
    console.error('❌ カスタムビュー削除エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// ユーザー設定の更新
app.patch('/user-settings', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const updates = req.body;

  try {
    const client = await pool.connect();
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const key in updates) {
        // viewModeを"viewMode"に変換
        const fieldName = key === 'viewMode' ? '"viewMode"' : key;
        
        // Boolean値をIntegerに変換
        let value = updates[key];
        if (typeof value === 'boolean' || value === 'true' || value === 'false') {
          value = value === true || value === 'true' ? 1 : 0;
        }
        
        fields.push(`${fieldName} = $${idx}`);
        values.push(value);
        idx++;
      }
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);
      const sql = `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = $${idx} RETURNING *`;
      const result = await client.query(sql, values);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'ユーザー設定が見つかりません' });
      }
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ ユーザー設定更新エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// viewModeの更新用エンドポイント
app.patch('/user-settings/view-mode', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { viewMode } = req.body;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE user_settings
        SET 
          "viewMode" = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
        RETURNING *
      `, [viewMode, userId]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'ユーザー設定が見つかりません' });
      }

      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ viewMode更新エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// メディケーションモードの更新
app.patch('/user-settings/medication-effect-mode', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { is_medication_taken, effect_start_time, effect_duration_minutes, time_to_max_effect_minutes, time_to_fade_minutes } = req.body;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE user_settings
        SET 
          is_medication_taken = $1,
          effect_start_time = $2,
          effect_duration_minutes = $3,
          time_to_max_effect_minutes = $4,
          time_to_fade_minutes = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6
        RETURNING *
      `, [
        is_medication_taken ? 1 : 0,
        effect_start_time,
        effect_duration_minutes,
        time_to_max_effect_minutes,
        time_to_fade_minutes,
        userId
      ]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'ユーザー設定が見つかりません' });
      }

      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ メディケーションモード更新エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// タスクの並び替え
app.patch('/tasks/reorder', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { tasks } = req.body;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const task of tasks) {
        await client.query(`
          UPDATE tasks
          SET child_order = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND user_id = $3 AND is_deleted = 0
        `, [task.child_order, task.id, userId]);
      }
      await client.query('COMMIT');
      res.json({ message: 'タスクの並び替えが完了しました' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ タスク並び替えエラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// タスクの進捗更新
app.patch('/tasks/:id/progress', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const taskId = req.params.id;
  const { progress } = req.body;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE tasks
        SET progress = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3 AND is_deleted = 0
        RETURNING *
      `, [progress, taskId, userId]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'タスクが見つかりません' });
      }
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ タスク進捗更新エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// 子タスクの取得
app.get('/tasks/:id/subtasks', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const parentId = req.params.id;

  try {
    const result = await pool.query(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.is_default as category_is_default
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.parent_task_id = $2 AND t.is_deleted = 0
      ORDER BY t.child_order ASC
    `, [userId, parentId]);

    const subtasks = result.rows.map(task => ({
      ...task,
      category: task.category_id ? {
        id: task.category_id,
        name: task.category_name,
        color: task.category_color,
        is_default: task.category_is_default
      } : null
    }));

    res.json(subtasks);
  } catch (err) {
    console.error('❌ 子タスク取得エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// タスクの一括更新
app.patch('/tasks/bulk-update', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { taskIds, updates } = req.body;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const key in updates) {
        fields.push(`${key} = $${idx}`);
        values.push(updates[key]);
        idx++;
      }
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(taskIds);
      values.push(userId);
      const sql = `
        UPDATE tasks
        SET ${fields.join(', ')}
        WHERE id = ANY($${idx}) AND user_id = $${idx + 1} AND is_deleted = 0
        RETURNING *
      `;
      const result = await client.query(sql, values);
      await client.query('COMMIT');
      res.json(result.rows);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ タスク一括更新エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// メディケーション設定の取得
app.get('/user-settings/medication-config', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;

  try {
    const result = await pool.query(`
      SELECT 
        medication_effect_mode_on,
        is_medication_taken,
        effect_start_time,
        effect_duration_minutes,
        time_to_max_effect_minutes,
        time_to_fade_minutes
      FROM user_settings
      WHERE user_id = $1
    `, [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'ユーザー設定が見つかりません' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ メディケーション設定取得エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// メディケーション設定の更新
app.patch('/user-settings/medication-config', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const { 
    medication_effect_mode_on,
    is_medication_taken,
    effect_start_time,
    effect_duration_minutes,
    time_to_max_effect_minutes,
    time_to_fade_minutes
  } = req.body;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE user_settings
        SET 
          is_medication_taken = $1,
          effect_start_time = $2,
          effect_duration_minutes = $3,
          time_to_max_effect_minutes = $4,
          time_to_fade_minutes = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6
        RETURNING *
      `, [
        is_medication_taken ? 1 : 0,
        effect_start_time,
        effect_duration_minutes,
        time_to_max_effect_minutes,
        time_to_fade_minutes,
        userId
      ]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'ユーザー設定が見つかりません' });
      }

      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ メディケーションモード更新エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// カスタムビューの詳細取得
app.get('/custom-views/:id', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const userId = req.user.uid;
  const viewId = req.params.id;

  try {
    const client = await pool.connect();
    try {
      // custom_プレフィックスを除去
      const cleanViewId = viewId.startsWith('custom_') ? viewId.slice(7) : viewId;
      console.log('リクエストされたID:', viewId);
      console.log('クリーンなID:', cleanViewId);
      console.log('ユーザーID:', userId);

      // カスタムビューの情報を取得
      const result = await client.query(`
        SELECT 
          cfv.id,
          cfv.name,
          cfv.filter_due,
          cfv.filters_importance,
          cfv.filters_hurdle,
          cfv.created_at,
          cfv.updated_at,
          fvs.view_key,
          fvs.visible,
          fvs.view_order
        FROM custom_focus_views cfv
        LEFT JOIN focus_view_settings fvs ON fvs.view_key = CONCAT('custom_', cfv.id)
        WHERE cfv.id = $1 AND cfv.user_id = $2
      `, [cleanViewId, userId]);

      console.log('クエリ結果:', result.rows);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'カスタムビューが見つかりません' });
      }

      // レスポンスデータの整形
      const view = result.rows[0];
      
      // フィルター情報のパース
      const filterDue = view.filter_due ? [view.filter_due] : [];
      const filtersImportance = Array.isArray(view.filters_importance) 
        ? view.filters_importance 
        : JSON.parse(view.filters_importance || '[]');
      const filtersHurdle = Array.isArray(view.filters_hurdle)
        ? view.filters_hurdle
        : JSON.parse(view.filters_hurdle || '[]');

      // フロントエンドの期待する形式に整形
      const formattedView = {
        id: view.id,
        name: view.name,
        filters: {
          due: filterDue,
          importance: filtersImportance,
          hurdle: filtersHurdle
        }
      };

      console.log('カスタムビュー詳細:', {
        id: view.id,
        name: view.name,
        filters: formattedView.filters
      });

      res.json(formattedView);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ カスタムビュー詳細取得エラー:', err);
    res.status(500).json({ error: 'サーバーエラー', details: err });
  }
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({ 
    message: 'TaskFocus Server is running',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// エラーハンドリング
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('アプリケーションエラー:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// サーバーの起動
const PORT = parseInt(process.env.PORT || '3001', 10);
console.log(`Starting server on port: ${PORT}`);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ サーバーが起動しました: http://0.0.0.0:${PORT}`);
});