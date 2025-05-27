import React, { useState, useEffect } from 'react';
import { useTasks } from '../../contexts/TaskContext';
import { Task } from '../../types/task';
import TasksTaskList from '../../components/TasksTaskList';
import { TasksFilterModal, TaskFilters } from '../../components/TasksFilterModal';
import QuickAddTaskModal from '../../components/QuickAddTaskModal';
import SettingsDisplayDrawer from '../../components/ui/SettingsDisplayDrawer';
import { FiSettings } from 'react-icons/fi';
import { useAppStore } from '../../lib/useAppStore';
import TasksTaskItem from '../../components/TasksTaskItem';
import FocusViewSection from './FocusViewSection';
import { userSettingsApi } from '../../lib/api';

const Tasks: React.FC = () => {
  const tasks = useAppStore(s => s.tasks);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    category: 'all',
    priority: 'all'
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<{
    show_hurdle: boolean;
    show_importance: boolean;
    show_deadline_alert: boolean;
    show_category: boolean;
  } | null>(null);
  const userSettings = useAppStore(s => s.userSettings);
  const setUserSettings = useAppStore(s => s.setUserSettings);
  const [viewMode, setViewMode] = useState(userSettings?.viewMode ?? 0);
  const toggleTask = useAppStore(s => s.toggleTask);
  const updateTask = useAppStore(s => s.updateTask);
  const deleteTask = useAppStore(s => s.deleteTask);
  const focusViewSettings = useAppStore(s => s.focusViewSettings);
  const focusViewLimit = useAppStore(s => s.focusViewLimit);
  const customFocusViews = useAppStore(s => s.customFocusViews);

  useEffect(() => {
    if (userSettings && userSettings.viewMode !== undefined && userSettings.viewMode !== viewMode) {
      setViewMode(userSettings.viewMode ?? 0);
    }
  }, [userSettings]);

  const handleTabChange = async (mode: number) => {
    setViewMode(mode);
    if (userSettings) {
      setUserSettings({ ...userSettings, viewMode: mode });
      try {
        await userSettingsApi.updateDefaultViewMode(mode);
      } catch (e) {
        console.error('viewModeのDB反映に失敗:', e);
      }
    }
  };

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

  const filteredTasks = tasks.filter(task => {
    if (filters.status !== 'all' && 
        ((filters.status === 'completed' && task.status !== 'completed') || 
         (filters.status === 'incomplete' && task.status === 'completed'))) {
      return false;
    }
    if (filters.category !== 'all' && task.category?.name !== filters.category) {
      return false;
    }
    if (filters.priority !== 'all' && task.importance !== filters.priority) {
      return false;
    }
    return true;
  });

  const handleAddTaskClick = () => {
    setIsAddTaskModalOpen(true);
  };

  if (!displaySettings) {
    return null;
  }

  const tabStyle = (active: boolean, color: string, inactiveColor: string) => ({
    background: active ? color : inactiveColor,
    borderRadius: active ? '8px 8px 0 0' : 8,
    fontWeight: 'bold',
    padding: '8px 20px',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    fontSize: 16,
    transition: 'background 0.2s',
  });

  console.log('focusViewSettings:', focusViewSettings);

  return (
    <div className="px-6 py-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="section-title" style={{ fontSize: 24, fontWeight: 'bold' }}>タスク一覧</h2>
        <button
          style={{
            background: '#F5F5F5',
            borderRadius: 8,
            padding: '8px',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          onClick={() => setIsDrawerOpen(true)}
        >
          {React.createElement(FiSettings as any, { size: 20 })}
        </button>
      </div>
      <div className="flex gap-2">
        <button
          style={tabStyle(viewMode === 0, '#D0E7FF', '#F0F4FA')}
          onClick={() => handleTabChange(0)}
          className="flex-1"
        >
          📋 一覧モード
        </button>
        <button
          style={tabStyle(viewMode === 1, '#FFE4B5', '#FDF6EE')}
          onClick={() => handleTabChange(1)}
          className="flex-1"
        >
          🎯 集中モード
        </button>
      </div>
      {viewMode === 0 ? (
        <>
          {console.log('一覧モードのタスク:', filteredTasks)}
          <TasksTaskList 
            onAddTaskClick={handleAddTaskClick} 
            displaySettings={displaySettings}
          />
          <div style={{ height: '20px', backgroundColor: '#F8F9FA' }}></div>
        </>
      ) : (
        <div style={{ background: '#FFF9F2', borderRadius: 12 }} className="p-4">
          {focusViewSettings
            .filter(v => v.visible)
            .sort((a, b) => a.order - b.order)
            .map((view) => {
              console.log('map内view:', view);
              if (view.key === 'today') {
                console.log('today分岐に入りました:', view);
                return (
                  <FocusViewSection
                    key={view.key}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[#B88B4A]"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    }
                    label={<h3 className="text-[#B88B4A] font-bold text-lg">{view.label}</h3>}
                  >
                    <div className="space-y-3 mb-0 border-t border-neutral-300 mt-4 pt-4">
                      {filteredTasks
                        .filter(task => {
                          console.log('集中モードのタスクフィルタリング:', {
                            id: task.id,
                            name: task.name,
                            status: task.status,
                            parent_task_id: task.parent_task_id,
                            due_date: task.due_date,
                            isToday: (() => {
                              if (!task.due_date) return false;
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const dueDate = new Date(task.due_date);
                              dueDate.setHours(0, 0, 0, 0);
                              return today.getTime() === dueDate.getTime();
                            })()
                          });
                          if (task.status === 'completed') return false;
                          if (task.parent_task_id) return false;
                          if (!task.due_date) return false;
                          
                          // 日本時間に変換
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dueDate = new Date(task.due_date);
                          dueDate.setHours(0, 0, 0, 0);
                          
                          // 日本時間に調整（UTC+9）
                          const jstToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
                          const jstDueDate = new Date(dueDate.getTime() + (9 * 60 * 60 * 1000));
                          
                          return jstToday.getTime() === jstDueDate.getTime();
                        })
                        .slice(0, focusViewLimit)
                        .map(task => (
                          <TasksTaskItem
                            key={task.id}
                            task={task}
                            displaySettings={displaySettings}
                            onTaskUpdate={updateTask}
                            onTaskDelete={deleteTask}
                            onTaskToggle={toggleTask}
                            disableSwipe={true}
                          />
                        ))}
                    </div>
                  </FocusViewSection>
                );
              } else if (view.key === 'deadline') {
                return (
                  <FocusViewSection
                    key={view.key}
                    icon={<span className="text-[#B88B4A] text-2xl">⏰</span>}
                    label={<h3 className="text-[#B88B4A] font-bold text-lg">{view.label}</h3>}
                  >
                    <div className="space-y-3 -mt-2 border-t border-neutral-300 mt-4 pt-4">
                      {filteredTasks
                        .filter(task => {
                          if (task.status === 'completed') return false;
                          if (task.parent_task_id) return false;
                          if (!task.due_date) return false;
                          
                          // 日本時間に変換
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dueDate = new Date(task.due_date);
                          dueDate.setHours(0, 0, 0, 0);
                          
                          // 日本時間に調整（UTC+9）
                          const jstToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
                          const jstDueDate = new Date(dueDate.getTime() + (9 * 60 * 60 * 1000));
                          
                          return jstDueDate < jstToday;
                        })
                        .sort((a, b) => {
                          if (!a.due_date) return 1;
                          if (!b.due_date) return -1;
                          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                        })
                        .slice(0, focusViewLimit)
                        .map(task => (
                          <TasksTaskItem
                            key={task.id}
                            task={task}
                            displaySettings={displaySettings}
                            onTaskUpdate={updateTask}
                            onTaskDelete={deleteTask}
                            onTaskToggle={toggleTask}
                            disableSwipe={true}
                          />
                        ))}
                    </div>
                  </FocusViewSection>
                );
              } else {
                const customView = customFocusViews.find(v => v.id === view.key);
                if (!customView) return null;
                // 型安全・全ケース対応のフィルタリング
                const dueRaw = customView.filters.due;
                let dueValue: string = '';
                if (Array.isArray(dueRaw)) {
                  dueValue = dueRaw[0] ?? '';
                } else {
                  dueValue = dueRaw ?? '';
                }
                const importanceArr: string[] = Array.isArray(customView.filters.importance)
                  ? customView.filters.importance
                  : [];
                const hurdleArr: number[] = Array.isArray(customView.filters.hurdle)
                  ? customView.filters.hurdle
                  : [];

                let baseTasks = tasks.filter(task => {
                  // ステータス
                  if (task.status === 'completed') return false;

                  // 期限フィルタ
                  if (!dueValue || dueValue === '') {
                    // 未設定→全タスク
                  } else if (dueValue === 'none') {
                    if (task.due_date) return false;
                  } else {
                    if (!task.due_date) return false;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(task.due_date);
                    dueDate.setHours(0, 0, 0, 0);
                    if (dueValue === 'today' && dueDate > today) return false;
                    if (dueValue === 'within_week') {
                      const endOfWeek = new Date(today);
                      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
                      endOfWeek.setHours(23, 59, 59, 999);
                      if (dueDate > endOfWeek) return false;
                    }
                    if (dueValue === 'within_month') {
                      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                      endOfMonth.setHours(23, 59, 59, 999);
                      if (dueDate > endOfMonth) return false;
                    }
                    if (dueValue === 'overdue' && dueDate >= today) return false;
                  }

                  // 重要度フィルタ
                  if (importanceArr.length > 0 && !importanceArr.includes(task.importance)) return false;

                  // ハードルフィルタ
                  if (hurdleArr.length > 0 && !hurdleArr.includes(task.hurdle_level ?? -1)) return false;

                  return true;
                });
                // その後、重要度・ハードルでANDフィルタ
                baseTasks = baseTasks.filter(task => {
                  if (task.status === 'completed') {
                    console.log('除外: completed', task);
                    return false;
                  }
                  // eslint-disable-next-line
                  if (importanceArr.length > 0 && !importanceArr.some(val => val == task.importance)) {
                    console.log('除外: importance', task);
                    return false;
                  }
                  // eslint-disable-next-line
                  if (hurdleArr.length > 0 && !hurdleArr.some(val => val == (task.hurdle_level ?? -1))) {
                    console.log('除外: hurdle', task);
                    return false;
                  }
                  return true;
                });
                console.log('最終表示タスク:', baseTasks);
                // フィルター条件の日本語ラベルを生成
                const dueLabelMap: Record<string, string> = {
                  today: '今日',
                  within_week: '今週',
                  within_month: '今月',
                  overdue: '期限切れ',
                  none: '期限なし',
                };
                const importanceLabelMap: Record<string, string> = {
                  high: '高',
                  medium: '中',
                  low: '低',
                };
                const hurdleLabelMap: Record<number, string> = {
                  1: '1',
                  2: '2',
                  3: '3',
                };
                const dueText = dueValue ? `期限:${dueLabelMap[dueValue] || dueValue}` : '';
                const importanceText = importanceArr.length > 0 ? `重要度:${importanceArr.map(i => importanceLabelMap[i] || i).join('・')}` : '';
                const hurdleText = hurdleArr.length > 0 ? `ハードル:${hurdleArr.map(h => hurdleLabelMap[h] || h).join('・')}` : '';
                const filterDesc = [dueText, importanceText, hurdleText].filter(Boolean).join(', ');
                return (
                  <FocusViewSection
                    key={view.key}
                    icon={<span>🛠️</span>}
                    label={<h3 className="text-[#B88B4A] font-bold text-lg">{view.label}</h3>}
                  >
                    <div className="space-y-3 mb-0 border-t border-neutral-300 mt-4 pt-4">
                      {(() => {
                        console.log('全tasks:', tasks);
                        return baseTasks
                          .sort((a, b) => {
                            if (a.due_date && b.due_date) {
                              return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                            }
                            if (!a.due_date) return 1;
                            if (!b.due_date) return -1;
                            return 0;
                          })
                          .slice(0, focusViewLimit)
                          .map(task => (
                            <TasksTaskItem
                              key={task.id}
                              task={task}
                              displaySettings={displaySettings}
                              onTaskUpdate={updateTask}
                              onTaskDelete={deleteTask}
                              onTaskToggle={toggleTask}
                            />
                          ));
                      })()}
                    </div>
                  </FocusViewSection>
                );
              }
            })}
        </div>
      )}
      <TasksFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setFilters}
        initialFilters={filters}
      />
      <QuickAddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
      />      
      <SettingsDisplayDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialSettings={displaySettings}
        onSave={handleSaveDisplaySettings}
      />
      <button 
        onClick={handleAddTaskClick}
        className="fixed bottom-20 right-4 z-50 bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
      >
        ＋
      </button>
    </div>
  );
};

export default Tasks; 