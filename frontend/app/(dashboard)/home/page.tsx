"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, Activity, Star, Mic, FileText, Tags, Timer, Search, ChartBar } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import Modal from '../../../components/Modal';

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

  const fetchRecentActivity = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Fetch all notes for stats
      const [notesResponse, allNotesResponse, transcriptsResponse, allTranscriptsResponse] = await Promise.all([
        // Recent notes (limited to 5)
        fetch('http://localhost:5000/notes?limit=5', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        // All notes for stats
        fetch('http://localhost:5000/notes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        // Recent transcripts (limited to 5)
        fetch('http://localhost:5000/transcripts?limit=5', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        // All transcripts for stats
        fetch('http://localhost:5000/transcripts', {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {/* Quick Actions */}
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1">
          <div className="space-y-3">
            <Link href="/notes-hub" className="w-full flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors group">
              <span className="text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200">Start Recording</span>
              <Mic className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </Link>
            <Link href="/notes-hub" className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span className="text-gray-700 dark:text-gray-300">View All Notes</span>
              <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </Link>
            <button className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span className="text-gray-700 dark:text-gray-300">Search Content</span>
              <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
          </div>
          <Link 
            href="/notes-hub" 
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
      </div>

      {/* Recent Recordings */}
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Recordings</h2>
          </div>
          <Link 
            href="/notes-hub" 
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
      </div>

      {/* Statistics */}
      <div className="h-full flex flex-col">
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
      </div>

      {/* Voice Insights */}
      <div className="col-span-full mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Voice Insights</h2>
          </div>
          <div className="flex items-center gap-2">
            <select className="text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 3 months</option>
            </select>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Recording Timeline */}
            <div className="md:col-span-2 h-[200px] bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Recording Timeline</h3>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 h-full flex items-center justify-center">
                Timeline visualization will go here
              </div>
            </div>

            {/* Popular Topics */}
            <div className="h-[200px] bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Tags className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Popular Topics</h3>
              </div>
              <div className="space-y-3">
                {[
                  { topic: 'meetings', percentage: 80 },
                  { topic: 'ideas', percentage: 60 },
                  { topic: 'tasks', percentage: 40 },
                  { topic: 'research', percentage: 20 }
                ].map(({ topic, percentage }) => (
                  <div key={topic} className="flex items-center gap-3">
                    <div className="w-16 text-sm text-gray-600 dark:text-gray-300">{topic}</div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-600">
                        <div 
                          className="h-2 rounded-full bg-blue-500 dark:bg-blue-400" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-10 text-right text-xs text-gray-500 dark:text-gray-400">{percentage}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recording Patterns */}
            <div className="md:col-span-2 h-[200px] bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Recording Patterns</h3>
              </div>
              <div className="grid grid-cols-7 gap-1 mt-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                      {day}
                    </div>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div
                        key={j}
                        className={`h-6 rounded ${
                          Math.random() > 0.5
                            ? 'bg-blue-500/20 dark:bg-blue-400/20'
                            : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      ></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="h-[200px] bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Timer className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Quick Stats</h3>
              </div>
              <div className="flex flex-col justify-between h-[calc(100%-2rem)]">
                <div>
                  <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">4.5h</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Avg. weekly recording time</div>
                </div>
                <div>
                  <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">8.2min</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Avg. recording length</div>
                </div>
                <div>
                  <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">85%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Notes with tags</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        content={modalState.content}
        title={modalState.title}
        itemId={modalState.itemId}
        type={modalState.type}
        initialTags={modalState.tags}
      />
    </div>
  );
}
