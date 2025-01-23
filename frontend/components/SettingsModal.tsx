import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Settings, Moon, Sun, Bell, Lock, User, Globe } from 'lucide-react';
import useTheme from '../hooks/useTheme';
import { getAIProvider, updateAIProvider, AIProvider, API_BASE } from '../services/ai';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { InvalidAPIKeyError } from '../services/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setUsername: (username: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, setUsername }: SettingsModalProps) => {
  interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    source: string;
  }

  interface SavedAPIKeys {
    [key: string]: string;
  }

  const [selectedGroup, setSelectedGroup] = useState('appearance');
  const [selectedProvider, setSelectedProvider] = useState<AIConfig>({
    provider: 'gemini',
    apiKey: '',
    source: ''
  });
  const [savedApiKeys, setSavedApiKeys] = useState<SavedAPIKeys>({});
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [tempProvider, setTempProvider] = useState<AIProvider>(selectedProvider.provider || 'gemini');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Username change state
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);

  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const { darkMode, toggleDarkMode } = useTheme();

  // AI Provider options
  const providerOptions = [
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'deepseek', label: 'DeepSeek' }
  ];

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        setIsLoading(true);
        const config = await getAIProvider();
        if (config) {
          setSelectedProvider({
            provider: config.provider,
            apiKey: config.apiKey,
            source: config.source
          });
          // Initialize saved keys with the current key
          setSavedApiKeys(prev => ({
            ...prev,
            [config.provider]: config.apiKey
          }));
          setApiKey(config.apiKey);
          setTempProvider(config.provider);
        }
      } catch (error) {
        console.error('Failed to fetch AI provider:', error);
        toast.error('Failed to load AI provider settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProvider();
  }, []);

  const validatePassword = (password: string, setError: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (password.length > 64) {
      setError('Password cannot exceed 64 characters');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (!/[!@#$%^&*]/.test(password)) {
      setError('Password must contain at least one special character');
      return false;
    }
    setError(null);
    return true;
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  // Ensure consistent state between selectedProvider and tempProvider
  useEffect(() => {
    setTempProvider(selectedProvider.provider);
    setApiKey(selectedProvider.apiKey || '');
  }, [selectedProvider]);

  const handlePasswordChange = async () => {
    // Validate all fields are filled
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate password strength
    if (!validatePassword(newPassword, setNewPasswordError)) {
      toast.error('Please fix password requirements');
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await fetch(`${API_BASE}/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      // Clear form fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      setConfirmPasswordError(null);
      setPasswordStrength(0);

      // Show success message
      toast.success(
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Password updated successfully!</span>
        </div>, 
        {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        }
      );
    } catch (error: any) {
      console.error('Password change error:', error);
      
      // Handle specific error cases
      if (error.message.includes('Invalid current password')) {
        setPasswordError('Invalid current password');
      } else {
        setPasswordError(error.message || 'Failed to update password');
      }

      // Show error toast
      toast.error(error.message || 'Failed to update password', {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUsernameChange = async () => {
    try {
      // Validate inputs
      if (!newUsername || !usernamePassword) {
        setUsernameError('Please enter a new username');
        setPasswordError('Please enter your current password');
        toast.error('Please fill in all fields', {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        return;
      }

      // Additional validation
      if (newUsername.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }
      if (newUsername.length > 20) {
        throw new Error('Username cannot exceed 20 characters');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
        throw new Error('Username can only contain letters, numbers and underscores');
      }

      setIsChangingUsername(true);
      
      const response = await fetch(`${API_BASE}/change-username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          newUsername,
          password: usernamePassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update username');
      }

      const data = await response.json();
      
      // Update local storage and state
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      setUsername(data.username);
      
      // Reset form
      setNewUsername('');
      setUsernamePassword('');
      setIsChangingUsername(false);

      // Show success message
      toast.success(
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Username updated to <span className="font-semibold">{data.username}</span></span>
        </div>, 
        {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        }
      );

    } catch (error: any) {
      console.error('Username change error:', error);
      setIsChangingUsername(false);
      
      // Clear previous errors
      setUsernameError(null);
      setPasswordError(null);

      // Handle specific error cases
      if (error.message.includes('already taken')) {
        setUsernameError('Username is already taken');
      } else if (error.message.includes('Invalid password')) {
        setPasswordError('Invalid password');
      } else {
        // Generic error handling
        const errorMessage = error.message || 'Failed to update username';
        setUsernameError(errorMessage);
      }

      // Show error toast
      toast.error(error.message || 'Failed to update username', {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
  };

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
      setSelectedProvider({
        provider: config.provider,
        apiKey: config.apiKey,
        source: config.source
      });
      // Update saved keys when saving
      setSavedApiKeys(prev => ({
        ...prev,
        [config.provider]: config.apiKey
      }));
      toast.success('Settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Failed to update AI provider:', error);
      toast.error('Failed to update AI provider');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsKeyValid(validateApiKey(apiKey, tempProvider));
  }, [apiKey, tempProvider]);

  useEffect(() => {
    const handleAPIError = (error: InvalidAPIKeyError) => {
      setApiKeyError('Your AI provider API key appears to be invalid or expired. Please update your key in settings.');
      toast.error('AI Provider API Key Invalid', {
        onClick: () => setSelectedGroup('ai'),
        autoClose: false,
        closeOnClick: false,
      });
    };

    const handleWindowError = (event: ErrorEvent) => {
      if (event.error instanceof InvalidAPIKeyError) {
        handleAPIError(event.error);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof InvalidAPIKeyError) {
        handleAPIError(event.reason);
      }
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleProviderChange = (provider: { value: string; label: string }) => {
    const newProvider = provider.value as AIProvider;
    setTempProvider(newProvider);
    
    // Set the API key to the saved value for this provider, or empty if none exists
    const savedKey = savedApiKeys[newProvider] || '';
    setApiKey(savedKey);
    setIsKeyValid(validateApiKey(savedKey, newProvider));
    setIsDropdownOpen(false);
    
    // Focus the API key input field
    setTimeout(() => {
      document.getElementById('apiKey')?.focus();
    }, 0);
  };

  if (!isOpen) return null;

  const settingGroups = [
    {
      id: 'ai',
      name: 'AI Provider',
      icon: <Globe className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          {apiKeyError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{apiKeyError}</p>
            </div>
          )}
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-gray-700 dark:text-gray-200">Current AI Provider</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedProvider.provider} ({selectedProvider.source || 'env'})
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

          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
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
      )
    },
    {
      id: 'appearance',
      name: 'Appearance',
      icon: <Moon className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-200">Dark Mode</span>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                id="dark-mode"
                checked={darkMode}
                onChange={toggleDarkMode}
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-2 border-gray-300 appearance-none cursor-pointer transition-transform duration-200 ease-in-out transform translate-x-0 dark:translate-x-4"
              />
              <label htmlFor="dark-mode" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer transition-colors duration-200 ease-in-out dark:bg-blue-500"></label>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-200">Enable Notifications</span>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input type="checkbox" id="notifications" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-2 border-gray-300 appearance-none cursor-pointer"/>
              <label htmlFor="notifications" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      name: 'Login & Security',
      icon: <Lock className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div className="p-6 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
              <Lock className="w-6 h-6 text-blue-500" />
              Account Security
            </h3>
            
            {/* Account Credentials Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Username Section */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Username Settings
                </h4>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUsernameChange();
            }} className="space-y-4">
              <div className="relative">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Username
                </label>
                <div className="mt-1 relative">
                  <input
                    id="username"
                    type="text"
                    value={newUsername}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 20); // Enforce max length
                      setNewUsername(value);
                      setUsernameError(null);
                      
                      // Basic validation
                      if (value.length < 3) {
                        setUsernameError('Username must be at least 3 characters');
                      } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                        setUsernameError('Only letters, numbers and underscores allowed');
                      } else {
                        setUsernameError(null);
                      }
                    }}
                    className={`block w-full px-3 py-2 border ${
                      usernameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 transition-all duration-200 pr-10 input-animation`}
                    required
                    aria-invalid={!!usernameError}
                    aria-describedby="username-error"
                    onFocus={(e) => {
                      e.target.placeholder = '';
                    }}
                    onBlur={(e) => {
                      if (!e.target.value) {
                        e.target.placeholder = 'New Username';
                      }
                    }}
                  />
                  {newUsername.length > 0 && !usernameError && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {usernameError ? (
                    <p id="username-error" className="text-sm text-red-600 dark:text-red-400">
                      {usernameError}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {newUsername.length > 0 && `Available characters: ${Math.max(0, 20 - newUsername.length)}`}
                    </p>
                  )}
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <li className={`flex items-center ${newUsername.length >= 3 ? 'text-green-500' : ''}`}>
                      <svg className={`w-3 h-3 mr-1 ${newUsername.length >= 3 ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      At least 3 characters
                    </li>
                    <li className={`flex items-center ${/^[a-zA-Z0-9_]+$/.test(newUsername) ? 'text-green-500' : 'text-gray-400'}`}>
                      <svg className={`w-3 h-3 mr-1 ${/^[a-zA-Z0-9_]+$/.test(newUsername) ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Only letters, numbers and underscores
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <label htmlFor="usernamePassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="usernamePassword"
                    type="password"
                    placeholder="Enter current password"
                    value={usernamePassword}
                    onChange={(e) => {
                      setUsernamePassword(e.target.value);
                      setPasswordError(null); // Clear error when typing
                    }}
                    className={`block w-full px-3 py-2 border ${
                      passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 input-animation`}
                    required
                    aria-invalid={!!passwordError}
                    aria-describedby="password-error"
                    onFocus={(e) => {
                      e.target.placeholder = '';
                    }}
                    onBlur={(e) => {
                      if (!e.target.value) {
                        e.target.placeholder = 'Enter current password';
                      }
                    }}
                  />
                  {passwordError && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {passwordError && (
                  <p id="password-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {passwordError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isChangingUsername || !newUsername || !usernamePassword}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isChangingUsername ? 'Updating...' : 'Update Username'}
              </button>
            </form>
              </div>

              {/* Password Section */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-500" />
                  Password Settings
                </h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handlePasswordChange();
                }} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 input-animation"
                      autoComplete="current-password"
                      required
                      disabled={false}
                      onFocus={(e) => {
                        e.target.placeholder = '';
                      }}
                      onBlur={(e) => {
                        if (!e.target.value) {
                          e.target.placeholder = 'Enter current password';
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewPassword(value);
                          calculatePasswordStrength(value);
                          validatePassword(value, setNewPasswordError);
                        }}
                        placeholder="Enter new password"
                        className={`w-full px-3 py-2 border ${
                          passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 cursor-text input-animation text-transparent selection:bg-blue-500 selection:text-transparent`}
                        autoComplete="new-password"
                        required
                        aria-invalid={!!passwordError}
                        aria-describedby="password-error"
                        onFocus={(e) => {
                          e.target.placeholder = '';
                        }}
                        onBlur={(e) => {
                          if (!e.target.value) {
                            e.target.placeholder = 'Enter new password';
                          }
                        }}
                      />
                      {passwordError && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div
                          className={`h-2 rounded-full ${
                            passwordStrength < 3 ? 'bg-red-500' :
                            passwordStrength < 5 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${(passwordStrength / 6) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Password strength: {' '}
                        <span className="font-medium">
                          {passwordStrength < 3 ? 'Weak' :
                           passwordStrength < 5 ? 'Medium' :
                           'Strong'}
                        </span>
                      </div>
                      {passwordError && (
                        <p id="password-error" className="text-sm text-red-600 dark:text-red-400">
                          {passwordError}
                        </p>
                      )}
                      <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <li className={`flex items-center ${newPassword.length >= 8 ? 'text-green-500' : ''}`}>
                          <svg className={`w-3 h-3 mr-1 ${newPassword.length >= 8 ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          At least 8 characters
                        </li>
                        <li className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`}>
                          <svg className={`w-3 h-3 mr-1 ${/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          At least one uppercase letter
                        </li>
                        <li className={`flex items-center ${/[a-z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`}>
                          <svg className={`w-3 h-3 mr-1 ${/[a-z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          At least one lowercase letter
                        </li>
                        <li className={`flex items-center ${/[0-9]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`}>
                          <svg className={`w-3 h-3 mr-1 ${/[0-9]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          At least one number
                        </li>
                        <li className={`flex items-center ${/[!@#$%^&*]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`}>
                          <svg className={`w-3 h-3 mr-1 ${/[!@#$%^&*]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          At least one special character
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 cursor-text input-animation"
                      autoComplete="new-password"
                      required
                      onFocus={(e) => {
                        e.target.placeholder = '';
                      }}
                      onBlur={(e) => {
                        if (!e.target.value) {
                          e.target.placeholder = 'Confirm new password';
                        }
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'language',
      name: 'Language',
      icon: <Globe className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-200">Language Preferences</span>
          </div>
        </div>
      )
    }
  ];

  const selectedContent = settingGroups.find(group => group.id === selectedGroup)?.content;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-5xl h-[85vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Settings
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            <div className="w-[30%] border-r border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="space-y-1">
                  {settingGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className={`w-full text-left px-4 py-2 rounded-md text-sm flex items-center gap-2 ${
                        selectedGroup === group.id
                          ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {group.icon}
                      <span>{group.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-[70%] p-6 overflow-y-auto">
              {selectedContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
