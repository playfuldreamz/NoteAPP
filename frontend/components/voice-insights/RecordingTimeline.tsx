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

interface TagsTimelineData {
  date: string;
  count: number;
}

interface RecordingTimelineProps {
  data?: TimelineData[];
  tagsData?: TagsTimelineData[];
  isLoading?: boolean;
}

const RecordingTimeline: React.FC<RecordingTimelineProps> = ({ 
  data = [], 
  tagsData = [], 
  isLoading = false 
}) => {
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

  // Normalize dates to ensure consistent format (YYYY-MM-DD)
  const normalizeDate = (dateStr: string) => {
    try {
      // Handle dates in format YYYY-MM-DD directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      
      // For other formats, use Date object
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr; // Return original if invalid
      }
      
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } catch (error) {
      return dateStr;
    }
  };

  // Normalize all dates in both datasets
  const normalizedData = data.map(item => ({
    ...item,
    date: normalizeDate(item.date)
  }));

  const normalizedTagsData = tagsData.map(item => ({
    ...item,
    date: normalizeDate(item.date)
  }));

  // Create a combined set of dates from both datasets
  const allDates = new Set([
    ...normalizedData.map(item => item.date),
    ...normalizedTagsData.map(item => item.date)
  ]);
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Sort dates chronologically and filter out future dates
  const sortedDates = Array.from(allDates)
    .sort()
    .filter(date => date <= todayFormatted);

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

  const chartData = {
    labels: formattedDates,
    datasets: [
      {
        label: 'Recording Duration',
        data: recordingData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
      },
      {
        label: 'Tags Created',
        data: tagsCreatedData,
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y1',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(139, 92, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
      }
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
      tooltip: {
        callbacks: {
          title: function(context: any) {
            // Get the original date from sortedDates using the index
            const index = context[0].dataIndex;
            return sortedDates[index];
          },
          label: function(context: any) {
            const value = context.raw;
            if (context.datasetIndex === 0) {
              return `${value} minutes`;
            } else {
              return `${value} tags`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Recording Duration (minutes)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Tags Created'
        },
        grid: {
          display: false,
        }
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default RecordingTimeline;
