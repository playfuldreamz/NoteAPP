import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateNoteTitle, updateTranscriptTitle } from '../../services/ai';

interface UseModalTitleProps {
  initialTitle?: string;
  itemId: number;
  type?: 'note' | 'transcript';
  onTitleUpdate?: () => void;
  onRegenerateTitle?: () => void;
  isRegeneratingTitle?: boolean;
}

export const useModalTitle = ({
  initialTitle,
  itemId,
  type = 'note',
  onTitleUpdate,
  onRegenerateTitle,
  isRegeneratingTitle = false
}: UseModalTitleProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(initialTitle || '');

  // Update editableTitle when initialTitle prop changes
  useEffect(() => {
    setEditableTitle(initialTitle || '');
  }, [initialTitle]);

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

  return {
    isEditingTitle,
    setIsEditingTitle,
    editableTitle,
    setEditableTitle,
    handleSaveTitle,
    handleCancelEdit,
    onRegenerateTitle,
    isRegeneratingTitle
  };
};

export default useModalTitle;
