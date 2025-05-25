import React from 'react';
import MiniKPIBox from './MiniKPIBox';
import { useAppStore } from '../lib/useAppStore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const TaskSummaryStats: React.FC = () => {
  const tasks = useAppStore((state) => state.tasks);
  // 親タスクのみを対象に完了タスク数を計算
  const completedTasksCount = tasks.filter(task => 
    task.status === 'completed' && 
    !task.parent_task_id
  ).length;

  // 完了タスクを日付ごとに集計（親タスクのみ）
  const completedTasksByDate = tasks
    .filter(task => 
      task.status === 'completed' && 
      task.completed_at && 
      !task.parent_task_id
    )
    .reduce((acc, task) => {
      const date = format(new Date(task.completed_at!), 'yyyy-MM-dd');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // 最大完了日を取得
  const maxCompletedDate = Object.entries(completedTasksByDate)
    .reduce((max, [date, count]) => {
      return count > (max.count || 0) ? { date, count } : max;
    }, { date: '', count: 0 });

  const maxCompletedDateDisplay = maxCompletedDate.date
    ? `${format(new Date(maxCompletedDate.date), 'M/d')}（${maxCompletedDate.count}件）`
    : 'データなし';

  // 総対応時間を計算（親タスクのみ）
  const totalTimeInMinutes = tasks
    .filter(task => 
      task.status === 'completed' && 
      !task.parent_task_id
    )
    .reduce((total, task) => total + (task.estimated_duration_minutes || 0), 0);

  const totalTimeDisplay = `${totalTimeInMinutes} 分`;

  // 作業ピーク帯を計算
  const hourlyCounts = tasks
    .filter(task => 
      task.status === 'completed' && 
      task.completed_at && 
      !task.parent_task_id
    )
    .reduce((acc, task) => {
      const hour = new Date(task.completed_at!).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

  // 最もタスク完了が多い時間帯を特定
  const peakHours = Object.entries(hourlyCounts)
    .reduce((max, [hour, count]) => {
      return count > (max.count || 0) ? { hour: parseInt(hour), count } : max;
    }, { hour: 0, count: 0 });

  // ピーク時間帯の表示（前後1時間を含む）
  const peakHourDisplay = peakHours.count > 0
    ? `${peakHours.hour}〜${peakHours.hour + 2}時`
    : 'データなし';

  return (
    <div className="grid grid-cols-2 gap-3 w-full mb-6">
      <MiniKPIBox label="完了タスク数" value={`${completedTasksCount} 件`} icon="✅" />
      <MiniKPIBox label="作業ピーク帯" value={peakHourDisplay} icon="📈" />
      <MiniKPIBox label="最大完了日" value={maxCompletedDateDisplay} icon="📅" />
      <MiniKPIBox label="総対応時間" value={totalTimeDisplay} icon="⏱" />
    </div>
  );
};

export default TaskSummaryStats; 