'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface ConfirmationPopoverProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationPopover: React.FC<ConfirmationPopoverProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel
}) => {

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg shadow-sm bg-white dark:bg-gray-800 w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-start gap-2 flex-1">
            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-gray-700 dark:text-gray-300 text-sm">{message}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-3 py-1 rounded text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Reset
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationPopover;
