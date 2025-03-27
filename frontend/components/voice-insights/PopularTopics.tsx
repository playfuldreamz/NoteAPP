import React from 'react';
import { Tags } from 'lucide-react';

interface TopicData {
  topic: string;
  percentage: number;
  count: number;
}

interface PopularTopicsProps {
  data?: TopicData[];
  isLoading?: boolean;
}

const PopularTopics: React.FC<PopularTopicsProps> = ({ data = [], isLoading = false }) => {
  return (
    <div className="h-[200px] bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Tags className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Popular Topics</h3>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          No topics data available
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {data.map(({ topic, percentage, count }) => (
            <div key={topic} className="flex items-center gap-3">
              <div className="w-16 text-sm text-gray-600 dark:text-gray-300 truncate">{topic}</div>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-600">
                  <div
                    className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <div className="w-16 text-right">
                <span className="text-xs text-gray-500 dark:text-gray-400">{percentage}%</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({count})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PopularTopics;
