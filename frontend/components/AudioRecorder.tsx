import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify'; // Import toast
import 'react-toastify/dist/ReactToastify.css'; // Import styles

// Extend the Window interface to include SpeechRecognition
interface Window {
  SpeechRecognition: new () => SpeechRecognition;
  webkitSpeechRecognition: new () => SpeechRecognition;
}

// Type declarations for SpeechRecognition and SpeechRecognitionEvent
interface SpeechRecognition extends EventTarget {
  start(): void;
  stop(): void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface AudioRecorderProps {
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  updateTranscripts: () => void; // Updated prop for fetching transcripts
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ setTranscript, updateTranscripts }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setLocalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported in this browser.');
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Update state for interim and final transcripts
      if (finalTranscript) {
        setLocalTranscript(prevTranscript => prevTranscript + finalTranscript);
        setTranscript(prevTranscript => prevTranscript + finalTranscript);
      }

      // Show the interim transcript in real-time
      setInterimTranscript(interimTranscript);
    };

    recognitionInstance.onend = () => {
      if (isRecording) {
        recognitionInstance.start(); // Restart if still recording
      }
    };

    recognitionRef.current = recognitionInstance;
  }, [setTranscript]);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimTranscript(''); // Clear interim transcript on stop
    }
  };

  const handleSaveTranscript = () => {
    if (!transcript.trim()) {
      toast.error('Cannot save an empty transcript.'); // Notify user
      return;
    }

    const savedTranscripts = JSON.parse(localStorage.getItem('transcripts') || '[]');
    const transcriptExists = savedTranscripts.some((t: { text: string }) => t.text === transcript);

    if (!transcriptExists) {
      savedTranscripts.push({ date: new Date().toISOString(), text: transcript });
      localStorage.setItem('transcripts', JSON.stringify(savedTranscripts));
      updateTranscripts(); // Fetch latest transcripts in parent component
      toast.success('Transcript saved!'); // Use toast for notification
    } else {
      toast.info('This transcript has already been saved.'); // Notify if duplicate
    }
  };

  const handleResetTranscripts = () => {
    setLocalTranscript(''); // Clear local transcript state only
    setTranscript(''); // Clear transcript in parent component
    toast.success('Current transcript reset!'); // Notify user
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-4">Audio Recorder</h2>
      <div className="flex items-center">
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded-md transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {isRecording && <div className="ml-2 w-6 h-6 bg-red-600 rounded-full animate-pulse" />} {/* Increased size */}
      </div>
      <p className="mt-4">Transcript: {transcript} {interimTranscript}</p>
      <button 
        onClick={handleSaveTranscript}
        className={`bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors mt-4 ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isRecording}
      >
        Save Transcript
      </button>
      <button 
        onClick={handleResetTranscripts}
        className={`bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors mt-4 ml-2 ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isRecording}
      >
        Reset Current Transcript
      </button>
    </div>
  );
};

export default AudioRecorder;