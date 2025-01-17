"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from 'next/navigation';
import localFont from 'next/font/local';
import "./globals.css";
import AudioRecorder from "../components/AudioRecorder";
import TranscriptsList from "../components/TranscriptsList";
import NoteSaver from "../components/NoteSaver";
import NoteList from "../components/NoteList";
import { Notebook, Mic, FileText, NotebookPen } from 'lucide-react';
import { toast } from "react-toastify";

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
  const [transcripts, setTranscripts] = useState<{ id: number; text: string; date: string }[]>([]);
  const [notes, setNotes] = useState<{
    id: number;
    content: string;
    transcript: string;
    timestamp: string;
    title: string;
  }[]>([]);
  const [username, setUsername] = useState('');

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
        setNotes(data);
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
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
  };

  const handleSaveNote = () => {
    fetchNotes();
  };

  const updateTranscripts = () => {
    fetchTranscripts();
  };

  // If still loading, show nothing
  if (isLoading) {
    return null;
  }

  // If on login or register page, just render the children
  if (['/login', '/register'].includes(pathname)) {
    return (
      <html lang="en" className="h-full">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-full bg-gray-50`}>
          {children}
        </body>
      </html>
    );
  }

  // For authenticated routes, render the full layout
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-full bg-gray-50`}>
        <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900">Voice Notes</h1>
              <div className="flex items-center space-x-4">
                {isAuthenticated && (
                  <>
                    <span className="text-gray-500">Welcome, {username}</span>
                    <div className="relative group">
                      <button className="flex items-center space-x-1 text-gray-700 hover:text-gray-900">
                        <span>Menu</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <div className="py-1" role="menu">
                          {isAdmin && (
                            <a
                              href="/admin/settings"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              role="menuitem"
                            >
                              Settings
                            </a>
                          )}
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                          >
                            Logout
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          {children}
          {isAuthenticated && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Mic className="w-6 h-6" />
                  Voice Recording
                </h2>
                <AudioRecorder updateTranscripts={updateTranscripts} setTranscript={setTranscript} transcript={transcript} />
                <h2 className="text-2xl font-bold mt-8 mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Transcripts
                </h2>
                <TranscriptsList transcripts={transcripts} updateTranscripts={updateTranscripts} />
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
      </body>
    </html>
  );
}
