import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { taskApi } from '../lib/api';
import TasksTaskItem from './TasksTaskItem';
import { Task } from '../types/task';
import { TasksFilterModal, TaskFilters } from './TasksFilterModal';
import type { AppState } from '../lib/useAppStore';
import { Filter } from 'lucide-react';
import { FunnelIcon } from '@heroicons/react/24/solid';

interface TasksTaskListProps {
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

type SortBy = 'deadline' | 'importance' | 'hurdle';

// TasksTaskItemのprops型を拡張
interface TasksTaskItemProps {
  task: Task;
  disableSwipe?: boolean;
  displaySettings?: {
    show_hurdle: boolean;
    show_importance: boolean;
    show_deadline_alert: boolean;
    show_category: boolean;
  };
  onTaskUpdate: (taskId: number, updates: Partial<Task> & { category?: string }) => Promise<void>;
  onTaskDelete: (taskId: number) => Promise<void>;
  onTaskToggle: (taskId: number, completed: boolean) => Promise<void>;
}

const TasksTaskList: React.FC<TasksTaskListProps> = ({
  title = 'タスク一覧',
  tasks: propTasks = [],
  onAddTaskClick,
  displaySettings,
  onSettingsClick
}) => {
  // displaySettingsがundefinedの場合は何も描画しない
  if (!displaySettings) {
    // ソート・フィルターUIの最低限の表示
    return (
      <div className="bg-[#F0F7FF] rounded-b-lg">
        <div className="task-list-header p-4" style={{ width: '100%' }}>
          <div className="flex gap-2 items-center w-full">
            <div className="flex gap-2 flex-1">
              <button className="sort-button">期限</button>
              <button className="sort-button">ハードル</button>
              <button className="sort-button">重要度</button>
            </div>
            <button className="filter-button">
              <FunnelIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="task-list px-4">
          <div className="p-8 text-center text-gray-400">
            タスクがありません。<br />
            右下のボタンからタスクを登録してタスク管理を楽しんでくださいね。
          </div>
        </div>
      </div>
    );
  }

  // zustandストアからタスク一覧を取得
  const tasks = useAppStore((s: AppState) => s.tasks);
  const setTasks = useAppStore((s: AppState) => s.setTasks);
  const updateTask = useAppStore((s: AppState) => s.updateTask);
  const deleteTask = useAppStore((s: AppState) => s.deleteTask);
  const toggleTask = useAppStore((s: AppState) => s.toggleTask);
  const userSettings = useAppStore((s: AppState) => s.userSettings);

  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!fetched && displaySettings) {
      taskApi.getTasks().then(tasks => {
        setTasks(tasks);
        setFetched(true);
      }).catch(console.error);
    }
  }, [fetched, setTasks, displaySettings]);

  // タスクの結合とフィルタリング
  const tasksCombined = useMemo(() => {
    if (!tasks) return [];
    return tasks;
  }, [tasks]);

  // 親タスクのみをフィルタリング
  const parentTasks = useMemo(() => {
    return tasksCombined.filter(task => !task.parent_task_id);
  }, [tasksCombined]);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    // ユーザー設定のdefault_sort_optionに基づいて初期値を設定
    const defaultSort = userSettings?.default_sort_option;
    if (defaultSort === 'hurdle') return 'hurdle';
    if (defaultSort === 'importance') return 'importance';
    return 'deadline'; // デフォルトは期限順
  });
  const [hurdleSortState, setHurdleSortState] = useState<'none' | 'asc' | 'desc'>('none');
  const [importanceSortState, setImportanceSortState] = useState<'none' | 'asc' | 'desc'>('none');
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'incomplete',
    category: 'all',
    priority: 'all'
  });
  const [isLoading, setIsLoading] = useState(true);

  // タスクのフィルタリングとソート処理
  const filteredTasks = useMemo(() => {
    // propsのtasksがあればそれを優先、なければzustandのtasks
    const tasksToUse = propTasks.length > 0 ? propTasks : tasks;
    
    // 子タスクを除外
    const parentTasks = tasksToUse.filter((task: Task) => !task.parent_task_id);
    console.log('親タスクのみ:', parentTasks);

    // フィルタリング処理
    const filtered = parentTasks.filter((task: Task) => {
      if (filters.status === 'completed' && task.status !== 'completed') return false;
      if (filters.status === 'incomplete' && task.status === 'completed') return false;
      if (filters.category !== 'all' && task.category?.name !== filters.category) return false;
      if (filters.priority !== 'all' && task.importance !== filters.priority) return false;
      return true;
    });

    // ソート処理
    if (sortBy === 'deadline') {
      return [...filtered].sort((a: Task, b: Task) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    } else if (sortBy === 'hurdle') {
      return [...filtered].sort((a: Task, b: Task) => {
        const hurdleA = a.hurdle_level || 1;
        const hurdleB = b.hurdle_level || 1;
        
        // ハードルスコアが異なる場合は、ハードルスコアでソート
        if (hurdleA !== hurdleB) {
          return hurdleSortState === 'asc' 
            ? hurdleA - hurdleB  // 昇順
            : hurdleB - hurdleA; // 降順
        }
        
        // ハードルスコアが同じ場合は、期限でソート
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    } else if (sortBy === 'importance') {
      return [...filtered].sort((a: Task, b: Task) => {
        const impOrder: Record<'low' | 'medium' | 'high', number> = { low: 1, medium: 2, high: 3 };
        const impA = impOrder[(a.importance as 'low' | 'medium' | 'high')] || 2;
        const impB = impOrder[(b.importance as 'low' | 'medium' | 'high')] || 2;
        if (impA !== impB) {
          return importanceSortState === 'asc' ? impA - impB : impB - impA;
        }
        // 同じ重要度なら日付が近い順
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    }
    return filtered;
  }, [propTasks, tasks, sortBy, hurdleSortState, importanceSortState, filters]);

  useEffect(() => {
    if (displaySettings) {
      setIsLoading(false);
    }
  }, [displaySettings]);

  // 状態がpendingのタスクが0件かどうかを判定
  const pendingTasksCount = tasks.filter(task => task.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="task-list-header" style={{ width: '100%' }}>
        <div className="header-top">
          <h2 className="section-title">{title}</h2>
          <div className="animate-pulse w-20 h-8 bg-gray-200 rounded"></div>
        </div>
        <div className="flex gap-2 items-center w-full">
          <div className="flex gap-2 flex-1">
            <div className="animate-pulse w-16 h-8 bg-gray-200 rounded"></div>
            <div className="animate-pulse w-20 h-8 bg-gray-200 rounded"></div>
            <div className="animate-pulse w-20 h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="task-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="task-item animate-pulse">
              <div className="task-content relative">
                <div className="task-details flex-1 min-w-0">
                  <div className="task-main-info">
                    <div className="task-title">
                      <span className="inline-block w-12 h-4 bg-gray-200 rounded"></span>
                      <span className="inline-block w-32 h-4 bg-gray-200 rounded ml-2"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#F0F7FF] rounded-b-lg">
        <div className="task-list-header p-4" style={{ width: '100%' }}>
          <div className="flex gap-2 items-center w-full">
            <div className="flex gap-2 flex-1">
              <button
                className={`sort-button ${sortBy === 'deadline' ? 'active' : ''}`}
                onClick={() => setSortBy('deadline')}
              >
                期限
              </button>
              {displaySettings?.show_hurdle && (
                <button
                  className={`sort-button ${sortBy === 'hurdle' ? 'active' : ''}`}
                  onClick={() => {
                    if (sortBy !== 'hurdle') {
                      setSortBy('hurdle');
                      setHurdleSortState('asc');
                    } else {
                      setHurdleSortState(hurdleSortState === 'asc' ? 'desc' : 'asc');
                    }
                  }}
                >
                  {hurdleSortState === 'asc' && sortBy === 'hurdle' ? 'ハードル ▲' : hurdleSortState === 'desc' ? 'ハードル ▼' : 'ハードル'}
                </button>
              )}
              {displaySettings?.show_importance && (
                <button
                  className={`sort-button ${sortBy === 'importance' ? 'active' : ''}`}
                  onClick={() => {
                    if (sortBy !== 'importance') {
                      setSortBy('importance');
                      setImportanceSortState('asc');
                    } else {
                      setImportanceSortState(importanceSortState === 'asc' ? 'desc' : 'asc');
                    }
                  }}
                >
                  {importanceSortState === 'asc' && sortBy === 'importance' ? '重要度 ▲' : importanceSortState === 'desc' ? '重要度 ▼' : '重要度'}
                </button>
              )}
            </div>
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="filter-button"
            >
              <FunnelIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="task-list px-4">
          {filteredTasks.length === 0 ? (
            pendingTasksCount === 0 ? (
              <div className="p-8 text-center text-gray-400">
                タスクがありません。<br />
                右下のボタンからタスクを登録してタスク管理を楽しんでくださいね。
              </div>
            ) : null
          ) : (
            filteredTasks.map(task => (
              <TasksTaskItem
                key={task.id}
                task={task}
                displaySettings={displaySettings}
                onTaskUpdate={updateTask}
                onTaskDelete={deleteTask}
                onTaskToggle={toggleTask}
              />
            ))
          )}
        </div>
        <div style={{ height: '20px' }}></div>
      </div>
      <TasksFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setFilters}
        initialFilters={filters}
      />
    </>
  );
};

export default TasksTaskList; 