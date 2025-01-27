"use client";

import { useState, useCallback, useEffect } from 'react';
import { toast } from "react-toastify";
import { Mic, ListMusic, Save, FileText } from 'lucide-react';
import AudioRecorder from "../AudioRecorder";
import TranscriptsList from "../TranscriptsList";
import NoteSaver from "../NoteSaver";
import NoteList from "../NoteList";

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

interface MainContentProps {
  isAuthenticated: boolean;
}

export default function MainContent({ isAuthenticated }: MainContentProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [transcripts, setTranscripts] = useState<{ id: number; text: string; title: string; date: string }[]>([]);
  const [transcript, setTranscript] = useState('');

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
    if (isAuthenticated) {
      fetchNotes();
      fetchTranscripts();
    } else {
      setNotes([]);
      setTranscripts([]);
    }
  }, [isAuthenticated, fetchNotes, fetchTranscripts]);

  const handleDeleteNote = (id: number) => {
    if (id === -1) {
      fetchNotes();
    } else {
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    }
  };

  return (
    <div className="flex-1 ml-16 bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="h-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
        {isAuthenticated && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Audio Recorder</h2>
                </div>
                <AudioRecorder 
                  setTranscript={setTranscript}
                  updateTranscripts={fetchTranscripts}
                  transcript={transcript}
                />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <ListMusic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Transcripts</h2>
                </div>
                <TranscriptsList 
                  transcripts={transcripts}
                  updateTranscripts={fetchTranscripts}
                />
              </div>
            </div>
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Save className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Save Note</h2>
                </div>
                <NoteSaver 
                  transcript={transcript}
                  onSave={fetchNotes}
                />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Notes</h2>
                </div>
                <NoteList 
                  notes={notes}
                  onDelete={handleDeleteNote}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
