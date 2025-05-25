import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useTasks } from '../contexts/TaskContext';
import { toJST } from '../utils/dateUtils';

type Period = '7days' | '14days' | '28days' | '90days';

const TaskSummaryGraph: React.FC = () => {
  const { tasks } = useTasks();
  const [period, setPeriod] = useState<Period>('7days');
  const [graphData, setGraphData] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    const days = period === '7days' ? 7 : period === '14days' ? 14 : period === '28days' ? 28 : 90;
    const today = new Date();
    const startDate = subDays(today, days - 1);

    // 完了したタスクのみをフィルタリング
    const completedTasks = tasks.filter(task => 
      task.status === 'completed' && 
      task.completed_at && 
      toJST(task.completed_at) >= startDate
    );

    let data: { date: string; count: number }[] = [];

    if (days <= 14) {
      // 日単位の集計
      const dailyCounts = new Map<string, number>();
      const dateRange = eachDayOfInterval({ start: startDate, end: today });

      // 日付範囲の初期化
      dateRange.forEach(date => {
        dailyCounts.set(format(date, 'yyyy-MM-dd'), 0);
      });

      // タスクの完了数を集計
      completedTasks.forEach(task => {
        const completedDate = format(toJST(task.completed_at!), 'yyyy-MM-dd');
        dailyCounts.set(completedDate, (dailyCounts.get(completedDate) || 0) + 1);
      });

      // グラフ用データの作成
      data = Array.from(dailyCounts.entries()).map(([date, count]) => ({
        date,
        count
      }));
    } else {
      // 週単位の集計
      const weeklyCounts = new Map<string, number>();
      const weeks = eachWeekOfInterval(
        { start: startDate, end: today },
        { weekStartsOn: 1 } // 月曜日開始
      );

      // 週の初期化
      weeks.forEach(weekStart => {
        weeklyCounts.set(format(weekStart, 'yyyy-MM-dd'), 0);
      });

      // タスクの完了数を週ごとに集計
      completedTasks.forEach(task => {
        const completedDate = toJST(task.completed_at!);
        const weekStart = startOfWeek(completedDate, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        weeklyCounts.set(weekKey, (weeklyCounts.get(weekKey) || 0) + 1);
      });

      // グラフ用データの作成
      data = Array.from(weeklyCounts.entries()).map(([date, count]) => ({
        date,
        count
      }));
    }

    setGraphData(data);
  }, [tasks, period]);

  // X軸のラベルフォーマッター
  const formatXAxisLabel = (date: string) => {
    const days = period === '7days' ? 7 : period === '14days' ? 14 : period === '28days' ? 28 : 90;
    if (days <= 14) {
      return format(toJST(date), 'M/d');
    } else {
      return format(toJST(date), 'M/d') + '〜';
    }
  };

  const getDateKey = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const getDateLabel = (date: Date) => {
    return format(date, 'MM/dd');
  };

  const getWeekLabel = (date: Date) => {
    return format(date, 'MM/dd');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
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

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              allowDecimals={false}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value}件`, '完了数']}
              labelFormatter={(label) => {
                const days = period === '7days' ? 7 : period === '14days' ? 14 : period === '28days' ? 28 : 90;
                if (days <= 14) {
                  return format(new Date(label), 'yyyy年M月d日');
                } else {
                  const weekStart = new Date(label);
                  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                  return `${format(weekStart, 'yyyy年M月d日')} 〜 ${format(weekEnd, 'M月d日')}`;
                }
              }}
            />
            <Bar 
              dataKey="count" 
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              name="完了数"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TaskSummaryGraph; 