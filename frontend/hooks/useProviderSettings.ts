import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import type { ProviderType } from '../services/transcription/types';

const PROVIDER_SETTINGS_KEY = 'transcription_provider_settings';

interface ProviderOptionValue {
  value: string | number | boolean;
  label?: string;
  description?: string;
}

export interface ProviderSettings {
  apiKey?: string;
  options?: Record<string, ProviderOptionValue>;
}

interface UseProviderSettingsResult {
  providerSettings: Record<ProviderType, ProviderSettings>;
  updateProviderSettings: (type: ProviderType, settings: ProviderSettings, showToast?: boolean) => Promise<void>;
  getProviderSettings: (type: ProviderType) => ProviderSettings | undefined;
  loadingSettings: boolean;
}

export function useProviderSettings(): UseProviderSettingsResult {
  const [providerSettings, setProviderSettings] = useState<Record<ProviderType, ProviderSettings>>(() => {
    // Load saved settings from localStorage with user-specific scope
    const username = localStorage.getItem('username');
    const key = username ? `${PROVIDER_SETTINGS_KEY}_${username}` : PROVIDER_SETTINGS_KEY;
    const saved = localStorage.getItem(key);
    // Check for null, undefined, AND the literal string "undefined" before parsing
    if (saved && saved !== 'undefined') {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  const [loadingSettings, setLoadingSettings] = useState(true);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const username = localStorage.getItem('username');
    const key = username ? `${PROVIDER_SETTINGS_KEY}_${username}` : PROVIDER_SETTINGS_KEY;
    localStorage.setItem(key, JSON.stringify(providerSettings));
  }, [providerSettings]);

  // Load settings from database on mount and username change
  useEffect(() => {
    const loadSettingsFromDB = async () => {
      try {
        setLoadingSettings(true);
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        
        // Clear settings if user is logged out
        if (!token || !username) {
          setProviderSettings({
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
        
        // Update settings directly
        setProviderSettings(prevSettings => ({
          ...prevSettings,
          ...data.settings
        }));
      } catch (error) {
        console.error('Failed to load provider settings:', error);
        // Don't show error toast on logout
        if (localStorage.getItem('token')) {
          toast.error('Failed to load provider settings');
        }
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettingsFromDB();
  }, []);

  // Handle storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const username = localStorage.getItem('username');
      const key = username ? `${PROVIDER_SETTINGS_KEY}_${username}` : PROVIDER_SETTINGS_KEY;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setProviderSettings(JSON.parse(saved));
        } catch {
          // Ignore parse errors
        }
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
      throw error;
    }
  }, [providerSettings]);

  const getProviderSettings = useCallback((type: ProviderType) => {
    return providerSettings[type];
  }, [providerSettings]);

  return {
    providerSettings,
    updateProviderSettings,
    getProviderSettings,
    loadingSettings
  };
}
