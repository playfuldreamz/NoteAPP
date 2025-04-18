import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateNoteContent, updateTranscriptContent } from '../../services/ai';
import { textToHtml } from '../../components/notes/editor/editorContentUtils';

interface UseModalContentProps {
  initialContent: string;
  itemId: number;
  type?: 'note' | 'transcript';
  onContentUpdate?: (content: string) => void;
}

export const useModalContent = ({
  initialContent,
  itemId,
  type = 'note',
  onContentUpdate
}: UseModalContentProps) => {
  const [content, setContent] = useState(initialContent);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Update content when initialContent prop changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Initialize editable content when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      // Convert plain text to HTML for the editor if it's not already HTML
      const htmlContent = content.startsWith('<') ? content : textToHtml(content);
      setEditableContent(htmlContent);
    }
  }, [isEditMode, content]);

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

  // Handle content changes from the editor
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

  // Handle copy functionality for view mode
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

  return {
    content,
    setContent,
    isEditMode,
    setIsEditMode,
    editableContent,
    setEditableContent,
    isSaving,
    isCopied,
    formatText,
    handlePaste,
    handleContentChange,
    saveContent,
    handleCancelEditContent,
    hasEditableContent,
    handleCopyEditableContent,
    handleCopy
  };
};

export default useModalContent;
