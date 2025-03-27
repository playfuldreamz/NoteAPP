import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { toast } from 'react-toastify';
import { updateAIProvider, AIProvider, API_BASE } from '../../services/ai';
import { AIConfig, SavedAPIKeys } from './types';

interface AISettingsProps {
  selectedProvider: AIConfig;
  onClose: () => void;
  currentModel: string;
  modelSource: string;
}

const providerOptions = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' }
];

export const AISettings: React.FC<AISettingsProps> = ({
  selectedProvider,
  onClose,
  currentModel,
  modelSource
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tempProvider, setTempProvider] = useState<AIProvider>(selectedProvider.provider || 'gemini');
  const [apiKey, setApiKey] = useState(selectedProvider.apiKey || '');
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [savedApiKeys, setSavedApiKeys] = useState<SavedAPIKeys>({});

  const validateApiKey = (key: string | undefined, provider: AIProvider) => {
    if (!key) return false;
    
    if (provider === 'openai') {
      return key.length === 51 && key.startsWith('sk-');
    }
    if (provider === 'deepseek') {
      return key.length === 35 && key.startsWith('sk-');
    }
    if (provider === 'gemini') {
      return key.length === 39 && key.startsWith('AIza');
    }
    return false;
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const config = await updateAIProvider({
        provider: tempProvider,
        apiKey: apiKey,
      });
      
      // Update saved keys when saving
      const newSavedKeys = {
        ...savedApiKeys,
        [config.provider]: {
          key: config.apiKey,
          source: config.source
        }
      };
      setSavedApiKeys(newSavedKeys);
      saveApiKeysToStorage(newSavedKeys);
      toast.success('Settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Failed to update AI provider:', error);
      toast.error('Failed to update AI provider');
    } finally {
      setIsLoading(false);
    }
  };

  // Get user-specific storage key
  const getUserStorageKey = () => {
    const username = localStorage.getItem('username');
    return username ? `ai_provider_settings_${username}` : null;
  };

  // Save API keys to user-specific storage
  const saveApiKeysToStorage = (keys: SavedAPIKeys) => {
    const storageKey = getUserStorageKey();
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(keys));
    }
  };

  useEffect(() => {
    setIsKeyValid(validateApiKey(apiKey, tempProvider));
  }, [apiKey, tempProvider]);

  useEffect(() => {
    // Load saved keys from storage first
    const storageKey = getUserStorageKey();
    let existingSavedKeys = {};
    if (storageKey) {
      try {
        const storedKeys = localStorage.getItem(storageKey);
        if (storedKeys) {
          existingSavedKeys = JSON.parse(storedKeys);
        }
      } catch (error) {
        console.error('Error loading saved API keys:', error);
      }
    }

    // Merge current provider's key with existing saved keys
    setSavedApiKeys({
      ...existingSavedKeys,
      [selectedProvider.provider]: {
        key: selectedProvider.apiKey,
        source: selectedProvider.source
      }
    });
  }, [selectedProvider]);

  const handleProviderChange = (provider: { value: string; label: string }) => {
    setTempProvider(provider.value as AIProvider);
    setIsDropdownOpen(false);

    // Check if a saved API key exists for the new provider
    if (savedApiKeys[provider.value]) {
      setApiKey(savedApiKeys[provider.value].key || '');
    } else if (provider.value === selectedProvider.provider) {
      setApiKey(selectedProvider.apiKey || '');
    } else {
      setApiKey(''); // Set API key input to blank if no saved key
    }

    // Reset API key validation status when provider changes
    setIsKeyValid(false);
  };

  return (
    <div className="space-y-4">
      {apiKeyError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{apiKeyError}</p>
        </div>
      )}
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <div>
            <p className="text-gray-700 dark:text-gray-200">Current AI Provider</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedProvider.provider || 'Not Configured'} ({selectedProvider.source || 'env'})
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 flex items-center justify-between"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>{tempProvider === 'openai' ? 'OpenAI' : tempProvider === 'gemini' ? 'Gemini' : 'DeepSeek'}</span>
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isDropdownOpen && (
            <div className="absolute mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10">
              {providerOptions.map(provider => (
                <div 
                  key={provider.value}
                  className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => handleProviderChange(provider)}
                >
                  {provider.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {tempProvider === 'gemini' ? 'Gemini API Key' : 'API Key'}
        </label>
        <div className="relative">
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={`w-full px-3 py-2 border ${
              isKeyValid ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'
            } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-transparent selection:bg-blue-500 selection:text-transparent caret-gray-900 dark:caret-white font-mono`}
            style={{ caretColor: 'currentcolor' }}
            placeholder={
              tempProvider === 'gemini' 
                ? 'Enter your Gemini API key (starts with AIza)'
                : tempProvider === 'openai'
                  ? 'Enter your OpenAI API key (starts with sk-)'
                  : 'Enter your DeepSeek API key (starts with sk-)'
            }
            onFocus={(e) => e.target.placeholder = ''}
            onBlur={(e) => {
              if (!e.target.value) {
                e.target.placeholder = tempProvider === 'gemini' 
                  ? 'Enter your Gemini API key (starts with AIza)'
                  : tempProvider === 'openai'
                    ? 'Enter your OpenAI API key (starts with sk-)'
                    : 'Enter your DeepSeek API key (starts with sk-)';
              }
            }}
            disabled={isLoading}
          />
          {apiKey && (
            <div 
              className="absolute top-0 left-0 px-3 py-2 pointer-events-none text-sm font-mono"
              aria-hidden="true"
            >
              <span className="text-gray-900 dark:text-gray-100">{apiKey.slice(0, 5)}</span>
              <span className="text-gray-400">{'•'.repeat(Math.max(0, apiKey.length - 5))}</span>
            </div>
          )}
        </div>
        {!isKeyValid && apiKey && apiKey.length > 0 && (
          <p className="mt-2 text-sm text-red-600">
            {tempProvider === 'gemini'
              ? 'Gemini API keys start with "AIza" and are 39 characters long'
              : tempProvider === 'openai'
                ? 'OpenAI API keys start with "sk-" and are 51 characters long'
                : 'DeepSeek API keys start with "sk-" and are 32 characters long'}
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!isKeyValid || isLoading}
        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isLoading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

export default AISettings;