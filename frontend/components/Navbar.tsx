import { User, Menu, Sparkles, Settings, LogOut, Search } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';

interface NavbarProps {
  username: string;
  currentModel: string;
  modelSource: string;
  embeddingProvider: string;
  embeddingSource: string;
  isAuthenticated: boolean;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export default function Navbar({
  username,
  currentModel,
  modelSource,
  embeddingProvider,
  embeddingSource,
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
                  <User className="w-5 h-5" />
                  <span>Welcome, {username || 'User'}</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                  <Sparkles className="w-4 h-4" />
                  <span>AI: {currentModel || 'Not Configured'}</span>
                  <span className="hidden sm:inline">({modelSource})</span>
                  <span className="mx-1 text-blue-300 dark:text-blue-600">|</span>
                  <Search className="w-4 h-4" />
                  <span>{embeddingProvider}</span>
                  <span className="hidden sm:inline">({embeddingSource})</span>
                </div>

                <div className="flex items-center gap-4">
                  <DarkModeToggle />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
