import React from 'react';
import { Settings } from 'lucide-react';
import { useTranscription } from '../../context/TranscriptionContext';
import type { ProviderType } from '../../services/transcription/types';

interface ProviderIndicatorProps {
  toggleSettings: () => void;
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  'webspeech': 'Web Speech',
  'assemblyai': 'AssemblyAI',
  'deepgram': 'Deepgram',
  'whisper': 'Whisper',
  'azure': 'Azure Speech'
};

const ProviderIndicator: React.FC<ProviderIndicatorProps> = ({ toggleSettings }) => {
  const { provider: selectedProvider } = useTranscription();

  const getProviderDisplayName = (provider: ProviderType): string => {
    return PROVIDER_DISPLAY_NAMES[provider] || provider;
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium border border-gray-200 dark:border-gray-600">
        <div className={`w-1.5 h-1.5 rounded-full ${selectedProvider === 'webspeech' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
        <span className="text-gray-700 dark:text-gray-300">
          {getProviderDisplayName(selectedProvider)}
        </span>
      </div>
      <button
        onClick={toggleSettings}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        title="Transcription Settings"
      >
        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  );
};

export default ProviderIndicator;
