import { User, Menu, Sparkles, Settings, LogOut } from 'lucide-react';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Voice Notes</h1>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI: {currentModel}</span>
              <span className="hidden sm:inline">({modelSource})</span>
            </div>
            {isAuthenticated && (
              <>
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium text-xs sm:text-sm">
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Welcome,</span>
                  <span>{username}</span>
                </div>
                <div className="relative group">
                  <button className="flex items-center space-x-1.5 px-2 py-1 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200 text-xs sm:text-sm">
                    <Menu className="w-3.5 h-3.5" />
                    <span className="font-medium hidden sm:inline">Menu</span>
                    <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-1 w-40 sm:w-48 rounded-lg shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top scale-95 group-hover:scale-100">
                    <div className="py-1" role="menu">
                      <button
                        onClick={onOpenSettings}
                        className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                        role="menuitem"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Settings</span>
                      </button>
                      <button
                        onClick={onLogout}
                        className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                        role="menuitem"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
