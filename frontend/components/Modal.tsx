import React, { useEffect, useState } from 'react';
import TaggingModule from './TaggingModule';
import ActionItemsModule from './ActionItemsModule';
import { Tag } from '../services/ai';
import { RotateCw, X, TagIcon, CheckSquare } from 'lucide-react';

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
  const [isScrolled, setIsScrolled] = useState(false);

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 0);
  };

  if (!isOpen) return null;

  // Validate and normalize type
  const normalizedType = type === 'note' ? 'note' : 'transcript';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-4 lg:inset-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 flex items-center gap-4 transition-shadow ${isScrolled ? 'shadow-md dark:shadow-gray-800' : ''}`}>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title || 'Content'}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {onRegenerateTitle && (
              <button
                onClick={onRegenerateTitle}
                disabled={isRegeneratingTitle}
                className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  isRegeneratingTitle ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Regenerate title"
              >
                <RotateCw 
                  size={20} 
                  className={`text-gray-500 dark:text-gray-400 ${isRegeneratingTitle ? 'animate-spin' : ''}`}
                />
              </button>
            )}
            
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content area with custom scrollbar */}
        <div 
          className="flex-1 overflow-hidden flex flex-col lg:flex-row"
          onScroll={handleScroll}
        >
          {/* Left panel - Content */}
          <div className="flex-1 min-w-0 overflow-y-auto px-6 py-6 lg:border-r border-gray-200 dark:border-gray-700"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(156 163 175) transparent'
            }}
          >
            <div className={`max-w-none ${type === 'transcript' ? 'font-mono text-sm' : 'prose dark:prose-invert'}`}>
              {type === 'transcript' ? (
                <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed bg-transparent p-0 m-0 border-0">
                  {content}
                </pre>
              ) : (
                <div 
                  className="text-gray-700 dark:text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: content.split('\n').map(line => 
                      line.trim() ? `<p>${line}</p>` : '<br/>'
                    ).join('')
                  }} 
                />
              )}
            </div>
          </div>

          {/* Right panel - Tabs and modules */}
          <div className="flex-1 min-w-0 lg:max-w-[40%] xl:max-w-[35%] overflow-hidden flex flex-col border-t border-gray-200 dark:border-gray-700 lg:border-t-0">
            {/* Tabs navigation */}
            <div className="flex items-center px-6 py-2 gap-1 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('tags')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'tags'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <TagIcon size={16} />
                Tags
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
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
            <div className="flex-1 overflow-y-auto px-6 py-4"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgb(156 163 175) transparent'
              }}
            >
              {activeTab === 'tags' && (
                <TaggingModule
                  type={normalizedType}
                  itemId={itemId}
                  content={content}
                  initialTags={tags}
                  onTagsUpdate={onTagsUpdate}
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
