import React, { useState, useEffect, useRef } from 'react';
import { Globe, Search, Cpu, Cloud } from 'lucide-react';
import { toast } from 'react-toastify';
import EmbeddingRegenerationConfirmation from './EmbeddingRegenerationConfirmation';
import { 
  updateAIProvider, 
  getAIProvider,
  getEmbeddingProvider,
  updateEmbeddingProvider, 
  getOpenAIKeyStatus,
  getMaskedApiKey,
  AIProvider, 
  EmbeddingProvider, 
  API_BASE 
} from '../../services/ai';
import { AIConfig, SavedAPIKeys } from './types';

interface AISettingsProps {
  selectedProvider: AIConfig;
  onClose: () => void;
  currentModel: string;
  modelSource: string;
}

interface EmbeddingConfigState {
  provider: EmbeddingProvider;
  source: string;
}

const providerOptions = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' }
];

const embeddingProviderOptions = [
  { value: 'xenova', label: 'Local Model (Xenova)' },
  { value: 'openai', label: 'OpenAI' }
];

export const AISettings: React.FC<AISettingsProps> = ({
  selectedProvider,
  onClose,
  currentModel,
  modelSource
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'generative' | 'embedding'>('generative');
  
  // Generative AI states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tempProvider, setTempProvider] = useState<AIProvider>(selectedProvider.provider || 'gemini');
  const [apiKey, setApiKey] = useState(selectedProvider.apiKey || '');
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [savedApiKeys, setSavedApiKeys] = useState<SavedAPIKeys>({});
  
  // Embedding provider states
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfigState>({ 
    provider: 'xenova', 
    source: 'default' 
  });
  const [isEmbeddingDropdownOpen, setIsEmbeddingDropdownOpen] = useState(false);
  const [isEmbeddingLoading, setIsEmbeddingLoading] = useState(false);
  const [openAIKeyStatus, setOpenAIKeyStatus] = useState<{ available: boolean, source: 'user' | 'env' | null, valid: boolean, error?: string } | null>(null);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [showRegenerationConfirmation, setShowRegenerationConfirmation] = useState(false);
  const [originalEmbeddingProvider, setOriginalEmbeddingProvider] = useState<EmbeddingProvider>('xenova');

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

  // Check if the current embedding configuration is valid
  const isEmbeddingConfigValid = () => {
    // Xenova is always valid as it's a local provider
    if (embeddingConfig.provider === 'xenova') {
      return true;
    }
    
    // For OpenAI, check if a valid key is available
    if (embeddingConfig.provider === 'openai') {
      return openAIKeyStatus?.available === true;
    }
    
    // For future providers, add validation here
    
    // Default to true for unknown providers to avoid blocking UI
    return true;
  };
  
  // Check if the current generative AI configuration is valid
  const isGenerativeConfigValid = () => {
    // If we're using an environment key, check if it's valid
    if (tempProvider === 'openai' && openAIKeyStatus?.available && openAIKeyStatus.source === 'env') {
      return openAIKeyStatus.valid !== false; // If valid is undefined or true, return true
    }
    
    // Otherwise, we need a valid API key
    return isKeyValid;
  };

  // Track if this is the initial load
  const isInitialLoad = useRef(true);
  
  // Track the last validated provider to avoid redundant validations
  const lastValidatedProvider = useRef<AIProvider | null>(null);
  
  useEffect(() => {
    // Load saved API keys from localStorage
    const savedKeys = localStorage.getItem('savedApiKeys');
    if (savedKeys) {
      try {
        const parsedKeys = JSON.parse(savedKeys) as SavedAPIKeys;
        setSavedApiKeys(parsedKeys);
      } catch (e) {
        console.error('Error parsing saved API keys:', e);
      }
    }
    
    // Validate the current API key based on format
    setIsKeyValid(validateApiKey(apiKey, tempProvider));
    
    // Load embedding configuration
    const fetchEmbeddingConfig = async () => {
      try {
        const config = await getEmbeddingProvider();
        setEmbeddingConfig({
          provider: config.provider,
          source: config.source
        });
        setOriginalEmbeddingProvider(config.provider);
      } catch (error) {
        console.error('Error fetching embedding config:', error);
        // Default to Xenova if there's an error
        setEmbeddingConfig({
          provider: 'xenova',
          source: 'default'
        });
        setOriginalEmbeddingProvider('xenova');
      }
    };
    
    // Check OpenAI key status - only when needed
    const fetchOpenAIKeyStatus = async () => {
      try {
        // Set to loading state first
        setOpenAIKeyStatus({ available: false, source: null, valid: false, error: 'Checking API key status...' });
        const status = await getOpenAIKeyStatus();
        setOpenAIKeyStatus(status);
      } catch (error) {
        console.error('Error fetching OpenAI key status:', error);
        setOpenAIKeyStatus({ available: false, source: null, valid: false, error: 'Failed to check key status' });
      }
    };
    
    // Load current AI provider configuration
    const fetchCurrentConfig = async () => {
      try {
        const config = await getAIProvider();
        
        // Get a securely masked version of the API key from the backend
        if (config.provider) {
          const maskedKeyInfo = await getMaskedApiKey(config.provider);
          
          if (maskedKeyInfo.available && maskedKeyInfo.maskedKey) {
            setApiKey(maskedKeyInfo.maskedKey);
            
            // Save the masked key info to the savedApiKeys state
            setSavedApiKeys(prev => ({
              ...prev,
              [config.provider]: { 
                key: maskedKeyInfo.maskedKey, 
                source: maskedKeyInfo.source || 'user' 
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching current AI config:', error);
      }
    };
    
    // Initial load - fetch all data
    if (isInitialLoad.current) {
      fetchEmbeddingConfig();
      fetchCurrentConfig();
      
      // Only validate OpenAI key on initial load if OpenAI is the selected provider
      if (tempProvider === 'openai') {
        fetchOpenAIKeyStatus();
        lastValidatedProvider.current = 'openai';
      }
      
      isInitialLoad.current = false;
    } else {
      // On subsequent renders, only validate if the provider changed to OpenAI
      // or if the API key was manually changed while OpenAI is selected
      const providerChanged = tempProvider !== lastValidatedProvider.current;
      
      if (tempProvider === 'openai' && (providerChanged || apiKey !== '')) {
        fetchOpenAIKeyStatus();
        lastValidatedProvider.current = 'openai';
      }
    }
  }, [apiKey, tempProvider]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Handle the case where we're using an environment API key
      if (tempProvider === 'openai' && openAIKeyStatus && openAIKeyStatus.available && openAIKeyStatus.source === 'env' && (!apiKey || apiKey === 'your-api-key')) {
        // We can use the environment key, so we'll send an empty string as the API key
        // The backend will handle this special case
        await updateAIProvider({
          provider: tempProvider,
          apiKey: ''
        });
      } else if (tempProvider === 'gemini' && (!apiKey || apiKey === 'your-api-key')) {
        // We'll let the backend check if there's a Gemini key in the environment
        // Similar handling for Gemini if needed
        await updateAIProvider({
          provider: tempProvider,
          apiKey: ''
        });
      } else {
        // Normal case - user is providing their own API key
        await updateAIProvider({
          provider: tempProvider,
          apiKey: apiKey
        });
      }
      
      // Update embedding provider if it has changed
      await updateEmbeddingProvider({
        provider: embeddingConfig.provider
      });
      
      // Save the API key to localStorage if it's valid
      if (isKeyValid) {
        const updatedKeys: SavedAPIKeys = { 
          ...savedApiKeys, 
          [tempProvider]: { 
            key: apiKey, 
            source: 'user' 
          } 
        };
        localStorage.setItem('savedApiKeys', JSON.stringify(updatedKeys));
        setSavedApiKeys(updatedKeys);
      }
      
      // Check if embedding provider has changed and show regeneration confirmation
      if (embeddingConfig.provider !== originalEmbeddingProvider) {
        setShowRegenerationConfirmation(true);
        return; // Don't close the dialog yet
      }
      
      toast.success('AI settings updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating AI settings:', error);
      toast.error('Failed to update AI settings');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegenerationClose = () => {
    setShowRegenerationConfirmation(false);
    toast.success('AI settings updated successfully');
    onClose();
  };
  
  // Handle modal close without saving
  const handleClose = () => {
    // Reset embedding provider to original value if it was changed but not saved
    if (embeddingConfig.provider !== originalEmbeddingProvider) {
      setEmbeddingConfig({
        ...embeddingConfig,
        provider: originalEmbeddingProvider
      });
    }
    onClose();
  };

  return (
    <div className="space-y-4 w-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          className={`py-2 px-4 font-medium text-sm ${activeTab === 'generative' 
            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('generative')}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Generative AI
          </div>
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${activeTab === 'embedding' 
            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('embedding')}
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Embedding & Search
          </div>
        </button>
      </div>

      {/* Generative AI Settings */}
      {activeTab === 'generative' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Current model: <span className="font-semibold">{currentModel}</span>{' '}
              <span className="text-xs ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                {modelSource}
              </span>
            </p>

            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">
                AI Provider
              </label>
              <div className="relative">
                <div 
                  className="border border-gray-300 dark:border-gray-600 rounded p-2 flex justify-between items-center cursor-pointer bg-white dark:bg-gray-700"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className="text-gray-800 dark:text-white">
                    {providerOptions.find(option => option.value === tempProvider)?.label || 'Select Provider'}
                  </span>
                  <svg className="h-4 w-4 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {isDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
                    {providerOptions.map(option => (
                      <div 
                        key={option.value} 
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-white"
                        onClick={async () => {
                          const newProvider = option.value as AIProvider;
                          setTempProvider(newProvider);
                          setIsDropdownOpen(false);
                          
                          // Reset editing state when switching providers
                          setIsEditingKey(false);
                          
                          try {
                            // Get a securely masked version of the API key from the backend
                            const maskedKeyInfo = await getMaskedApiKey(newProvider);
                            console.log('Got masked key info:', maskedKeyInfo);
                            
                            // Update OpenAI key status if needed
                            if (newProvider === 'openai') {
                              // Set to loading state first
                              setOpenAIKeyStatus({ available: false, source: null, valid: false, error: 'Checking API key status...' });
                              const status = await getOpenAIKeyStatus();
                              setOpenAIKeyStatus(status);
                            } else {
                              // Clear OpenAI status when switching to other providers
                              setOpenAIKeyStatus(null);
                            }
                            
                            // Set the masked key if available
                            if (maskedKeyInfo.available && maskedKeyInfo.maskedKey) {
                              setApiKey(maskedKeyInfo.maskedKey);
                              
                              // Save to savedApiKeys
                              setSavedApiKeys(prev => ({
                                ...prev,
                                [newProvider]: { 
                                  key: maskedKeyInfo.maskedKey, 
                                  source: maskedKeyInfo.source || 'user' 
                                }
                              }));
                            } else {
                              // If no key is available, clear the input
                              setApiKey('');
                            }
                          } catch (error) {
                            console.error(`Error fetching masked key for ${newProvider}:`, error);
                            // If we have a saved API key for this provider, use it as fallback
                            if (savedApiKeys[newProvider]) {
                              setApiKey(savedApiKeys[newProvider].key);
                            } else {
                              setApiKey('');
                            }
                          }
                        }}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-2">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2 flex items-center">
                API Key
                {tempProvider === 'openai' && openAIKeyStatus?.available && (
                  <span className="text-xs ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                    {openAIKeyStatus.source}
                  </span>
                )}
              </label>
              
              {/* Show masked key display */}
              {apiKey && !isEditingKey && (
                <div 
                  className={`w-full p-2 border ${apiKeyError || (tempProvider === 'openai' && openAIKeyStatus?.valid === false) ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white flex justify-between items-center cursor-pointer`}
                  onClick={() => setIsEditingKey(true)}
                >
                  <div className="font-mono">
                    {/* For OpenAI keys */}
                    {tempProvider === 'openai' && apiKey.startsWith('sk-') && (
                      <>
                        <span className="text-gray-800 dark:text-white">sk-</span>
                        <span className="text-gray-500 dark:text-gray-400">{apiKey.substring(3, 7)}</span>
                        <span className="text-gray-400 dark:text-gray-500">{'•'.repeat(Math.max(10, apiKey.length - 11))}</span>
                        <span className="text-gray-500 dark:text-gray-400">{apiKey.substring(apiKey.length - 4)}</span>
                      </>
                    )}
                    
                    {/* For Gemini keys */}
                    {tempProvider === 'gemini' && (
                      <>
                        <span className="text-gray-800 dark:text-white">{apiKey.substring(0, 6)}</span>
                        <span className="text-gray-400 dark:text-gray-500">{'•'.repeat(Math.max(10, apiKey.length - 10))}</span>
                        <span className="text-gray-500 dark:text-gray-400">{apiKey.substring(apiKey.length - 4)}</span>
                      </>
                    )}
                    
                    {/* For other providers */}
                    {tempProvider !== 'openai' && tempProvider !== 'gemini' && apiKey.length >= 8 && (
                      <>
                        <span className="text-gray-800 dark:text-white">{apiKey.substring(0, 4)}</span>
                        <span className="text-gray-400 dark:text-gray-500">{'•'.repeat(Math.max(10, apiKey.length - 8))}</span>
                        <span className="text-gray-500 dark:text-gray-400">{apiKey.substring(apiKey.length - 4)}</span>
                      </>
                    )}
                    
                    {/* Fallback for short keys */}
                    {((tempProvider !== 'openai' && tempProvider !== 'gemini' && apiKey.length < 8) || 
                      (tempProvider === 'openai' && !apiKey.startsWith('sk-'))) && (
                      <span className="text-gray-500 dark:text-gray-400">{apiKey}</span>
                    )}
                  </div>
                  <span className="text-blue-500 text-xs">Edit</span>
                </div>
              )}
              
              {/* Show input field when editing or no key exists */}
              {(!apiKey || isEditingKey) && (
                <input
                  type="password"
                  className={`w-full p-2 border ${apiKeyError || (tempProvider === 'openai' && openAIKeyStatus?.valid === false) ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                  value={isEditingKey ? '' : apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setApiKeyError(null);
                  }}
                  onBlur={() => {
                    // If the field is empty and we're editing, go back to showing the masked key
                    if (isEditingKey && !apiKey) {
                      setIsEditingKey(false);
                    }
                    // If we entered a new key, exit edit mode
                    if (isEditingKey && apiKey) {
                      setIsEditingKey(false);
                    }
                  }}
                  placeholder={`Enter your ${tempProvider} API key`}
                  autoFocus={isEditingKey}
                />
              )}
              {apiKeyError && <p className="text-red-500 text-xs mt-1">{apiKeyError}</p>}
              {tempProvider === 'openai' && openAIKeyStatus?.error === 'Checking API key status...' && (
                <p className="text-gray-500 text-xs mt-1">
                  Checking API key status...
                </p>
              )}
              {tempProvider === 'openai' && openAIKeyStatus?.valid === false && (
                <p className="text-red-500 text-xs mt-1">
                  ⚠ The OpenAI API key is invalid: {openAIKeyStatus.error || 'Please check your key and try again.'}
                </p>
              )}
              {tempProvider === 'openai' && openAIKeyStatus?.valid === true && (
                <p className="text-green-500 text-xs mt-1">
                  ✓ OpenAI API key is valid
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your API key is stored securely in your browser and is only sent to the API provider.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Embedding Settings */}
      {activeTab === 'embedding' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">
                Embedding Provider
              </label>
              <div className="relative">
                <div 
                  className="border border-gray-300 dark:border-gray-600 rounded p-2 flex justify-between items-center cursor-pointer bg-white dark:bg-gray-700"
                  onClick={() => setIsEmbeddingDropdownOpen(!isEmbeddingDropdownOpen)}
                >
                  <span className="text-gray-800 dark:text-white">
                    {embeddingProviderOptions.find(option => option.value === embeddingConfig.provider)?.label || 'Select Provider'}
                  </span>
                  <svg className="h-4 w-4 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {isEmbeddingDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
                    {embeddingProviderOptions.map(option => (
                      <div 
                        key={option.value} 
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-white"
                        onClick={async () => {
                          const newProvider = option.value as EmbeddingProvider;
                          setEmbeddingConfig({
                            ...embeddingConfig,
                            provider: newProvider
                          });
                          setIsEmbeddingDropdownOpen(false);
                          
                          // Check OpenAI key status when OpenAI is selected
                          if (newProvider === 'openai') {
                            // Set to loading state first
                            setOpenAIKeyStatus({ available: false, source: null, valid: false, error: 'Checking API key status...' });
                            try {
                              const status = await getOpenAIKeyStatus();
                              setOpenAIKeyStatus(status);
                            } catch (error) {
                              console.error('Error fetching OpenAI key status:', error);
                              setOpenAIKeyStatus({ available: false, source: null, valid: false, error: 'Failed to check key status' });
                            }
                          }
                        }}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
              {embeddingConfig.provider === 'xenova' ? (
                <div className="flex items-start gap-3">
                  <Cpu className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1" />
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <p className="font-medium mb-1">Local Model (Xenova)</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Runs completely on the server - no API key required</li>
                      <li>Provides 384-dimensional embeddings</li>
                      <li>Ideal for privacy and offline use</li>
                      <li>First use requires downloading the model (~100MB)</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Cloud className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1" />
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <p className="font-medium mb-1">OpenAI</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Uses OpenAI's text-embedding models</li>
                      <li>Requires an OpenAI API key in server settings</li>
                      <li>Provides high-quality embeddings</li>
                      <li>Requires internet connection</li>
                    </ul>
                    
                    {(openAIKeyStatus === null || openAIKeyStatus.error === 'Checking API key status...') ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Checking API key status...
                      </p>
                    ) : openAIKeyStatus.available ? (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        ✓ Using OpenAI API key from {openAIKeyStatus.source === 'user' ? 'your account settings' : 'server environment'}
                      </p>
                    ) : (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                        ⚠ No OpenAI API key found. Please configure one in the Generative AI tab or contact your administrator to set up the server environment.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              <strong>Note:</strong> Changing the embedding provider will require regenerating embeddings for existing notes and transcripts.
              Run the backfill script after changing this setting.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4 mt-6">
        <button
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          onClick={handleClose}
        >
          Cancel
        </button>
        <button
          className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${(isLoading || isEmbeddingLoading || (activeTab === 'embedding' && !isEmbeddingConfigValid()) || (activeTab === 'generative' && !isGenerativeConfigValid())) ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleSave}
          disabled={isLoading || isEmbeddingLoading || (activeTab === 'embedding' && !isEmbeddingConfigValid()) || (activeTab === 'generative' && !isGenerativeConfigValid())}
        >
          {isLoading || isEmbeddingLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
      
      {/* Embedding Regeneration Confirmation Dialog */}
      <EmbeddingRegenerationConfirmation
        isOpen={showRegenerationConfirmation}
        onClose={handleRegenerationClose}
        provider={embeddingProviderOptions.find(option => option.value === embeddingConfig.provider)?.label || embeddingConfig.provider}
      />
    </div>
  );
};

export default AISettings;
