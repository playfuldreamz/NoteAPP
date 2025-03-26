import React from 'react';
import { Activity } from 'lucide-react';

interface PatternData {
  day: string;
  slots: Array<{
    hour: number;
    intensity: number; // 0-3: none, low, medium, high
  }>;
}

interface RecordingPatternsProps {
  data?: PatternData[];
  isLoading?: boolean;
}

const RecordingPatterns: React.FC<RecordingPatternsProps> = ({ data = [], isLoading = false }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots = Array.from({ length: 4 }, (_, i) => i);

  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 1: return 'bg-blue-500/20 dark:bg-blue-400/20';
      case 2: return 'bg-blue-500/40 dark:bg-blue-400/40';
      case 3: return 'bg-blue-500/60 dark:bg-blue-400/60';
      default: return 'bg-gray-200 dark:bg-gray-600';
    }
  };

  return (
    <div className="h-[200px] bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Recording Patterns</h3>
      </div>

      {isLoading ? (
        <div className="h-[140px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-[140px] flex items-center justify-center text-sm text-gray-500">
          No pattern data available
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 mt-4">
          {days.map((day, dayIndex) => (
            <div key={day} className="flex flex-col gap-1">
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                {day}
              </div>
              {timeSlots.map((slot) => {
                const dayData = data.find(d => d.day === day);
                const slotData = dayData?.slots.find(s => s.hour === slot);
                return (
                  <div
                    key={slot}
                    className={`h-6 rounded transition-colors duration-200 ${
                      getIntensityClass(slotData?.intensity || 0)
                    }`}
                    title={`${day} - ${slot * 6}:00-${(slot + 1) * 6}:00`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordingPatterns;
