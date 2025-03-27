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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save transcript');
      }
      
      toast.success('Transcript saved successfully!');
      
      // Call the success callback if provided
      if (options.onSaveSuccess) {
        options.onSaveSuccess();
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
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
