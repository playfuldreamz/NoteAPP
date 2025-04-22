import { toast } from 'react-toastify';
import { generateTranscriptTitle } from '../../../services/ai';
import { htmlToText, MAX_FALLBACK_CONTENT_SIZE } from './editorContentUtils';
import eventBus from '../../../utils/eventBus';

interface SaveNoteParams {
  noteContent: string;
  transcript: string;
  title: string;
  isDefaultTitle: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export const saveNoteToServer = async ({
  noteContent,
  transcript,
  title,
  isDefaultTitle,
  onSuccess,
  onClose
}: SaveNoteParams): Promise<void> => {
  if (!noteContent.trim()) {
    toast.error('Cannot save an empty note.');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    toast.error('Please login to save notes');
    return;
  }

  let noteTitle = title;
  
  try {
    // Convert HTML to clean text
    const cleanedContent = htmlToText(noteContent);
    
    // If title is default, generate a title using AI
    if (isDefaultTitle) {
      try {
        toast.info('Generating title for your note...');
        noteTitle = await generateTranscriptTitle(cleanedContent);
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

      await response.json();
      toast.success('Note saved successfully!');
      
      // Emit a note:saved event
      setTimeout(() => {
        eventBus.emit('note:saved');
      }, 500);
      
      onSuccess(); // Refresh the notes list
      onClose(); // Close the modal
      return;
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
          toast.success('Note saved with simplified format!');
          
          // Emit a note:saved event even for fallback saves
          setTimeout(() => {
            eventBus.emit('note:saved');
          }, 500);
          
          onSuccess(); // Refresh the notes list
          onClose(); // Close the modal
          return;
        } catch (fallbackError) {
          console.error('Fallback save error:', fallbackError);
          throw new Error('Failed to save note even with reduced size. Please try with less content.');
        }
      }
      
      // Re-throw other errors
      throw error;
    }
  } catch (error) {
    console.error('Overall save error:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to save note. Please try again');
    throw error;
  }
};
