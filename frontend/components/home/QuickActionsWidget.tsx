import React from 'react';
import Link from 'next/link';
import { Activity, Mic, FileText, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRecording } from '../../context/RecordingContext';

const QuickActionsWidget: React.FC = () => {
  const { startRecording, setIsMaximized, isRecording } = useRecording();

  const handleStartRecording = async () => {
    setIsMaximized(true); // Show maximized recorder first
    await startRecording(); // Then start recording
  };

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1">
        <div className="space-y-3">
          <button
            onClick={handleStartRecording}
            disabled={isRecording}
            className={`w-full flex items-center justify-between px-4 py-2 ${
              isRecording 
                ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" 
                : "bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"
            } rounded-lg transition-colors group`}
          >
            <span className={`${
              isRecording 
                ? "text-gray-400 dark:text-gray-500" 
                : "text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200"
            }`}>
              {isRecording ? "Recording in Progress" : "Start Recording"}
            </span>
            <Mic className={`w-5 h-5 ${
              isRecording 
                ? "text-gray-400 dark:text-gray-500" 
                : "text-blue-500 dark:text-blue-400"
            }`} />
          </button>
          <Link href="/hub" className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span className="text-gray-700 dark:text-gray-300">View All Notes</span>
            <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </Link>
          <Link href="/search" className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span className="text-gray-700 dark:text-gray-300">Semantic Search</span>
            <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default QuickActionsWidget;