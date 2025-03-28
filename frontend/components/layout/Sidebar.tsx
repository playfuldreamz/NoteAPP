"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, LogOut, NotebookPen } from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ onLogout, onOpenSettings }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40">
      <div className="h-full flex flex-col justify-between py-4">
        <div className="space-y-2">
          <Link
            href="/home"
            className={`flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors ${
              pathname === '/home' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Home"
          >
            <Home className="w-5 h-5" />
          </Link>
          <Link 
            href="/hub"
            className={`flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors ${
              pathname === '/hub' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Notes Hub"
          >
            <NotebookPen className="w-5 h-5" />
          </Link>
          <button
            className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Notes"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
