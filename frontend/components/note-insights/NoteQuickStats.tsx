import React from 'react';
import { FileText, Edit3, Tags, Clock } from 'lucide-react';

interface NoteQuickStatsProps {
  data?: {
    total_notes: number;
    avg_words_per_note: number;
    tagged_notes_percentage: number;
    edit_frequency: number;
  };
  isLoading?: boolean;
}

const NoteQuickStats: React.FC<NoteQuickStatsProps> = ({ data, isLoading }) => {
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

  const stats = [
    {
      label: 'Total Notes',
      value: data.total_notes,
      icon: FileText,
      format: (v: number) => v.toLocaleString(),
    },
    {
      label: 'Avg Words/Note',
      value: data.avg_words_per_note,
      icon: Edit3,
      format: (v: number) => Math.round(v).toLocaleString(),
    },
    {
      label: 'Tagged Notes',
      value: data.tagged_notes_percentage,
      icon: Tags,
      format: (v: number) => `${Math.round(v)}%`,
    },
    {
      label: 'Edits/Week',
      value: data.edit_frequency,
      icon: Clock,
      format: (v: number) => v.toFixed(1),
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Stats</h3>
      <div className="grid grid-cols-1 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <stat.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {stat.label}
              </span>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {stat.format(stat.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoteQuickStats;
