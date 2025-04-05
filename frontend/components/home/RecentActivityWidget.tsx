import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Activity, FileText, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

interface Note {
  id: number;
  title: string;
  content: string;
  timestamp: string;
  tags: Array<{ id: number; name: string; }>;
}

interface RecentActivityWidgetProps {
  onItemClick: (item: Note, type: 'note') => void;
}

const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({ onItemClick }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const ITEMS_TO_SHOW = 5;

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error("Authentication required.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/notes?limit=${ITEMS_TO_SHOW}&offset=0`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch recent notes');

      const data = await response.json();
      setNotes(data.data || []);

    } catch (error) {
      console.error('Error fetching recent notes:', error);
      toast.error('Failed to fetch recent notes');
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
        </div>
        <Link
          href="/hub"
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          View All
        </Link>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1 flex flex-col">
        <div className="overflow-y-auto flex-grow h-[180px] custom-scrollbar pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : notes.length > 0 ? (
            notes.map(note => (
              <div
                key={note.id}
                onClick={() => onItemClick(note, 'note')}
                className="flex items-center space-x-3 text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer group mb-1"
              >
                <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 dark:text-gray-400 truncate group-hover:text-gray-900 dark:group-hover:text-gray-200">
                    {note.title || 'Untitled Note'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(note.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
              No recent notes.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default RecentActivityWidget;