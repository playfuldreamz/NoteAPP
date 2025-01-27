import React from 'react';
import { Home, FileText, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ onLogout, onOpenSettings }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40">
      <div className="flex flex-col items-center h-full py-4 space-y-6">
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Home"
        >
          <Home className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Notes"
        >
          <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Settings"
          onClick={onOpenSettings}
        >
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mt-auto"
          title="Logout"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </aside>
  );
}
