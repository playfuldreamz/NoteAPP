"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, Activity, Star, Mic, FileText, Tags, Timer, Search, ChartBar, FileTextIcon, BarChart2, Target } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import Modal from '../../../components/Modal';
import TimeRangeSelector from '../../../components/shared/TimeRangeSelector';
import StatCard from '../../../components/shared/StatCard';
import MiniChart from '../../../components/shared/MiniChart';
import FocusAreas from '../../../components/shared/FocusAreas';
import {
  VoiceInsightsPanel,
  RecordingTimeline,
  RecordingPatterns,
  PopularTopics,
  QuickStats,
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
  
  // Pagination state
  const [notesLimit] = useState(5);
  const [notesOffset, setNotesOffset] = useState(0);
  const [hasMoreNotes, setHasMoreNotes] = useState(true);
  const [isLoadingMoreNotes, setIsLoadingMoreNotes] = useState(false);
  
  const [transcriptsLimit] = useState(5);
  const [transcriptsOffset, setTranscriptsOffset] = useState(0);
  const [hasMoreTranscripts, setHasMoreTranscripts] = useState(true);
  const [isLoadingMoreTranscripts, setIsLoadingMoreTranscripts] = useState(false);
  
  // Sample data for mini charts
  const [statChartData, setStatChartData] = useState({
    notes: [4, 6, 8, 5, 9, 7, 10],
    recordings: [2, 5, 3, 7, 4, 6, 8],
    tags: [3, 5, 8, 6, 9, 7, 10],
    time: [5, 8, 6, 9, 7, 10, 8]
  });

  const fetchRecentActivity = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Fetch all notes and transcripts for stats
      const [allNotesResponse, allTranscriptsResponse] = await Promise.all([
        // All notes for stats
        fetch('http://localhost:5000/api/notes', {
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

      if (!allNotesResponse.ok || !allTranscriptsResponse.ok) {
        throw new Error('Failed to fetch activity stats');
      }
      
      const [allNotesData, allTranscriptsData] = await Promise.all([
        allNotesResponse.json(),
        allTranscriptsResponse.json()
      ]);

      // Calculate stats using the full data
      setStats({
        totalNotes: allNotesData.data ? allNotesData.data.length : 0,
        totalRecordings: allTranscriptsData.data ? allTranscriptsData.data.length : 0,
        totalTags: new Set(
          (allNotesData.data || []).flatMap((note: Note) => 
            (note.tags || []).map((tag: { id: number; name: string }) => tag.name)
          )
        ).size,
        recordingTime: (allTranscriptsData.data || []).reduce(
          (acc: number, curr: Transcript) => acc + (curr.duration || 0), 0
        )
      });

      // Fetch initial paginated notes and transcripts
      await Promise.all([
        fetchNotes(true),
        fetchTranscripts(true)
      ]);
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      toast.error('Failed to fetch activity stats');
    }
  }, []);

  const fetchNotes = useCallback(async (isInitial = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (isInitial) {
      setNotesOffset(0);
    }

    const offset = isInitial ? 0 : notesOffset;
    
    try {
      setIsLoadingMoreNotes(true);
      
      const response = await fetch(
        `http://localhost:5000/api/notes?limit=${notesLimit}&offset=${offset}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }

      const result = await response.json();
      
      if (isInitial) {
        setRecentNotes(result.data || []);
      } else {
        setRecentNotes(prev => [...prev, ...(result.data || [])]);
      }
      
      setHasMoreNotes(result.pagination?.hasMore || false);
      setNotesOffset(prev => isInitial ? notesLimit : prev + notesLimit);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to fetch notes');
    } finally {
      setIsLoadingMoreNotes(false);
    }
  }, [notesLimit, notesOffset]);

  const fetchTranscripts = useCallback(async (isInitial = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (isInitial) {
      setTranscriptsOffset(0);
    }

    const offset = isInitial ? 0 : transcriptsOffset;
    
    try {
      setIsLoadingMoreTranscripts(true);
      
      const response = await fetch(
        `http://localhost:5000/api/transcripts?limit=${transcriptsLimit}&offset=${offset}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transcripts');
      }

      const result = await response.json();
      
      if (isInitial) {
        setRecentTranscripts(result.data || []);
      } else {
        setRecentTranscripts(prev => [...prev, ...(result.data || [])]);
      }
      
      setHasMoreTranscripts(result.pagination?.hasMore || false);
      setTranscriptsOffset(prev => isInitial ? transcriptsLimit : prev + transcriptsLimit);
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      toast.error('Failed to fetch transcripts');
    } finally {
      setIsLoadingMoreTranscripts(false);
    }
  }, [transcriptsLimit, transcriptsOffset]);

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

  const handleLoadMore = (type: 'notes' | 'transcripts') => {
    if (type === 'notes') {
      if (!hasMoreNotes || isLoadingMoreNotes) return;
      fetchNotes();
    } else {
      if (!hasMoreTranscripts || isLoadingMoreTranscripts) return;
      fetchTranscripts();
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          icon={FileText} 
          title="Total Notes" 
          value={stats.totalNotes} 
          color="bg-blue-500"
          delay={0}
          chart={<MiniChart data={statChartData.notes} color="bg-blue-500/60" />}
        />
        <StatCard 
          icon={Mic} 
          title="Total Recordings" 
          value={stats.totalRecordings} 
          color="bg-purple-500"
          delay={0.1}
          chart={<MiniChart data={statChartData.recordings} color="bg-purple-500/60" />}
        />
        <StatCard 
          icon={Tags} 
          title="Unique Tags" 
          value={stats.totalTags} 
          color="bg-emerald-500"
          delay={0.2}
          chart={<MiniChart data={statChartData.tags} color="bg-emerald-500/60" />}
        />
        <StatCard 
          icon={Timer} 
          title="Recording Time" 
          value={`${Math.floor(stats.recordingTime / 60)}m ${stats.recordingTime % 60}s`} 
          color="bg-amber-500"
          delay={0.3}
          chart={<MiniChart data={statChartData.time} color="bg-amber-500/60" />}
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Quick Actions */}
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
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1">
            <div className="flex flex-col h-full">
              <div className="overflow-y-auto h-[180px] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
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
              <div className="sticky bottom-0 mt-2 flex justify-end">
                {hasMoreNotes && (
                  <button
                    onClick={() => handleLoadMore('notes')}
                    disabled={isLoadingMoreNotes}
                    className={`text-sm px-2 py-1 text-blue-500 hover:text-blue-700 bg-transparent flex items-center ${isLoadingMoreNotes ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoadingMoreNotes ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Recordings */}
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
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1">
            <div className="flex flex-col h-full">
              <div className="overflow-y-auto h-[180px] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
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
                          {new Date(transcript.date).toLocaleString()} • {transcript.duration ? `${Math.floor(transcript.duration / 60)}:${(transcript.duration % 60).toString().padStart(2, '0')}` : '0:00'}
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
              <div className="sticky bottom-0 mt-2 flex justify-end">
                {hasMoreTranscripts && (
                  <button
                    onClick={() => handleLoadMore('transcripts')}
                    disabled={isLoadingMoreTranscripts}
                    className={`text-sm px-2 py-1 text-blue-500 hover:text-blue-700 bg-transparent flex items-center ${isLoadingMoreTranscripts ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoadingMoreTranscripts ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Focus Areas (Replacing Statistics) */}
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
            <FocusAreas 
              noteTags={noteInsights?.popularTags?.map(tag => ({ tag: tag.tag, count: tag.count }))} 
              transcriptTags={voiceInsights?.popularTopics?.map(topic => ({ tag: topic.topic, count: topic.count }))}
              isLoading={isLoadingNoteInsights || isLoadingInsights} 
            />
          </div>
        </motion.div>

        {/* Voice Insights */}
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
          transition={{ duration: 0.2, delay: 0.5 }}
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
    </div>
  );
}
