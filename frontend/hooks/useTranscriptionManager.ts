import { useState, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranscription } from '../context/TranscriptionContext';
import { TranscriptionProviderFactory } from '../services/transcription/providerFactory';
import type { TranscriptionResult, ProviderType } from '../services/transcription/types';
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
  providerInstance: any;
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
  const providerInstanceRef = useRef<any>(null);
  
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
    if (providerInstanceRef.current && typeof providerInstanceRef.current.pause === 'function') {
      try {
        console.log("useTranscriptionManager: Calling provider.pause()"); // Added log
        await providerInstanceRef.current.pause(); // Call the new pause method
      } catch (error) {
        console.error('Error pausing transcription provider:', error);
      }
    } else {
        console.warn("useTranscriptionManager: Pause called but no provider or pause method available.");
    }
  };

  // Resume transcription with existing transcript
  const resumeTranscription = async (existingTranscript: string, mediaStream?: MediaStream): Promise<boolean> => {
    // NOTE: existingTranscript and mediaStream might not be needed if provider handles state internally
    if (providerInstanceRef.current && typeof providerInstanceRef.current.resume === 'function') {
      try {
        console.log("useTranscriptionManager: Calling provider.resume()"); // Added log
        await providerInstanceRef.current.resume(); // Call the new resume method
        
        // Re-attach result handler just in case? (May not be necessary if provider state persists)
        // providerInstanceRef.current.onResult(handleResult); 
        // providerInstanceRef.current.onError(handleError);

        return true;
      } catch (error) {
        console.error('Failed to resume transcription provider:', error);
        toast.error(`Failed to resume transcription: ${(error as Error).message}`);
        return false;
      }
    } else {
      console.warn("useTranscriptionManager: Resume called but no provider or resume method available. Attempting full restart...");
      // Fallback: If pause/resume isn't supported or provider was lost, try a full restart
      // This might lose the existing transcript context depending on provider implementation
      setOriginalTranscript(existingTranscript); // Ensure existing transcript is preserved in state
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
