import React, { useEffect, useState } from 'react';
import type { ProviderType } from '../../services/transcription/types';
import { useTranscription } from '../../context/TranscriptionContext';

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  'webspeech': 'Web Speech',
  'assemblyai': 'AssemblyAI',
  'deepgram': 'Deepgram',
  'whisper': 'Whisper',
  'azure': 'Azure Speech',
  'realtimestt': 'RealtimeSTT'
};

const ProviderIndicator: React.FC = () => {
  const { provider: selectedProvider, activeProvider, isInitialized } = useTranscription();
  const [isLoading, setIsLoading] = useState(true);

  // Handle loading state when initializing providers
  useEffect(() => {
    // Start with loading state when we're initializing or switching providers
    if (!isInitialized || selectedProvider !== activeProvider) {
      setIsLoading(true);
    } else {
      // Once initialization is complete, turn off loading state
      const timer = setTimeout(() => setIsLoading(false), 100); // Short delay for smoother transition
      return () => clearTimeout(timer);
    }
  }, [isInitialized, selectedProvider, activeProvider]);

  const getProviderDisplayName = (provider: ProviderType): string => {
    return PROVIDER_DISPLAY_NAMES[provider] || provider;
  };

  const getStatusColor = () => {
    if (isLoading) return 'bg-yellow-500 animate-pulse';
    return activeProvider === 'webspeech' ? 'bg-green-500' : 'bg-blue-500';
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium border border-gray-200 dark:border-gray-600">
      <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`}></div>
      <span className="text-gray-700 dark:text-gray-300">
        {isLoading 
          ? "Connecting..."
          : getProviderDisplayName(activeProvider)}
      </span>
    </div>
  );
};

export default ProviderIndicator;
