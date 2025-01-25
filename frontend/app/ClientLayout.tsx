"use client";
import { useEffect, useState, useCallback } from "react";
import DarkModeToggle from "../components/DarkModeToggle";
import { useRouter, usePathname } from 'next/navigation';
import localFont from 'next/font/local';
import "./globals.css";
import AudioRecorder from "../components/AudioRecorder";
import TranscriptsList from "../components/TranscriptsList";
import NoteSaver from "../components/NoteSaver";
import NoteList from "../components/NoteList";
import { Notebook, Mic, FileText, NotebookPen, Settings, LogOut, User, Menu, Sparkles } from 'lucide-react';
import SettingsModal from '../components/SettingsModal';
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { getAIProvider } from '../services/ai';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: '--font-geist-mono',
  weight: '100 900',
});

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [transcripts, setTranscripts] = useState<{ id: number; text: string; title: string; date: string }[]>([]);
  interface Tag {
    id: number;
    name: string;
  }

  interface Note {
    id: number;
    content: string;
    transcript: string;
    timestamp: string;
    title: string;
    user_id: number;
    tags: Tag[];
  }

  const [notes, setNotes] = useState<Note[]>([]);
  const [username, setUsername] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [modelSource, setModelSource] = useState<string>('');

  const fetchCurrentModel = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('http://localhost:5000/api/ai/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setCurrentModel(data.provider || 'default gemini');
    } catch (error) {
      console.error('Error fetching current model:', error);
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/notes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Transform data to match Note type
        const formattedNotes = data.map((note: any) => ({
          id: note.id,
          content: note.content,
          transcript: note.transcript || '',
          timestamp: note.timestamp || new Date().toISOString(),
          title: note.title || 'Untitled Note',
          user_id: note.user_id || 0,
          tags: note.tags || []
        }));
        setNotes(formattedNotes);
      } else {
        console.error('Failed to fetch notes');
        toast.error('Failed to fetch notes');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Network error while fetching notes');
    }
  }, []);

  const fetchTranscripts = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/transcripts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTranscripts(data);
      } else {
        console.error('Failed to fetch transcripts');
        toast.error('Failed to fetch transcripts');
      }
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      toast.error('Network error while fetching transcripts');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    const publicRoutes = ['/login', '/register']

    if (!token && !publicRoutes.includes(pathname)) {
      router.push('/login');
    } else if (token && publicRoutes.includes(pathname)) {
      router.push('/');
    } else if (token) {
      setIsAuthenticated(true);
      if (storedUsername) {
        setUsername(storedUsername);
      }
      // Check if user is admin
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(tokenData.is_admin || false);
      } catch (error) {
        console.error('Error parsing token:', error);
      }
      fetchNotes();
      fetchTranscripts();
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setNotes([]);
      setTranscripts([]);
    }
    setIsLoading(false);
  }, [pathname, router, fetchNotes, fetchTranscripts]);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchAIProvider = async () => {
        try {
          const config = await getAIProvider();
          setCurrentModel(config.provider);
          setModelSource(config.source);
        } catch (error) {
          console.error('Failed to fetch AI provider:', error);
        }
      };
      fetchAIProvider();
    }
  }, [isSettingsOpen, isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setNotes([]);
    setTranscripts([]);
    router.push('/login');
  };

  const handleDeleteNote = (id: number) => {
    if (id === -1) {
      fetchNotes();
    } else {
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    }
  };

  const handleSaveNote = () => {
    fetchNotes();
  };

  const handleRefresh = () => {
    fetchTranscripts();
    fetchNotes();
  };

  // If still loading, show nothing
  if (isLoading) {
    return null;
  }

  // If on login or register page, just render the children
  if (['/login', '/register'].includes(pathname)) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 dark:bg-gray-900`}>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{ zIndex: 9999 }}
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
      <DarkModeToggle />
    </div>
  );
  }

  // For authenticated routes, render the full layout
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 dark:bg-gray-900`}>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{ zIndex: 9999 }}
      />
        <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Voice Notes</h1>
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI: {currentModel}</span>
                  <span className="hidden sm:inline">({modelSource})</span>
                </div>
                {isAuthenticated && (
                  <>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium text-xs sm:text-sm">
                      <User className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Welcome,</span>
                      <span>{username}</span>
                    </div>
                    <div className="relative group">
                      <button className="flex items-center space-x-1.5 px-2 py-1 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200 text-xs sm:text-sm">
                        <Menu className="w-3.5 h-3.5" />
                        <span className="font-medium hidden sm:inline">Menu</span>
                        <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="absolute right-0 mt-1 w-40 sm:w-48 rounded-lg shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top scale-95 group-hover:scale-100">
                        <div className="py-1" role="menu">
                          <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                            role="menuitem"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Settings</span>
                          </button>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                            role="menuitem"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 text-gray-900 dark:text-gray-100 min-h-[calc(100vh-5rem)]">
          <DarkModeToggle />
          {children}
          {isAuthenticated && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Mic className="w-6 h-6" />
                  Voice Recording
                </h2>
                <AudioRecorder updateTranscripts={handleRefresh} setTranscript={setTranscript} transcript={transcript} />
                <h2 className="text-2xl font-bold mt-8 mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Transcripts
                </h2>
                <TranscriptsList transcripts={transcripts} updateTranscripts={handleRefresh} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <NotebookPen className="w-6 h-6" />
                  Create Note
                </h2>
                <NoteSaver transcript={transcript} onSave={handleSaveNote} />
                <h2 className="text-2xl font-bold mt-8 mb-4 flex items-center gap-2">
                  <Notebook className="w-6 h-6" />
                  Notes
                </h2>
                <NoteList notes={notes} onDelete={handleDeleteNote} />
              </div>
            </div>
          )}
        </main>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          setUsername={setUsername}
        />
      </div>
  );
}
