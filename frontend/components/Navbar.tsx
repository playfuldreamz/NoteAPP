import { User, Menu, Sparkles, Settings, LogOut } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';

interface NavbarProps {
  username: string;
  currentModel: string;
  modelSource: string;
  isAuthenticated: boolean;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export default function Navbar({
  username,
  currentModel,
  modelSource,
  isAuthenticated,
  onLogout,
  onOpenSettings
}: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-50">
      <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Voice Notes</h1>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <User className="w-4 h-4" />
                  <span>Welcome, {username || 'User'}</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                  <Sparkles className="w-4 h-4" />
                  <span>AI: {currentModel || 'Not Configured'}</span>
                  <span className="hidden sm:inline">({modelSource})</span>
                </div>

                <div className="flex items-center gap-4">
                  <DarkModeToggle />
                  
                  <button
                    onClick={onOpenSettings}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>

                  <button
                    onClick={onLogout}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
