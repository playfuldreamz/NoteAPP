import React from 'react';
import { Tags } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
        <p className="text-gray-500 dark:text-gray-400">No topics data available</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => item.topic),
    datasets: [
      {
        label: 'Usage Count',
        data: data.map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
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
        text: 'Popular Topics',
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
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Popular Topics</h3>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default PopularTopics;
