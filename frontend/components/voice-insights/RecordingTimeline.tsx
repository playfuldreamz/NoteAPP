import React from 'react';
import { Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TimelineData {
  date: string;
  duration: number;
  count: number;
}

interface RecordingTimelineProps {
  data?: TimelineData[];
  isLoading?: boolean;
}

const RecordingTimeline: React.FC<RecordingTimelineProps> = ({ data = [], isLoading = false }) => {
  return (
    <div className="h-[200px] bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Recording Timeline</h3>
      </div>
      
      {isLoading ? (
        <div className="h-[140px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-[140px] flex items-center justify-center text-sm text-gray-500">
          No recording data available
        </div>
      ) : (
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
              <XAxis 
                dataKey="date" 
                className="text-xs text-gray-500 dark:text-gray-400"
                tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                className="text-xs text-gray-500 dark:text-gray-400"
                tickFormatter={(value: number) => `${Math.round(value)}m`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(31 41 55)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                }}
                labelStyle={{ color: 'rgb(156 163 175)' }}
                itemStyle={{ color: 'rgb(209 213 219)' }}
                formatter={(value: number) => [`${Math.round(value)}m`, 'Duration']}
                labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey="duration"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorDuration)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default RecordingTimeline;
