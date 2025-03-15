import React from 'react';
import { Moon } from 'lucide-react';
import useTheme from '../../hooks/useTheme';

export const AppearanceSettings: React.FC = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Moon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            <div>
              <span className="text-lg font-medium text-gray-700 dark:text-gray-200">Dark Mode</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Switch between light and dark themes
              </p>
            </div>
          </div>
          <div className="relative inline-block w-14 align-middle select-none">
            <input
              type="checkbox"
              id="dark-mode"
              checked={darkMode ?? false}
              onChange={toggleDarkMode}
              className="toggle-checkbox absolute block w-7 h-7 rounded-full bg-white border-2 border-gray-300 appearance-none cursor-pointer transition-transform duration-200 ease-in-out transform translate-x-0 dark:translate-x-7"
            />
            <label 
              htmlFor="dark-mode" 
              className="toggle-label block overflow-hidden h-7 rounded-full bg-gray-300 cursor-pointer transition-colors duration-200 ease-in-out dark:bg-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
