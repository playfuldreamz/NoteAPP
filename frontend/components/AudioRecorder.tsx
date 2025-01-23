import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LucideIcon, Mic, MicOff, Save, RotateCcw, Settings, RefreshCw, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { generateTranscriptTitle, enhanceTranscript, InvalidAPIKeyError } from '../services/ai';
import Link from 'next/link';

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
  const [confidenceThreshold, setConfidenceThreshold] = useState(3);
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState(0);
  const [isEnhancedCollapsed, setIsEnhancedCollapsed] = useState(false);
  const [isOriginalCollapsed, setIsOriginalCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  const [isManualScroll, setIsManualScroll] = useState(false);
  
  useEffect(() => {
    const transcriptElement = originalTranscriptRef.current;
    if (!transcriptElement) return;

    // Check if user has manually scrolled up
    const isNearBottom =
      transcriptElement.scrollHeight - transcriptElement.scrollTop <= transcriptElement.clientHeight + 50;

    // Only auto-scroll if near bottom or not manually scrolled
    if (!isManualScroll || isNearBottom) {
      transcriptElement.scrollTop = transcriptElement.scrollHeight;
      setIsManualScroll(false);
    }
  }, [transcript, interimTranscript]);

  // Handle manual scroll
  useEffect(() => {
    const transcriptElement = originalTranscriptRef.current;
    if (!transcriptElement) return;

    const handleScroll = () => {
      const isNearBottom =
        transcriptElement.scrollHeight - transcriptElement.scrollTop <= transcriptElement.clientHeight + 50;
      setIsManualScroll(!isNearBottom);
    };

    transcriptElement.addEventListener('scroll', handleScroll);
    return () => transcriptElement.removeEventListener('scroll', handleScroll);
  }, []);

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
        toast.success(`🎉 Transcript enhanced with ${confidence}% confidence!`);
      } else {
        toast.warn(`🤔 Low confidence enhancement (${confidence}%). Keeping original transcript.`);
        setEnhancedTranscript(transcript);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      if (error instanceof InvalidAPIKeyError) {
        toast.error(
          <div className="flex flex-col gap-2">
            <div>AI Provider API key is invalid or expired</div>
            <Link 
              href="/settings?tab=ai" 
              className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <Settings size={14} />
              Update API Key in Settings
            </Link>
          </div>,
          { autoClose: false, closeOnClick: false }
        );
      } else {
        toast.error('Failed to enhance transcript');
      }
      setEnhancedTranscript(transcript);
    } finally {
      setIsEnhancing(false);
      setEnhancementProgress(100);
    }
  };

  const handleSaveTranscript = async () => {
    setIsSaving(true);
    const finalTranscript = enhanceEnabled && enhancedTranscript ? enhancedTranscript : transcript;
    
    if (!finalTranscript.trim()) {
      toast.error('Cannot save an empty transcript.');
      setIsSaving(false);
      return;
    }

    try {
      let title = 'Untitled Transcript';
      try {
        title = await generateTranscriptTitle(finalTranscript);
      } catch (error) {
        console.error('Title generation error:', error);
        if (error instanceof InvalidAPIKeyError) {
          toast.error(
            <div className="flex flex-col gap-2">
              <div>AI Provider API key is invalid or expired</div>
              <Link 
                href="/settings?tab=ai" 
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                <Settings size={14} />
                Update API Key in Settings
              </Link>
            </div>,
            { autoClose: false, closeOnClick: false }
          );
        } else {
          toast.warning('Could not generate title. Using default title...');
        }
      }

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to save transcript');
        return;
      }

      try {
        const saveResponse = await fetch('http://localhost:5000/transcripts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: finalTranscript,
            title: title
          })
        });

        if (saveResponse.ok) {
          toast.success(`💾 Transcript saved successfully!`);
          updateTranscripts();
        } else {
          const saveData = await saveResponse.json();
          toast.error(`❌ Failed to save transcript: ${saveData.error || 'Please try again'}`);
        }
      } catch (error) {
        console.error('Save error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Please try again';
        toast.error(`❌ Failed to save transcript: ${errorMessage}`);
      } finally {
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save transcript');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTranscripts = () => {
    setTranscript('');
    setEnhancedTranscript('');
    setShowEnhanced(false);
    setIsEnhancedCollapsed(false);
    setIsOriginalCollapsed(false);
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
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center cursor-pointer" onClick={() => setIsOriginalCollapsed(!isOriginalCollapsed)}>
                <h3 className="text-sm font-medium dark:text-gray-200 mr-2">Original Transcript</h3>
                {isOriginalCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </div>
            </div>
            <div className={`transition-all duration-500 ${isOriginalCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[200px]'}`}>
              <div
                ref={originalTranscriptRef}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-y-auto scroll-smooth h-[200px]"
              >
                <p className="text-sm dark:text-gray-200">{transcript} {interimTranscript}</p>
              </div>
            </div>
          </div>
          
          {showEnhanced && (
            <div className={`transition-all duration-500 ${showEnhanced ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center cursor-pointer" onClick={() => setIsEnhancedCollapsed(!isEnhancedCollapsed)}>
                  <h3 className="text-sm font-medium dark:text-gray-200 mr-2">Enhanced Transcript</h3>
                  {isEnhancedCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
                {isEnhancing && (
                  <div className="flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Enhancing... {enhancementProgress}%
                    </span>
                  </div>
                )}
              </div>
              <div className={`transition-all duration-500 ${isEnhancedCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[300px]'}`}>
                <div
                  ref={enhancedTranscriptRef}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-y-auto scroll-smooth h-[200px]"
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
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={handleEnhanceTranscript}
          className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
            (isRecording || !transcript.trim() || isEnhancing) 
              ? 'bg-blue-200 dark:bg-blue-900 text-blue-50 dark:text-blue-200 cursor-not-allowed' 
              : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-md active:scale-[0.98]'
          }`}
          disabled={isRecording || !transcript.trim() || isEnhancing}
        >
          {isEnhancing ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw size={18} className="shrink-0" />
          )}
          <span>{isEnhancing ? 'Enhancing...' : 'Enhance'}</span>
        </button>
        
        <button
          onClick={handleSaveTranscript}
          className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
            isRecording || isSaving
              ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-50 dark:text-emerald-200 cursor-not-allowed'
              : 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 hover:shadow-md active:scale-[0.98]'
          }`}
          disabled={isRecording || isSaving}
        >
          {isSaving ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Save size={18} className="shrink-0" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>
        
        <button 
          onClick={handleResetTranscripts}
          className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
            isRecording
              ? 'bg-amber-200 dark:bg-amber-900 text-amber-50 dark:text-amber-200 cursor-not-allowed'
              : 'bg-amber-600 dark:bg-amber-500 text-white hover:bg-amber-700 dark:hover:bg-amber-600 hover:shadow-md active:scale-[0.98]'
          }`}
          disabled={isRecording}
        >
          <RotateCcw size={18} className="shrink-0" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

export default AudioRecorder;
