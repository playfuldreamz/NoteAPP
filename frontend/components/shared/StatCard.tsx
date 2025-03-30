import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  color: string;
  delay?: number;
  chart?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon: Icon, 
  title, 
  value, 
  color, 
  delay = 0,
  chart
}) => {
  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
        </div>
        <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</span>
      </div>
      {chart && (
        <div className="mt-2">
          {chart}
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
