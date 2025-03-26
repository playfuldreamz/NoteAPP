import React from 'react';

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ value, onChange }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2"
      aria-label="Select time range for voice insights"
    >
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
      <option value="90d">Last 3 months</option>
    </select>
  );
};

export default TimeRangeSelector;
