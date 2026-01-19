import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  barColor?: string;
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKey,
  barColor = '#10b981',
  height = 300,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? '#374151' : '#e5e7eb'}
        />
        <XAxis
          dataKey={xKey}
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '6px',
            color: isDark ? '#f3f4f6' : '#111827',
          }}
        />
        <Legend
          wrapperStyle={{
            fontSize: '12px',
            color: isDark ? '#9ca3af' : '#6b7280',
          }}
        />
        <Bar dataKey={yKey} fill={barColor} radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
