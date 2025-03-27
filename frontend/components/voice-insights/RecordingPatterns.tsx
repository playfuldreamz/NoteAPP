import React from 'react';

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
  // Map slot index to actual hour ranges
  const timeSlots = [
    { start: 0, end: 6 },    // 12am-6am
    { start: 6, end: 12 },   // 6am-12pm
    { start: 12, end: 18 },  // 12pm-6pm
    { start: 18, end: 24 },  // 6pm-12am
  ];

  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 1: return 'bg-blue-500/20 dark:bg-blue-400/20';
      case 2: return 'bg-blue-500/40 dark:bg-blue-400/40';
      case 3: return 'bg-blue-500/60 dark:bg-blue-400/60';
      default: return 'bg-gray-200 dark:bg-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-64 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No pattern data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="h-64 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">Recording Patterns</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-600"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">None</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-blue-500/20 dark:bg-blue-400/20"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-blue-500/40 dark:bg-blue-400/40"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-blue-500/60 dark:bg-blue-400/60"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">High</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 flex-1">
          {days.map((day) => (
            <div key={day} className="flex flex-col gap-1">
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                {day}
              </div>
              <div className="flex-1 flex flex-col gap-1">
                {timeSlots.map((slot) => {
                  const dayData = data.find(d => d.day === day);
                  const slotData = dayData?.slots.find(s => s.hour >= slot.start && s.hour < slot.end);
                  const formattedStart = slot.start === 0 ? '12am' : 
                                       slot.start === 12 ? '12pm' : 
                                       slot.start > 12 ? `${slot.start-12}pm` : `${slot.start}am`;
                  const formattedEnd = slot.end === 24 ? '12am' : 
                                     slot.end === 12 ? '12pm' : 
                                     slot.end > 12 ? `${slot.end-12}pm` : `${slot.end}am`;
                  return (
                    <div
                      key={slot.start}
                      className={`flex-1 rounded transition-colors duration-200 ${
                        getIntensityClass(slotData?.intensity || 0)
                      }`}
                      title={`${day} - ${formattedStart} to ${formattedEnd}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecordingPatterns;
