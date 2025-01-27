"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { toast } from "react-toastify";
import { Mic, ListMusic, Save, FileText } from 'lucide-react';
import AudioRecorder from "../../../components/AudioRecorder";
import TranscriptsList from "../../../components/TranscriptsList";
import NoteSaver from "../../../components/NoteSaver";
import NoteList from "../../../components/NoteList";

export default function NotesHubPage() {
  const [transcript, setTranscript] = useState('');
  const [transcripts, setTranscripts] = useState([]);
  const [notes, setNotes] = useState([]);

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

      if (!response.ok) throw new Error('Failed to fetch transcripts');
      const data = await response.json();
      setTranscripts(data);
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      toast.error('Failed to fetch transcripts');
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

      if (!response.ok) throw new Error('Failed to fetch notes');
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to fetch notes');
    }
  }, []);

  useEffect(() => {
    fetchTranscripts();
    fetchNotes();
  }, [fetchTranscripts, fetchNotes]);

  const handleDeleteNote = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:5000/notes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      await fetchNotes();
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  return (
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
  );
}
