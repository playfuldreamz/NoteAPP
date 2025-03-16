import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LucideIcon, Mic, MicOff, Save, RotateCcw, Settings, RefreshCw, Loader, ChevronDown, ChevronUp, Trash2, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { generateTranscriptTitle, enhanceTranscript, InvalidAPIKeyError } from '../services/ai';
import SettingsModal from './settings/SettingsModal';
import Link from 'next/link';
import { useTranscription } from '../context/TranscriptionContext';
import type { TranscriptionProvider, TranscriptionResult } from '../services/transcription/types';
import { TranscriptionProviderFactory } from '../services/transcription/providerFactory';

interface AudioRecorderProps {
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  updateTranscripts: () => void;
  transcript: string;
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  'webspeech': 'Web Speech',
  'assemblyai': 'AssemblyAI',
  'deepgram': 'Deepgram',
  'whisper': 'Whisper',
  'azure': 'Azure Speech'
};

const AudioRecorder: React.FC<AudioRecorderProps> = ({ setTranscript, updateTranscripts, transcript }) => {
  const { 
    provider: selectedProvider, 
    setProvider, 
    initializeProvider,
    availableProviders, 
    getProviderSettings, 
    updateProviderSettings,
    isInitialized,
    error,
    activeProvider 
  } = useTranscription();
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
  const [startTime, setStartTime] = useState<number | null>(null);
   const [pausedTime, setPausedTime] = useState(0); // New state for paused time
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

        // For WebSpeech, initialize immediately. For others, wait for explicit initialization
        if (selectedProvider === 'webspeech') {
          const provider = await TranscriptionProviderFactory.getProvider({
            type: selectedProvider
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
        }
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
  }, [selectedProvider, setTranscript]);

  // Load saved API key when provider changes
  useEffect(() => {
    const settings = getProviderSettings(selectedProvider);
    if (settings?.apiKey) {
      setApiKeyInput(settings.apiKey);
      // Validate the saved key
      validateSavedKey(settings.apiKey);
    } else {
      setApiKeyInput('');
      setIsKeyValid(null);
    }
  }, [selectedProvider]);

  // Validate saved API key
  const validateSavedKey = async (key: string) => {
    setIsValidatingKey(true);
    try {
      const provider = await TranscriptionProviderFactory.getProvider({
        type: selectedProvider,
        apiKey: key
      });
      const isAvailable = await provider.isAvailable();
      setIsKeyValid(isAvailable);
      if (isAvailable) {
        toast.success('API key validated successfully!');
      } else {
        toast.error('Invalid API key');
      }
    } catch (error) {
      console.error('API key validation error:', error);
      setIsKeyValid(false);
      toast.error('Invalid API key');
    } finally {
      setIsValidatingKey(false);
    }
  };

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
    try {
      if (!isInitialized) {
        await initializeProvider(selectedProvider);
      }

      // Get new provider instance
      const provider = await TranscriptionProviderFactory.getProvider({
        type: selectedProvider,
        apiKey: getProviderSettings(selectedProvider)?.apiKey
      });

      // Set up result handler
      provider.onResult((result: TranscriptionResult) => {
        if (!result.isFinal) {
          setInterimTranscript(result.transcript);
        } else {
          setTranscript(prev => prev + ' ' + result.transcript);
          setInterimTranscript('');
        }
      });

      // Start recording
      await provider.start();
      providerRef.current = provider;
      setIsRecording(true);
      setStartTime(Date.now());
      
      // Start timer (now using pausedTime as base)
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording. Please check your settings and try again.');
      if (providerRef.current) {
        providerRef.current.cleanup();
        providerRef.current = null;
      }
    }
  };

  const stopRecording = async () => {
    if (providerRef.current) {
      await providerRef.current.stop();
      providerRef.current.cleanup();
      providerRef.current = null;
    }
    setIsRecording(false);
      if (selectedProvider === 'webspeech') {
        initializeProvider(selectedProvider);
      }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      // Save current time to pausedTime
       setPausedTime(elapsedTime);
    }
    setStartTime(null);

  };

  const clearRecording = () => {
    setTranscript('');
    setElapsedTime(0);
    setInterimTranscript('');
    setEnhancedTranscript('');
    setShowEnhanced(false);
    setPausedTime(0);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
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
        const toastId = toast.error(
          <div className="flex flex-col gap-2">
            <div>AI Provider API key is invalid or expired</div>
            <button
              onClick={() => {
                setShowSettings(true);
                toast.dismiss(toastId);
              }}
              className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <Settings size={14} />
              Update API Key in Settings
            </button>
          </div>,
          {
            autoClose: false,
            closeOnClick: false,
            onClick: () => {
              setShowSettings(true);
              toast.dismiss(toastId);
            }
          }
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
              <button 
                onClick={() => setShowSettings(true)}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                <Settings size={14} />
                Update API Key in Settings
              </button>
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
            title: title,
            duration: elapsedTime
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
    <>
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-lg ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          { (isRecording || elapsedTime > 0) && (
            <div className="flex items-center gap-2 text-gray-500">
              <span className="animate-pulse mr-2">●</span>
              {formatTime(isRecording ? elapsedTime : pausedTime)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-sm text-green-600 dark:text-green-400" style={{
              textShadow: '0 0 5px rgba(34, 197, 94, 0.3)'
            }}>
              {PROVIDER_DISPLAY_NAMES[activeProvider]}
            </span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label htmlFor="provider-select" className="block text-sm font-medium mb-1 dark:text-gray-200">
                Transcription Provider
              </label>
              <div className="flex flex-col space-y-2">
                <select
                  id="provider-select"
                  value={selectedProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value as any;
                    setProvider(newProvider);
                    setIsKeyValid(null);
                    // Only show the enter API key toast if there's no saved key
                    const settings = getProviderSettings(newProvider);
                    if (newProvider !== 'webspeech' && !settings?.apiKey) {
                      toast.info(`Please enter your ${newProvider} API key and click Apply to start using it.`);
                    }
                  }}
                  className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                >
                  {availableProviders.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
                <div className="flex items-center text-sm">
                  <span className="mr-2">Current Status:</span>
                  {selectedProvider === 'webspeech' ? (
                    <span className="flex items-center text-green-500">
                      <Check className="w-4 h-4 mr-1" />
                      Ready
                    </span>
                  ) : isValidatingKey ? (
                    <span className="flex items-center text-blue-500">
                      <Loader className="w-4 h-4 mr-1 animate-spin" />
                      Validating API Key
                    </span>
                  ) : isKeyValid ? (
                    <span className="flex items-center text-green-500">
                      <Check className="w-4 h-4 mr-1" />
                      API Key Valid
                    </span>
                  ) : isKeyValid === false ? (
                    <span className="flex items-center text-red-500">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Invalid API Key
                    </span>
                  ) : (
                    <span className="flex items-center text-gray-500">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      API Key Required
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Provider-specific Settings */}
            {selectedProvider !== 'webspeech' && (
              <div>
                <label htmlFor="api-key" className="block text-sm font-medium mb-1 dark:text-gray-200">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    id="api-key"
                    value={apiKeyInput}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      setApiKeyInput(newKey);
                      setIsKeyValid(null);
                    }}
                    className="flex-1 p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                    placeholder={`Enter ${selectedProvider} API Key`}
                  />
                  <button
                    onClick={async () => {
                      setIsValidatingKey(true);
                      try {
                        // First validate the key
                        const provider = await TranscriptionProviderFactory.getProvider({
                          type: selectedProvider,
                          apiKey: apiKeyInput
                        });
                        
                        const isAvailable = await provider.isAvailable();
                        if (!isAvailable) {
                          throw new Error('Invalid API key');
                        }

                        // If validation successful, save settings
                        await updateProviderSettings(selectedProvider, {
                          ...getProviderSettings(selectedProvider),
                          apiKey: apiKeyInput
                        });

                        // Initialize the provider
                        await initializeProvider(selectedProvider);
                        setIsKeyValid(true);
                        toast.success('API key validated successfully!');
                      } catch (error: any) {
                        setIsKeyValid(false);
                        if (error.type === 'PAYMENT_REQUIRED') {
                          toast.error(
                            <div>
                              <p>{error.message}</p>
                              <a 
                                href={error.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 underline mt-2 block"
                              >
                                Add payment method →
                              </a>
                            </div>,
                            { autoClose: false }
                          );
                        } else {
                          toast.error('Invalid API key');
                        }
                      } finally {
                        setIsValidatingKey(false);
                      }
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isValidatingKey
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                    disabled={isValidatingKey}
                  >
                    {isValidatingKey ? (
                      <div className="flex items-center">
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Validating...
                      </div>
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Transcription Settings */}
            {selectedProvider === 'webspeech' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="enhance-toggle"
                    checked={enhanceEnabled}
                    onChange={(e) => setEnhanceEnabled(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="enhance-toggle" className="text-sm dark:text-gray-200">
                    Enable AI Enhancement
                  </label>
                </div>
                <div className="space-y-2">
                  <label htmlFor="confidence" className="block text-sm dark:text-gray-200">
                    Confidence Threshold: {confidenceThreshold}%
                  </label>
                  <input
                    type="range"
                    id="confidence"
                    min="0"
                    max="100"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      <div className="flex items-center gap-4">
        {activeProvider === 'webspeech' && (
          <button 
            onClick={handleEnhanceTranscript}
            className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
              !transcript || isEnhancing
                ? 'bg-green-200 dark:bg-green-900 text-green-50 dark:text-green-200 cursor-not-allowed'
                : 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 hover:shadow-md active:scale-[0.98]'
            }`}
            disabled={!transcript || isEnhancing}
            title={transcript ? 'Enhance transcript' : 'No transcript to enhance'}
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
        )}
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
    <SettingsModal
      isOpen={showSettings}
      onClose={() => setShowSettings(false)}
      setUsername={() => {}}
      currentModel=""
      modelSource=""
    />
    </>
  );
};

export default AudioRecorder;
