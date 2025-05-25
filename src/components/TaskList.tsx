import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useAppStore } from '../lib/useAppStore';
import CompletedTasks from './CompletedTasks';
import TaskItem from './TaskItem';
import { addHours } from 'date-fns';
import { isToday } from '../utils/dateUtils';

interface TaskListProps {
  onAddTaskClick: () => void;
  title?: string;
}

const TaskList: React.FC<TaskListProps> = ({ onAddTaskClick, title = '今日のタスク' }) => {
  const tasks = useAppStore(s => s.tasks);
  const toggleTask = useAppStore(s => s.toggleTask);
  const [sortMode, setSortMode] = useState<'AI' | 'manual'>('AI');
  const [sortBy, setSortBy] = useState<'deadline' | 'importance'>('deadline');

  // タスクのメモ化
  const displayTasks = useMemo(() => {
    let sortedTasks = [...tasks];
    
    // ソート条件に基づいて並び替え
    if (sortBy === 'deadline') {
      sortedTasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    } else {
      sortedTasks.sort((a, b) => b.importance - a.importance);
    }

    return sortedTasks.map((task, index) => ({
      ...task,
      originalIndex: index
    }));
  }, [tasks, sortBy]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    reorderTasks(result.source.index, result.destination.index);
  };

  const isTodayTask = (task: Task) => {
    if (!task.completed_at) return false;
    return isToday(task.completed_at);
  };

  const renderTaskItem = (task: any, index: number) => {
    const draggableId = String(task.id);
    
    if (sortMode === 'manual') {
      return (
        <Draggable
          key={draggableId}
          draggableId={draggableId}
          index={index}
        >
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`task-item ${snapshot.isDragging ? 'dragging' : ''}`}
              data-category={task.category}
              data-rbd-draggable-id={draggableId}
            >
              <TaskItem
                task={task}
                onToggle={() => toggleTask(task.id)}
              />
            </div>
          )}
        </Draggable>
      );
    }

    return (
      <div
        key={draggableId}
        className="task-item"
        data-category={task.category}
        style={{
          cursor: 'default',
          pointerEvents: 'auto'
        }}
      >
        <TaskItem
          task={task}
          onToggle={() => toggleTask(task.id)}
        />
      </div>
    );
  };

  return (
    <div className="task-list-container">
      <div className="task-list-header">
        <div className="header-top">
          <h2 className="section-title">{title}</h2>
          <button className="filter-button">
            フィルター
            <span className="dropdown-icon">▼</span>
          </button>
        </div>
        <div className="sort-controls">
          <div className="sort-mode">
            <button
              className={`sort-button ${sortMode === 'AI' ? 'active' : ''}`}
              onClick={() => {
                setSortMode('AI');
                resetToAISort();
              }}
            >
              AI推薦
            </button>
            <button
              className={`sort-button ${sortMode === 'manual' ? 'active' : ''}`}
              onClick={() => setSortMode('manual')}
            >
              手動
            </button>
          </div>
          <div className="sort-by">
            <button
              className={`sort-button ${sortBy === 'deadline' ? 'active' : ''}`}
              onClick={() => setSortBy('deadline')}
            >
              期限
            </button>
            <button
              className={`sort-button ${sortBy === 'importance' ? 'active' : ''}`}
              onClick={() => setSortBy('importance')}
            >
              重要度
            </button>
          </div>
        </div>
      </div>

      {sortMode === 'manual' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="task-list">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="task-list"
                data-rbd-droppable-id="task-list"
              >
                {displayTasks.map((task, index) => renderTaskItem(task, index))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="task-list" style={{ pointerEvents: 'auto' }}>
          {displayTasks.map((task, index) => renderTaskItem(task, index))}
        </div>
      )}

      <CompletedTasks />
      <button className="add-task-button" onClick={onAddTaskClick}>
        <span className="plus-icon">+</span>
      </button>
    </div>
  );
};

export default TaskList; 