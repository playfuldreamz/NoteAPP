'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { TranscriptionProvider, ProviderType, ProviderConfig } from '../services/transcription/types';
import { TranscriptionProviderFactory } from '../services/transcription/providerFactory';
import { toast } from 'react-toastify';

interface ProviderSettings {
  apiKey?: string;
  options?: Record<string, any>;
}

interface TranscriptionContextType {
  provider: ProviderType;
  setProvider: (provider: ProviderType) => void;
  initializeProvider: (type: ProviderType) => Promise<void>;
  availableProviders: ProviderType[];
  isInitialized: boolean;
  error: Error | null;
  updateProviderSettings: (type: ProviderType, settings: ProviderSettings) => Promise<void>;
  getProviderSettings: (type: ProviderType) => ProviderSettings | undefined;
  activeProvider: ProviderType;
}

const TranscriptionContext = createContext<TranscriptionContextType | undefined>(undefined);

const PROVIDER_SETTINGS_KEY = 'transcription_provider_settings';

const PROVIDER_DISPLAY_NAMES: Record<ProviderType, string> = {
  'webspeech': 'Web Speech',
  'assemblyai': 'AssemblyAI',
  'deepgram': 'Deepgram',
  'whisper': 'Whisper',
  'azure': 'Azure Speech'
};

export function TranscriptionProviderContext({ children }: { children: React.ReactNode }) {
  const [currentProvider, setCurrentProvider] = useState<ProviderType>('webspeech');
  const [activeProvider, setActiveProvider] = useState<ProviderType>('webspeech');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [providerSettings, setProviderSettings] = useState<Record<ProviderType, ProviderSettings>>(() => {
    // Load saved settings from localStorage with user-specific scope
    const username = localStorage.getItem('username');
    const key = username ? `${PROVIDER_SETTINGS_KEY}_${username}` : PROVIDER_SETTINGS_KEY;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  });
  
  // Available transcription providers
  const availableProviders: ProviderType[] = ['webspeech', 'assemblyai', 'deepgram'];

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const username = localStorage.getItem('username');
    const key = username ? `${PROVIDER_SETTINGS_KEY}_${username}` : PROVIDER_SETTINGS_KEY;
    localStorage.setItem(key, JSON.stringify(providerSettings));
  }, [providerSettings]);

  const initializeProvider = useCallback(async (type: ProviderType) => {
    try {
      setError(null);
      setIsInitialized(false);

      // Cleanup existing provider
      await TranscriptionProviderFactory.cleanup();

      // Get settings for the provider
      const settings = providerSettings[type];

      // For non-WebSpeech providers, verify API key exists
      if (type !== 'webspeech' && !settings?.apiKey) {
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
      // Only show toast when switching from one provider to another (not on initial load)
      if (currentProvider !== type) {
        toast.success(`Successfully switched to ${PROVIDER_DISPLAY_NAMES[type]} provider`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize provider');
      setError(error);
      toast.error(error.message);
      
      // Fall back to WebSpeech if available and not already trying it
      if (type !== 'webspeech') {
        console.warn('Falling back to WebSpeech provider');
        initializeProvider('webspeech');
      }
    }
  }, [providerSettings, currentProvider]);

  const updateProviderSettings = useCallback(async (type: ProviderType, settings: ProviderSettings) => {
    setProviderSettings(prev => ({
      ...prev,
      [type]: settings
    }));
  }, []);

  const getProviderSettings = useCallback((type: ProviderType) => {
    return providerSettings[type];
  }, [providerSettings]);

  // Initialize WebSpeech provider on mount
  useEffect(() => {
    if (currentProvider === 'webspeech') {
      initializeProvider('webspeech');
    }
    return () => {
      TranscriptionProviderFactory.cleanup();
    };
  }, [initializeProvider]);

  const value = {
    provider: currentProvider,
    setProvider: setCurrentProvider,
    initializeProvider,
    availableProviders,
    isInitialized,
    error,
    updateProviderSettings,
    getProviderSettings,
    activeProvider
  };

  return (
    <TranscriptionContext.Provider value={value}>
      {children}
    </TranscriptionContext.Provider>
  );
}

export function useTranscription() {
  const context = useContext(TranscriptionContext);
  if (context === undefined) {
    throw new Error('useTranscription must be used within a TranscriptionProviderContext');
  }
  return context;
}
