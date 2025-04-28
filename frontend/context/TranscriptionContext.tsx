'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ProviderType, ProviderConfig } from '../services/transcription/types';
import { TranscriptionProviderFactory } from '../services/transcription/providerFactory';
import { toast } from 'react-toastify';

interface ProviderOptionValue {
  value: string | number | boolean;
  label?: string;
  description?: string;
}

interface ProviderSettings {
  apiKey?: string;
  options?: Record<string, ProviderOptionValue>;
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
  'azure': 'Azure Speech',
  'realtimestt': 'RealtimeSTT (Local Server)'
};

export function TranscriptionProviderContext({ children }: { children: React.ReactNode }) {  const [currentProvider, setCurrentProvider] = useState<ProviderType>('realtimestt');
  const [activeProvider, setActiveProvider] = useState<ProviderType>('realtimestt');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [providerSettings, setProviderSettings] = useState<Record<ProviderType, ProviderSettings>>(() => {
    // Load saved settings from localStorage with user-specific scope
    const username = localStorage.getItem('username');
    const key = username ? `${PROVIDER_SETTINGS_KEY}_${username}` : PROVIDER_SETTINGS_KEY;
    const saved = localStorage.getItem(key);
    // Check for null, undefined, AND the literal string "undefined" before parsing
    return saved && saved !== 'undefined' ? JSON.parse(saved) : {};
  });
  
  // Available transcription providers
  const availableProviders: ProviderType[] = ['webspeech', 'assemblyai', 'deepgram', 'realtimestt'];

  // Reload settings when username changes
  useEffect(() => {
    const handleStorageChange = () => {
      const username = localStorage.getItem('username');
      const key = username ? `${PROVIDER_SETTINGS_KEY}_${username}` : PROVIDER_SETTINGS_KEY;
      const saved = localStorage.getItem(key);
      if (saved) {
        setProviderSettings(JSON.parse(saved));
      } else {
        // Initialize with empty settings for each provider
        const emptySettings: Record<ProviderType, ProviderSettings> = {
          'webspeech': {},
          'assemblyai': {},
          'deepgram': {},
          'whisper': {},
          'azure': {},
          'realtimestt': {}
        };
        setProviderSettings(emptySettings);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
      setError(error);
      
      // Special handling for RealtimeSTT failures to avoid excessive error messages
      if (type === 'realtimestt') {
        console.warn('RealtimeSTT server not available, falling back to WebSpeech provider');
        
        // Update state to reflect the fallback
        setCurrentProvider('webspeech');
        
        // Don't show error toast for initial fallback from RealtimeSTT on page load
        if (!window.location.pathname.includes('login')) {
          toast.info('RealtimeSTT server not available, using Web Speech instead');
        }
        
        // Fall back to WebSpeech
        initializeProvider('webspeech');
        return;
      }
      
      // Show error only for non-realtimestt providers
      toast.error(error.message);
      
      // Fall back to WebSpeech if available and not already trying it
      if (type !== 'webspeech') {
        console.warn('Falling back to WebSpeech provider');
        setCurrentProvider('webspeech');
        initializeProvider('webspeech');
      }
    }
  }, [providerSettings, currentProvider]);

  const updateProviderSettings = useCallback(async (type: ProviderType, settings: ProviderSettings, showToast = true) => {
    try {
      // Update local state first for immediate feedback
      setProviderSettings(prev => ({
        ...prev,
        [type]: settings
      }));

      // Save to database
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:5000/api/transcripts/transcription/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: type,
          settings: settings
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save provider settings');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Failed to save provider settings');
      }

      // Save to localStorage as backup
      const username = localStorage.getItem('username');
      if (username) {
        const key = `${PROVIDER_SETTINGS_KEY}_${username}`;
        localStorage.setItem(key, JSON.stringify(providerSettings));
      }

      if (showToast) {
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to update provider settings:', error);
      if (showToast) {
        toast.error('Failed to save settings to server. Your changes may not persist after refresh.');
      }
    }
  }, [providerSettings]);

  const getProviderSettings = useCallback((type: ProviderType) => {
    return providerSettings[type];
  }, [providerSettings]);

  // Load settings from database on mount and username change
  useEffect(() => {
    const loadSettingsFromDB = async () => {
      try {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        
        // Clear settings if user is logged out
        if (!token || !username) {          setProviderSettings({
            'webspeech': {},
            'assemblyai': {},
            'deepgram': {},
            'whisper': {},
            'azure': {},
            'realtimestt': {}
          });
          return;
        }

        const response = await fetch('http://localhost:5000/api/transcripts/transcription/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to load provider settings');
        }

        const data = await response.json();
        
        // Update settings directly instead of using updateProviderSettings
        setProviderSettings(prevSettings => ({
          ...prevSettings,
          ...data.settings
        }));
        
        // Save to localStorage
        const key = `${PROVIDER_SETTINGS_KEY}_${username}`;
        localStorage.setItem(key, JSON.stringify(data.settings));
      } catch (error) {
        console.error('Failed to load provider settings:', error);
        // Don't show error toast on logout
        if (localStorage.getItem('token')) {
          toast.error('Failed to load provider settings');
        }
      }
    };

    loadSettingsFromDB();
  }, []);  // Initialize provider on mount or when currentProvider changes
  useEffect(() => {
    // Initialize the selected provider
    let mounted = true;
    
    // Only initialize providers if we're not on login page to prevent unnecessary connections
    if (!window.location.pathname.includes('login')) {
      // Use timeout to delay initialization slightly, which helps prevent
      // multiple initializations during page transitions
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
