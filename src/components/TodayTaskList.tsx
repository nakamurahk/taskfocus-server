import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { taskApi } from '../lib/api';
import TodayTaskItem from './TodayTaskItem';
import { Task } from '../types/task';
import type { AppState } from '../lib/useAppStore';

interface TodayTaskListProps {
  title?: string;
  tasks?: Task[];
  onAddTaskClick: () => void;
  displaySettings?: {
    show_hurdle: boolean;
    show_importance: boolean;
    show_deadline_alert: boolean;
    show_category: boolean;
  };
  onSettingsClick?: () => void;
}

const TodayTaskList: React.FC<TodayTaskListProps> = ({
  title = '今日のタスク',
  tasks: propTasks = [],
  onAddTaskClick,
  displaySettings,
  onSettingsClick
}) => {
  // displaySettingsがundefinedの場合は何も描画しない
  if (!displaySettings) {
    return null;
  }

  // zustandストアからタスク一覧を取得
  const tasks = useAppStore((s: AppState) => s.tasks);
  const setTasks = useAppStore((s: AppState) => s.setTasks);
  const updateTask = useAppStore((s: AppState) => s.updateTask);
  const deleteTask = useAppStore((s: AppState) => s.deleteTask);
  const toggleTask = useAppStore((s: AppState) => s.toggleTask);

  // 初回マウント時、ストアにデータがなければAPIから取得
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const fetchedTasks = await taskApi.getTasks();
        setTasks(fetchedTasks);
      } catch (error) {
        console.error('タスクの取得に失敗しました:', error);
      }
    };

    fetchTasks();
  }, []);

  // タスクの結合とフィルタリング
  const tasksCombined = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(task => {
      if (!task.deadline) return false;
      const taskDate = new Date(task.deadline);
      const today = new Date();
      return taskDate.toDateString() === today.toDateString();
    });
  }, [tasks]);

  const getEncouragementMessage = () => {
    const totalTasks = tasksCombined.length;
    const completedTasks = tasksCombined.filter(t => t.status === 'completed').length;
    const completionRate = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

    if (totalTasks === 0) {
      return "今日のタスクを追加して、新しい一日を始めましょう！";
    }

    if (completionRate === 0) {
      return "一歩一歩、着実に進めていきましょう！";
    }

    if (completionRate < 25) {
      return `最初の一歩を踏み出せましたね！${completedTasks}件完了！この調子で頑張りましょう！`;
    }

    if (completionRate < 50) {
      return `順調に進んでいます！${completedTasks}件完了！このペースをキープしましょう！`;
    }

    if (completionRate < 75) {
      return `半分以上完了！${completedTasks}件完了！素晴らしい進捗です！`;
    }

    if (completionRate < 100) {
      return `あと少し！${completedTasks}件完了！最後まで頑張りましょう！`;
    }

    return `全てのタスクを完了！${completedTasks}件完了！素晴らしい一日でした！`;
  };

  return (
    <div className="today-tasks-container">
      <div className="task-list-header p-4" style={{ width: '100%' }}>
        <div className="header-top">
          <h2 className="section-title">{title}</h2>
          <div className="flex gap-2">
            <button
              onClick={onSettingsClick}
              className="settings-button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAddTaskClick}
            className="add-task-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-600"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            タスクを追加
          </button>
        </div>
      </div>

      <div className="task-list">
        <div style={{ 
          fontSize: '0.9em', 
          color: '#666',
          padding: '12px 16px',
          backgroundColor: '#F8F9FA',
          borderRadius: '8px',
          textAlign: 'center',
          margin: '0 16px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          {getEncouragementMessage()}
        </div>
        {tasksCombined.map(task => (
          <TodayTaskItem
            key={task.id}
            task={task}
            onToggle={toggleTask}
            onRemoveFromToday={deleteTask}
            onTaskUpdate={updateTask}
            displaySettings={displaySettings}
            getCongratMessage={(task) => `「${task.name}」を完了しました！`}
          />
        ))}
      </div>
    </div>
  );
};

export default TodayTaskList; 