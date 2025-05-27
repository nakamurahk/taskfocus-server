import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { Task } from '../types/task';
import { formatDateForDisplay } from '../utils/dateUtils';
import { parseISO } from 'date-fns';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { Fragment } from 'react';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import EditTaskModal from '../components/EditTaskModal';
import DeleteTaskModal from '../components/DeleteTaskModal';
import { useSwipeable } from 'react-swipeable';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { taskApi } from '../lib/api';
import { HurdleEmoji } from '../components/HurdleEmoji';
import { useLongPress } from '../hooks/useLongPress';
import { useGestureReducer } from '../hooks/useGestureReducer';

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
  from?: 'list' | 'today';
}

const useTaskClick = ({
  task,
  onToggle,
  onTaskUpdate
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onTaskUpdate?: (taskId: number, updates: Partial<Task> & { category?: string }) => Promise<void>;
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState<boolean>(false);

  useEffect(() => {
    const fetchChildTasks = async () => {
      if (isExpanded && !task.parent_task_id) {
        setIsLoadingChildren(true);
        try {
          const tasks = await taskApi.getTasks();
          const children = tasks.filter((t: Task) => t.parent_task_id === task.id);
          setChildTasks(children);
        } catch (error) {
          console.error('Error fetching child tasks:', error);
        } finally {
          setIsLoadingChildren(false);
        }
      }
    };
    fetchChildTasks();
  }, [isExpanded, task.id, task.parent_task_id]);

  const handleTaskClick = () => {
    if (!task.parent_task_id) {
      setIsExpanded(prev => !prev);
    } else {
      onToggle(task);
    }
  };

  const handleChildToggle = async (childTask: Task) => {
    await onToggle(childTask);
    setChildTasks(prev =>
      prev.map((t: Task) =>
        t.id === childTask.id
          ? { ...t, status: childTask.status === 'completed' ? 'pending' : 'completed' }
          : t
      )
    );
    const updatedChildren = childTasks.map((t: Task) =>
      t.id === childTask.id
        ? { ...t, status: childTask.status === 'completed' ? 'pending' : 'completed' }
        : t
    );
    const allCompleted = updatedChildren.length > 0 && updatedChildren.every((t: Task) => t.status === 'completed');
    if (allCompleted && task.status !== 'completed') {
      await onToggle(task);
    }
  };

  return {
    isExpanded,
    setIsExpanded,
    childTasks,
    setChildTasks,
    isLoadingChildren,
    setIsLoadingChildren,
    handleTaskClick,
    handleChildToggle
  };
};

const TasksTaskItem: React.FC<TasksTaskItemProps> = ({ 
  task, 
  disableSwipe = false, 
  displaySettings,
  onTaskUpdate,
  onTaskDelete,
  onTaskToggle,
  from = 'list'
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const updateTask = useAppStore(s => s.updateTask);
  const { userSettings } = useAppStore();
  const isCompleted = task.status === 'completed';

  const { state, gestureHandlers } = useGestureReducer({
    onTap: () => {
      // GPTによるタスク分解機能を一時的に無効化
      // setIsExpanded(prev => !prev)
    },
    onLongPress: () => {
      if (!isCompleted) setIsEditModalOpen(true);
    },
    onSwipe: (dir) => {
      if (dir === 'right') {
        toast.success(`「${task.name}」を今日のタスクに追加しました`, {
          id: `task-${task.id}-add`,
        });
        handleAddToToday();
      } else if (dir === 'left') {
        setIsDeleteModalOpen(true);
      }
    }
  });

  useEffect(() => {
    if (displaySettings) {
      setIsLoading(false);
    }
  }, [displaySettings]);

  useEffect(() => {
    const fetchChildTasks = async () => {
      if (isExpanded && !task.parent_task_id) {
        setIsLoadingChildren(true);
        try {
          const tasks = await taskApi.getTasks();
          const children = tasks.filter((t: Task) => t.parent_task_id === task.id);
          setChildTasks(children);
        } catch (error) {
          console.error('Error fetching child tasks:', error);
        } finally {
          setIsLoadingChildren(false);
        }
      }
    };
    fetchChildTasks();
  }, [isExpanded, task.id, task.parent_task_id]);

  const handleAddToToday = async () => {
    try {
      await updateTask(task.id, { is_today_task: true }); // ← これで状態がContextまで反映
      toast.success(`「${task.name}」を今日のタスクに追加`, {
        id: `task-${task.id}-add`,
      });
    } catch (error) {
      console.error('Error adding task to today:', error);
      toast.error('タスクの追加に失敗しました');
    }
  };

  const handleChildToggle = async (childTask: Task) => {
    await onTaskToggle(childTask.id, childTask.status !== 'completed');
    setChildTasks(prev =>
      prev.map((t: Task) =>
        t.id === childTask.id
          ? { ...t, status: childTask.status === 'completed' ? 'pending' : 'completed' }
          : t
      )
    );
    const updatedChildren = childTasks.map((t: Task) =>
      t.id === childTask.id
        ? { ...t, status: childTask.status === 'completed' ? 'pending' : 'completed' }
        : t
    );
    const allCompleted = updatedChildren.length > 0 && updatedChildren.every((t: Task) => t.status === 'completed');
    if (allCompleted && task.status !== 'completed') {
      await onTaskToggle(task.id, true);
    }
  };

  if (!displaySettings) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="task-content relative animate-pulse">
        <div className="task-details flex-1 min-w-0">
          <div className="task-main-info">
            <div className="task-title">
              <span className="inline-block w-12 h-4 bg-gray-200 rounded"></span>
              <span className="inline-block w-32 h-4 bg-gray-200 rounded ml-2"></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`task-content${isCompleted ? ' bg-gray-50' : ''}`}
        {...gestureHandlers}
        // onClick={() => setIsExpanded(prev => !prev)}  // GPTによるタスク分解機能を一時的に無効化
        style={{ 
          borderLeftColor: displaySettings?.show_category ? (task.category?.color || '#FFD93D') : 'transparent',
          borderLeftWidth: displaySettings?.show_category ? '4px' : '0',
          opacity: isCompleted ? 0.6 : 1,
          filter: isCompleted ? 'grayscale(100%)' : 'none',
          transition: state.actionLocked
            ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s, box-shadow 0.3s'
            : 'none',
          transform: `translateX(${state.swipeDistance}px) scale(${state.gestureType === 'swipe' ? 0.98 : 1})`,
          backgroundColor: state.gestureType === 'swipe' 
            ? (state.swipeDistance >= 0 ? '#E8F5E9' : '#FFF3E0') 
            : undefined,
          boxShadow: state.gestureType === 'swipe' 
            ? `0 4px 10px rgba(0,0,0,${Math.min(Math.abs(state.swipeDistance) / 200, 0.2)})` 
            : 'none'
        }}
      >
        <div className="parent-info" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <span className={`task-title ${isCompleted ? 'line-through text-gray-500' : ''}`} style={{ flex: 1 }}>
            {task.due_date && (
              <span className={`text-xs font-bold mr-1 align-middle task-date ${
                new Date(task.due_date).toDateString() === new Date().toDateString() ? 'today' :
                new Date(task.due_date) < new Date() ? 'overdue' : 'future'
              }`}>
                {format(new Date(task.due_date), 'MM/dd')}
              </span>
            )}
            {task.name}
          </span>
          {/* ハードル */}
          {displaySettings?.show_hurdle && (
            <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-bold mr-2" style={{ color: '#616161', background: '#F5F5F5', border: '1px solid #BDBDBD' }}>
              <HurdleEmoji level={task.hurdle_level || 1} />
            </span>
          )}
          {/* 重要度バッジ */}
          {displaySettings?.show_importance && task.importance === 'high' && (
            <span className="px-1 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200 mr-2">高</span>
          )}
          {displaySettings?.show_importance && task.importance === 'medium' && (
            <span className="px-1 py-0.5 rounded-full text-xs font-bold mr-2" style={{ background: '#FFECB3', border: '1px solid #FBC02D', color: '#A67C00' }}>中</span>
          )}
          {displaySettings?.show_importance && task.importance === 'low' && (
            <span className="px-1 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-500 border border-gray-200 mr-2">低</span>
          )}
        </div>
        {/* 子タスクリスト（blockで下に展開） */}
        {isExpanded && (
          <div className="child-tasks-list" style={{ display: 'block', width: '100%' }}>
            {isLoadingChildren ? (
              <div className="text-sm text-gray-500 py-2 px-4">読み込み中...</div>
            ) : childTasks.length > 0 ? (
              childTasks.map(childTask => (
                <div key={childTask.id} className="child-task-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <label style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer' }}>
                    {from === 'today' && (
                      <input
                        type="checkbox"
                        checked={childTask.status === 'completed'}
                        onChange={() => handleChildToggle(childTask)}
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <span className={childTask.status === 'completed' ? 'line-through text-gray-400' : ''}>{childTask.name}</span>
                  </label>
                  <span className="ml-2 text-xs text-gray-400">{childTask.estimated_duration_minutes ? `${childTask.estimated_duration_minutes}分` : '--分'}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 py-2 px-4">子タスクはありません</div>
            )}
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <EditTaskModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          task={task}
          onTaskUpdate={onTaskUpdate}
          from="list"
        />
      )}

      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={() => setIsDeleteModalOpen(false)}>
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-30" />
            </Transition.Child>

            <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>

            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  タスクの削除
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    「{task.name}」を削除してもよろしいですか？
                  </p>
                </div>

                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={() => setIsDeleteModalOpen(false)}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                    onClick={() => {
                      onTaskDelete(task.id);
                      setIsDeleteModalOpen(false);
                      toast.success('タスクを削除しました');
                    }}
                  >
                    削除
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default TasksTaskItem; 