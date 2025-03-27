import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface NotesTimelineProps {
  data?: Array<{
    date: string;
    count: number;
  }>;
  isLoading?: boolean;
}

const NotesTimeline: React.FC<NotesTimelineProps> = ({ data, isLoading }) => {
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
        <p className="text-gray-500 dark:text-gray-400">No timeline data available</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => item.date),
    datasets: [
      {
        label: 'Notes Created',
        data: data.map(item => item.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="h-64">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Notes Timeline</h3>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default NotesTimeline;
