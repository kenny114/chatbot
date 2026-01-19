import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';

interface LineChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  lineColor?: string;
  height?: number;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  xKey,
  yKey,
  lineColor = '#6366f1',
  height = 300,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data}>
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
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={lineColor}
          strokeWidth={2}
          dot={{ fill: lineColor, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;
