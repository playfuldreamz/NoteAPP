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
import { Notebook, Mic, FileText, NotebookPen } from 'lucide-react';
import SettingsModal from '../components/SettingsModal';
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { getAIProvider } from '../services/ai';
import Navbar from '../components/Navbar';
import { TagsProvider } from '../context/TagsContext';
import { TranscriptionProviderContext } from '../context/TranscriptionContext';

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
      setCurrentModel(data.provider);
      setModelSource(data.source);
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
      <TagsProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            {children}
          </div>
          <DarkModeToggle />
        </div>
      </TagsProvider>
    );
  }

  // For authenticated routes, render the full layout
  return (
    <TagsProvider>
      <TranscriptionProviderContext>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <Navbar
            username={username}
            currentModel={currentModel}
            modelSource={modelSource}
            isAuthenticated={isAuthenticated}
            onLogout={handleLogout}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
          <main className="pt-16 relative">
            <div className="fixed top-4 right-4 z-50">
              <DarkModeToggle />
            </div>
            <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pb-8 overflow-y-auto">
              {children}
              {isAuthenticated && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Mic className="w-6 h-6" />
                      Voice Recording
                    </h2>
                    <AudioRecorder updateTranscripts={handleRefresh} setTranscript={setTranscript} transcript={transcript} />
                    <h2 className="text-2xl font-bold mt-8 mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <FileText className="w-6 h-6" />
                      Transcripts
                    </h2>
                    <TranscriptsList transcripts={transcripts} updateTranscripts={handleRefresh} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <NotebookPen className="w-6 h-6" />
                      Create Note
                    </h2>
                    <NoteSaver transcript={transcript} onSave={handleSaveNote} />
                    <h2 className="text-2xl font-bold mt-8 mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Notebook className="w-6 h-6" />
                      Notes
                    </h2>
                    <NoteList notes={notes} onDelete={handleDeleteNote} />
                  </div>
                </div>
              )}
            </div>
          </main>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            setUsername={setUsername}
            currentModel={currentModel}
            modelSource={modelSource}
          />
        </div>
      </TranscriptionProviderContext>
    </TagsProvider>
  );
}
