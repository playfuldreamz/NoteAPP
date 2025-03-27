import React from 'react';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ChartOptions,
  ScatterDataPoint,
  Scale,
  Tick,
  CategoryScale,
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, CategoryScale);

interface WritingPatternsProps {
  data?: Array<{
    day: string;
    slots: Array<{
      hour: number;
      intensity: number;
    }>;
  }>;
  isLoading?: boolean;
}

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WritingPatterns: React.FC<WritingPatternsProps> = ({ data, isLoading }) => {
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

  const chartData = {
    datasets: data
      // Sort data to match the days array order
      .sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day))
      // Remove duplicates by keeping only the first occurrence of each day
      .filter((dayData, index, array) => 
        array.findIndex(item => item.day === dayData.day) === index
      )
      .map((dayData, index) => ({
        label: dayData.day,
        data: dayData.slots.map(slot => ({
          x: slot.hour,
          y: dayData.day,
          r: slot.intensity * 10,
        })),
        backgroundColor: `hsla(${(index * 360) / 7}, 70%, 50%, 0.5)`,
      })),
  };

  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'category',
        labels: days,
        reverse: true,
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: true,
        },
        ticks: {
          padding: 10
        }
      },
      x: {
        type: 'linear',
        min: -0.5,
        max: 23.5,
        ticks: {
          stepSize: 3,
          callback: function(this: Scale<any>, tickValue: string | number) {
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            return `${Math.round(value)}:00`;
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Writing Activity Patterns',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const hour = Math.round(context.parsed.x);
            const day = context.parsed.y;
            const intensity = (context.raw as ScatterDataPoint & { r: number }).r / 10;
            return `${day} ${hour}:00 - Activity: ${intensity.toFixed(2)}`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="h-64">
        <Scatter data={chartData} options={options} />
      </div>
    </div>
  );
};

export default WritingPatterns;
