import { useState, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranscription } from '../context/TranscriptionContext';
import { TranscriptionProviderFactory } from '../services/transcription/providerFactory';
import type { TranscriptionResult, ProviderType, TranscriptionProvider } from '../services/transcription/types';
import { enhanceTranscript as enhanceTranscriptAPI, InvalidAPIKeyError } from '../services/ai';

interface UseTranscriptionManagerOptions {
  initialTranscript?: string;
  onTranscriptUpdate?: (transcript: string) => void;
}

interface UseTranscriptionManagerReturn {
  originalTranscript: string;
  enhancedTranscript: string;
  isEnhancing: boolean;
  showEnhanced: boolean;
  providerInstance: TranscriptionProvider | null;
  initializeProvider: () => Promise<boolean>;
  startTranscription: (mediaStream?: MediaStream) => Promise<boolean>;
  stopTranscription: () => Promise<void>;
  pauseTranscription: () => Promise<void>;
  resumeTranscription: (existingTranscript: string, mediaStream?: MediaStream) => Promise<boolean>;
  enhanceTranscript: () => Promise<void>;
  resetTranscript: () => void;
  setShowEnhanced: (show: boolean) => void;
}

export function useTranscriptionManager(options: UseTranscriptionManagerOptions = {}): UseTranscriptionManagerReturn {
  const { initialTranscript = '', onTranscriptUpdate } = options;
  
  // State for transcription
  const [originalTranscript, setOriginalTranscript] = useState(initialTranscript);
  const [enhancedTranscript, setEnhancedTranscript] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showEnhanced, setShowEnhanced] = useState(false);
    // Refs
  const providerInstanceRef = useRef<TranscriptionProvider | null>(null);
  
  // Get transcription context
  const { 
    provider: selectedProvider, 
    getProviderSettings,
    isInitialized
  } = useTranscription();

  // Handle transcription results
  const handleResult = useCallback((result: TranscriptionResult) => {
    if (result.transcript) {
      // When we get a new transcript, we need to preserve any existing transcript
      // Only update if the new transcript is different to avoid unnecessary re-renders
      if (result.transcript !== originalTranscript) {
        setOriginalTranscript(result.transcript);
        if (onTranscriptUpdate) {
          onTranscriptUpdate(result.transcript);
        }
      }
    }
  }, [onTranscriptUpdate, originalTranscript]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    console.error('Transcription error:', error);
    toast.error(`Transcription error: ${error.message}`);
    stopTranscription();
  }, []);

  // Initialize provider
  const initializeProvider = async (): Promise<boolean> => {
    if (!isInitialized) {
      toast.error('Transcription provider not initialized');
      return false;
    }    // Import isKeyRequiredProvider helper
    const isKeyRequiredProvider = (provider: ProviderType): boolean => {
      return provider !== 'webspeech' && provider !== 'realtimestt';
    };

    // Check if provider requires API key
    if (isKeyRequiredProvider(selectedProvider)) {
      const settings = getProviderSettings(selectedProvider);
      if (!settings?.apiKey) {
        toast.error(`API Key for ${selectedProvider} is required. Please configure it in settings.`);
        return false;
      }
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
      
      return true;
    } catch (error) {
      console.error('Failed to initialize provider:', error);
      toast.error(`Failed to initialize provider: ${(error as Error).message}`);
      return false;
    }
  };
  // Start transcription
  const startTranscription = async (mediaStream?: MediaStream): Promise<boolean> => {
    const initialized = await initializeProvider();
    if (!initialized) return false;
      try {
      if (!providerInstanceRef.current) {
        console.error('No provider instance available');
        return false;
      }

      // For RealtimeSTT, we need to pass the mediaStream
      if (selectedProvider === 'realtimestt') {
        if (!mediaStream) {
          console.error('MediaStream is required for RealtimeSTT provider');
          toast.error('Microphone stream not available');
          return false;
        }
        await providerInstanceRef.current.start(mediaStream);
      } else {
        // For other providers, use their standard start method
        await providerInstanceRef.current.start();
      }
      return true;
    } catch (error) {
      console.error('Failed to start transcription:', error);
      toast.error(`Failed to start transcription: ${(error as Error).message}`);
      return false;
    }
  };

  // Stop transcription
  const stopTranscription = async (): Promise<void> => {
    if (providerInstanceRef.current) {
      try {
        await providerInstanceRef.current.stop();
        providerInstanceRef.current = null;
      } catch (error) {
        console.error('Error stopping transcription:', error);
      }
    }
  };
  // Pause transcription
  const pauseTranscription = async (): Promise<void> => {
    // Store current transcript before pausing
    const currentTranscript = originalTranscript;
    
    if (providerInstanceRef.current && typeof providerInstanceRef.current.pause === 'function') {
      try {
        console.log(`useTranscriptionManager: Calling provider.pause() for ${providerInstanceRef.current.name}`);
        await providerInstanceRef.current.pause();
        // Store transcript in provider instance for resuming later
        providerInstanceRef.current.pausedTranscript = currentTranscript;
      } catch (error) {
        console.error('Error pausing transcription provider:', error);
        toast.error(`Failed to pause transcription: ${(error as Error).message}`);
      }
    } else {
      console.warn("useTranscriptionManager: Pause called but no provider or pause method available.");
      // For providers without native pause, we'll need to stop
      await stopTranscription();
    }
  };

  // Resume transcription with existing transcript
  const resumeTranscription = async (existingTranscript: string, mediaStream?: MediaStream): Promise<boolean> => {
    if (providerInstanceRef.current) {
      try {
        if (typeof providerInstanceRef.current.resume === 'function') {
          console.log(`useTranscriptionManager: Calling provider.resume() for ${providerInstanceRef.current.name}`);
          // Ensure we have the transcript stored before resuming
          if (!providerInstanceRef.current.pausedTranscript) {
            providerInstanceRef.current.pausedTranscript = existingTranscript;
          }
          await providerInstanceRef.current.resume();
          return true;
        } else {
          console.warn(`useTranscriptionManager: Provider ${providerInstanceRef.current.name} lacks .resume(), attempting restart with existing content.`);
          setOriginalTranscript(existingTranscript); // Store the existing transcript
          return await startTranscription(mediaStream);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('already started')) {
          // If already started, consider it a success
          return true;
        }
        console.error('Failed to resume transcription provider:', error);
        toast.error(`Failed to resume transcription: ${(error as Error).message}`);
        // If resume fails, try a restart as fallback
        setOriginalTranscript(existingTranscript);
        return await startTranscription(mediaStream);
      }
    } else {
      console.warn("useTranscriptionManager: Resume called but no provider available. Attempting full restart...");
      setOriginalTranscript(existingTranscript);
      return await startTranscription(mediaStream);
    }
  };

  // Enhance transcript
  const enhanceTranscript = async (): Promise<void> => {
    if (!originalTranscript || originalTranscript.trim() === '') {
      toast.info('No transcript to enhance');
      return;
    }

    try {
      setIsEnhancing(true);
      const enhanced = await enhanceTranscriptAPI(originalTranscript);
      // Make sure we're setting a string value, not an object
      setEnhancedTranscript(typeof enhanced === 'string' ? enhanced : enhanced.enhanced || '');
      setShowEnhanced(true);
    } catch (error) {
      console.error('Error enhancing transcript:', error);
      if (error instanceof InvalidAPIKeyError) {
        toast.error('Invalid API key for AI enhancement. Please check your settings.');
      } else {
        toast.error('Failed to enhance transcript');
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  // Reset transcript
  const resetTranscript = () => {
    setOriginalTranscript('');
    setEnhancedTranscript('');
    setShowEnhanced(false);
    if (onTranscriptUpdate) {
      onTranscriptUpdate('');
    }
  };

  return {
    originalTranscript,
    enhancedTranscript,
    isEnhancing,
    showEnhanced,
    providerInstance: providerInstanceRef.current,
    initializeProvider,
    startTranscription,
    stopTranscription,
    pauseTranscription,
    resumeTranscription,
    enhanceTranscript,
    resetTranscript,
    setShowEnhanced
  };
}
