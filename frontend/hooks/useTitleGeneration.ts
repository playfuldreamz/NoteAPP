import { useState } from 'react';
import { toast } from 'react-toastify';
import { generateTranscriptTitle } from '../services/ai';

interface UseTitleGeneration {
  loadingTitles: { [key: number]: boolean };
  handleGenerateTitle: (id: number, text: string, updateTitle: (id: number, title: string) => void) => Promise<void>;
}

const useTitleGeneration = (): UseTitleGeneration => {
  const [loadingTitles, setLoadingTitles] = useState<{ [key: number]: boolean }>({});

  const handleGenerateTitle = async (id: number, text: string, updateTitle: (id: number, title: string) => void) => {
    try {
      setLoadingTitles(prev => ({ ...prev, [id]: true }));
      
      const title = await generateTranscriptTitle(text);
      updateTitle(id, title);
      
      toast.success('Title generated successfully');
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
