import React, { useState, useEffect, useRef } from 'react';

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
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ setTranscript }) => {
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-4">Audio Recorder</h2>
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      <p className="mt-4">Transcript: {transcript} {interimTranscript}</p>
    </div>
  );
};

export default AudioRecorder;
