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
  Filler,
  ChartOptions,
  Scale,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TimelineData {
  date: string;
  duration: number;
  count: number;
}

interface RecordingTimelineProps {
  data?: TimelineData[];
  isLoading?: boolean;
}

const RecordingTimeline: React.FC<RecordingTimelineProps> = ({ data = [], isLoading = false }) => {
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
        <p className="text-gray-500 dark:text-gray-400">No recording data available</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Recording Duration',
        data: data.map(item => Math.round(item.duration)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
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
        type: 'linear' as const,
        beginAtZero: true,
        ticks: {
          callback: function(this: Scale<any>, value: number | string) {
            return `${value}m`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="h-64">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Recording Timeline</h3>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default RecordingTimeline;
