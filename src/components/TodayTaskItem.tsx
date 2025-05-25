import React, { useState, useEffect, useRef } from 'react';
import { Task } from '../types/task'; // ✅ 相対パス修正
import { useAppStore } from '../lib/useAppStore';
import { toast } from 'react-hot-toast';
import { HurdleEmoji } from './HurdleEmoji'; // ✅ 同じ components ディレクトリなら ./ でOK
import { taskApi } from '../lib/api'; // ✅ 相対パス修正
import { useGestureReducer } from '../hooks/useGestureReducer'; // ✅ 相対パス修正
import EditTaskModal from './EditTaskModal'; // ✅ 同じ components ディレクトリなら ./ でOK
import { format } from 'date-fns';

interface TodayTaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onRemoveFromToday: (task: Task) => void;
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => Promise<void>;
  displaySettings: {
    show_hurdle: boolean;
    show_importance: boolean;
    show_deadline_alert: boolean;
    show_category: boolean;
  };
  fetchChildTasksRef?: React.MutableRefObject<() => void>;
  getCongratMessage?: (task: Task) => string;
}

const TodayTaskItem: React.FC<TodayTaskItemProps> = ({
  task,
  onToggle,
  onRemoveFromToday,
  onTaskUpdate,
  displaySettings,
  fetchChildTasksRef,
  getCongratMessage
}) => {
  const updateTask = useAppStore(s => s.updateTask);
  const isCompleted = task.status === 'completed';
  const [showEditModal, setShowEditModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

  const { gestureHandlers, state } = useGestureReducer({
    onTap: () => {
      // タップ時の処理は不要
    },
    onLongPress: () => {
      if (!isCompleted) setShowEditModal(true);
    },
    onSwipe: (dir) => {
      if (dir === 'right') {
        handleCompleteWithUndo();
      } else if (dir === 'left') {
        if (isCompleted) {
          updateTask(task.id, { status: 'pending', completed_at: undefined });
        } else {
          onRemoveFromToday(task);
        }
      }
    },
    swipeThreshold: 30,
    resetDelay: 300,
    longPressDelay: 500
  });

  useEffect(() => {
    const fetchChildTasks = async () => {
      if (isExpanded) {
        setIsLoadingChildren(true);
        try {
          const tasks = await taskApi.getTasks();
          const children = tasks.filter(t => t.parent_task_id === task.id);
          setChildTasks(children);

          const notToday = children.filter(t => !t.is_today_task);
          if (notToday.length > 0) {
            await Promise.all(notToday.map(t => updateTask(t.id, { is_today_task: true })));
            const updated = await taskApi.getTasks();
            setChildTasks(updated.filter(t => t.parent_task_id === task.id));
          }
        } catch (e) {
          console.error('Failed to load child tasks:', e);
        } finally {
          setIsLoadingChildren(false);
        }
      }
    };
    fetchChildTasks();
    if (fetchChildTasksRef) fetchChildTasksRef.current = fetchChildTasks;
  }, [isExpanded, task.id]);

  const handleChildToggle = async (child: Task) => {
    await onTaskUpdate(child.id, { status: child.status === 'completed' ? 'pending' : 'completed' });
    setChildTasks(prev => prev.map(t =>
      t.id === child.id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    ));
  };

  const handleCompleteWithUndo = async () => {
    const now = new Date();
    await updateTask(task.id, { status: 'completed', completed_at: now });
    toast.success(
      <span>
        {getCongratMessage ? getCongratMessage(task) : 'タスクを完了にしました'}
        <button onClick={async () => {
          await updateTask(task.id, { status: 'pending', completed_at: undefined });
          toast.dismiss();
        }} style={{ marginLeft: 12, textDecoration: 'underline', background: 'none', border: 'none', color: '#197FE5', cursor: 'pointer' }}>
          元に戻す
        </button>
      </span>,
      { duration: 4000, id: `task-${task.id}-swipe-toast` }
    );
  };

  return (
    <>
      <div
        {...gestureHandlers}
        className={`task-content${isCompleted ? ' bg-gray-50' : ''}`}
        style={{
          borderLeftColor: displaySettings.show_category ? (task.category?.color || '#FFD93D') : 'transparent',
          borderLeftWidth: displaySettings.show_category ? '4px' : '0',
          opacity: isCompleted ? 0.6 : 1,
          filter: isCompleted ? 'grayscale(100%)' : 'none',
          transition: state.actionLocked
            ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s, box-shadow 0.3s'
            : 'none',
          transform: `translateX(${state.swipeDistance}px) scale(${
            state.gestureType === 'swipe' ? 0.98 :
            state.gestureType === 'longpress' ? 0.95 :
            1
          })`,
          backgroundColor: state.gestureType === 'swipe' 
            ? (state.swipeDistance >= 0 ? '#E8F5E9' : '#FFF3E0') 
            : state.gestureType === 'longpress'
            ? '#EEEEEE'
            : undefined,
          boxShadow: state.gestureType === 'swipe' 
            ? `0 4px 10px rgba(0,0,0,${Math.min(Math.abs(state.swipeDistance) / 200, 0.2)})` 
            : state.gestureType === 'longpress'
            ? '0 6px 12px rgba(0,0,0,0.2)'
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
          {displaySettings.show_hurdle && (
            <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-bold mr-2" style={{ color: '#616161', background: '#F5F5F5', border: '1px solid #BDBDBD' }}>
              <HurdleEmoji level={task.hurdle_level || 1} />
            </span>
          )}
          {displaySettings.show_importance && task.importance === 'high' && (
            <span className="px-1 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200 mr-2">高</span>
          )}
          {displaySettings.show_importance && task.importance === 'medium' && (
            <span className="px-1 py-0.5 rounded-full text-xs font-bold mr-2" style={{ background: '#FFECB3', border: '1px solid #FBC02D', color: '#A67C00' }}>中</span>
          )}
          {displaySettings.show_importance && task.importance === 'low' && (
            <span className="px-1 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-500 border border-gray-200 mr-2">低</span>
          )}
        </div>

        {isExpanded && !task.parent_task_id && (
          <div className="child-tasks-list" style={{ display: 'block', width: '100%' }}>
            {isLoadingChildren ? (
              <div className="text-sm text-gray-500 py-2 px-4">読み込み中...</div>
            ) : childTasks.length > 0 ? (
              childTasks.map(child => (
                <div key={child.id} className="child-task-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <label style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={child.status === 'completed'}
                      onChange={() => handleChildToggle(child)}
                      style={{ marginRight: 8 }}
                    />
                    <span className={child.status === 'completed' ? 'line-through text-gray-400' : ''}>{child.name}</span>
                  </label>
                  <span className="ml-2 text-xs text-gray-400">{child.estimated_duration_minutes ? `${child.estimated_duration_minutes}分` : '--分'}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 py-2 px-4">子タスクはありません</div>
            )}
          </div>
        )}
      </div>

      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setTimeout(() => fetchChildTasksRef?.current?.(), 100);
        }}
        task={task}
        onTaskUpdate={onTaskUpdate}
        from="today"
      />
    </>
  );
};

export default TodayTaskItem;