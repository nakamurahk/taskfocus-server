import React, { useState, useEffect } from 'react';
import { format, subDays, startOfWeek, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import TaskCountGraph from './TaskCountGraph';
import TaskHeatmap from './TaskHeatmap';
import TaskSummaryStats from './TaskSummaryStats';
import { useAppStore, AppState } from '../lib/useAppStore';

// Task型の最低限必要なプロパティ
interface Task {
  id: number;
  user_id: number;
  name: string;
  created_at: Date;
  importance: string;
  progress: number;
  is_deleted: boolean;
  is_today_task: boolean;
  status: string;
  completed_at?: Date;
  priority_score: number;
  child_order: number;
  task_depth: number;
  suggested_by_ai: boolean;
}

type Period = '7days' | '14days' | '28days' | '90days';

const DUMMY_ANALYTICS = false; // 本番用に切り替え

// 90日分の日ごとダミーデータを生成
const generateDummyData = (days: number) => {
  const dailyData = Array.from({ length: days }, (_, i) => {
    // ベースとなる完了数を日数に応じて少しずつ増加（2→3→4→5）
    const baseCount = Math.floor(2 + (i / days) * 3);
    // ベース値に対して-1～+2のランダムな変動を加える
    const variation = Math.floor(Math.random() * 4) - 1;
    const count = Math.min(Math.max(baseCount + variation, 2), 9);
    
    return {
      date: format(new Date(2024, 3, 1 + i), 'yyyy-MM-dd'),
      count
    };
  });

  // 28日以上の場合、週単位でサマリー
  if (days >= 28) {
    const weeklyData = new Map<string, number>();
    dailyData.forEach(({ date, count }) => {
      const weekStart = startOfWeek(new Date(date), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + count);
    });
    return Array.from(weeklyData.entries()).map(([date, count]) => ({ date, count }));
  }

  return dailyData;
};

const dummyGraphDataMap: Record<Period, { date: string; count: number }[]> = {
  '7days': generateDummyData(7),
  '14days': generateDummyData(14),
  '28days': generateDummyData(28),
  '90days': generateDummyData(90),
};

// ヒートマップ用のダミーデータ生成
const generateDummyHeatmapData = (days: number) => {
  const data: { date: string; hour: number; count: number }[] = [];
  const morningHours = [6, 7, 8, 9]; // 朝の時間帯
  const eveningHours = [17, 18, 19, 20]; // 夕方の時間帯
  const otherHours = [10, 11, 12, 13, 14, 15, 16, 21, 22]; // その他の時間帯

  // 過去30日分のデータを生成
  for (let i = 0; i < days; i++) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    
    // 朝の時間帯（2-4件）
    morningHours.forEach(hour => {
      if (Math.random() < 0.7) { // 70%の確率でタスク完了
        data.push({
          date,
          hour,
          count: Math.floor(Math.random() * 3) + 2 // 2-4件
        });
      }
    });

    // 夕方の時間帯（1-3件）
    eveningHours.forEach(hour => {
      if (Math.random() < 0.6) { // 60%の確率でタスク完了
        data.push({
          date,
          hour,
          count: Math.floor(Math.random() * 3) + 1 // 1-3件
        });
      }
    });

    // その他の時間帯（0-2件）
    otherHours.forEach(hour => {
      if (Math.random() < 0.3) { // 30%の確率でタスク完了
        data.push({
          date,
          hour,
          count: Math.floor(Math.random() * 2) + 1 // 1-2件
        });
      }
    });
  }

  return data;
};

const dummyHeatmapData = generateDummyHeatmapData(30); // 30日分のデータを生成

const TaskAnalytics: React.FC = () => {
  // zustandストアからtasksを取得
  const tasks = useAppStore((s: AppState) => s.tasks);
  const [period, setPeriod] = useState<Period>('7days');
  const [graphData, setGraphData] = useState<{ date: string; count: number }[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ date: string; hour: number; count: number }[]>([]);

  // グラフデータの集計
  useEffect(() => {
    if (DUMMY_ANALYTICS) {
      setGraphData(dummyGraphDataMap[period]);
      return;
    }
    const days = period === '7days' ? 7 : period === '14days' ? 14 : period === '28days' ? 28 : 90;
    const today = new Date();
    const startDate = subDays(today, days - 1);
    // 完了したタスクのみをフィルタリング
    const completedTasks = tasks.filter((task: Task) =>
      task.status === 'completed' &&
      task.completed_at &&
      new Date(task.completed_at) >= startDate
    );
    let data: { date: string; count: number }[] = [];
    
    if (days <= 14) {
      // 日単位の集計
      const dailyCounts = new Map<string, number>();
      const dateRange = eachDayOfInterval({ start: startDate, end: today });
      dateRange.forEach((date: Date) => {
        dailyCounts.set(format(date, 'yyyy-MM-dd'), 0);
      });
      completedTasks.forEach((task: Task) => {
        const completedDate = format(new Date(task.completed_at!), 'yyyy-MM-dd');
        dailyCounts.set(completedDate, (dailyCounts.get(completedDate) || 0) + 1);
      });
      data = Array.from(dailyCounts.entries()).map(([date, count]) => ({ date, count }));
    } else {
      // 週単位の集計
      const weekStarts = eachWeekOfInterval({ start: startDate, end: today }, { weekStartsOn: 1 });
      const weeklyCounts = new Map<string, number>();
      weekStarts.forEach((weekStart: Date) => {
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        weeklyCounts.set(weekKey, 0);
      });
      completedTasks.forEach((task: Task) => {
        const weekStart = startOfWeek(new Date(task.completed_at!), { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        if (weeklyCounts.has(weekKey)) {
          weeklyCounts.set(weekKey, (weeklyCounts.get(weekKey) || 0) + 1);
        }
      });
      data = Array.from(weeklyCounts.entries()).map(([date, count]) => ({ date, count }));
    }
    setGraphData(data);
  }, [tasks, period]);

  // ヒートマップデータの集計
  useEffect(() => {
    if (DUMMY_ANALYTICS) {
      setHeatmapData(dummyHeatmapData);
      return;
    }
    // 完了タスクのみ
    const completedTasks = tasks.filter((task: Task) => task.status === 'completed' && task.completed_at);
    // 日付・時間ごとに集計
    const hourlyCounts = completedTasks.reduce((acc: Record<string, number>, task: Task) => {
      const completedDate = new Date(task.completed_at!);
      const dateKey = format(completedDate, 'yyyy-MM-dd');
      const hour = completedDate.getHours();
      const key = `${dateKey}_${hour}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const data = Object.entries(hourlyCounts).map(([key, count]) => {
      const [date, hour] = key.split('_');
      return {
        date,
        hour: parseInt(hour),
        count: Number(count)
      };
    });
    setHeatmapData(data);
  }, [tasks]);

  // タスク完了推移グラフ用のデータ
  const chartData = {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
    datasets: [
      {
        label: '完了タスク数',
        data: [12, 19, 15, 25, 22, 30],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.4
      }
    ]
  };

  return (
    <section>
      <h2 className="section-title mb-6">アナリティクス</h2>
      {/* 1. タスク完了推移グラフ */}
      <div className="bg-white rounded-lg shadow pt-6 pb-0 pl-0 pr-4 mb-6">
        <div className="flex justify-between items-center mb-4 pl-6">
          <h2 className="text-lg font-semibold">タスク完了推移</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7days">1週間</option>
            <option value="14days">2週間</option>
            <option value="28days">4週間</option>
            <option value="90days">3ヶ月</option>
          </select>
        </div>
        <TaskCountGraph 
          data={graphData} 
          period={period === '7days' ? 7 : period === '14days' ? 14 : period === '28days' ? 28 : 90} 
        />
      </div>
      {/* 2. ミニ統計ボックス */}
      <TaskSummaryStats />
      {/* 3. サブ：ヒートマップをアコーディオンで表示 */}
      <div className="bg-white rounded-lg shadow pt-6 pb-0 pl-0 pr-4 mb-6">
        <div className="flex justify-between items-center mb-4 pl-6">
          <h2 className="text-lg font-semibold">時間帯の傾向を見る</h2>
        </div>
        <TaskHeatmap data={heatmapData} />
      </div>
    </section>
  );
};

export default TaskAnalytics; 