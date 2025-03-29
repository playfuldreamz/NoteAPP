import React from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface EditorToolbarProps {
  formatText: (command: string, value?: string) => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ formatText }) => {
  return (
    <div className="sticky top-0 z-10 mb-4 flex items-center gap-1 p-2 bg-white dark:bg-gray-900 rounded-lg overflow-x-auto shadow-sm">
      <button
        onClick={() => formatText('bold')}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none transition-colors"
        title="Bold"
      >
        <Bold size={18} />
      </button>
      <button
        onClick={() => formatText('italic')}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none transition-colors"
        title="Italic"
      >
        <Italic size={18} />
      </button>
      <button
        onClick={() => formatText('underline')}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none transition-colors"
        title="Underline"
      >
        <Underline size={18} />
      </button>
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
      <button
        onClick={() => formatText('insertUnorderedList')}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none transition-colors"
        title="Bullet List"
      >
        <List size={18} />
      </button>
      <button
        onClick={() => formatText('insertOrderedList')}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none transition-colors"
        title="Numbered List"
      >
        <ListOrdered size={18} />
      </button>
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
      <button
        onClick={() => formatText('justifyLeft')}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none transition-colors"
        title="Align Left"
      >
        <AlignLeft size={18} />
      </button>
      <button
        onClick={() => formatText('justifyCenter')}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none transition-colors"
        title="Align Center"
      >
        <AlignCenter size={18} />
      </button>
      <button
        onClick={() => formatText('justifyRight')}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none transition-colors"
        title="Align Right"
      >
        <AlignRight size={18} />
      </button>
    </div>
  );
};

export default EditorToolbar;
