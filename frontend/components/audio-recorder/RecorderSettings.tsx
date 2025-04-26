import React, { useState, useEffect } from 'react';
import { Loader, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranscription } from '../../context/TranscriptionContext';
import { useRecording } from '../../context/RecordingContext';
import { TranscriptionProviderFactory } from '../../services/transcription/providerFactory';
import type { ProviderType } from '../../services/transcription/types';

interface RecorderSettingsProps {
    showSettings: boolean;
    toggleSettings: () => void;
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  'webspeech': 'Web Speech',
  'assemblyai': 'AssemblyAI',
  'deepgram': 'Deepgram',
  'whisper': 'Whisper',
  'azure': 'Azure Speech',
  'realtimestt': 'RealtimeSTT (Local Server)'
};


const RecorderSettings: React.FC<RecorderSettingsProps> = ({ showSettings, toggleSettings }) => {
  const {
    provider: selectedProvider,
    setProvider,
    initializeProvider,
    availableProviders,
    getProviderSettings,
    updateProviderSettings,
    activeProvider,
  } = useTranscription();

  const { isRecording } = useRecording(); // Add this to get recording state

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);

  // Load saved API key when provider changes or settings are shown
  useEffect(() => {
    const settings = getProviderSettings(selectedProvider);
    if (settings?.apiKey) {
      setApiKeyInput(settings.apiKey);
      // Re-validate if settings are shown or provider changes
      if (showSettings) {
          validateKey(settings.apiKey, selectedProvider, false); // Don't show toast on initial load
      } else {
         setIsKeyValid(null); // Reset validation status when settings closed
      }
    } else {
      setApiKeyInput('');
      setIsKeyValid(null);
    }
  }, [selectedProvider, showSettings, getProviderSettings]);

  const validateKey = async (key: string, providerType: ProviderType, showSuccessToast = true) => {
    if (providerType === 'webspeech' || providerType === 'realtimestt') {
        setIsValidatingKey(true);
        try {
            if (providerType === 'realtimestt') {
                const provider = await TranscriptionProviderFactory.getProvider({ type: providerType });
                const isAvailable = await provider.isAvailable();
                setIsKeyValid(isAvailable);
                if (!isAvailable && showSuccessToast) {
                    toast.error('RealtimeSTT server is not available');
                }
                return isAvailable;
            }
            setIsKeyValid(true);
            return true;
        } finally {
            setIsValidatingKey(false);
        }
    }
    if (!key) {
        setIsKeyValid(null); // No key provided means neither valid nor invalid, just required
        return false;
    }

    setIsValidatingKey(true);
    setIsKeyValid(null);
    try {
      const providerInstance = await TranscriptionProviderFactory.getProvider({
        type: providerType,
        apiKey: key
      });
      const isAvailable = await providerInstance.isAvailable();
      setIsKeyValid(isAvailable);
      if (isAvailable && showSuccessToast) {
        toast.success('API key validated successfully!');
      } else if (!isAvailable) {
        toast.error('Invalid API key');
      }
      return isAvailable;
    } catch (error: any) {
      console.error('API key validation error:', error);
      setIsKeyValid(false);
      if (error.type === 'PAYMENT_REQUIRED') {
          toast.error(
            <div>
              <p>{error.message}</p>
              <a
                href={error.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline mt-2 block"
              >
                Add payment method →
              </a>
            </div>,
            { autoClose: false }
          );
      } else {
          toast.error('Invalid API key');
      }
      return false;
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleApplyKey = async () => {
    const isValid = await validateKey(apiKeyInput, selectedProvider);
    if (isValid) {
        await updateProviderSettings(selectedProvider, {
            ...getProviderSettings(selectedProvider),
            apiKey: apiKeyInput
        });
        // Re-initialize the provider with the new settings
        await initializeProvider(selectedProvider);
    }
  };

  const handleProviderChange = async (newProvider: ProviderType) => {
     setProvider(newProvider);
     const settings = getProviderSettings(newProvider);
     const newApiKey = settings?.apiKey || '';
     setApiKeyInput(newApiKey);
     // Validate the key for the new provider
     await validateKey(newApiKey, newProvider, false); // Don't show success toast on provider change
      // Only show info toast if key is missing for non-webspeech
      if (newProvider !== 'webspeech' && !newApiKey) {
          toast.info(`Please enter your ${PROVIDER_DISPLAY_NAMES[newProvider]} API key and click Apply.`);
      }
  };


  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 w-full">
      <div className="space-y-4">
        {/* Provider Selection */}
        <div>
          <label htmlFor="provider-select" className="block text-sm font-medium mb-1 dark:text-gray-200">
            Transcription Provider
          </label>
          <select
            id="provider-select"
            value={selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
            className={`w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm ${
              isRecording ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isRecording}
          >
            {availableProviders.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_DISPLAY_NAMES[p]}
              </option>
            ))}
          </select>
          <div className="flex items-center text-xs mt-1 h-4">
            {selectedProvider !== 'webspeech' && ( // Only show status for non-webspeech
              <>
                <span className="mr-1">Status:</span>
                {isValidatingKey ? (
                  <span className="flex items-center text-blue-500">
                    <Loader className="w-3 h-3 mr-1 animate-spin" /> Validating...
                  </span>
                ) : isKeyValid ? (
                  <span className="flex items-center text-green-500">
                    <Check className="w-3 h-3 mr-1" /> Valid
                  </span>
                ) : isKeyValid === false ? (
                  <span className="flex items-center text-red-500">
                    <AlertCircle className="w-3 h-3 mr-1" /> Invalid Key
                  </span>
                ) : (
                  <span className="flex items-center text-yellow-500">
                    <AlertCircle className="w-3 h-3 mr-1" /> Key Required
                  </span>
                )}
              </>
            )}
          </div>
        </div>        {/* Provider-specific Settings */}
        {selectedProvider !== 'webspeech' && selectedProvider !== 'realtimestt' && (
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium mb-1 dark:text-gray-200">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                id="api-key"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setIsKeyValid(null); // Reset validation status on change
                }}
                className={`flex-1 p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm ${
                  isRecording ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                placeholder={`Enter ${PROVIDER_DISPLAY_NAMES[selectedProvider]} API Key`}
                disabled={isRecording}
              />
              <button
                onClick={handleApplyKey}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  isValidatingKey || !apiKeyInput || isRecording
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                disabled={isValidatingKey || !apiKeyInput || isRecording}
              >
                {isValidatingKey ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  'Apply'
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* RealtimeSTT Info Message */}
        {selectedProvider === 'realtimestt' && (
          <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700 rounded">
            Connects to a local RealtimeSTT server process. Ensure the server is running at {process.env.NEXT_PUBLIC_STT_DATA_URL || 'ws://localhost:8012'}
          </div>
        )}
        {/* Placeholder for other settings like language, etc. */}
      </div>
      {isRecording && (
        <div className="mt-4 text-sm text-yellow-500 dark:text-yellow-400 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          Provider settings cannot be changed while recording
        </div>
      )}
    </div>
  );
};

export default RecorderSettings;