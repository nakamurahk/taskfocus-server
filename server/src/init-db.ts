import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const db = new Database('server/data/task_manager.db', { verbose: console.log });

// スキーマファイルの読み込みと実行
const schemaPath = join(__dirname, 'db', 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');
db.exec(schema);

console.log('✅ データベースの初期化が完了しました');

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
    console.log('✅ デフォルトカテゴリーを登録しました');
  }
} catch (err) {
  console.error('❌ デフォルトカテゴリー登録中にエラー:', err);
}

db.close(); 