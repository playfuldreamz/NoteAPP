import React, { useState } from 'react';
import { Settings, Moon, Sun, Bell, Lock, User, Globe } from 'lucide-react';
import useTheme from '../hooks/useTheme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [selectedGroup, setSelectedGroup] = useState('appearance');
  const { darkMode, toggleDarkMode } = useTheme();

  if (!isOpen) return null;

  const settingGroups = [
    {
      id: 'ai',
      name: 'AI Provider',
      icon: <Globe className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-200">AI Provider</span>
            </div>
            <select
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm text-gray-700 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
              disabled
            >
              <option>Select Provider</option>
              <option>OpenAI</option>
              <option>Anthropic</option>
              <option>Cohere</option>
            </select>
          </div>
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
      name: 'Security',
      icon: <Lock className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-200">Change Password</span>
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
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-3xl h-[80vh] flex flex-col">
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