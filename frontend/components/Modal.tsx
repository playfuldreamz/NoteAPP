import React, { useEffect, useState } from 'react';
import TaggingModule from './TaggingModule';
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
      <div className="fixed inset-0 flex flex-col p-4 pt-20"> {/* Added pt-20 for navbar spacing */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg h-[calc(100vh-6rem)] w-full flex flex-col overflow-hidden"> {/* Constrained height */}
          {/* Header */}
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
          
          {/* Main content area */}
          <div className="flex-1 grid grid-cols-[70%_30%] divide-x divide-gray-200 dark:divide-gray-700 overflow-hidden">
            {/* Left column - Content */}
            <div className="p-6 overflow-y-auto">
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{content}</p>
            </div>
            
            {/* Right column - Modules */}
            <div className="p-6 overflow-y-auto">
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
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
