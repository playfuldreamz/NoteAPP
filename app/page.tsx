"use client";

import React, { useState } from 'react';
import AudioRecorder from '../components/AudioRecorder';
import NoteSaver from '../components/NoteSaver';
import NoteList from '../components/NoteList';

const Home = () => {
  const [transcript, setTranscript] = useState('');

  return (
    <div className="min-h-screen bg-off-white text-black flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to the Audio Note App</h1>
      <div className="w-full max-w-2xl">
        <AudioRecorder setTranscript={setTranscript} />
        <NoteSaver transcript={transcript} />
        <NoteList />
      </div>
    </div>
  );
};

export default Home;
