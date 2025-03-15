import React from 'react';
import { Bell } from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <div>
              <span className="text-gray-700 dark:text-gray-200">Enable Notifications</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Get notified about important updates and events
              </p>
            </div>
          </div>
          <div className="relative inline-block w-10 align-middle select-none">
            <input 
              type="checkbox" 
              id="notifications" 
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-2 border-gray-300 appearance-none cursor-pointer transition-transform duration-200 ease-in-out transform translate-x-0 dark:translate-x-4"
            />
            <label 
              htmlFor="notifications" 
              className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer transition-colors duration-200 ease-in-out dark:bg-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
