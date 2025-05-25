const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../task_database.db'));

db.serialize(() => {
  // カラム名の変更
  db.run('ALTER TABLE tasks RENAME COLUMN completedAt TO completed_at', (err) => {
    if (err) {
      console.error('カラム名の変更に失敗しました:', err);
      return;
    }
  });

  // 日付形式の変換
  db.run(
    'UPDATE tasks SET completed_at = strftime("%Y-%m-%d %H:%M:%S", completed_at) WHERE completed_at IS NOT NULL',
    (err) => {
      if (err) {
        console.error('日付形式の変換に失敗しました:', err);
        return;
      }
    }
  );
});

db.close(); 