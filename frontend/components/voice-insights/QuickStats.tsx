import React from 'react';

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

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-64 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No stats available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="h-64">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Quick Stats</h3>
        <div className="flex flex-col justify-between h-[calc(100%-3rem)] py-2">
          <div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">
              {formatTime(data.weeklyRecordingTime)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Avg. weekly recording time
            </div>
          </div>
          <div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">
              {formatMinutes(data.avgRecordingLength)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Avg. recording length
            </div>
          </div>
          <div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">
              {data.taggedNotesPercentage}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Notes with tags
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;
