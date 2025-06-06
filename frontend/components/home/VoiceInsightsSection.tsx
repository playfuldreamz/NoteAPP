import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Mic, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import TimeRangeSelector from '../shared/TimeRangeSelector';
import {
  VoiceInsightsPanel,
  RecordingTimeline,
  RecordingPatterns,
  PopularTopics,
  QuickStats,
} from '../voice-insights';

interface VoiceInsightsData {
  timeRange: string;
  recordingTimeline: Array<{ date: string; duration: number; count: number }>;
  popularTopics: Array<{ topic: string; percentage: number; count: number }>;
  recordingPatterns: Array<{ day: string; slots: Array<{ hour: number; intensity: number }> }>;
  quickStats: { weeklyRecordingTime: number; avgRecordingLength: number; taggedNotesPercentage: number };
  tagsTimeline: any;
}

const VoiceInsightsSection: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [insights, setInsights] = useState<VoiceInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchInsights = useCallback(async (range: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/voice-insights?timeRange=${range}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch voice insights');

      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Error fetching voice insights:', error);
      toast.error('Failed to fetch voice insights');
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
      transition={{ duration: 0.2, delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Voice Insights</h2>
        </div>
        <TimeRangeSelector
          value={timeRange}
          onChange={(value: string) => setTimeRange(value)}
          ariaLabel="Select time range for voice insights"
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
              <RecordingTimeline
                data={insights.recordingTimeline}
                tagsData={insights.tagsTimeline}
                isLoading={isLoading}
              />
            </div>
            <div>
              <PopularTopics
                data={insights.popularTopics}
                isLoading={isLoading}
              />
            </div>
            <div className="md:col-span-2">
              <RecordingPatterns
                data={insights.recordingPatterns}
                isLoading={isLoading}
              />
            </div>
            <div>
              <QuickStats
                data={insights.quickStats}
                isLoading={isLoading}
              />
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Failed to load voice insights.
          </div>
        )}
      </VoiceInsightsPanel>
    </motion.div>
  );
};

export default VoiceInsightsSection;