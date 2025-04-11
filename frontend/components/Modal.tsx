import React, { useEffect, useState, useRef } from 'react';
import TaggingModule from './TaggingModule';
import ActionItemsModule from './ActionItemsModule';
import SummaryModule from './summary/SummaryModule';
import BacklinksDisplay from './backlinks/BacklinksDisplay';
import LinkRenderer from './shared/LinkRenderer';
import { Tag, updateNoteTitle, updateTranscriptTitle, updateNoteContent, updateTranscriptContent } from '../services/ai';
import { API_BASE } from '../services/userTags';
import { RotateCw, X, TagIcon, CheckSquare, Download, Copy, Check, Edit3, Save, FileText, Link2 } from 'lucide-react';
import useDownloadDocument, { DownloadOptions } from '../hooks/useDownloadDocument';
import { toast } from 'react-toastify';
import EditorToolbar from './notes/editor/EditorToolbar';
import { textToHtml } from './notes/editor/editorContentUtils';
import ContentEditable from 'react-contenteditable';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
  itemId: number;
  type?: 'note' | 'transcript';
  children?: React.ReactNode;
  initialTags?: Tag[];
  initialSummary?: string | null;
  onTagsUpdate?: (tags: Tag[]) => void;
  onSummaryUpdate?: (summary: string | null) => void;
  onRegenerateTitle?: () => void;
  isRegeneratingTitle?: boolean;
  onTitleUpdate?: () => void;
  onContentUpdate?: (content: string) => void;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  content: initialContent,
  title: initialTitle,
  itemId,
  type,
  children,
  initialTags = [],
  initialSummary = null,
  onTagsUpdate,
  onSummaryUpdate,
  onRegenerateTitle,
  isRegeneratingTitle = false,
  onTitleUpdate,
  onContentUpdate
}) => {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [currentSummary, setCurrentSummary] = useState<string | null>(initialSummary);
  const [activeTab, setActiveTab] = useState('summary'); // Make summary the default tab
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
  const [editableTitle, setEditableTitle] = useState(initialTitle || '');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);  const [content, setContent] = useState(initialContent);
  const [selectedNoteId, setSelectedNoteId] = useState<number>(itemId);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [normalizedType, setNormalizedType] = useState(type === 'note' || type === 'transcript' ? type : 'note');

  // Add a breadcrumb stack to track navigation history
  const [breadcrumbStack, setBreadcrumbStack] = useState<Array<{ id: number; type: string; title: string; content: string; summary: string | null; tags: Tag[] }>>([]);

  // Initialize editable content when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      // Convert plain text to HTML for the editor if it's not already HTML
      const htmlContent = content.startsWith('<') ? content : textToHtml(content);
      setEditableContent(htmlContent);
    }
  }, [isEditMode, content]);

  // Update editableTitle when title prop changes
  useEffect(() => {
    setEditableTitle(initialTitle || '');
  }, [initialTitle]);

  // Update content when initialContent prop changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Reset state when a new item is being shown
  useEffect(() => {
    if (isOpen) {
      setActiveTab('summary');
      setCurrentSummary(initialSummary);
    }
  }, [isOpen, itemId, initialSummary]);

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

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditableTitle(initialTitle || '');
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

  // Format text for the editor
  const formatText = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
  };

  // Handle paste events to clean up HTML
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Get clipboard data as plain text only
    const text = e.clipboardData.getData('text/plain');
    
    if (text) {
      // Insert as plain text - this is the key to avoiding HTML formatting issues
      document.execCommand('insertText', false, text);
    }
  };

  // Handle content changes from the editor - using ContentEditable's onChange
  const handleContentChange = (e: { target: { value: string } }) => {
    setEditableContent(e.target.value);
  };

  // Save edited content
  const saveContent = async () => {
    setIsSaving(true);
    try {
      // Extract text from HTML content while preserving line breaks
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = editableContent;
      
      // Replace <div> and <br> with proper line breaks before extracting text
      const html = tempDiv.innerHTML;
      // Replace <div><br></div> (empty lines) with double newlines
      const htmlWithLineBreaks1 = html.replace(/<div><br><\/div>/g, '\n\n');
      // Replace <div>content</div> with content + newline
      const htmlWithLineBreaks2 = htmlWithLineBreaks1.replace(/<div>(.*?)<\/div>/g, '$1\n');
      // Replace <br> with newlines
      const htmlWithLineBreaks3 = htmlWithLineBreaks2.replace(/<br>/g, '\n');
      
      // Now extract text from the modified HTML
      tempDiv.innerHTML = htmlWithLineBreaks3;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Trim any trailing newlines but preserve internal ones
      const trimmedText = plainText.replace(/\n+$/, '');

      if (type === 'note') {
        await updateNoteContent(itemId, trimmedText);
        // Update the content state with the new content
        setContent(trimmedText);
        toast.success('Note content updated successfully');
      } else {
        await updateTranscriptContent(itemId, trimmedText);
        // Update the content state with the new content
        setContent(trimmedText);
        toast.success('Transcript content updated successfully');
      }
      // Exit edit mode after successful save
      setIsEditMode(false);
      
      // Notify parent component if callback exists
      if (onContentUpdate) {
        onContentUpdate(trimmedText);
      }
    } catch (error) {
      console.error('Failed to save content:', error);
      toast.error(`Failed to save content: ${(error as Error).message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle canceling edit mode
  const handleCancelEditContent = () => {
    setIsEditMode(false);
    // Reset editable content to original content
    setEditableContent(content.startsWith('<') ? content : textToHtml(content));
  };

  // Function to check if there's actual content to copy in edit mode
  const hasEditableContent = () => {
    if (!editableContent) return false;
    // Create a temporary div to extract text from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editableContent;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.trim().length > 0;
  };

  // Handle copy functionality for edit mode
  const handleCopyEditableContent = async () => {
    try {
      // Create a temporary div to extract text from HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = editableContent;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(text);
      toast.success('Content copied to clipboard');
    } catch (error) {
      console.error('Failed to copy content:', error);
      toast.error('Failed to copy content');
    }
  };

  // Handle summary generation from SummaryModule
  const handleSummaryGenerated = (newSummary: string) => {
    setCurrentSummary(newSummary);
    // Call the parent component's callback if provided
    if (onSummaryUpdate) {
      onSummaryUpdate(newSummary);
    }
  };
  if (!isOpen) return null;

  // Function to handle navigation to a new item
  const navigateToItem = (
    id: number, 
    type: string, 
    title: string, 
    content: string, 
    tags: Tag[] = [], 
    summary: string | null = null
  ) => {
    // Store current item in breadcrumb stack
    setBreadcrumbStack(prev => [...prev, {
      id: itemId,
      type: normalizedType,
      title: editableTitle,
      content,
      summary: currentSummary,
      tags
    }]);

    // Update all modal state for the new item
    setContent(content);
    setEditableTitle(title);
    setSelectedNoteId(id);
    setTags(tags);
    setCurrentSummary(summary);
    // Reset all states
    setIsEditMode(false);
    setIsEditingTitle(false);
    setEditableContent(content);
    setIsCopied(false);
    // Update the normalized type for the new item
    const newNormalizedType = type === 'note' || type === 'transcript' ? type : 'note';
    setNormalizedType(newNormalizedType);
    // Reset active tab to summary
    setActiveTab('summary');
  };

  // Function to handle back navigation to a specific item in the breadcrumb
  const handleBackNavigation = async (targetItem?: typeof breadcrumbStack[0]) => {
    if (breadcrumbStack.length > 0) {
      const itemToNavigateTo = targetItem || breadcrumbStack[breadcrumbStack.length - 1];
      
      try {
        // Fetch the previous item's content and data
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Authentication required');
          return;
        }

        // Get the item from the API
        const newNormalizedType = itemToNavigateTo.type === 'note' || itemToNavigateTo.type === 'transcript' 
          ? itemToNavigateTo.type 
          : 'note';
        const itemEndpoint = newNormalizedType === 'note' ? 'notes' : 'transcripts';
        const response = await fetch(`${API_BASE}/api/${itemEndpoint}/${itemToNavigateTo.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${itemToNavigateTo.type}`);
        }
        
        // Get the full item data
        const item = await response.json();
        const linkedContent = newNormalizedType === 'note' ? item.content : item.text;
        const linkedSummary = item.summary || null;
        const linkedTags = item.tags || [];

        // Remove all items after the target item from the stack
        if (targetItem) {
          const targetIndex = breadcrumbStack.findIndex(item => item.id === targetItem.id);
          if (targetIndex !== -1) {
            setBreadcrumbStack(prev => prev.slice(0, targetIndex));
          }
        } else {
          setBreadcrumbStack(prev => prev.slice(0, -1));
        }

        // Update all modal state for the previous item
        setContent(linkedContent);
        setEditableTitle(itemToNavigateTo.title);
        setSelectedNoteId(itemToNavigateTo.id);
        setTags(linkedTags);
        setCurrentSummary(linkedSummary);
        setActiveTab('summary');
        // Update type state
        setNormalizedType(newNormalizedType);
        // Reset edit states
        setIsEditMode(false);
        setIsEditingTitle(false);
        setEditableContent(linkedContent);
        // Reset copy state
        setIsCopied(false);

        toast.success(`Returned to: ${itemToNavigateTo.title || 'previous item'}`);
      } catch (error) {
        console.error('Error navigating back:', error);
        toast.error('Failed to navigate back to previous item');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-4 lg:inset-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-4rem)]">
        {/* Header */}
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
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  placeholder="Enter title"
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
                <option value="md">MD</option>
                <option value="html">HTML</option>
                <option value="pdf">PDF</option>
              </select>
              
              <button
                onClick={() => downloadDocument({
                  id: selectedNoteId,
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

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left panel - Content */}
          <div className={`flex-1 min-w-0 ${isEditMode ? '' : 'overflow-y-auto'} px-4 sm:px-6 py-4 lg:border-r border-gray-200 dark:border-gray-700 flex flex-col`}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(156 163 175) transparent'
            }}
            onScroll={handleScroll}
          >
            {isEditMode ? (
              <>
                {/* Formatting Toolbar */}
                <EditorToolbar formatText={formatText} />
                
                {/* Editor Content */}
                <div className="flex flex-col flex-grow mt-4">
                  <div className="flex-grow relative">
                    {hasEditableContent() && (
                      <button
                        onClick={handleCopyEditableContent}
                        className="absolute top-2 right-2 p-2 z-10 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        title="Copy content"
                      >
                        <Copy size={16} />
                      </button>
                    )}
                    <ContentEditable
                      innerRef={contentEditableRef}
                      html={editableContent}
                      onChange={handleContentChange}
                      onPaste={handlePaste}
                      tagName="div"
                      className="min-h-[300px] p-4 bg-white dark:bg-transparent rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-y-auto font-mono text-sm max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed"
                      style={{
                        minHeight: "300px",
                        maxHeight: "calc(100vh - 250px)", // Adjust based on header, toolbar and button heights
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgb(156 163 175) transparent'
                      }}
                    />
                  </div>
                  
                  {/* Save Button */}
                  <div className="mt-4 flex justify-end space-x-3">
                    <button 
                      onClick={handleCancelEditContent}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={saveContent}
                      disabled={isSaving}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </> 
            ) : (
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
                <div className={`max-w-none pt-10 font-mono text-sm`}>                  <LinkRenderer 
                    content={content}
                    onLinkClick={async (title) => {
                      try {
                        // Set up loading state
                        toast.info(`Loading "${title}"...`, {
                          autoClose: 1000
                        });
                        
                        // Call backend to find the item by title
                        const token = localStorage.getItem('token');
                        if (!token) {
                          toast.error('Authentication required');
                          return;
                        }

                        const response = await fetch(`${API_BASE}/api/links/find-by-title?title=${encodeURIComponent(title)}`, {
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        });

                        if (!response.ok) {
                          throw new Error('Failed to find linked item');
                        }

                        const data = await response.json();
                        
                        if (data && data.found) {
                          // Fetch the linked item content and update the current modal
                          const itemEndpoint = data.type === 'note' ? 'notes' : 'transcripts';
                          const linkedItemResponse = await fetch(`${API_BASE}/api/${itemEndpoint}/${data.id}`, {
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          
                          if (!linkedItemResponse.ok) {
                            throw new Error('Failed to fetch linked item content');
                          }
                          
                          // Extract content based on item type
                          const linkedItem = await linkedItemResponse.json();
                          const linkedContent = data.type === 'note' ? linkedItem.content : linkedItem.text;
                          const linkedSummary = linkedItem.summary || null;
                          const linkedTags = linkedItem.tags || [];
                          
                          // Update current modal with new content
                          navigateToItem(data.id, data.type, data.title || 'Untitled', linkedContent, linkedTags, linkedSummary);
                          
                          // Reset active tab to summary
                          setActiveTab('summary');
                          
                          toast.success(`Navigated to: ${data.title || 'linked item'}`);
                        } else {
                          toast.info(`No item found with title "${title}"`);
                        }
                      } catch (error) {
                        console.error('Error navigating to linked item:', error);
                        toast.error('Failed to navigate to linked item');
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>          {/* Right panel - Tabs and modules */}
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
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgb(156 163 175) transparent'
              }}
            >              {activeTab === 'summary' && (
                <SummaryModule
                  itemId={itemId}
                  itemType={normalizedType}
                  content={content}
                  initialSummary={currentSummary}
                  onSummaryGenerated={handleSummaryGenerated}
                />
              )}
              {activeTab === 'tags' && (
                <TaggingModule
                  type={normalizedType}
                  itemId={itemId}
                  content={content}
                  initialTags={tags}
                  onTagsUpdate={onTagsUpdate}
                />
              )}              {activeTab === 'backlinks' && (
                <BacklinksDisplay
                  itemId={selectedNoteId}
                  itemType={normalizedType}
                  onBacklinkClick={async (backlink) => {
                    try {
                      // Set up loading state
                      toast.info(`Loading ${backlink.sourceTitle || 'linked item'}...`, {
                        autoClose: 1000
                      });
                      
                      const token = localStorage.getItem('token');
                      if (!token) {
                        toast.error('Authentication required');
                        return;
                      }
                      
                      // Fetch the source item content
                      const endpoint = backlink.sourceType === 'note' ? 'notes' : 'transcripts';
                      const response = await fetch(`${API_BASE}/api/${endpoint}/${backlink.sourceId}`, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      
                      if (!response.ok) {
                        throw new Error(`Failed to fetch ${backlink.sourceType}`);
                      }
                      
                      const item = await response.json();
                      const linkedContent = backlink.sourceType === 'note' ? item.content : item.text;
                      const linkedSummary = item.summary || null;
                      const linkedTags = item.tags || [];
                      
                      // Update modal content with the backlink source
                      navigateToItem(backlink.sourceId, backlink.sourceType, backlink.sourceTitle || 'Untitled', linkedContent, linkedTags, linkedSummary);
                      
                      // Reset active tab to summary
                      setActiveTab('summary');
                      
                      toast.success(`Navigated to: ${backlink.sourceTitle || 'linked item'}`);
                    } catch (error) {
                      console.error('Error navigating to backlink:', error);
                      toast.error('Failed to navigate to backlink');
                    }
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
