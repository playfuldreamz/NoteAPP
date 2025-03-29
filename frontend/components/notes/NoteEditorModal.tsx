import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

// Import modular components
import EditorHeader from './editor/EditorHeader';
import EditorToolbar from './editor/EditorToolbar';
import EditorContent from './editor/EditorContent';
import EditorTabs from './editor/EditorTabs';

// Import utility functions
import { textToHtml } from './editor/editorContentUtils';
import { saveNoteToServer } from './editor/noteEditorService';

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
  const [activeTab, setActiveTab] = useState('extensions');
  const [isScrolled, setIsScrolled] = useState(false);
  const [title, setTitle] = useState('Untitled Note');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(title);

  // Initialize content when the modal opens
  useEffect(() => {
    if (isOpen) {
      // Convert plain text to HTML for the editor
      const htmlContent = textToHtml(initialContent);
      
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
    const contentElement = document.querySelector('[contenteditable="true"]');
    if (contentElement) {
      const newContent = contentElement.innerHTML;
      setNoteContent(newContent);
      
      // Notify parent component if callback exists
      if (onContentChange) {
        onContentChange(newContent);
      }
      
      // Focus back on the editor - fix for type safety
      if (contentElement instanceof HTMLElement) {
        contentElement.focus();
      }
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
      const contentElement = e.currentTarget;
      if (contentElement) {
        const newContent = contentElement.innerHTML;
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
    setIsSaving(true);
    try {
      await saveNoteToServer({
        noteContent,
        transcript,
        title,
        isDefaultTitle: title === 'Untitled Note' && !isEditingTitle,
        onSuccess: () => {
          setNoteContent(''); // Clear the input
          onSave(); // Refresh the notes list
        },
        onClose
      });
    } catch (error) {
      // Error is already handled in the service
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-4 lg:inset-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-4rem)]">
        {/* Header */}
        <EditorHeader 
          title={title}
          editableTitle={editableTitle}
          isEditingTitle={isEditingTitle}
          isScrolled={isScrolled}
          setEditableTitle={setEditableTitle}
          setIsEditingTitle={setIsEditingTitle}
          handleSaveTitle={handleSaveTitle}
          handleCancelEdit={handleCancelEdit}
          onClose={onClose}
        />

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
            <EditorToolbar formatText={formatText} />

            {/* Editor and Save Button Container */}
            <EditorContent
              noteContent={noteContent}
              isSaving={isSaving}
              handleContentChange={handleContentChange}
              handlePaste={handlePaste}
              saveNote={saveNote}
            />
          </div>

          {/* Right panel - Extensions */}
          <EditorTabs 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
};

export default NoteEditorModal;
