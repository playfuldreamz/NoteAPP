"use client";

import React, { useState } from 'react';
import AudioRecorder from '../components/AudioRecorder';
import NoteSaver from '../components/NoteSaver';
import NoteList from '../components/NoteList';

const Home = () => {
  const [transcript, setTranscript] = useState('');

  return (
    <div>
      <h1>Welcome to the Audio Note App</h1>
      <AudioRecorder setTranscript={setTranscript} />
      <NoteSaver transcript={transcript} />
      <NoteList />
    </div>
  );
};

export default Home;
