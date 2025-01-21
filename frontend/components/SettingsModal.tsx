import React, { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Bell, Lock, User, Globe } from 'lucide-react';
import useTheme from '../hooks/useTheme';
import { getAIProvider, updateAIProvider, AIProvider } from '../services/ai';
import { toast } from 'react-hot-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  interface AIConfig {
    provider: AIProvider;
    apiKey: string;
  }

  const [selectedGroup, setSelectedGroup] = useState('appearance');
  const [selectedProvider, setSelectedProvider] = useState<AIConfig>({
    provider: 'gemini',
    apiKey: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        setIsLoading(true);
        const config = await getAIProvider();
        if (config) {
          setSelectedProvider({
            provider: config.provider,
            apiKey: config.apiKey
          });
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

  const [apiKey, setApiKey] = useState<string>(selectedProvider.apiKey || '');
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [tempProvider, setTempProvider] = useState<AIProvider>(selectedProvider.provider || 'gemini');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Username change state
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Ensure consistent state between selectedProvider and tempProvider
  useEffect(() => {
    setTempProvider(selectedProvider.provider);
    setApiKey(selectedProvider.apiKey || '');
  }, [selectedProvider]);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      toast.error('Please fill in all fields and ensure passwords match');
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await fetch('/change-password', {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update password');
      }

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUsernameChange = async () => {
    if (!newUsername || !usernamePassword) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsChangingUsername(true);
      const response = await fetch('/change-username', {
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
      localStorage.setItem('token', data.token);
      toast.success('Username updated successfully!');
      setNewUsername('');
      setUsernamePassword('');
    } catch (error: any) {
      console.error('Username change error:', error);
      toast.error(error.message || 'Failed to update username');
    } finally {
      setIsChangingUsername(false);
    }
  };

  const validateApiKey = (key: string | undefined, provider: AIProvider) => {
    if (!key) return false;
    
    if (provider === 'openai') {
      return key.length === 51 && key.startsWith('sk-');
    }
    if (provider === 'gemini') {
      return key.length === 39 && key.startsWith('AIza');
    }
    return false;
  };

  const handleSave = async () => {
    try {
      if (!validateApiKey(apiKey, tempProvider)) {
        throw new Error(`Invalid API key format for ${tempProvider}`);
      }

      setIsLoading(true);
      await updateAIProvider({ provider: tempProvider, apiKey });
      setSelectedProvider({
        provider: tempProvider,
        apiKey: apiKey
      });
      toast.success(`AI provider updated to ${tempProvider}`);
    } catch (error: any) {
      console.error('Failed to update AI provider:', error);
      toast.error(error?.message || 'Failed to update AI provider');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsKeyValid(validateApiKey(apiKey, tempProvider));
  }, [apiKey, tempProvider]);

  if (!isOpen) return null;

  const settingGroups = [
    {
      id: 'ai',
      name: 'AI Provider',
      icon: <Globe className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-gray-700 dark:text-gray-200">Current AI Provider</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedProvider.provider === 'gemini' && !selectedProvider.apiKey
                    ? 'Using default Gemini'
                    : `Using ${selectedProvider.provider}`}
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 flex items-center justify-between"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span>{tempProvider === 'openai' ? 'OpenAI' : 'Gemini'}</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10">
                  <div 
                    className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => {
                      setTempProvider('openai');
                      setApiKey('');
                      setIsDropdownOpen(false);
                    }}
                  >
                    OpenAI
                  </div>
                  <div 
                    className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => {
                      setTempProvider('gemini');
                      setApiKey('');
                      setIsDropdownOpen(false);
                    }}
                  >
                    Gemini
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {tempProvider === 'openai' ? 'OpenAI API Key' : 'Gemini API Key'}
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={`w-full px-3 py-2 border ${
                isKeyValid ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800`}
              placeholder={
                tempProvider === 'openai' 
                  ? 'Enter your OpenAI API key (starts with sk-)'
                  : 'Enter your Gemini API key (starts with AIza)'
              }
              disabled={isLoading}
            />
            {!isKeyValid && apiKey && apiKey.length > 0 && (
              <p className="mt-2 text-sm text-red-600">
                {tempProvider === 'openai'
                  ? 'OpenAI API keys start with "sk-" and are 51 characters long'
                  : 'Gemini API keys start with "AIza" and are 39 characters long'}
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
            <form onSubmit={handleUsernameChange} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800"
                  required
                />
              </div>

              <div>
                <label htmlFor="usernamePassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <input
                  id="usernamePassword"
                  type="password"
                  placeholder="Enter current password"
                  value={usernamePassword}
                  onChange={(e) => setUsernamePassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800"
                  required
                  minLength={8}
                />
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
                <form onSubmit={handlePasswordChange} className="space-y-4">
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800"
                      autoComplete="current-password"
                      required
                      disabled={false}
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 cursor-text"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Password strength: <span className="font-medium">Medium</span>
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 cursor-text"
                      autoComplete="new-password"
                      required
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
