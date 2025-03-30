import React from 'react';

interface MiniChartProps {
  data: number[];
  color: string;
  height?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({ 
  data, 
  color,
  height = 30
}) => {
  const max = Math.max(...data, 1);
  
  return (
    <div className="flex items-end h-full gap-[2px]" style={{ height: `${height}px` }}>
      {data.map((value, index) => (
        <div 
          key={index}
          className={`rounded-sm ${color} transition-all duration-300`}
          style={{ 
            height: `${(value / max) * 100}%`,
            width: `${100 / data.length}%`
          }}
        />
      ))}
    </div>
  );
};

export default MiniChart;
