import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../lib/useAppStore';
import FocusTime from '../../components/FocusTime';
import { Task } from '../../types/task';
import SettingsDisplayDrawer from '../../components/ui/SettingsDisplayDrawer';
import { userSettingsApi } from '../../lib/api';
import TodayTaskItem from '../../components/TodayTaskItem';
import { toast } from 'react-toastify';

const Today: React.FC = () => {
  const tasks = useAppStore(s => s.tasks);
  const updateTask = useAppStore(s => s.updateTask);
  const userSettings = useAppStore(s => s.userSettings);
  const [sortBy, setSortBy] = useState<'deadline' | 'hurdle' | 'importance'>(() => {
    // ユーザー設定のdefault_sort_optionに基づいて初期値を設定
    const defaultSort = userSettings?.default_sort_option;
    if (defaultSort === 'hurdle') return 'hurdle';
    if (defaultSort === 'importance') return 'importance';
    return 'deadline'; // デフォルトは期限順
  });
  const [hurdleSortState, setHurdleSortState] = useState<'none' | 'asc' | 'desc'>('none');
  const [importanceSortState, setImportanceSortState] = useState<'none' | 'asc' | 'desc'>('none');
  const [showCompleted, setShowCompleted] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<{
    show_hurdle: boolean;
    show_importance: boolean;
    show_deadline_alert: boolean;
    show_category: boolean;
  } | null>(null);
  const fetchChildTasksRef = useRef<() => void>(() => {});

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTasks = tasks.filter(task => task.is_today_task);
  const incompleteTasks = todayTasks.filter(t => t.status !== 'completed' && t.parent_task_id == null);
  const completedTasks = todayTasks.filter(t => {
    if (t.status !== 'completed' || t.parent_task_id != null) return false;
    if (!t.completed_at) return false;
    const completedAt = new Date(t.completed_at);
    completedAt.setHours(0, 0, 0, 0);
    return completedAt.getTime() === today.getTime();
  });

  useEffect(() => {
    userSettingsApi.getUserSettings().then(settings => {
      setDisplaySettings({
        show_hurdle: !!settings.show_hurdle,
        show_importance: !!settings.show_importance,
        show_deadline_alert: !!settings.show_deadline_alert,
        show_category: !!settings.show_category
      });
    });
  }, [isDrawerOpen]);

  const handleSaveDisplaySettings = async (settings: typeof displaySettings) => {
    if (!settings) return;
    await userSettingsApi.updateDisplaySettings(settings);
    setDisplaySettings(settings);
  };

  const sortedIncomplete = [...incompleteTasks].sort((a, b) => {
    if (sortBy === 'deadline') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    } else if (sortBy === 'hurdle') {
      const hurdleA = a.hurdle_level || 1;
      const hurdleB = b.hurdle_level || 1;
      return hurdleSortState === 'asc' ? hurdleA - hurdleB : hurdleB - hurdleA;
    } else if (sortBy === 'importance') {
      const impOrder: Record<'low' | 'medium' | 'high', number> = { low: 1, medium: 2, high: 3 };
      const impA = impOrder[a.importance as 'low' | 'medium' | 'high'] || 2;
      const impB = impOrder[b.importance as 'low' | 'medium' | 'high'] || 2;
      return importanceSortState === 'asc' ? impA - impB : impB - impA;
    }
    return 0;
  });

  const sortedCompleted = [...completedTasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
  });

  const getCongratMessage = (task: Task) => {
    const now = new Date();
    const hour = now.getHours();

    // 時間帯による特別メッセージ
    if (hour >= 5 && hour < 9) {
      return '朝からエライ！素晴らしいスタートです☀️';
    }
    if (hour >= 21 || hour < 5) {
      return '遅くまでお疲れ様！ゆっくり休んでください🌙';
    }

    // 重要度・ハードル優先
    if (task.importance === 'high') {
      return '重要タスク完了！本当にお疲れさまです！';
    }
    if (task.hurdle_level === 3) {
      return '難しいタスクをやりきりましたね！素晴らしい！';
    }

    // ランダムメッセージ
    const messages = [
      'お疲れさま！タスク完了です！',
      'よく頑張りました！',
      '素晴らしい！次もこの調子！',
      'タスクを終えましたね、休憩も大事です！',
      '完了おめでとうございます！'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const now = new Date();
    await updateTask(task.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? now : undefined
    });
    if (newStatus === 'completed') {
      toast(getCongratMessage(task));
    }
  };

  const handleRemoveFromToday = async (task: Task) => {
    await updateTask(task.id, { is_today_task: false });
  };

  const handleEditTaskUpdate = async (taskId: number, updates: Partial<Task>) => {
    const { category, ...rest } = updates;
    await updateTask(taskId, rest);
  };

  if (!displaySettings) return null;

  return (
    <>
      {userSettings?.medication_effect_mode_on === 1 && <FocusTime />}
      <div style={{ 
        fontSize: '0.9em', 
        color: '#666',
        padding: '12px 16px',
        backgroundColor: '#F8F9FA',
        borderRadius: '8px',
        textAlign: 'center',
        margin: '0 0 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {(() => {
          const incompleteCount = incompleteTasks.length;  // 未完了のタスク数
          const todayCompletedCount = completedTasks.length;  // 今日完了したタスク数
          const totalTasks = incompleteCount + todayCompletedCount;  // 今日のタスク全体
          const completionRate = totalTasks === 0 ? 0 : (todayCompletedCount / totalTasks) * 100;

          if (totalTasks === 0) {
            const now = new Date();
            const hour = now.getHours();
            
            if (hour < 12) {
              return "今日のタスクを追加して、新しい一日を始めましょう！";
            } else if (hour < 18) {
              return "今日のタスクを追加して、残りの時間を有効に使いましょう！";
            } else {
              return "明日のタスクを追加して、準備を整えましょう！";
            }
          }

          if (completionRate === 0) {
            return "一歩一歩、着実に進めていきましょう！";
          }

          if (completionRate < 25) {
            return `最初の一歩を踏み出せましたね！${todayCompletedCount}件完了！この調子で頑張りましょう！`;
          }

          if (completionRate < 50) {
            return `順調に進んでいます！${todayCompletedCount}件完了！このペースをキープしましょう！`;
          }

          if (completionRate < 75) {
            return `半分以上完了！${todayCompletedCount}件完了！素晴らしい進捗です！`;
          }

          if (completionRate < 100) {
            return `あと少し！${todayCompletedCount}件完了！最後まで頑張りましょう！`;
          }

          return `全てのタスクを完了！${todayCompletedCount}件完了！素晴らしい一日でした！`;
        })()}
      </div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="section-title">今日のタスク</h2>
        {/* <button onClick={() => setIsDrawerOpen(true)} className="text-gray-500 hover:text-blue-500 text-base p-0.5">⚙️</button> */}
      </div>
      <div className="sort-controls flex justify-end items-center gap-2 mb-4">
        <button className={`sort-button${sortBy === 'deadline' ? ' active' : ''}`} onClick={() => setSortBy('deadline')}>期限</button>
        {displaySettings.show_hurdle && (
          <button className={`sort-button${sortBy === 'hurdle' ? ' active' : ''}`} onClick={() => {
            if (sortBy !== 'hurdle') {
              setSortBy('hurdle');
              setHurdleSortState('asc');
            } else {
              setHurdleSortState(hurdleSortState === 'asc' ? 'desc' : 'asc');
            }
          }}>
            {hurdleSortState === 'asc' && sortBy === 'hurdle' ? 'ハードル ▲' : hurdleSortState === 'desc' ? 'ハードル ▼' : 'ハードル'}
          </button>
        )}
        {displaySettings.show_importance && (
          <button className={`sort-button${sortBy === 'importance' ? ' active' : ''}`} onClick={() => {
            if (sortBy !== 'importance') {
              setSortBy('importance');
              setImportanceSortState('asc');
            } else {
              setImportanceSortState(importanceSortState === 'asc' ? 'desc' : 'asc');
            }
          }}>
            {importanceSortState === 'asc' && sortBy === 'importance' ? '重要度 ▲' : importanceSortState === 'desc' ? '重要度 ▼' : '重要度'}
          </button>
        )}
      </div>
      <div className="task-list-container">
        {sortedIncomplete.length === 0 ? (
          <div className="text-center py-8 text-gray-500">今日のタスクはありません</div>
        ) : (
          sortedIncomplete.map(task => (
            <TodayTaskItem
              key={task.id}
              task={task}
              displaySettings={displaySettings}
              onToggle={handleToggle}
              onRemoveFromToday={handleRemoveFromToday}
              onTaskUpdate={handleEditTaskUpdate}
              fetchChildTasksRef={fetchChildTasksRef}
              getCongratMessage={getCongratMessage}
            />
          ))
        )}
      </div>
      {sortedCompleted.length > 0 && (
        <div className="mt-4">
          <button
            className="w-full flex items-center justify-between text-base font-semibold mb-2 px-2 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors text-gray-500 border border-gray-100"
            onClick={() => setShowCompleted(v => !v)}
          >
            <span>完了したタスク</span>
            <span className="ml-2">{showCompleted ? '▲' : '▼'}</span>
          </button>
          {showCompleted && (
            <div className="task-list-container">
              {sortedCompleted.map(task => (
                <TodayTaskItem
                  key={task.id}
                  task={task}
                  displaySettings={displaySettings}
                  onToggle={handleToggle}
                  onRemoveFromToday={handleRemoveFromToday}
                  onTaskUpdate={handleEditTaskUpdate}
                  fetchChildTasksRef={fetchChildTasksRef}
                  getCongratMessage={getCongratMessage}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ height: '20px', backgroundColor: '#F8F9FA' }}></div>
      <SettingsDisplayDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialSettings={displaySettings}
        onSave={handleSaveDisplaySettings}
      />
    </>
  );
};

export default Today;