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
import { formatUTCDateToShortLocal } from '../../utils/dateUtils'; // Update import to use the renamed function

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

  // Create a combined set of dates directly from the props
  const allDates = new Set([
    ...data.map(item => item.date.split('T')[0]), // Extract YYYY-MM-DD
    ...tagsData.map(item => item.date) // Tags dates are already YYYY-MM-DD
  ]);

  // Sort dates chronologically (YYYY-MM-DD strings)
  const sortedDates = Array.from(allDates).sort();

  // Format dates for display using the short format utility function
  const formattedDates = sortedDates.map(formatUTCDateToShortLocal);

  // Create datasets with 0 counts for missing dates
  const recordingData = sortedDates.map(date => {
    // Find based on the original YYYY-MM-DD date
    const found = data.find(item => item.date.startsWith(date));
    return found ? Math.round(found.duration / 60) : 0; // Convert seconds to minutes
  });

  const tagsCreatedData = sortedDates.map(date => {
    // Find based on the original YYYY-MM-DD date
    const found = tagsData.find(item => item.date === date);
    return found ? found.count : 0;
  });

  const durationChartData = {
    labels: formattedDates, // Use formatted short local dates
    datasets: [
      {
        label: 'Recording Duration (minutes)',
        data: recordingData,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const tagsChartData = {
    labels: formattedDates, // Use formatted short local dates
    datasets: [
      {
        label: 'Tags Created',
        data: tagsCreatedData,
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
