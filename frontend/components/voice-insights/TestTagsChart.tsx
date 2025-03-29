import React from 'react';
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

interface TagsTimelineData {
  date: string;
  count: number;
}

interface TestTagsChartProps {
  tagsData?: TagsTimelineData[];
}

const TestTagsChart: React.FC<TestTagsChartProps> = ({ tagsData = [] }) => {
  console.log('TestTagsChart received tagsData:', tagsData);

  if (!tagsData || tagsData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-64 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No tags data available</p>
      </div>
    );
  }

  // Sort dates chronologically
  const sortedData = [...tagsData].sort((a, b) => a.date.localeCompare(b.date));
  
  // Format dates for display
  const labels = sortedData.map(item => 
    new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  );
  
  const counts = sortedData.map(item => item.count);
  
  console.log('Sorted dates:', sortedData.map(item => item.date));
  console.log('Formatted labels:', labels);
  console.log('Tag counts:', counts);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Tags Created',
        data: counts,
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 1,
      }
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
        display: true,
        text: 'Tags Created Per Day',
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
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default TestTagsChart;
