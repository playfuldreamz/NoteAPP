import { useState } from 'react';
import { toast } from 'react-toastify';
import { generateTranscriptTitle } from '../services/ai';

interface UseTranscriptSaverOptions {
  onSaveSuccess?: () => void;
  onReset?: () => void;
}

interface UseTranscriptSaverReturn {
  isSaving: boolean;
  saveTranscript: (transcript: string, duration: number, useEnhanced?: boolean, enhancedTranscript?: string) => Promise<void>;
  resetTranscript: () => void;
}

export function useTranscriptSaver(options: UseTranscriptSaverOptions = {}): UseTranscriptSaverReturn {
  const [isSaving, setIsSaving] = useState(false);

  const saveTranscript = async (
    transcript: string, 
    duration: number, 
    useEnhanced = false, 
    enhancedTranscript = ''
  ): Promise<void> => {
    if (!transcript || transcript.trim() === '') {
      toast.info('No transcript to save');
      return;
    }

    try {
      setIsSaving(true);
      
      // Generate a title for the transcript
      const title = await generateTranscriptTitle(transcript);
      
      // Determine which transcript to save
      const transcriptToSave = useEnhanced && enhancedTranscript ? enhancedTranscript : transcript;
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You must be logged in to save transcripts');
        return;
      }
      
      // First attempt to save with full data
      try {
        const response = await fetch('http://localhost:5000/api/transcripts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            text: transcriptToSave,
            duration
          })
        });
        
        if (!response.ok) {
          // Check if it's a payload too large error (413)
          if (response.status === 413) {
            throw new Error('PAYLOAD_TOO_LARGE');
          }
          
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save transcript');
        }
        
        toast.success('Transcript saved successfully!');
        
        // Call the success callback if provided
        if (options.onSaveSuccess) {
          options.onSaveSuccess();
        }
      } catch (error) {
        // If it's a payload too large error, try with a simplified payload
        if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
          console.warn('Payload too large, attempting to save with reduced content...');
          toast.info('Transcript is very large, attempting to save with a simplified format...');
          
          // Define maximum size for fallback content (100KB)
          const MAX_FALLBACK_CONTENT_SIZE = 100 * 1024;
          
          // Try saving with just the content and a default title
          try {
            // Truncate content if it's extremely large
            let truncatedContent = transcriptToSave;
            if (transcriptToSave.length > MAX_FALLBACK_CONTENT_SIZE) {
              truncatedContent = transcriptToSave.substring(0, MAX_FALLBACK_CONTENT_SIZE) + 
                "\n\n[Transcript was truncated due to size limitations]";
            }
            
            // Simplified payload with just the essential data
            const fallbackResponse = await fetch('http://localhost:5000/api/transcripts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                title: 'Untitled Large Transcript',
                text: truncatedContent,
                duration
              })
            });
            
            if (!fallbackResponse.ok) {
              const fallbackErrorData = await fallbackResponse.json();
              throw new Error(fallbackErrorData.error || 'Failed to save transcript with reduced content');
            }
            
            toast.success('Transcript saved with simplified format');
            
            // Call the success callback if provided
            if (options.onSaveSuccess) {
              options.onSaveSuccess();
            }
          } catch (fallbackError) {
            console.error('Error saving transcript with fallback method:', fallbackError);
            toast.error(`Error saving transcript: ${(fallbackError as Error).message}`);
          }
        } else {
          // Handle other errors
          console.error('Error saving transcript:', error);
          toast.error(`Error saving transcript: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      console.error('Error in transcript saving process:', error);
      toast.error(`Error saving transcript: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetTranscript = () => {
    if (options.onReset) {
      options.onReset();
    }
  };

  return {
    isSaving,
    saveTranscript,
    resetTranscript
  };
}
