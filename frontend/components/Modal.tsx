import React, { useEffect, useState } from 'react';
import TaggingModule from './TaggingModule';
import ActionItemsModule from './ActionItemsModule';
import { Tag, updateNoteTitle, updateTranscriptTitle } from '../services/ai';
import { RotateCw, X, TagIcon, CheckSquare, Download, Copy, Check } from 'lucide-react';
import useDownloadDocument, { DownloadOptions } from '../hooks/useDownloadDocument';
import { toast } from 'react-toastify';

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
  onTitleUpdate?: () => void;
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
  isRegeneratingTitle = false,
  onTitleUpdate
}) => {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [activeTab, setActiveTab] = useState('tags');
  const [isScrolled, setIsScrolled] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState<DownloadOptions>({
    format: 'txt',
    includeMetadata: true
  });
  const [perItemDownloadOptions, setPerItemDownloadOptions] = useState<DownloadOptions>({
    format: 'txt',
    includeMetadata: true
  });
  const [isCopied, setIsCopied] = useState(false);
  const { downloadDocument, isDownloading } = useDownloadDocument();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(title || '');

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 0);
  };

  const handleDownloadOptionsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDownloadOptions(prev => ({
      ...prev,
      format: e.target.value as 'txt' | 'json' | 'pdf'
    }));
  };

  const handlePerItemDownloadOptionsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerItemDownloadOptions(prev => ({
      ...prev,
      format: e.target.value as 'txt' | 'json' | 'pdf'
    }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      toast.success('Content copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
      toast.error('Failed to copy content');
    }
  };

  const handleSaveTitle = async () => {
    try {
      // Call the appropriate API to save the title
      if (type === 'note') {
        await updateNoteTitle(itemId, editableTitle);
      } else if (type === 'transcript') {
        await updateTranscriptTitle(itemId, editableTitle);
      }
      toast.success('Title updated successfully');
      setIsEditingTitle(false);
      if (onTitleUpdate) onTitleUpdate();
    } catch (error) {
      console.error('Failed to update title:', error);
      toast.error('Failed to update title');
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      if (onTitleUpdate) onTitleUpdate(); // Ensure title update callback is called when modal is closed
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onTitleUpdate]);

  if (!isOpen) return null;

  // Validate and normalize type
  const normalizedType = type === 'note' ? 'note' : 'transcript';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-4 lg:inset-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className={`sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center gap-4 transition-shadow ${isScrolled ? 'shadow-md dark:shadow-gray-800' : ''}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500"
                />
              ) : (
                <h3
                  className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate cursor-pointer"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {editableTitle || 'Content'}
                </h3>
              )}
              {isEditingTitle && (
                <button
                  onClick={handleSaveTitle}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  title="Save title"
                >
                  <Check size={20} />
                </button>
              )}
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
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={perItemDownloadOptions.format}
              onChange={handlePerItemDownloadOptionsChange}
              className="text-sm text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors p-2 border border-gray-200 dark:border-gray-700"
            >
              <option value="txt">TXT</option>
              <option value="json">JSON</option>
              <option value="pdf">PDF</option>
            </select>
            
            <button
              onClick={() => downloadDocument({
                id: itemId,
                type: type === 'note' ? 'note' : 'transcript',
                content,
                timestamp: new Date().toISOString(),
                title: title || 'Untitled',
                tags,
                ...(type === 'note' ? { transcript: '' } : {})
              }, perItemDownloadOptions)}
              disabled={isDownloading}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download content"
            >
              <Download size={20} className={isDownloading ? 'opacity-50' : ''} />
            </button>
            
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
          <div className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-4 lg:border-r border-gray-200 dark:border-gray-700"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(156 163 175) transparent'
            }}
          >
            <div className="relative">
              <button
                onClick={handleCopy}
                className="absolute top-0 right-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                title="Copy content"
              >
                {isCopied ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
              <div className={`max-w-none pt-10 ${type === 'transcript' ? 'font-mono text-sm' : 'prose dark:prose-invert'}`}>
                <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed bg-transparent p-0 m-0 border-0">
                  {content}
                </pre>
              </div>
            </div>
          </div>

          {/* Right panel - Tabs and modules */}
          <div className="flex-1 min-w-0 lg:max-w-[45%] xl:max-w-[40%] overflow-hidden flex flex-col border-t border-gray-200 dark:border-gray-700 lg:border-t-0">
            {/* Tabs navigation */}
            <div className="flex items-center px-4 sm:px-6 py-2 gap-1 border-b border-gray-200 dark:border-gray-700">
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
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
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
