'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ProviderType } from '../services/transcription/types';
import { TranscriptionProviderFactory } from '../services/transcription/providerFactory';
import { useProviderSettings, ProviderSettings } from '../hooks/useProviderSettings';
import { useProviderInitialization } from '../hooks/useProviderInitialization';

interface TranscriptionContextType {
  provider: ProviderType;
  setProvider: (provider: ProviderType) => void;
  initializeProvider: (type: ProviderType) => Promise<void>;
  availableProviders: ProviderType[];
  isInitialized: boolean;
  error: Error | null;
  updateProviderSettings: (type: ProviderType, settings: ProviderSettings, showToast?: boolean) => Promise<void>;
  getProviderSettings: (type: ProviderType) => ProviderSettings | undefined;
  activeProvider: ProviderType;
}

const TranscriptionContext = createContext<TranscriptionContextType | undefined>(undefined);

// List of available providers
const availableProviders: ProviderType[] = ['webspeech', 'assemblyai', 'deepgram', 'realtimestt'];

export function TranscriptionProviderContext({ children }: { children: React.ReactNode }) {
  // Core provider state
  const [currentProvider, setCurrentProvider] = useState<ProviderType>('realtimestt');
  const [activeProvider, setActiveProvider] = useState<ProviderType>('realtimestt');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use our custom hooks
  const {
    updateProviderSettings,
    getProviderSettings
  } = useProviderSettings();

  const { initializeProvider } = useProviderInitialization({
    currentProvider,
    getProviderSettings,
    setActiveProvider,
    setIsInitialized,
    setError
  });

  // Initialize provider on mount or when currentProvider changes
  useEffect(() => {
    let mounted = true;
    
    // Only initialize providers if we're not on login page
    if (!window.location.pathname.includes('login')) {
      const timer = setTimeout(() => {
        if (mounted) {
          initializeProvider(currentProvider);
        }
      }, 500);
      
      return () => {
        mounted = false;
        clearTimeout(timer);
        TranscriptionProviderFactory.cleanup();
      };
    }
    
    return () => {
      mounted = false;
      TranscriptionProviderFactory.cleanup();
    };
  }, [initializeProvider, currentProvider]);

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
