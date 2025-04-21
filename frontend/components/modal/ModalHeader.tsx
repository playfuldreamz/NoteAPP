import React from 'react';
import { Check, Download, Edit3, RotateCw, X } from 'lucide-react';
import { Tag } from '../../services/ai';
import useDownloadDocument, { DownloadOptions } from '../../hooks/useDownloadDocument';

interface BreadcrumbItem {
  id: number;
  type: string;
  title: string;
  content: string;
  summary: string | null;
  tags: Tag[];
}

interface ModalHeaderProps {
  title: string;
  isEditingTitle: boolean;
  setIsEditingTitle: (isEditing: boolean) => void;
  editableTitle: string;
  setEditableTitle: (title: string) => void;
  handleSaveTitle: () => void;
  handleCancelEdit: () => void;
  onRegenerateTitle?: () => void;
  isRegeneratingTitle?: boolean;
  breadcrumbStack: BreadcrumbItem[];
  handleBackNavigation: (item?: BreadcrumbItem) => void;
  onClose: () => void;
  setIsEditMode: (isEditMode: boolean) => void;
  isEditMode: boolean;
  isScrolled: boolean;
  itemId: number;
  normalizedType: 'note' | 'transcript';
  content: string;
  tags: Tag[];
}

const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  isEditingTitle,
  setIsEditingTitle,
  editableTitle,
  setEditableTitle,
  handleSaveTitle,
  handleCancelEdit,
  onRegenerateTitle,
  isRegeneratingTitle = false,
  breadcrumbStack,
  handleBackNavigation,
  onClose,
  setIsEditMode,
  isEditMode,
  isScrolled,
  itemId,
  normalizedType,
  content,
  tags
}) => {
  const [perItemDownloadOptions, setPerItemDownloadOptions] = React.useState<DownloadOptions>({
    format: 'txt',
    includeMetadata: true
  });
  
  const { downloadDocument, isDownloading } = useDownloadDocument();

  const handlePerItemDownloadOptionsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerItemDownloadOptions(prev => ({
      ...prev,
      format: e.target.value as 'txt' | 'json' | 'pdf'
    }));
  };

  return (
    <div className={`sticky top-0 z-10 px-4 sm:px-6 py-4 flex flex-col gap-2 transition-shadow ${isScrolled ? 'shadow-md dark:shadow-gray-800' : ''}`}>
      {/* Breadcrumb navigation */}
      {breadcrumbStack.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          {breadcrumbStack.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              <button
                onClick={() => handleBackNavigation(item)}
                className="hover:text-blue-500 hover:underline truncate max-w-[200px]"
              >
                {item.title || 'Untitled'}
              </button>
            </React.Fragment>
          ))}
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100 truncate">{editableTitle || 'Untitled'}</span>
        </div>
      )}

      {/* Title and actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 max-w-[85%]">
          {isEditingTitle ? (
            <input
              type="text"
              value={editableTitle}
              onChange={(e) => setEditableTitle(e.target.value)}
              placeholder="Enter title"
              className="text-xl font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500"
              style={{ width: `${Math.max(editableTitle.length * 0.8, 20)}ch` }}
            />
          ) : (
            <h3
              className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate cursor-pointer"
              onClick={() => setIsEditingTitle(true)}
            >
              {editableTitle || 'Content'}
            </h3>
          )}
          
          {/* Title editing controls */}
          {isEditingTitle ? (
            <>
              <button
                onClick={handleSaveTitle}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                title="Save title"
              >
                <Check size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                title="Cancel edit"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              title="Edit title"
            >
              <Edit3 size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}

          {/* Regenerate title button */}
          {onRegenerateTitle && !isEditingTitle && (
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

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <select
            title="Select download format"
            value={perItemDownloadOptions.format}
            onChange={handlePerItemDownloadOptionsChange}
            className="text-sm text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors p-2 border border-gray-200 dark:border-gray-700"
          >
            <option value="txt">TXT</option>

            <option value="pdf">PDF</option>
          </select>
          
          <button
            onClick={() => downloadDocument({
              id: itemId,
              type: normalizedType,
              content,
              timestamp: new Date().toISOString(),
              title: editableTitle || 'Untitled',
              tags,
            }, perItemDownloadOptions)}
            disabled={isDownloading}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download content"
          >
            <Download size={20} className={isDownloading ? 'opacity-50' : ''} />
          </button>

          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            title={isEditMode ? "Cancel editing" : "Edit content"}
          >
            <Edit3 size={20} className={isEditMode ? 'text-blue-500' : ''} />
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
    </div>
  );
};

export default ModalHeader;
