import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

type Props = {
  data: { date: string; count: number }[]; // dateは "yyyy-MM-dd"
  period: number; // 表示期間（日数） 例: 7, 14, 28, 90
};

const TaskCountGraph: React.FC<Props> = ({ data, period }) => {
  // X軸のラベルフォーマッター
  const formatXAxisLabel = (date: string) => {
    if (period <= 14) {
      return format(new Date(date), 'M/d');
    } else {
      return format(new Date(date), 'M/d') + '〜';
    }
  };

  // ツールチップのラベルフォーマッター
  const formatTooltipLabel = (label: string) => {
    if (period <= 14) {
      return format(new Date(label), 'yyyy年M月d日');
    } else {
      return `${format(new Date(label), 'yyyy年M月d日')} 〜 ${format(new Date(label), 'M月d日')}`;
    }
  };

  // X軸ラベルを下にずらすカスタムtick
  const renderCustomTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <text
        x={x}
        y={y}
        dy={16} // 下方向に16pxずらす
        textAnchor="end"
        fontSize={12}
        fill="#6B7280"
        transform={`rotate(-45, ${x}, ${y})`}
      >
        {formatXAxisLabel(payload.value)}
      </text>
    );
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ 
            top: 10, 
            right: 4, 
            left: -10, 
            bottom: 0 
          }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false}
            stroke="#E5E7EB"
          />
          <XAxis 
            dataKey="date" 
            height={60}
            tick={renderCustomTick}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis 
            allowDecimals={false}
            tick={{ 
              fontSize: 12,
              fill: '#6B7280'
            }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <Tooltip 
            formatter={(value: number) => [`${value}件`, '完了数']}
            labelFormatter={formatTooltipLabel}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            labelStyle={{
              color: '#374151',
              fontWeight: 500
            }}
          />
          <Bar 
            dataKey="count" 
            fill="#3B82F6"
            radius={[6, 6, 0, 0]}
            name="完了数"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TaskCountGraph; 