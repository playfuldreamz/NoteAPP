import React, { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Bell, Lock, User, Globe, X } from 'lucide-react';
import { getAIProvider } from '../../services/ai';
import { toast } from 'react-toastify';
import { SettingsModalProps, AIConfig, AIProvider } from './types';
import AISettings from './AISettings';
import AppearanceSettings from './AppearanceSettings';
import NotificationSettings from './NotificationSettings';
import SecuritySettings from './SecuritySettings';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  setUsername,
  currentModel,
  modelSource
}) => {
  const [selectedGroup, setSelectedGroup] = useState('ai');
  const [selectedProvider, setSelectedProvider] = useState<AIConfig>({
    provider: (currentModel || 'gemini') as AIProvider,
    apiKey: '',
    source: modelSource || 'env'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
          } as AIConfig);
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

  useEffect(() => {
    setSelectedProvider(prev => ({
      ...prev,
      provider: (currentModel || 'gemini') as AIProvider,
      source: modelSource || 'env'
    }));
  }, [currentModel, modelSource]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 0);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const settingGroups = [
    {
      id: 'ai',
      name: 'AI Provider',
      icon: <Globe className="w-4 h-4" />,
      content: (
        <AISettings
          selectedProvider={selectedProvider}
          onClose={onClose}
          currentModel={currentModel}
          modelSource={modelSource}
        />
      )
    },
    {
      id: 'appearance',
      name: 'Appearance',
      icon: <Moon className="w-4 h-4" />,
      content: <AppearanceSettings />
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      content: <NotificationSettings />
    },
    {
      id: 'security',
      name: 'Login & Security',
      icon: <Lock className="w-4 h-4" />,
      content: <SecuritySettings setUsername={setUsername} />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-black/50 backdrop-blur-sm">
      <div className="relative w-full h-screen max-h-screen bg-white dark:bg-gray-900 shadow-xl overflow-hidden md:max-w-[95vw] md:h-[95vh] md:my-[2.5vh] md:rounded-lg">
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 bg-white dark:bg-gray-900 ${
          isScrolled ? 'border-b border-gray-200 dark:border-gray-700' : ''
        }`}>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(100vh-5rem)] md:h-[calc(95vh-5rem)]">
          {/* Sidebar */}
          <div className="w-72 border-r border-gray-200 dark:border-gray-700 p-6">
            <nav className="space-y-2">
              {settingGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors duration-200 ${
                    selectedGroup === group.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {React.cloneElement(group.icon, {
                    className: `w-5 h-5 ${
                      selectedGroup === group.id
                        ? 'text-blue-500'
                        : 'text-gray-400 dark:text-gray-500'
                    }`
                  })}
                  {group.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6" onScroll={handleScroll}>
            {settingGroups.find(group => group.id === selectedGroup)?.content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
