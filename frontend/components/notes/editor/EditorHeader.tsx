import React from 'react';
import { X, Edit3, Check } from 'lucide-react';

interface EditorHeaderProps {
  title: string;
  editableTitle: string;
  isEditingTitle: boolean;
  isScrolled: boolean;
  setEditableTitle: (title: string) => void;
  setIsEditingTitle: (isEditing: boolean) => void;
  handleSaveTitle: () => void;
  handleCancelEdit: () => void;
  onClose: () => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  editableTitle,
  isEditingTitle,
  isScrolled,
  setEditableTitle,
  setIsEditingTitle,
  handleSaveTitle,
  handleCancelEdit,
  onClose
}) => {
  return (
    <div className={`sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center gap-4 transition-shadow ${isScrolled ? 'shadow-md dark:shadow-gray-800' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={editableTitle}
              onChange={(e) => setEditableTitle(e.target.value)}
              placeholder="Enter title"
              className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate bg-transparent border-b border-gray-300 focus:outline-none"
            />
          ) : (
            <h3
              className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate cursor-pointer"
              onClick={() => setIsEditingTitle(true)}
            >
              {title}
            </h3>
          )}
          {isEditingTitle ? (
            <>
              <button
                onClick={handleSaveTitle}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
                title="Save title"
              >
                <Check size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
                title="Cancel edit"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
              title="Edit title"
            >
              <Edit3 size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>
      
      <button 
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none transition-colors"
        aria-label="Close modal"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default EditorHeader;
