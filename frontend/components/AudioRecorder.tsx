import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LucideIcon, Mic, MicOff, Save, RotateCcw, Settings, RefreshCw, Loader, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { generateTranscriptTitle, enhanceTranscript, InvalidAPIKeyError } from '../services/ai';
import Link from 'next/link';
import { useTranscription } from '../context/TranscriptionContext';
import type { TranscriptionProvider, TranscriptionResult } from '../services/transcription/types';
import { TranscriptionProviderFactory } from '../services/transcription/providerFactory';

interface AudioRecorderProps {
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  updateTranscripts: () => void;
  transcript: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ setTranscript, updateTranscripts, transcript }) => {
  const { provider: selectedProvider, setProvider, availableProviders, getProviderSettings, updateProviderSettings } = useTranscription();
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
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const providerRef = useRef<TranscriptionProvider | null>(null);
  const originalTranscriptRef = useRef<HTMLDivElement>(null);
  const enhancedTranscriptRef = useRef<HTMLDivElement>(null);

  // Initialize transcription provider
  useEffect(() => {
    const initProvider = async () => {
      try {
        // Cleanup existing provider
        if (providerRef.current) {
          providerRef.current.cleanup();
        }

        // Get new provider instance
        const provider = await TranscriptionProviderFactory.getProvider({
          type: selectedProvider,
          apiKey: getProviderSettings(selectedProvider)?.apiKey
        });

        // Set up result handler
        provider.onResult((result: TranscriptionResult) => {
          if (result.isFinal) {
            setTranscript(prev => prev + result.transcript);
          } else {
            setInterimTranscript(result.transcript);
          }
        });

        // Set up error handler
        provider.onError((error: Error) => {
          console.error('Transcription error:', error);
          toast.error(`Transcription error: ${error.message}`);
          stopRecording();
        });

        providerRef.current = provider;
      } catch (error) {
        console.error('Failed to initialize provider:', error);
        toast.error('Failed to initialize speech recognition');
      }
    };

    initProvider();

    // Cleanup on unmount or provider change
    return () => {
      if (providerRef.current) {
        providerRef.current.cleanup();
      }
    };
  }, [selectedProvider, setTranscript, getProviderSettings]);

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

  const startRecording = async () => {
    if (providerRef.current && !isRecording) {
      try {
        await providerRef.current.start();
        setIsRecording(true);
        timerIntervalRef.current = setInterval(() => {
          setElapsedTime(prev => prev + 1);
        }, 1000);
      } catch (error) {
        console.error('Failed to start recording:', error);
        toast.error('Failed to start recording');
      }
    }
  };

  const stopRecording = async () => {
    if (providerRef.current && isRecording) {
      try {
        await providerRef.current.stop();
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
      setIsRecording(false);
      setInterimTranscript('');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const clearRecording = () => {
    setTranscript('');
    setElapsedTime(0);
    setInterimTranscript('');
    setEnhancedTranscript('');
    setShowEnhanced(false);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
          {isRecording && (
            <div className="ml-2 flex items-center text-sm font-medium text-gray-600">
              <span className="animate-pulse mr-2">●</span>
              {formatTime(elapsedTime)}
            </div>
          )}
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
          <div className="flex flex-col space-y-4">
            {/* Provider Selection */}
            <div className="flex flex-col space-y-2">
              <label htmlFor="provider-select" className="text-sm font-medium dark:text-gray-200">
                Transcription Provider
              </label>
              <select
                id="provider-select"
                value={selectedProvider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              >
                {availableProviders.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Settings */}
            {selectedProvider !== 'webspeech' && (
              <div className="flex flex-col space-y-2 border-t pt-4 dark:border-gray-600">
                <label htmlFor="api-key" className="text-sm font-medium dark:text-gray-200">
                  API Key
                </label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    id="api-key"
                    value={getProviderSettings(selectedProvider)?.apiKey || ''}
                    onChange={(e) => updateProviderSettings(selectedProvider, {
                      ...getProviderSettings(selectedProvider),
                      apiKey: e.target.value
                    })}
                    className="flex-1 p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                    placeholder={`Enter ${selectedProvider} API Key`}
                  />
                  <Link 
                    href={selectedProvider === 'assemblyai' ? 'https://www.assemblyai.com/dashboard/signup' : '#'}
                    target="_blank"
                    className="p-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Get API Key"
                  >
                    <Settings size={20} />
                  </Link>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedProvider === 'assemblyai' 
                    ? 'Get your API key from AssemblyAI dashboard'
                    : `API key required for ${selectedProvider}`}
                </p>
              </div>
            )}

            {/* Existing Settings */}
            <div className="border-t pt-4 dark:border-gray-600">
              <div className="flex items-center mb-4">
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

      <div className="flex items-center gap-4">
        <button 
          onClick={handleEnhanceTranscript}
          className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
            isRecording || !transcript || isEnhancing
              ? 'bg-green-200 dark:bg-green-900 text-green-50 dark:text-green-200 cursor-not-allowed'
              : 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 hover:shadow-md active:scale-[0.98]'
          }`}
          disabled={isRecording || !transcript || isEnhancing}
        >
          {isEnhancing ? (
            <>
              <Loader size={18} className="shrink-0 animate-spin" />
              <span>{Math.round(enhancementProgress * 100)}%</span>
            </>
          ) : (
            <>
              <RefreshCw size={18} className="shrink-0" />
              <span>Enhance</span>
            </>
          )}
        </button>

        <button
          onClick={handleSaveTranscript}
          className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
            isRecording || !transcript
              ? 'bg-blue-200 dark:bg-blue-900 text-blue-50 dark:text-blue-200 cursor-not-allowed'
              : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-md active:scale-[0.98]'
          }`}
          disabled={isRecording || !transcript}
        >
          {isSaving ? (
            <Loader size={18} className="shrink-0 animate-spin" />
          ) : (
            <Save size={18} className="shrink-0" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        <button
          onClick={clearRecording}
          className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
            'bg-gray-600 dark:bg-gray-500 text-white hover:bg-gray-700 dark:hover:bg-gray-600 hover:shadow-md active:scale-[0.98]'
          }`}
        >
          <RotateCcw size={18} className="shrink-0" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

export default AudioRecorder;
