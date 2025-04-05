import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FileText, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import TimeRangeSelector from '../shared/TimeRangeSelector';
import {
  NotesTimeline,
  PopularTags,
  WritingPatterns,
  NoteQuickStats
} from '../note-insights';
import { VoiceInsightsPanel } from '../voice-insights';

interface NoteInsightsData {
  timeRange: string;
  notesTimeline: Array<{ date: string; count: number }>;
  popularTags: Array<{ tag: string; percentage: number; count: number }>;
  writingPatterns: Array<{ day: string; slots: Array<{ hour: number; intensity: number }> }>;
  quickStats: { total_notes: number; avg_words_per_note: number; tagged_notes_percentage: number; edit_frequency: number };
  tagsTimeline: any;
}

const NoteInsightsSection: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [insights, setInsights] = useState<NoteInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchInsights = useCallback(async (range: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/note-insights?timeRange=${range}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch note insights');

      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Error fetching note insights:', error);
      toast.error('Failed to fetch note insights');
      setInsights(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights(timeRange);
  }, [timeRange, fetchInsights]);

  return (
    <motion.div
      className="col-span-full mt-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.5 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Note Insights</h2>
        </div>
        <TimeRangeSelector
          value={timeRange}
          onChange={(value: string) => setTimeRange(value)}
          ariaLabel="Select time range for note insights"
        />
      </div>

      <VoiceInsightsPanel>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : insights ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <NotesTimeline
                data={insights.notesTimeline}
                tagsData={insights.tagsTimeline}
                isLoading={isLoading}
              />
            </div>
            <div>
              <PopularTags
                data={insights.popularTags}
                isLoading={isLoading}
              />
            </div>
            <div className="md:col-span-2">
              <WritingPatterns
                data={insights.writingPatterns}
                isLoading={isLoading}
              />
            </div>
            <div>
              <NoteQuickStats
                data={insights.quickStats}
                isLoading={isLoading}
              />
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Failed to load note insights.
          </div>
        )}
      </VoiceInsightsPanel>
    </motion.div>
  );
};

export default NoteInsightsSection;