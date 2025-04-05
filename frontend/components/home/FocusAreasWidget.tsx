import React from 'react';
import { Target, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import FocusAreas from '../shared/FocusAreas';

interface Tag {
  tag: string;
  count: number;
}

interface FocusAreasWidgetProps {
  noteTags?: Tag[];
  transcriptTags?: Tag[];
  isLoading?: boolean;
}

const FocusAreasWidget: React.FC<FocusAreasWidgetProps> = ({ noteTags, transcriptTags, isLoading }) => {
  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Focus Areas</h2>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <FocusAreas
            noteTags={noteTags}
            transcriptTags={transcriptTags}
            isLoading={isLoading}
          />
        )}
      </div>
    </motion.div>
  );
};

export default FocusAreasWidget;