import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Mic, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

interface Transcript {
  id: number;
  title: string;
  text: string;
  date: string;
  duration: number;
  summary?: string | null;
}

interface RecentRecordingsWidgetProps {
  onItemClick: (item: Transcript, type: 'transcript') => void;
}

const RecentRecordingsWidget: React.FC<RecentRecordingsWidgetProps> = ({ onItemClick }) => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const ITEMS_TO_SHOW = 5;

  const fetchTranscripts = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error("Authentication required.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/transcripts?limit=${ITEMS_TO_SHOW}&offset=0`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch recent recordings');

      const data = await response.json();
      setTranscripts(data.data || []);

    } catch (error) {
      console.error('Error fetching recent recordings:', error);
      toast.error('Failed to fetch recent recordings');
      setTranscripts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTranscripts();
  }, [fetchTranscripts]);

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Recordings</h2>
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
          ) : transcripts.length > 0 ? (
            transcripts.map(transcript => (
              <div
                key={transcript.id}
                onClick={() => onItemClick(transcript, 'transcript')}
                className="flex items-center space-x-3 text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer group mb-1"
              >
                <Mic className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 dark:text-gray-400 truncate group-hover:text-gray-900 dark:group-hover:text-gray-200">
                    {transcript.title || 'Untitled Recording'}
                  </p>
                  {transcript.summary && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate italic mt-0.5">
                      {transcript.summary}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(transcript.date).toLocaleString()} • {transcript.duration ? `${Math.floor(transcript.duration / 60)}:${(transcript.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
              No recent recordings.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default RecentRecordingsWidget;