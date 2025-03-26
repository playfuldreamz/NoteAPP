import React from 'react';
import { Timer } from 'lucide-react';

interface QuickStatsData {
  weeklyRecordingTime: number;  // in hours
  avgRecordingLength: number;   // in minutes
  taggedNotesPercentage: number;
}

interface QuickStatsProps {
  data?: QuickStatsData;
  isLoading?: boolean;
}

const QuickStats: React.FC<QuickStatsProps> = ({ data, isLoading = false }) => {
  const formatTime = (hours: number) => {
    return hours.toFixed(1) + 'h';
  };

  const formatMinutes = (minutes: number) => {
    return minutes.toFixed(1) + 'min';
  };

  return (
    <div className="h-[200px] bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Timer className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Quick Stats</h3>
      </div>

      {isLoading ? (
        <div className="h-[140px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : !data ? (
        <div className="h-[140px] flex items-center justify-center text-sm text-gray-500">
          No stats available
        </div>
      ) : (
        <div className="flex flex-col justify-between h-[calc(100%-2rem)]">
          <div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">
              {formatTime(data.weeklyRecordingTime)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Avg. weekly recording time
            </div>
          </div>
          <div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">
              {formatMinutes(data.avgRecordingLength)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Avg. recording length
            </div>
          </div>
          <div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">
              {data.taggedNotesPercentage}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Notes with tags
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickStats;
