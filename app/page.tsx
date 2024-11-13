"use client";

import React, { useState, useEffect } from 'react';
import AudioRecorder from '../components/AudioRecorder';
import NoteSaver from '../components/NoteSaver';
import NoteList from '../components/NoteList';

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
      <div className="w-full max-w-2xl">
        <AudioRecorder setTranscript={setTranscript} />
        <NoteSaver transcript={transcript} onSave={fetchNotes} /> {/* Pass onSave prop */}
        <NoteList notes={notes} onDelete={handleDelete} />
      </div>
    </div>
  );
};

export default Home;
