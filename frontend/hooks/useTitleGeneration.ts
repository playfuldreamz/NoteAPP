import { useState } from 'react';
import { toast } from 'react-toastify';
import { generateTranscriptTitle, updateTranscriptTitle, updateNoteTitle } from '../services/ai';

interface UseTitleGeneration {
  loadingTitles: { [key: number]: boolean };
  handleGenerateTitle: (id: number, text: string, updateTitle: (id: number, title: string) => void, type: 'note' | 'transcript', currentTitle?: string) => Promise<void>;
}

const useTitleGeneration = (): UseTitleGeneration => {
  const [loadingTitles, setLoadingTitles] = useState<{ [key: number]: boolean }>({});

  const handleGenerateTitle = async (id: number, text: string, updateTitle: (id: number, title: string) => void, type: 'note' | 'transcript', currentTitle?: string) => {
    try {
      setLoadingTitles(prev => ({ ...prev, [id]: true }));
      
      // Try up to 3 times to get a different title
      let newTitle = '';
      let attempts = 0;
      const maxAttempts = 3;
      
      do {
        newTitle = await generateTranscriptTitle(text);
        attempts++;
        
        // If we got a different title or we've tried enough times, break the loop
        if (!currentTitle || newTitle !== currentTitle || attempts >= maxAttempts) {
          break;
        }
        
        // If we got the same title, log and try again
        console.log(`Generated same title on attempt ${attempts}, trying again...`);
      } while (attempts < maxAttempts);
      
      // If we still got the same title after all attempts, add a suffix to make it different
      if (currentTitle && newTitle === currentTitle) {
        newTitle = `${newTitle} (Revised)`;
      }
      
      // Update the title in the database
      if (type === 'note') {
        await updateNoteTitle(id, newTitle);
      } else {
        await updateTranscriptTitle(id, newTitle);
      }
      
      // Update the title in the UI
      updateTitle(id, newTitle);
      
      toast.success('Title generated and saved successfully');
    } catch (error) {
      console.error('Error generating title:', error);
      toast.error('Failed to generate title');
    } finally {
      setLoadingTitles(prev => ({ ...prev, [id]: false }));
    }
  };

  return {
    loadingTitles,
    handleGenerateTitle
  };
};

export default useTitleGeneration;
