import React, { useEffect, useState } from 'react';
import TaggingModule from './TaggingModule';
import ActionItemsModule from './ActionItemsModule';
import { Tag } from '../services/ai';
import { RotateCw } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
  itemId: number;
  type?: 'note' | 'transcript';
  children?: React.ReactNode;
  initialTags?: Tag[];
  onTagsUpdate?: (tags: Tag[]) => void;
  onRegenerateTitle?: () => void;
  isRegeneratingTitle?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  content,
  title,
  itemId,
  type,
  children,
  initialTags = [],
  onTagsUpdate,
  onRegenerateTitle,
  isRegeneratingTitle = false
}) => {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [activeTab, setActiveTab] = useState('tags');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Validate and normalize type
  const normalizedType = type === 'note' ? 'note' : 'transcript';
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="fixed inset-x-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex-1 flex items-center justify-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title || 'Content'}
            </h3>
            {onRegenerateTitle && (
              <button
                onClick={onRegenerateTitle}
                disabled={isRegeneratingTitle}
                className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isRegeneratingTitle ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Regenerate title"
              >
                <RotateCw 
                  size={18} 
                  className={`text-gray-500 dark:text-gray-400 ${isRegeneratingTitle ? 'animate-spin' : ''}`}
                />
              </button>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {/* Content section */}
          <div className="prose dark:prose-invert max-w-none">
            <p>{content}</p>
          </div>

          {/* Tabs for different modules */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('tags')}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'tags'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Tags
                </button>
                <button
                  onClick={() => setActiveTab('actions')}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'actions'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Action Items
                </button>
              </nav>
            </div>

            <div className="mt-6">
              {activeTab === 'tags' && (
                <TaggingModule
                  type={normalizedType}
                  itemId={itemId}
                  content={content}
                  initialTags={tags}
                  onTagsUpdate={(newTags) => {
                    setTags(newTags);
                    onTagsUpdate?.(newTags);
                  }}
                />
              )}
              {activeTab === 'actions' && (
                <ActionItemsModule
                  itemId={itemId}
                  type={normalizedType}
                  content={content}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
