import React, { useState, useEffect, useRef } from 'react';
import { X, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Save, TagIcon, CheckSquare, Edit3, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { generateTranscriptTitle } from '../../services/ai';
import ContentEditable from 'react-contenteditable';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  transcript: string;
  onSave: () => void;
  onContentChange?: (content: string) => void;
}

const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  isOpen,
  onClose,
  initialContent,
  transcript,
  onSave,
  onContentChange
}) => {
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const contentEditableRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState('extensions');
  const [isScrolled, setIsScrolled] = useState(false);
  const [title, setTitle] = useState('Untitled Note');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(title);

  // Maximum content size to try if we get a payload too large error
  const MAX_FALLBACK_CONTENT_SIZE = 100 * 1024; // 100KB limit for fallback

  // Initialize content when the modal opens
  useEffect(() => {
    if (isOpen) {
      // Convert plain text to HTML for the editor
      const htmlContent = initialContent
        .split('\n')
        .map(line => line.trim() ? `<div>${line}</div>` : '<div><br></div>')
        .join('');
      
      // Set the HTML content
      setNoteContent(htmlContent);
    }
  }, [isOpen, initialContent]);

  // Reset title when modal is opened
  useEffect(() => {
    if (isOpen) {
      setTitle('Untitled Note');
      setEditableTitle('Untitled Note');
    }
  }, [isOpen]);

  // Handle modal open/close effects
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the editor when modal opens
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 100);
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

  const formatText = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    
    // Update the content state after formatting
    if (contentEditableRef.current?.el?.current) {
      const newContent = contentEditableRef.current.el.current.innerHTML;
      setNoteContent(newContent);
      
      // Notify parent component if callback exists
      if (onContentChange) {
        onContentChange(newContent);
      }
      
      // Focus back on the editor
      contentEditableRef.current.el.current.focus();
    }
  };

  // Handle paste events to clean up HTML
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Get clipboard data as plain text only
    const text = e.clipboardData.getData('text/plain');
    
    if (text) {
      // Insert as plain text - this is the key to avoiding HTML formatting issues
      document.execCommand('insertText', false, text);
      
      // Update the content state after paste
      if (contentEditableRef.current?.el?.current) {
        const newContent = contentEditableRef.current.el.current.innerHTML;
        setNoteContent(newContent);
        
        // Notify parent component if callback exists
        if (onContentChange) {
          onContentChange(newContent);
        }
      }
    }
  };

  // Handle content changes from the editor
  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    setNoteContent(newContent);
    
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  const handleSaveTitle = () => {
    setTitle(editableTitle);
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditableTitle(title);
    setIsEditingTitle(false);
  };

  const saveNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Cannot save an empty note.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to save notes');
      return;
    }

    setIsSaving(true);
    let noteTitle = title;
    
    // Check if the title is still the default and hasn't been edited
    const isDefaultTitle = title === 'Untitled Note' && !isEditingTitle;
    
    try {
      // Extract plain text content from the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = noteContent;
      
      // Process the content to match NoteSaver's behavior
      const processNode = (node: Node): string => {
        let result = '';
        
        if (node.nodeType === Node.TEXT_NODE) {
          result += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Handle different element types
          if (node.nodeName === 'BR') {
            result += '\n';
          } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
            // For block elements, add a single newline if needed
            if (node.previousSibling && 
                !(node.previousSibling.nodeType === Node.ELEMENT_NODE && 
                  (node.previousSibling.nodeName === 'DIV' || node.previousSibling.nodeName === 'P'))) {
              result += '\n';
            }
            
            // Process all child nodes
            for (let i = 0; i < node.childNodes.length; i++) {
              result += processNode(node.childNodes[i]);
            }
            
            // Only add a newline after if it doesn't already end with one
            // and if it has content
            if (result && !result.endsWith('\n') && node.nextSibling) {
              result += '\n';
            }
          } else {
            // For other elements, just process their children
            for (let i = 0; i < node.childNodes.length; i++) {
              result += processNode(node.childNodes[i]);
            }
          }
        }
        
        return result;
      };
      
      let cleanedContent = processNode(tempDiv);
      
      // Normalize newlines - this is critical to match NoteSaver behavior
      // Replace multiple consecutive newlines with a maximum of two
      cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n');
      
      // Trim leading/trailing whitespace
      cleanedContent = cleanedContent.trim();
      
      // If title is default, generate a title using AI
      if (isDefaultTitle) {
        try {
          setIsSaving(true);
          toast.info('Generating title for your note...');
          noteTitle = await generateTranscriptTitle(cleanedContent);
          setTitle(noteTitle); // Update the title in the state
        } catch (error) {
          console.error('Error generating title:', error);
          toast.warn('Could not generate title, using default');
          // Keep the default title if generation fails
        }
      }
      
      // Save note with edited or AI-generated title
      try {
        const response = await fetch('http://localhost:5000/api/notes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: cleanedContent,
            transcript: transcript,
            title: noteTitle
          })
        });

        if (!response.ok) {
          // Check if it's a payload too large error
          if (response.status === 413) {
            throw new Error('PAYLOAD_TOO_LARGE');
          }
          const data = await response.json();
          throw new Error(data.error || 'Failed to save note');
        }

        const data = await response.json();
        toast.success('Note saved successfully!');
        setNoteContent(''); // Clear the input
        onSave(); // Refresh the notes list
        onClose(); // Close the modal
      } catch (error) {
        // Handle payload too large error with a fallback approach
        if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
          console.warn('Payload too large, attempting to save with reduced content...');
          toast.info('Note is very large, attempting to save with a simplified format...');
          
          // Try saving with just the content and a default title
          try {
            // Truncate content if it's extremely large
            let truncatedContent = cleanedContent;
            if (cleanedContent.length > MAX_FALLBACK_CONTENT_SIZE) {
              truncatedContent = cleanedContent.substring(0, MAX_FALLBACK_CONTENT_SIZE) + 
                "\n\n[Note was truncated due to size limitations]";
            }
            
            const fallbackResponse = await fetch('http://localhost:5000/api/notes', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: truncatedContent,
                title: 'Untitled Large Note'
              })
            });

            if (!fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              throw new Error(fallbackData.error || 'Failed to save note even with reduced content');
            }

            console.log('Saved note with fallback approach');
            toast.success('Note saved successfully with simplified format!');
            setNoteContent(''); // Clear the input
            onSave(); // Refresh the notes list
            onClose(); // Close the modal
          } catch (fallbackError) {
            console.error('Fallback save error:', fallbackError);
            toast.error('Failed to save note even with reduced size. Please try with less content.');
          }
        } else {
          // Handle other errors
          console.error('Save error:', error);
          toast.error('Failed to save note. Please try again');
        }
      }
    } catch (error) {
      console.error('Overall save error:', error);
      toast.error('Failed to save note. Please try again');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle input events in the editor
  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    // Get the current content
    const newContent = e.currentTarget.innerHTML;
    
    // Update our state
    setNoteContent(newContent);
    
    // Notify parent component if callback exists
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  // Handle key press events to ensure proper behavior
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Make sure the cursor stays in the right place
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<div><br></div>');
      return false;
    }
    return true;
  };

  if (!isOpen) return null;

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

        {/* Content area with custom scrollbar */}
        <div 
          className="flex-1 overflow-hidden flex flex-col lg:flex-row"
          onScroll={handleScroll}
        >
          {/* Left panel - Content */}
          <div className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-4 lg:border-r border-gray-200 dark:border-gray-700 flex flex-col"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(156 163 175) transparent'
            }}
          >
            {/* Formatting Toolbar */}
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

            {/* Editor and Save Button Container */}
            <div className="flex flex-col flex-grow overflow-hidden">
              {/* Editor with fixed height and scrolling */}
              <ContentEditable
                innerRef={contentEditableRef}
                html={noteContent}
                onChange={handleContentChange}
                onPaste={handlePaste}
                tagName="div"
                disabled={false}
                className="flex-grow p-4 bg-white dark:bg-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none rounded-lg shadow-sm overflow-y-auto"
                style={{
                  minHeight: "300px",
                  maxHeight: "calc(100vh - 250px)", // Adjust based on header, toolbar and button heights
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgb(156 163 175) transparent'
                }}
              />
              {/* Save button in sticky container at bottom */}
              <div className="sticky bottom-0 pt-4 bg-white dark:bg-gray-900 z-10">
                <button 
                  onClick={saveNote}
                  disabled={isSaving}
                  className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all focus:outline-none ${
                    isSaving
                      ? 'bg-blue-200 dark:bg-blue-900 text-blue-50 dark:text-blue-200 cursor-not-allowed'
                      : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  <Save size={20} />
                  {isSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>

          {/* Right panel - Extensions */}
          <div className="flex-1 min-w-0 lg:max-w-[40%] xl:max-w-[35%] overflow-hidden flex flex-col border-t border-gray-200 dark:border-gray-700 lg:border-t-0">
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
        </div>
      </div>
    </div>
  );
};

export default NoteEditorModal;
