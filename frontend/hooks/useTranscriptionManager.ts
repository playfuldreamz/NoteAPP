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
  startTranscription: () => Promise<boolean>;
  stopTranscription: () => Promise<void>;
  pauseTranscription: () => Promise<void>;
  resumeTranscription: (existingTranscript: string) => Promise<boolean>;
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
    }

    // Check if provider requires API key
    if (selectedProvider !== 'webspeech') {
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
  const startTranscription = async (): Promise<boolean> => {
    const initialized = await initializeProvider();
    if (!initialized) return false;
    
    try {
      await providerInstanceRef.current.start();
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
    if (providerInstanceRef.current) {
      try {
        await providerInstanceRef.current.stop();
      } catch (error) {
        console.error('Error pausing transcription:', error);
      }
    }
  };

  // Resume transcription with existing transcript
  const resumeTranscription = async (existingTranscript: string): Promise<boolean> => {
    try {
      if (providerInstanceRef.current) {
        // Set up result handler that preserves the existing transcript
        providerInstanceRef.current.onResult((result: TranscriptionResult) => {
          if (result.transcript) {
            // Combine the existing transcript with the new one
            const combinedTranscript = existingTranscript + " " + result.transcript;
            setOriginalTranscript(combinedTranscript);
            if (onTranscriptUpdate) {
              onTranscriptUpdate(combinedTranscript);
            }
          }
        });
        
        await providerInstanceRef.current.start();
        return true;
      } else {
        // If provider was cleaned up, recreate it
        const initialized = await initializeProvider();
        if (!initialized) return false;
        
        // Set up result handler that preserves the existing transcript
        providerInstanceRef.current.onResult((result: TranscriptionResult) => {
          if (result.transcript) {
            // Combine the existing transcript with the new one
            const combinedTranscript = existingTranscript + " " + result.transcript;
            setOriginalTranscript(combinedTranscript);
            if (onTranscriptUpdate) {
              onTranscriptUpdate(combinedTranscript);
            }
          }
        });
        
        await providerInstanceRef.current.start();
        return true;
      }
    } catch (error) {
      console.error('Failed to resume transcription:', error);
      toast.error(`Failed to resume transcription: ${(error as Error).message}`);
      return false;
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
