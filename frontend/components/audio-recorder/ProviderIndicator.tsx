import React from 'react';
import type { ProviderType } from '../../services/transcription/types';
import { useTranscription } from '../../context/TranscriptionContext';

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  'webspeech': 'Web Speech',
  'assemblyai': 'AssemblyAI',
  'deepgram': 'Deepgram',
  'whisper': 'Whisper',
  'azure': 'Azure Speech'
};

const ProviderIndicator: React.FC = () => {
  const { provider: selectedProvider } = useTranscription();

  const getProviderDisplayName = (provider: ProviderType): string => {
    return PROVIDER_DISPLAY_NAMES[provider] || provider;
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium border border-gray-200 dark:border-gray-600">
      <div className={`w-1.5 h-1.5 rounded-full ${selectedProvider === 'webspeech' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
      <span className="text-gray-700 dark:text-gray-300">
        {getProviderDisplayName(selectedProvider)}
      </span>
    </div>
  );
};

export default ProviderIndicator;
