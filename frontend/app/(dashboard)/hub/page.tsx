"use client";

import React, { useState, useCallback, useEffect } from 'react';
import eventBus from '../../../utils/eventBus';
import { toast } from "react-toastify";
import { Mic, ListMusic, Save, FileText } from 'lucide-react';
import { debounce } from 'lodash';
import AudioRecorderContainer from "../../../components/audio-recorder/AudioRecorder";
import TranscriptsList from "../../../components/TranscriptsList";
import NoteSaver from "../../../components/NoteSaver";
import NoteList from "../../../components/NoteList";
import { motion } from 'framer-motion';

interface Note {
  id: number;
  title: string;
  content: string;
  timestamp: string;
  tags: Array<{ id: number; name: string }>;
}

interface NoteListProps {
  notes: Note[];
  onDelete: (id: number) => Promise<void>;
  onTitleUpdate: (id: number, newTitle: string) => Promise<void>; 
}

export default function NotesHubPage() {
  const [transcript, setTranscript] = useState(''); 
  const [transcripts, setTranscripts] = useState<any[]>([]); 
  const [notes, setNotes] = useState<any[]>([]); 

  const fetchTranscripts = useCallback(async (useFastMode = false) => {
     try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const url = `http://localhost:5000/api/transcripts${useFastMode ? '?fast=true' : ''}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setTranscripts(result.data || result);
     } catch (error) {
         console.error('Error fetching transcripts:', error);
         toast.error('Failed to fetch transcripts');
     }
  }, []);

  const fetchNotes = useCallback(async () => {
      try {
         const token = localStorage.getItem('token');
         if (!token) return;
         const response = await fetch('http://localhost:5000/api/notes', {
             headers: { 'Authorization': `Bearer ${token}` }
         });
         if (!response.ok) throw new Error('Failed to fetch');
         const result = await response.json();
         setNotes(result.data || result);
      } catch (error) {
          console.error('Error fetching notes:', error);
          toast.error('Failed to fetch notes');
      }
  }, []);

  // Only fetch on mount
  useEffect(() => {
    fetchTranscripts();
    fetchNotes();
  }, []); // Empty dependency array as we only want this to run once
  
  // Listen for transcript:saved events
  useEffect(() => {
    // Handler function to fetch transcripts when a save event occurs
    const handleTranscriptSaved = () => {
      console.log('Transcript saved event received, updating list...');
      fetchTranscripts(true); // Use fast mode for event-triggered updates
    };
    
    // Register event listener
    eventBus.on('transcript:saved', handleTranscriptSaved);
    
    // Clean up event listener when component unmounts
    return () => {
      eventBus.off('transcript:saved', handleTranscriptSaved);
    };
  }, [fetchTranscripts]);

  const handleDeleteNote = async (id: number) => {
     const token = localStorage.getItem('token');
     if (!token) return;
     try {
        const response = await fetch(`http://localhost:5000/api/notes/${id}`, {
           method: 'DELETE',
           headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete');
        await fetchNotes(); 
        toast.success('Note deleted successfully');
     } catch (error) {
         console.error('Error deleting note:', error);
         toast.error('Failed to delete note');
     }
  };

  // Create a non-debounced version that always uses fast mode
  const fetchTranscriptsFast = useCallback(() => {
    fetchTranscripts(true); // Always use fast mode for direct calls
  }, [fetchTranscripts]);

  // Create a debounced version of fetchTranscripts to prevent rapid updates
  const debouncedFetchTranscripts = useCallback(
    debounce(() => {
      fetchTranscripts(false); // Fetch full data including tags
    }, 1000),
    [fetchTranscripts]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Audio Recorder</h2>
          </div>
          <AudioRecorderContainer
            setTranscript={setTranscript} 
            transcript={transcript} 
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <ListMusic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Transcripts</h2>
          </div>
          <TranscriptsList
            transcripts={transcripts}
            updateTranscripts={debouncedFetchTranscripts}
            onTitleUpdate={debouncedFetchTranscripts} 
          />
        </motion.div>
      </motion.div>
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Save className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Save Note</h2>
          </div>
          <NoteSaver
            transcript={transcript} 
            onSave={fetchNotes}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Notes</h2>
          </div>
          <NoteList
            notes={notes}
            onDelete={handleDeleteNote}
            onTitleUpdate={fetchNotes} 
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
