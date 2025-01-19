import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LucideIcon, Mic, MicOff, Save, RotateCcw, Settings, RefreshCw, Loader } from 'lucide-react';
import { generateTranscriptTitle, enhanceTranscript } from '../services/ai';

interface Window {
  SpeechRecognition: new () => SpeechRecognition;
  webkitSpeechRecognition: new () => SpeechRecognition;
}

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
  updateTranscripts: () => void;
  transcript: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ setTranscript, updateTranscripts, transcript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [enhancedTranscript, setEnhancedTranscript] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [enhanceEnabled, setEnhanceEnabled] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(45);
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const originalTranscriptRef = useRef<HTMLDivElement>(null);
  const enhancedTranscriptRef = useRef<HTMLDivElement>(null);

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

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      setInterimTranscript(interimTranscript);
    };

    recognitionInstance.onend = () => {
      if (isRecording) {
        recognitionInstance.start();
      }
    };

    recognitionRef.current = recognitionInstance;
  }, [setTranscript]);

  // Auto-scroll original transcript
  useEffect(() => {
    if (originalTranscriptRef.current) {
      originalTranscriptRef.current.scrollTop = originalTranscriptRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  // Auto-scroll enhanced transcript
  useEffect(() => {
    if (enhancedTranscriptRef.current) {
      enhancedTranscriptRef.current.scrollTop = enhancedTranscriptRef.current.scrollHeight;
    }
  }, [enhancedTranscript]);

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
      setInterimTranscript('');
    }
  };

  const handleEnhanceTranscript = async () => {
    if (!transcript.trim()) {
      toast.error('Cannot enhance empty transcript');
      return;
    }

    setIsEnhancing(true);
    setEnhancementProgress(0);
    setShowEnhanced(true);

    try {
      const { enhanced, confidence } = await enhanceTranscript(
        transcript,
        (progress) => setEnhancementProgress(progress)
      );
      
      if (confidence >= confidenceThreshold) {
        setEnhancedTranscript(enhanced);
        toast.success(`Transcript enhanced with confidence: ${confidence}%`);
      } else {
        toast.warn(`Low confidence enhancement (${confidence}%). Keeping original transcript.`);
        setEnhancedTranscript(transcript);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error('Failed to enhance transcript');
      setEnhancedTranscript(transcript);
    } finally {
      setIsEnhancing(false);
      setEnhancementProgress(100);
    }
  };

  const handleSaveTranscript = async () => {
    const finalTranscript = enhanceEnabled && enhancedTranscript ? enhancedTranscript : transcript;
    
    if (!finalTranscript.trim()) {
      toast.error('Cannot save an empty transcript.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to save transcript');
      return;
    }

    try {
      const titleResponse = await fetch('http://localhost:5000/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: finalTranscript })
      });

      if (!titleResponse.ok) throw new Error('Failed to generate title');
      const titleData = await titleResponse.json();
      const generatedTitle = titleData.title || 'Untitled Transcript';

      const saveResponse = await fetch('http://localhost:5000/transcripts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: finalTranscript,
          title: generatedTitle
        })
      });

      if (saveResponse.ok) {
        toast.success('Transcript saved!');
        updateTranscripts();
      } else {
        const saveData = await saveResponse.json();
        toast.error(saveData.error || 'Failed to save transcript');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save transcript. Please try again');
    }
  };

  const handleResetTranscripts = () => {
    setTranscript('');
    setEnhancedTranscript('');
    setShowEnhanced(false);
    toast.success('Transcript reset!');
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-4 py-2 rounded-md transition-colors ${
              isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          {isRecording && <div className="ml-2 w-6 h-6 bg-red-600 rounded-full animate-pulse" />}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        >
          <Settings size={24} />
        </button>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="enhance-toggle"
              checked={enhanceEnabled}
              onChange={(e) => setEnhanceEnabled(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="enhance-toggle" className="text-sm dark:text-gray-200">
              Enable AI Enhancement
            </label>
          </div>
          <div className="flex items-center">
            <label htmlFor="confidence" className="text-sm dark:text-gray-200 mr-2">
              Confidence Threshold:
            </label>
            <input
              type="range"
              id="confidence"
              min="0"
              max="100"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-32"
            />
            <span className="ml-2 text-sm dark:text-gray-200">{confidenceThreshold}%</span>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <h3 className="text-sm font-medium mb-2 dark:text-gray-200">Original Transcript</h3>
            <div
              ref={originalTranscriptRef}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg h-[300px] overflow-y-auto scroll-smooth"
            >
              <p className="text-sm dark:text-gray-200">{transcript} {interimTranscript}</p>
            </div>
          </div>
          
          {showEnhanced && (
            <div className={`transition-all duration-500 ${showEnhanced ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium dark:text-gray-200">Enhanced Transcript</h3>
                {isEnhancing && (
                  <div className="flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Enhancing... {enhancementProgress}%
                    </span>
                  </div>
                )}
              </div>
              <div
                ref={enhancedTranscriptRef}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg h-[300px] overflow-y-auto scroll-smooth"
              >
                {isEnhancing ? (
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${enhancementProgress}%` }}
                    ></div>
                  </div>
                ) : (
                  <p className="text-sm dark:text-gray-200">{enhancedTranscript}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={handleEnhanceTranscript}
          className={`bg-purple-500 text-white px-4 py-2 rounded-md transition-colors ${
            (isRecording || !transcript.trim() || isEnhancing) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600'
          }`}
          disabled={isRecording || !transcript.trim() || isEnhancing}
        >
          {isEnhancing ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw size={20} className="mr-2" />
          )}
          {isEnhancing ? 'Enhancing...' : 'Enhance'}
        </button>
        <button 
          onClick={handleSaveTranscript}
          className={`bg-green-500 text-white px-4 py-2 rounded-md transition-colors ${
            isRecording ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
          }`}
          disabled={isRecording}
        >
          <Save size={20} className="mr-2" />
          Save
        </button>
        <button 
          onClick={handleResetTranscripts}
          className={`bg-yellow-500 text-white px-4 py-2 rounded-md transition-colors ${
            isRecording ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-600'
          }`}
          disabled={isRecording}
        >
          <RotateCcw size={20} className="mr-2" />
          Reset
        </button>
      </div>
    </div>
  );
};

export default AudioRecorder;
