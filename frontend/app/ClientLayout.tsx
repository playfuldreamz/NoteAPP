"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from 'next/navigation';
import localFont from 'next/font/local';
import "./globals.css";
import AudioRecorder from "../components/AudioRecorder";
import TranscriptsList from "../components/TranscriptsList";
import NoteSaver from "../components/NoteSaver";
import NoteList from "../components/NoteList";
import { Notebook, Mic, FileText, NotebookPen } from 'lucide-react';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [transcripts, setTranscripts] = useState<{ date: string; text: string }[]>([]);
  const [notes, setNotes] = useState<{ id: number; content: string; transcript: string; timestamp: string }[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const publicRoutes = ['/login', '/register'];
    
    if (!token && !publicRoutes.includes(pathname)) {
      router.push('/login');
    } else if (token && publicRoutes.includes(pathname)) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      setTranscripts(JSON.parse(localStorage.getItem('transcripts') || '[]'));
      setNotes(JSON.parse(localStorage.getItem('notes') || '[]'));
    }
  }, []);

  const updateTranscripts = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const newTranscripts = JSON.parse(localStorage.getItem('transcripts') || '[]');
      console.log('Updating transcripts:', newTranscripts);
      setTranscripts(newTranscripts);
    }
  };

  const handleSaveNote = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const newNotes = JSON.parse(localStorage.getItem('notes') || '[]');
      console.log('Updating notes:', newNotes);
      setNotes(newNotes);
    }
  };

  const handleDeleteNote = (id: number) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const updatedNotes = notes.filter(note => note.id !== id);
      console.log('Deleting note:', id, 'Updated notes:', updatedNotes);
      setNotes(updatedNotes);
      localStorage.setItem('notes', JSON.stringify(updatedNotes));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

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
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>

          <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6">
              <section className="w-full md:w-1/2 space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <Mic className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-medium text-gray-900 ml-2">Voice Recorder</h2>
                  </div>
                  <AudioRecorder setTranscript={setTranscript} updateTranscripts={updateTranscripts} transcript={transcript} />
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-medium text-gray-900 ml-2">Transcripts</h2>
                  </div>                  
                  <TranscriptsList transcripts={transcripts} updateTranscripts={updateTranscripts} />
                </div>
              </section>

              <section className="w-full md:w-1/2 space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <NotebookPen className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-medium text-gray-900 ml-2">Create Note</h2>
                  </div>                  
                  <NoteSaver transcript={transcript} onSave={handleSaveNote} />
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <Notebook className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-medium text-gray-900 ml-2">Saved Notes</h2>
                  </div>
                  <NoteList notes={notes} onDelete={handleDeleteNote} />
                </div>
              </section>
            </div>
          </main>
      </body>
    </html>
  );
}