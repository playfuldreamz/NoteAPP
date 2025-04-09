import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Sparkles } from 'lucide-react';
import { generateAndSaveSummary, InvalidAPIKeyError, SummaryResponse } from '../../services/ai';

interface SummaryModuleProps {
  itemId: number;
  itemType: 'note' | 'transcript';
  initialSummary: string | null | undefined;
  content: string;
  onSummaryGenerated: (newSummary: string) => void;
}

const SummaryModule: React.FC<SummaryModuleProps> = ({
  itemId,
  itemType,
  initialSummary,
  content,
  onSummaryGenerated,
}) => {
  const [displayedSummary, setDisplayedSummary] = useState<string | null>(initialSummary || null);
  const [isLoading, setIsLoading] = useState(false);

  // Update displayed summary when initialSummary prop changes
  useEffect(() => {
    setDisplayedSummary(initialSummary || null);
  }, [initialSummary]);

  const handleGenerateSummary = async () => {
    if (!content || content.trim() === '') {
      toast.error('Cannot generate a summary for empty content.');
      return;
    }

    setIsLoading(true);

    try {
      const response: SummaryResponse = await generateAndSaveSummary(itemType, itemId);
      
      if (response.success) {
        setDisplayedSummary(response.summary);
        onSummaryGenerated(response.summary);
        toast.success('Summary generated successfully!');
      } else {
        toast.error('Failed to generate summary.');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      
      if (error instanceof InvalidAPIKeyError) {
        toast.error('AI provider API key is missing or invalid. Please check your settings.', {
          autoClose: 5000,
          onClick: () => {
            // This will be handled by the parent component or through global state
            // to open the settings modal
            const settingsEvent = new CustomEvent('openAISettings');
            window.dispatchEvent(settingsEvent);
          },
        });
      } else {
        toast.error(`Error: ${error instanceof Error ? error.message : 'Failed to generate summary'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-4 space-y-3">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-6 space-y-3">
          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">Generating summary...</p>
        </div>
      ) : displayedSummary ? (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{displayedSummary}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">No summary available.</p>
          <button
            onClick={handleGenerateSummary}
            disabled={!content || content.trim() === ''}
            className="inline-flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={16} />
            Generate Summary
          </button>
        </div>
      )}
    </div>
  );
};

export default SummaryModule;