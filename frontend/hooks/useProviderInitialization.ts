import { useCallback } from 'react';
import { toast } from 'react-toastify';
import type { ProviderType, ProviderConfig } from '../services/transcription/types';
import { TranscriptionProviderFactory } from '../services/transcription/providerFactory';
import type { ProviderSettings } from './useProviderSettings';

const PROVIDER_DISPLAY_NAMES: Record<ProviderType, string> = {
  'webspeech': 'Web Speech',
  'assemblyai': 'AssemblyAI',
  'deepgram': 'Deepgram',
  'whisper': 'Whisper',
  'azure': 'Azure Speech',
  'realtimestt': 'RealtimeSTT (Local Server)'
};

interface UseProviderInitializationProps {
  currentProvider: ProviderType;
  getProviderSettings: (type: ProviderType) => ProviderSettings | undefined;
  setActiveProvider: (provider: ProviderType) => void;
  setCurrentProvider: (provider: ProviderType) => void; // Add setCurrentProvider
  setIsInitialized: (initialized: boolean) => void;
  setError: (error: Error | null) => void;
  setIsInitializing?: (isInitializing: boolean) => void; // Add optional initializing state
}

export function useProviderInitialization({
  currentProvider,
  getProviderSettings,
  setActiveProvider,
  setCurrentProvider,
  setIsInitialized,
  setError,
  setIsInitializing
}: UseProviderInitializationProps) {

  const initializeProvider = useCallback(async (type: ProviderType) => {
    try {
      if (setIsInitializing) {
        setIsInitializing(true);
      }
      
      setError(null);
      setIsInitialized(false);

      // Cleanup existing provider
      await TranscriptionProviderFactory.cleanup();

      // Get settings for the provider
      const settings = getProviderSettings(type);

      // For providers that require API keys, verify key exists
      if (type !== 'webspeech' && type !== 'realtimestt' && !settings?.apiKey) {
        throw new Error(`${type} API key is required`);
      }

      // Initialize new provider
      const config: ProviderConfig = {
        type,
        apiKey: settings?.apiKey,
        options: settings?.options
      };

      const provider = await TranscriptionProviderFactory.getProvider(config);

      // Check if provider is available
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        throw new Error(`Provider ${type} is not available`);
      }

      setIsInitialized(true);
      setActiveProvider(type);
      
      // Only show toast when explicitly switching providers (not on initial load or automatic fallback)
      if (currentProvider !== type && type !== 'webspeech' && !window.location.pathname.includes('login')) {
        toast.success(`Successfully switched to ${PROVIDER_DISPLAY_NAMES[type]} provider`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize provider');
      setError(error);        // Special handling for RealtimeSTT failures to avoid excessive error messages
      if (type === 'realtimestt') {
        console.warn('RealtimeSTT server not available, falling back to WebSpeech provider');
        
        // Update both active provider and current provider to reflect the fallback
        setActiveProvider('webspeech');
        
        // This was missing - also set the current provider (UI state) to match the active provider
        if (currentProvider === 'realtimestt') {
          setCurrentProvider('webspeech');
        }
        
        // Don't show error toast for initial fallback from RealtimeSTT on page load
        if (!window.location.pathname.includes('login')) {
          toast.info('RealtimeSTT server not available, using Web Speech instead');
        }
        
        // Fall back to WebSpeech
        return initializeProvider('webspeech');
      }
        // Show error only for non-realtimestt providers
      toast.error(error.message);
      
      // Fall back to WebSpeech if available and not already trying it
      if (type !== 'webspeech') {
        console.warn('Falling back to WebSpeech provider');
        setActiveProvider('webspeech');
        setCurrentProvider('webspeech');
        return initializeProvider('webspeech');
      }    } finally {
      // Set isInitializing to false after initialization completes, regardless of provider type
      if (setIsInitializing) {
        setIsInitializing(false);
      }
    }
  }, [currentProvider, getProviderSettings, setActiveProvider, setCurrentProvider, setIsInitialized, setError, setIsInitializing]);

  return { initializeProvider };
}
