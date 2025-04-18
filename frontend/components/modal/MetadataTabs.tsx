import React from 'react';
import { FileText, TagIcon, Link2, CheckSquare } from 'lucide-react';

interface MetadataTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

const MetadataTabs: React.FC<MetadataTabsProps> = ({ activeTab, setActiveTab, children }) => {
  return (
    <div className="flex-1 min-w-0 lg:max-w-[45%] xl:max-w-[40%] overflow-hidden flex flex-col border-t border-gray-200 dark:border-gray-700 lg:border-t-0">
      {/* Tabs navigation */}
      <div className="flex items-center px-4 sm:px-6 py-2 gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('summary')}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'summary'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <FileText size={16} />
          Summary
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'tags'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <TagIcon size={16} />
          Tags
        </button>
        <button
          onClick={() => setActiveTab('backlinks')}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'backlinks'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Link2 size={16} />
          Backlinks
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'actions'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <CheckSquare size={16} />
          Action Items
        </button>
      </div>

      {/* Tab panels with separate scroll */}
      <div 
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(156 163 175) transparent'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default MetadataTabs;
