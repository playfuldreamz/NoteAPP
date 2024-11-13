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
  const [transcripts, setTranscripts] = useState<{ date: string; text: string }[]>([]);

  const fetchNotes = async () => {
    const response = await fetch(`${process.env.API_URL}/notes`);
    if (response.ok) {
      const data = await response.json();
      setNotes(data);
    }
  };

  const fetchTranscripts = () => {
    const savedTranscripts = JSON.parse(localStorage.getItem('transcripts') || '[]');
    const sortedTranscripts = savedTranscripts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTranscripts(sortedTranscripts);
    console.log('Transcripts fetched:', sortedTranscripts); // Log the fetched transcripts
  };

  const handleDelete = (id: number) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  useEffect(() => {
    fetchNotes(); // Fetch notes on component mount
    fetchTranscripts(); // Fetch transcripts on component mount
  }, []);

  return (
    <div className="min-h-screen bg-off-white text-black flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to the Audio Note App</h1>
      <div className="w-full max-w-2xl space-y-6">
        <AudioRecorder setTranscript={setTranscript} updateTranscripts={fetchTranscripts} /> {/* Pass updateTranscripts */}
        <NoteSaver transcript={transcript} onSave={fetchNotes} />
        <NoteList notes={notes} onDelete={handleDelete} />
        <TranscriptsList transcripts={transcripts} /> {/* Pass transcripts to TranscriptsList */}
      </div>
      <ToastContainer />
    </div>
  );
};

export default Home;
