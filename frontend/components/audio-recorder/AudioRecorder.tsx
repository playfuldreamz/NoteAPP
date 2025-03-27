'use client'; // Ensure this is a Client Component

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { Settings } from 'lucide-react'; // Only keep Settings icon if needed here

import { generateTranscriptTitle, enhanceTranscript, InvalidAPIKeyError } from '../../services/ai';
import { useTranscription } from '../../context/TranscriptionContext';
import type { TranscriptionResult, ProviderType } from '../../services/transcription/types';
import { TranscriptionProviderFactory } from '../../services/transcription/providerFactory';

// Import the new modular components
import RecordingControls from './RecordingControls';
import RecorderSettings from './RecorderSettings';
import TranscriptionDisplay from './TranscriptionDisplay';
import RecorderActions from './RecorderActions';

interface AudioRecorderContainerProps {
  setTranscript: React.Dispatch<React.SetStateAction<string>>; // Keep if parent needs final transcript
  updateTranscripts?: () => void; // Callback to refresh transcript list
  transcript?: string; // Existing transcript if any
}

const AudioRecorderContainer: React.FC<AudioRecorderContainerProps> = ({
  setTranscript,
  updateTranscripts,
  transcript: initialTranscript
}) => {
  // State for recording
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pausedTime, setPausedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  
  // State for transcription
  const [originalTranscript, setOriginalTranscript] = useState(initialTranscript || '');
  const [enhancedTranscript, setEnhancedTranscript] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showEnhanced, setShowEnhanced] = useState(false);
  
  // State for UI
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const providerInstanceRef = useRef<any>(null);
  
  // Get transcription context
  const transcriptionContext = useTranscription();
  const { 
    provider: selectedProvider, 
    getProviderSettings,
    isInitialized
  } = transcriptionContext;

  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        if (startTime) {
          const currentTime = Date.now();
          // Calculate elapsed time including any previous paused time
          // but don't count the time while paused
          const elapsed = Math.floor((currentTime - startTime) / 1000) + pausedTime;
          setElapsedTime(elapsed);
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused, startTime, pausedTime]);

  // Handle transcription results
  const handleResult = useCallback((result: TranscriptionResult) => {
    if (result.transcript) {
      // When we get a new transcript, we need to preserve any existing transcript
      // Only update if the new transcript is different to avoid unnecessary re-renders
      if (result.transcript !== originalTranscript) {
        setOriginalTranscript(result.transcript);
        setTranscript(result.transcript); // Update parent state if needed
      }
    }
  }, [setTranscript, originalTranscript]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    console.error('Transcription error:', error);
    toast.error(`Transcription error: ${error.message}`);
    stopRecording();
  }, []);

  // Start recording
  const startRecording = async () => {
    if (!isInitialized) {
      toast.error('Transcription provider not initialized');
      return;
    }

    // If already recording but paused, resume recording
    if (isRecording && isPaused) {
      setIsPaused(false);
      const now = Date.now();
      
      // When resuming, set the new startTime to now
      // We don't need to adjust pausedTime here as it's already accumulated
      setStartTime(now);
      setPauseStartTime(null);
      
      // Restart the transcription provider
      try {
        if (providerInstanceRef.current) {
          // Store the current transcript before restarting
          const currentTranscript = originalTranscript;
          
          // Set up result handler that preserves the existing transcript
          providerInstanceRef.current.onResult((result: TranscriptionResult) => {
            if (result.transcript) {
              // Combine the existing transcript with the new one
              const combinedTranscript = currentTranscript + " " + result.transcript;
              setOriginalTranscript(combinedTranscript);
              setTranscript(combinedTranscript);
            }
          });
          
          await providerInstanceRef.current.start();
        } else {
          // If provider was cleaned up, recreate it
          const apiKey = getProviderSettings(selectedProvider)?.apiKey;
          const provider = await TranscriptionProviderFactory.getProvider({ 
            type: selectedProvider, 
            apiKey: apiKey 
          });
          
          // Store the current transcript
          const currentTranscript = originalTranscript;
          
          // Set up result handler that preserves the existing transcript
          provider.onResult((result: TranscriptionResult) => {
            if (result.transcript) {
              // Combine the existing transcript with the new one
              const combinedTranscript = currentTranscript + " " + result.transcript;
              setOriginalTranscript(combinedTranscript);
              setTranscript(combinedTranscript);
            }
          });
          
          provider.onError(handleError);
          providerInstanceRef.current = provider;
          await provider.start();
        }
      } catch (error) {
        console.error('Failed to resume recording:', error);
        toast.error(`Failed to resume recording: ${(error as Error).message}`);
      }
      
      return;
    }

    // Check if provider requires API key
    if (selectedProvider !== 'webspeech') {
      const settings = getProviderSettings(selectedProvider);
      if (!settings?.apiKey) {
        toast.error(`API Key for ${selectedProvider} is required. Please configure it in settings.`);
        setShowSettings(true); // Open settings automatically
        return;
      }
      // Optionally add a check here if isKeyValid state is available and false
    }

    try {
      // Always re-initialize or get provider instance before starting
      const apiKey = getProviderSettings(selectedProvider)?.apiKey;
      const provider = await TranscriptionProviderFactory.getProvider({ 
        type: selectedProvider, 
        apiKey: apiKey 
      });
      
      providerInstanceRef.current = provider;

      provider.onResult(handleResult);
      provider.onError(handleError);

      await provider.start();
      setIsRecording(true);
      setIsPaused(false);
      setStartTime(Date.now());
      setPausedTime(0); // Reset paused time when starting a new recording
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error(`Failed to start recording: ${(error as Error).message}`);
    }
  };

  // Pause recording
  const pauseRecording = async () => {
    if (!isRecording || isPaused) return;
    
    if (providerInstanceRef.current) {
      try {
        // Stop the provider temporarily
        await providerInstanceRef.current.stop();
        
        // When pausing, we need to:
        // 1. Calculate how much time has elapsed since we started/resumed recording
        // 2. Add this to our accumulated pausedTime
        if (startTime) {
          const currentTime = Date.now();
          const elapsedSinceStart = Math.floor((currentTime - startTime) / 1000);
          // Update the pausedTime to include the time elapsed since we started/resumed
          setPausedTime(prev => prev + elapsedSinceStart);
        }
        
        // We'll keep the provider instance but mark as paused
        setIsPaused(true);
        setPauseStartTime(Date.now());
        
        // Clear the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (error) {
        console.error('Error pausing recording:', error);
      }
    }
  };

  // Stop recording
  const stopRecording = async () => {
    // If recording is paused, treat this as a full stop
    if (isRecording && isPaused) {
      if (providerInstanceRef.current) {
        providerInstanceRef.current = null;
      }
      
      setIsRecording(false);
      setIsPaused(false);
      setStartTime(null);
      setPauseStartTime(null);
      
      return;
    }
    
    // Normal stop recording flow
    if (providerInstanceRef.current) {
      try {
        await providerInstanceRef.current.stop();
        providerInstanceRef.current = null;
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setStartTime(null);
    setPauseStartTime(null);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Enhance transcript
  const handleEnhanceTranscript = async () => {
    if (!originalTranscript.trim()) {
      toast.info('Nothing to enhance. Record something first!');
      return;
    }
    
    setIsEnhancing(true);
    
    try {
      const result = await enhanceTranscript(originalTranscript);
      setEnhancedTranscript(result.enhanced);
      setShowEnhanced(true);
    } catch (error) {
      if (error instanceof InvalidAPIKeyError) {
        toast.error('Invalid API key. Please check your settings.');
        setShowSettings(true);
      } else {
        toast.error(`Error enhancing transcript: ${(error as Error).message}`);
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  // Save transcript
  const handleSaveTranscript = async () => {
    const transcriptToSave = showEnhanced && enhancedTranscript ? enhancedTranscript : originalTranscript;
    const title = await generateTranscriptTitle(transcriptToSave);
    
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You must be logged in to save transcripts');
        return;
      }
      
      const response = await fetch('http://localhost:5000/api/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          text: transcriptToSave, // Changed from 'content' to 'text' to match backend API
          duration: elapsedTime // Add recording duration if available
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save transcript');
      }
      
      toast.success('Transcript saved successfully!');
      
      // Reset states after saving
      setOriginalTranscript('');
      setEnhancedTranscript('');
      setShowEnhanced(false);
      setTranscript(''); // Clear parent state if needed
      
      // Refresh transcript list if callback provided
      if (updateTranscripts) {
        updateTranscripts();
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast.error(`Error saving transcript: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset transcript
  const handleResetTranscript = () => {
    setOriginalTranscript('');
    setEnhancedTranscript('');
    setShowEnhanced(false);
    setTranscript(''); // Clear parent state if needed
  };

  // Toggle between original and enhanced transcript
  const toggleTranscriptView = () => {
    if (enhancedTranscript) {
      setShowEnhanced(!showEnhanced);
    } else if (!showEnhanced) {
      toast.info('No enhanced transcript available. Click "Enhance" first.');
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <RecordingControls 
                        isRecording={isRecording}
                        isPaused={isPaused}
                        elapsedTime={elapsedTime}
                        onStart={startRecording}
                        onStop={stopRecording}
                        onPause={pauseRecording}
                    />
                    <RecorderSettings
                        showSettings={showSettings}
                        toggleSettings={() => setShowSettings(!showSettings)}
                    />
                </div>
            </div>
            
            <TranscriptionDisplay
                originalTranscript={originalTranscript}
                interimTranscript=""
                enhancedTranscript={enhancedTranscript}
                showEnhanced={showEnhanced}
                isEnhancing={isEnhancing}
                enhancementProgress={0}
            />
            
            <RecorderActions
                transcript={originalTranscript}
                isRecording={isRecording}
                isEnhancing={isEnhancing}
                isSaving={isLoading}
                canEnhance={true}
                onEnhance={handleEnhanceTranscript}
                onSave={handleSaveTranscript}
                onReset={handleResetTranscript}
            />
        </div>
    </div>
  );
};

export default AudioRecorderContainer;