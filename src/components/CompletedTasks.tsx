import React from 'react';
import { useTasks } from '../contexts/TaskContext';
import { Task } from '../types/task';
import { toJST, isToday } from '../utils/dateUtils';
import { format } from 'date-fns';

const CompletedTasks: React.FC = () => {
  const { completedTasks, restoreTask, deleteTask } = useTasks();

  const todayTasks = completedTasks.filter(task => {
    if (!task.completed_at) return false;
    const isTodayTask = isToday(task.completed_at);
    if (isTodayTask) {
      console.log('[CompletedTasks] 今日の完了タスク:', {
        id: task.id,
        completed_at: task.completed_at
      });
    }
    return isTodayTask;
  });

  const formatDate = (date: Date) => {
    return format(date, 'MM/dd HH:mm');
  };

  const renderTask = (task: Task) => (
    <div className="completed-task-item" key={task.id}>
      <div className="completed-task-content">
        <span className="completed-task-title">{task.name}</span>
        <span className="completed-task-time">
          {formatDate(toJST(task.completed_at!))}
        </span>
      </div>
      <div className="completed-task-actions">
        <button 
          className="restore-button"
          onClick={() => restoreTask(task.id)}
        >
          復元
        </button>
        <button 
          className="delete-button"
          onClick={() => deleteTask(task.id)}
        >
          削除
        </button>
      </div>
    </div>
  );

  return (
    <div className="completed-tasks-section">
      {todayTasks.length > 0 && (
        <div className="completed-tasks-group">
          <h4 className="completed-tasks-subtitle">今日の完了</h4>
          {todayTasks.map(renderTask)}
        </div>
      )}
    </div>
  );
};

export default CompletedTasks; 