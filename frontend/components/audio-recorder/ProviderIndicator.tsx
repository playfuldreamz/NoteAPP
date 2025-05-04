import React from 'react';
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
  const { activeProvider, isInitializing } = useTranscription();

  const getProviderDisplayName = (provider: ProviderType): string => {
    return PROVIDER_DISPLAY_NAMES[provider] || provider;
  };

  const getStatusColor = () => {
    if (isInitializing) return 'bg-yellow-500 animate-pulse';
    return activeProvider === 'webspeech' ? 'bg-green-500' : 'bg-blue-500';
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium border border-gray-200 dark:border-gray-600">
      <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`}></div>
      <span className="text-gray-700 dark:text-gray-300">
        {isInitializing 
          ? "Checking..."
          : getProviderDisplayName(activeProvider)}
      </span>
    </div>
  );
};

export default ProviderIndicator;
