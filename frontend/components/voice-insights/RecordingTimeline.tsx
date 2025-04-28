import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TimelineData {
  date: string;
  duration: number;
  count: number;
}

interface TagsTimelineData {
  date: string;
  count: number;
}

interface RecordingTimelineProps {
  data?: TimelineData[];
  tagsData?: TagsTimelineData[];
  isLoading?: boolean;
}

const RecordingTimeline: React.FC<RecordingTimelineProps> = ({ data = [], tagsData = [], isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if ((!data || data.length === 0) && (!tagsData || tagsData.length === 0)) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-64 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No recording data available</p>
      </div>
    );
  }

  const normalizeRecordingDate = (dateStr: string) => {
    try {
      // Directly extract YYYY-MM-DD from the ISO string (assuming format like YYYY-MM-DDTHH:mm:ss.sssZ)
      if (dateStr && dateStr.includes('T')) {
        return dateStr.split('T')[0];
      }
      // If it's already YYYY-MM-DD or another format, return as is or handle appropriately
      // Basic check for YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      // Fallback: attempt to parse and format, but without timezone shift
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string encountered in normalizeRecordingDate:', dateStr);
        return dateStr; // Return original if invalid
      }
      // Format directly from the parsed date object (which interprets based on UTC or local depending on input string)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; 
    } catch (error) {
      console.error('Error normalizing recording date:', dateStr, error);
      return dateStr;
    }
  };

  const normalizeTagsDate = (dateStr: string) => {
    // Skip timezone adjustment for dates already in YYYY-MM-DD format
    return dateStr;
  };

  // Normalize all dates in both datasets
  const normalizedData = data.map(item => ({
    ...item,
    date: normalizeRecordingDate(item.date)
  }));

  const normalizedTagsData = tagsData.map(item => ({
    ...item,
    date: normalizeTagsDate(item.date)
  }));

  // Create a combined set of dates from both datasets
  const allDates = new Set([
    ...normalizedData.map(item => item.date),
    ...normalizedTagsData.map(item => item.date)
  ]);
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Sort dates chronologically
  const sortedDates = Array.from(allDates)
    .sort();

  // Format dates for display with timezone handling
  const formattedDates = sortedDates.map(date => {
    // Create date with timezone handling to prevent off-by-one errors
    const [year, month, day] = date.split('-').map(Number);
    // Months are 0-indexed in JavaScript Date
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });

  // Create datasets with 0 counts for missing dates
  const recordingData = sortedDates.map(date => {
    const found = normalizedData.find(item => item.date === date);
    return found ? Math.round(found.duration / 60) : 0; // Convert seconds to minutes
  });

  const tagsCreatedData = sortedDates.map(date => {
    const found = normalizedTagsData.find(item => item.date === date);
    return found ? found.count : 0;
  });

  const labels = sortedDates;

  const recordingDurations = recordingData;
  const tagsCounts = tagsCreatedData;

  const durationChartData = {
    labels: formattedDates,
    datasets: [
      {
        label: 'Recording Duration (minutes)',
        data: recordingDurations,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const tagsChartData = {
    labels: formattedDates,
    datasets: [
      {
        label: 'Tags Created',
        data: tagsCounts,
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Recording Duration</h3>
        <Line data={durationChartData} options={options} />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Tags Created</h3>
        <Bar data={tagsChartData} options={options} />
      </div>
    </div>
  );
};

export default RecordingTimeline;
