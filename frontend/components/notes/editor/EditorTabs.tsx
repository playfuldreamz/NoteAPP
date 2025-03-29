import React from 'react';
import { TagIcon, CheckSquare } from 'lucide-react';

interface EditorTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const EditorTabs: React.FC<EditorTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex-1 min-w-0 lg:max-w-[45%] xl:max-w-[40%] overflow-hidden flex flex-col border-t border-gray-200 dark:border-gray-700 lg:border-t-0">
      {/* Tabs navigation */}
      <div className="flex items-center px-4 sm:px-6 py-2 gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('extensions')}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none ${
            activeTab === 'extensions'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <TagIcon size={16} />
          Extensions
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none ${
            activeTab === 'actions'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <CheckSquare size={16} />
          Actions
        </button>
      </div>

      {/* Tab panels with separate scroll */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(156 163 175) transparent'
        }}
      >
        {activeTab === 'extensions' && (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            <p className="mb-2">Extension components will be added here</p>
            <p className="text-sm">This panel is reserved for future functionality</p>
          </div>
        )}
        {activeTab === 'actions' && (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            <p className="mb-2">Action components will be added here</p>
            <p className="text-sm">This panel is reserved for future functionality</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorTabs;
