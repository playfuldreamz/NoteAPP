"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, Activity, Star, Mic, FileText, Tags, Timer, Search, ChartBar } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import Modal from '../../../components/Modal';
import TimeRangeSelector from '../../../components/shared/TimeRangeSelector';
import {
  VoiceInsightsPanel,
  RecordingTimeline,
  PopularTopics,
  RecordingPatterns,
  QuickStats
} from '../../../components/voice-insights';
import {
  NotesTimeline,
  PopularTags,
  WritingPatterns,
  NoteQuickStats
} from '../../../components/note-insights';
import { motion } from 'framer-motion';

interface Note {
  id: number;
  title: string;
  content: string;
  timestamp: string;
  tags: Array<{ id: number; name: string; }>;
}

interface Transcript {
  id: number;
  title: string;
  text: string;
  date: string; // Added date property
  timestamp: string;
  duration: number;
  tags?: Array<{ id: number; name: string; }>;
}

interface ModalState {
  isOpen: boolean;
  content: string;
  title: string;
  itemId: number;
  type: 'note' | 'transcript';
  tags?: Array<{ id: number; name: string; }>;
}

interface VoiceInsightsData {
  timeRange: string;
  recordingTimeline: Array<{
    date: string;
    duration: number;
    count: number;
  }>;
  popularTopics: Array<{
    topic: string;
    percentage: number;
    count: number;
  }>;
  recordingPatterns: Array<{
    day: string;
    slots: Array<{
      hour: number;
      intensity: number;
    }>;
  }>;
  quickStats: {
    weeklyRecordingTime: number;
    avgRecordingLength: number;
    taggedNotesPercentage: number;
  };
  tagsTimeline: any;
}

interface NoteInsightsData {
  timeRange: string;
  notesTimeline: Array<{
    date: string;
    count: number;
  }>;
  popularTags: Array<{
    tag: string;
    percentage: number;
    count: number;
  }>;
  writingPatterns: Array<{
    day: string;
    slots: Array<{
      hour: number;
      intensity: number;
    }>;
  }>;
  quickStats: {
    total_notes: number;
    avg_words_per_note: number;
    tagged_notes_percentage: number;
    edit_frequency: number;
  };
  tagsTimeline: any;
}

export default function HomePage() {
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [recentTranscripts, setRecentTranscripts] = useState<Transcript[]>([]);
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalRecordings: 0,
    totalTags: 0,
    recordingTime: 0
  });
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    content: '',
    title: '',
    itemId: 0,
    type: 'note'
  });
  const [voiceTimeRange, setVoiceTimeRange] = useState<string>('7d');
  const [noteTimeRange, setNoteTimeRange] = useState<string>('7d');
  const [voiceInsights, setVoiceInsights] = useState<VoiceInsightsData | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);
  const [noteInsights, setNoteInsights] = useState<NoteInsightsData | null>(null);
  const [isLoadingNoteInsights, setIsLoadingNoteInsights] = useState<boolean>(false);
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState<boolean>(false);

  const fetchRecentActivity = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Fetch all notes for stats
      const [notesResponse, allNotesResponse, transcriptsResponse, allTranscriptsResponse] = await Promise.all([
        // Recent notes (limited to 5)
        fetch('http://localhost:5000/api/notes?limit=5', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        // All notes for stats
        fetch('http://localhost:5000/api/notes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        // Recent transcripts (limited to 5)
        fetch('http://localhost:5000/api/transcripts?limit=5', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        // All transcripts for stats
        fetch('http://localhost:5000/api/transcripts', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!notesResponse.ok || !transcriptsResponse.ok || !allNotesResponse.ok || !allTranscriptsResponse.ok) {
        throw new Error('Failed to fetch recent activity');
      }
      
      const [recentNotesData, allNotesData, recentTranscriptsData, allTranscriptsData] = await Promise.all([
        notesResponse.json(),
        allNotesResponse.json(),
        transcriptsResponse.json(),
        allTranscriptsResponse.json()
      ]);

      setRecentNotes(recentNotesData);
      setRecentTranscripts(recentTranscriptsData);

      // Calculate stats using the full data
      setStats({
        totalNotes: allNotesData.length,
        totalRecordings: allTranscriptsData.length,
        totalTags: new Set(allNotesData.flatMap((note: Note) => note.tags.map((tag: { id: number; name: string }) => tag.name))).size,
        recordingTime: allTranscriptsData.reduce((acc: number, curr: Transcript) => acc + (curr.duration || 0), 0)
      });

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      toast.error('Failed to fetch recent activity');
    }
  }, []);

  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity]);

  const handleItemClick = (item: Note | Transcript, type: 'note' | 'transcript') => {
    try {
      const content = type === 'note' 
        ? (item as Note).content 
        : (item as Transcript).text;
        
      setModalState({
        isOpen: true,
        content,
        title: item.title || 'Untitled',
        itemId: item.id,
        type,
        tags: 'tags' in item ? item.tags : undefined
      });
    } catch (error) {
      console.error('Error opening modal:', error);
      toast.error('Failed to open content');
    }
  };

  const handleCloseModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const fetchVoiceInsights = useCallback(async (range: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoadingInsights(true);
    try {
      const response = await fetch(`http://localhost:5000/api/voice-insights?timeRange=${range}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voice insights');
      }

      const data = await response.json();
      setVoiceInsights(data);
    } catch (error) {
      console.error('Error fetching voice insights:', error);
      toast.error('Failed to fetch voice insights');
    } finally {
      setIsLoadingInsights(false);
    }
  }, []);

  useEffect(() => {
    fetchVoiceInsights(voiceTimeRange);
  }, [voiceTimeRange, fetchVoiceInsights]);

  const fetchNoteInsights = useCallback(async (range: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoadingNoteInsights(true);
    try {
      const response = await fetch(`http://localhost:5000/api/note-insights?timeRange=${range}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch note insights');
      }

      const data = await response.json();
      setNoteInsights(data);
    } catch (error) {
      console.error('Error fetching note insights:', error);
      toast.error('Failed to fetch note insights');
    } finally {
      setIsLoadingNoteInsights(false);
    }
  }, []);

  useEffect(() => {
    fetchNoteInsights(noteTimeRange);
  }, [noteTimeRange, fetchNoteInsights]);

  const handleRegenerateTitle = async () => {
    if (!modalState.content || !modalState.itemId) return;
    
    setIsRegeneratingTitle(true);
    try {
      const { generateTranscriptTitle, updateNoteTitle, updateTranscriptTitle } = await import('../../../services/ai');
      
      const newTitle = await generateTranscriptTitle(modalState.content);
      
      if (modalState.type === 'note') {
        await updateNoteTitle(modalState.itemId, newTitle);
      } else {
        await updateTranscriptTitle(modalState.itemId, newTitle);
      }
      
      setModalState(prev => ({
        ...prev,
        title: newTitle
      }));
      
      toast.success('Title regenerated successfully');
      fetchRecentActivity(); // Refresh data to show updated title
    } catch (error) {
      console.error('Error regenerating title:', error);
      toast.error('Failed to regenerate title');
    } finally {
      setIsRegeneratingTitle(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {/* Quick Actions */}
      <motion.div 
        className="h-full flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1">
          <div className="space-y-3">
            <Link href="/hub" className="w-full flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors group">
              <span className="text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200">Start Recording</span>
              <Mic className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </Link>
            <Link href="/hub" className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span className="text-gray-700 dark:text-gray-300">View All Notes</span>
              <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </Link>
            <button className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span className="text-gray-700 dark:text-gray-300">Search Content</span>
              <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div 
        className="h-full flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
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
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1">
          <div className="space-y-3 h-[180px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
            {recentNotes.length > 0 ? (
              recentNotes.map(note => (
                <div 
                  key={note.id} 
                  onClick={() => handleItemClick(note, 'note')}
                  className="flex items-center space-x-3 text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer group"
                >
                  <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
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
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400 h-full justify-center">
                <Activity className="w-4 h-4" />
                <span>Start by creating your first note!</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Recent Recordings */}
      <motion.div 
        className="h-full flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
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
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1">
          <div className="space-y-3 h-[180px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
            {recentTranscripts.length > 0 ? (
              recentTranscripts.map(transcript => (
                <div 
                  key={transcript.id} 
                  onClick={() => handleItemClick(transcript, 'transcript')}
                  className="flex items-center space-x-3 text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer group"
                >
                  <Mic className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-600 dark:text-gray-400 truncate group-hover:text-gray-900 dark:group-hover:text-gray-200">
                      {transcript.title || 'Untitled Recording'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(transcript.date).toLocaleString()} • {Math.floor(transcript.duration / 60)}:{(transcript.duration % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400 h-full justify-center">
                <Star className="w-4 h-4" />
                <span>Record your first voice note!</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      <motion.div 
        className="h-full flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <ChartBar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Statistics</h2>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Notes</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{stats.totalNotes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Recordings</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{stats.totalRecordings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Unique Tags</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{stats.totalTags}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Recording Time</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {Math.floor(stats.recordingTime / 60)}m {stats.recordingTime % 60}s
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Voice Insights */}
      <motion.div 
        className="col-span-full mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Voice Insights</h2>
          </div>
          <TimeRangeSelector 
            value={voiceTimeRange} 
            onChange={(value: string) => setVoiceTimeRange(value)}
            ariaLabel="Select time range for voice insights"
          />
        </div>
        
        <VoiceInsightsPanel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <RecordingTimeline 
                data={voiceInsights?.recordingTimeline} 
                tagsData={voiceInsights?.tagsTimeline}
                isLoading={isLoadingInsights} 
              />
            </div>
            <div>
              <PopularTopics 
                data={voiceInsights?.popularTopics} 
                isLoading={isLoadingInsights} 
              />
            </div>
            <div className="md:col-span-2">
              <RecordingPatterns 
                data={voiceInsights?.recordingPatterns} 
                isLoading={isLoadingInsights} 
              />
            </div>
            <div>
              <QuickStats 
                data={voiceInsights?.quickStats} 
                isLoading={isLoadingInsights} 
              />
            </div>
          </div>
        </VoiceInsightsPanel>
      </motion.div>

      {/* Note Insights */}
      <motion.div 
        className="col-span-full mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Note Insights</h2>
          </div>
          <TimeRangeSelector 
            value={noteTimeRange} 
            onChange={(value: string) => setNoteTimeRange(value)}
            ariaLabel="Select time range for note insights"
          />
        </div>
        
        <VoiceInsightsPanel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <NotesTimeline 
                data={noteInsights?.notesTimeline} 
                tagsData={noteInsights?.tagsTimeline}
                isLoading={isLoadingNoteInsights} 
              />
            </div>
            <div>
              <PopularTags 
                data={noteInsights?.popularTags} 
                isLoading={isLoadingNoteInsights} 
              />
            </div>
            <div className="md:col-span-2">
              <WritingPatterns 
                data={noteInsights?.writingPatterns} 
                isLoading={isLoadingNoteInsights} 
              />
            </div>
            <div>
              <NoteQuickStats 
                data={noteInsights?.quickStats} 
                isLoading={isLoadingNoteInsights} 
              />
            </div>
          </div>
        </VoiceInsightsPanel>
      </motion.div>

      {/* Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        content={modalState.content}
        title={modalState.title}
        itemId={modalState.itemId}
        type={modalState.type}
        initialTags={modalState.tags}
        onRegenerateTitle={handleRegenerateTitle}
        isRegeneratingTitle={isRegeneratingTitle}
        onTitleUpdate={fetchRecentActivity}
      />
    </div>
  );
}
