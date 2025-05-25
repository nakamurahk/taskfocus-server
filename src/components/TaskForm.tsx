import React, { useState } from 'react';
import { CogIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const TaskForm: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('');
  const [importance, setImportance] = useState<'low' | 'medium' | 'high'>('medium');
  const [hurdle, setHurdle] = useState<1 | 2 | 3>(1);
  const [dueDate, setDueDate] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [onClose, setOnClose] = useState<() => void>(() => {});

  // 詳細設定ボタンのテキストを生成する関数
  const getAdvancedSettingsText = () => {
    const parts = [];
    if (estimatedTime) parts.push(estimatedTime);
    if (importance !== 'medium') {
      const importanceMap = { low: '低', medium: '中', high: '高' };
      parts.push(importanceMap[importance]);
    }
    return parts.length > 0 ? `詳細設定を開く：${parts.join('・')}` : '詳細設定を開く';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      category: selectedCategory,
      importance: importance,
      deadline: deadline ? deadline.toISOString() : null,
      estimated_time: estimatedTime,
      status: isCompleted ? 'completed' : 'pending',
      completed_at: isCompleted ? format(new Date(), 'yyyy-MM-dd HH:mm:ss') : null, // SQLiteのDATETIME形式に合わせる
    };

    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
      } else {
        await addTask(taskData);
      }
      onClose();
    } catch (error) {
      console.error('タスクの保存に失敗しました:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="タスク名を入力"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* 詳細設定ボタン */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-sm text-gray-700 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        <CogIcon className="w-4 h-4 text-gray-500" />
        <span>{getAdvancedSettingsText()}</span>
      </button>

      {/* 詳細設定セクション */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所要時間
            </label>
            <input
              type="text"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              placeholder="例：30分"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              重要度
            </label>
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
      >
        タスクを追加
      </button>
    </form>
  );
};

export default TaskForm; 