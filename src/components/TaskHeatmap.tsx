import React, { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';

type TaskDataPoint = {
  date: string; // YYYY-MM-DD
  hour: number; // 0〜23
  count: number; // タスク完了数
};

interface TaskHeatmapProps {
  data: TaskDataPoint[];
}

// 色の強度を決定する関数
const getColorClass = (count: number, totalCount: number): string => {
  if (totalCount === 0) return 'bg-gray-100';
  const percentage = (count / totalCount) * 100;
  
  if (percentage === 0) return 'bg-gray-100';
  if (percentage <= 0.3) return 'bg-green-50';
  if (percentage <= 0.6) return 'bg-green-100';
  if (percentage <= 0.9) return 'bg-green-200';
  if (percentage <= 1.2) return 'bg-green-300';
  if (percentage <= 1.5) return 'bg-green-400';
  return 'bg-green-600';
};

// 過去30日間の日付を取得
const getLast30Days = (): Date[] => {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => subDays(today, i));
};

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

const TaskHeatmap: React.FC<TaskHeatmapProps> = ({ data }) => {
  // 30日分のデータを曜日×時間で集計
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0)); // [weekday][hour]

  // 対象日付リスト
  const last30Days = getLast30Days();
  const last30DayStrs = last30Days.map(d => format(d, 'yyyy-MM-dd'));

  // データを曜日×時間で合計
  data.forEach(d => {
    if (last30DayStrs.includes(d.date)) {
      const dateObj = new Date(d.date);
      const weekday = dateObj.getDay(); // 0:日, 1:月, ... 6:土
      grid[weekday][d.hour] += d.count;
    }
  });

  // 全体の完了数を計算
  const totalCount = grid.reduce((sum, row) => 
    sum + row.reduce((rowSum, count) => rowSum + count, 0), 0
  );

  // デバッグ: グリッドの合計値を出力
  console.log('ヒートマップ集計グリッド:', grid);
  console.log('全体の完了数:', totalCount);

  const getDateKey = (date: Date) => {
    return `${date.getUTCDay()}_${date.getUTCHours()}`;
  };

  const getDateLabel = (date: Date) => {
    return format(date, 'MM/dd');
  };

  const getTimeLabel = (hour: number) => {
    return `${hour}:00`;
  };

  const getTooltipContent = (day: number, hour: number) => {
    const count = grid[day][hour] || 0;
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (6 - day));
    date.setUTCHours(hour, 0, 0, 0);
    return `${format(date, 'MM/dd')} ${hour}:00 - ${count}件`;
  };

  // ヒートマップのデータを計算
  const heatmapData = useMemo(() => {
    const grid: { [key: string]: number } = {};
    let totalCount = 0;

    data.forEach(d => {
      if (d.date) {
        const date = new Date(d.date);
        const dateStr = date.toISOString().split('T')[0];
        grid[dateStr] = (grid[dateStr] || 0) + d.count;
        totalCount += d.count;
      }
    });

    return { grid, totalCount };
  }, [data]);

  return (
    <div className="bg-white pl-6 pr-2 py-2 rounded-lg">
      {/* 曜日ラベル */}
      <div className="flex justify-start w-fit">
        <div className="w-[32px]" /> {/* 左端の空白（時間ラベル分） */}
        {weekdayLabels.map((label, i) => (
          <div key={i} className="w-8 h-6 flex items-center justify-center text-xs text-gray-600">
            {label}
          </div>
        ))}
      </div>
      {/* ヒートマップ本体 */}
      <div className="flex">
        {/* 時間ラベル（0時〜23時） */}
        <div className="flex flex-col">
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="h-6 flex items-center justify-end pr-1 text-[10px] text-gray-500"
              style={{ minWidth: '32px' }}
            >
              {`${hour}時`}
            </div>
          ))}
        </div>
        {/* 各曜日のマス */}
        <div className="flex">
          {Array.from({ length: 7 }, (_, weekday) => (
            <div key={weekday} className="flex flex-col">
              {Array.from({ length: 24 }, (_, hour) => {
                const count = grid[weekday][hour];
                const colorClass = getColorClass(count, totalCount);
                const tooltip = getTooltipContent(weekday, hour);
                return (
                  <div
                    key={`${weekday}-${hour}`}
                    className={`w-8 h-6 ${colorClass} border border-white rounded-md`}
                    title={tooltip}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskHeatmap; 