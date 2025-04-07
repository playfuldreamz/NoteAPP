'use client';

import React from 'react';
import { Maximize2, Pause, Play, Square } from 'lucide-react';
import { useRecording } from '../../context/RecordingContext';
import { motion, AnimatePresence } from 'framer-motion';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const MinimizedRecorder: React.FC = () => {
  const {
    isRecording,
    isPaused,
    elapsedTime,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setIsMaximized
  } = useRecording();

  const handlePlayPauseClick = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  // Only render if recording is active
  if (!isRecording) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="fixed bottom-4 right-4 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700 z-50"
      >
        <button
          onClick={handlePlayPauseClick}
          className={`p-2 rounded-lg ${
            isPaused
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
              : 'bg-gray-500 hover:bg-gray-600 text-white'
          }`}
          title={isPaused ? 'Resume Recording' : 'Pause Recording'}
        >
          {isPaused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={stopRecording}
          className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
          title="Stop Recording"
        >
          <Square className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 min-w-[60px]">
          <span className="animate-pulse text-red-500">●</span>
          <span className="text-sm font-medium dark:text-gray-200">
            {formatTime(elapsedTime)}
          </span>
        </div>

        <button
          onClick={() => setIsMaximized(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Maximize Recorder"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default MinimizedRecorder;