"use client";

import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify'; // Import ToastContainer
import AudioRecorder from '../components/AudioRecorder';
import NoteSaver from '../components/NoteSaver';
import NoteList from '../components/NoteList';
import TranscriptsList from '../components/TranscriptsList'; // Import TranscriptsList

const Home = () => {
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState<Array<{ id: number; content: string; transcript: string; timestamp: string }>>([]);

  const fetchNotes = async () => {
    const response = await fetch(`${process.env.API_URL}/notes`);
    if (response.ok) {
      const data = await response.json();
      setNotes(data);
    }
  };

  const handleDelete = (id: number) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  useEffect(() => {
    fetchNotes(); // Fetch notes on component mount
  }, []);

  return (
    <div className="min-h-screen bg-off-white text-black flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to the Audio Note App</h1>
      <div className="w-full max-w-2xl space-y-6"> {/* Increased spacing to space-y-6 */}
        <AudioRecorder setTranscript={setTranscript} updateTranscripts={() => {}} /> {/* Pass updateTranscripts */}
        <NoteSaver transcript={transcript} onSave={fetchNotes} /> {/* Pass onSave prop */}
        <NoteList notes={notes} onDelete={handleDelete} /> {/* Pass only notes */}
        <TranscriptsList /> {/* Add TranscriptsList component */}
      </div>
      <ToastContainer /> {/* Add ToastContainer for notifications */}
    </div>
  );
};

export default Home;
