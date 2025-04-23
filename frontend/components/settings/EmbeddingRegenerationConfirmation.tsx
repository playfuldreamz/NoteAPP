import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { regenerateAllEmbeddings, getRegenerationStatus } from '../../services/embeddingRegenerationService';

interface EmbeddingRegenerationConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  provider: string;
}

const EmbeddingRegenerationConfirmation: React.FC<EmbeddingRegenerationConfirmationProps> = ({
  isOpen,
  onClose,
  provider
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [regenerationStatus, setRegenerationStatus] = useState<{
    inProgress: boolean;
    total: number;
    completed: number;
    startTime?: string;
    errors?: Array<{itemId: number; itemType: string; error: string}>;
    fatalError?: string;
    hasAPIKeyError?: boolean;
    errorCount?: number;
  } | null>(null);

  // Check if regeneration is already in progress when component mounts
  useEffect(() => {
    if (isOpen) {
      checkRegenerationStatus();
    }
  }, [isOpen]);

  // Periodically check regeneration status if in progress
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isOpen && regenerationStatus?.inProgress) {
      intervalId = setInterval(checkRegenerationStatus, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, regenerationStatus?.inProgress]);

  const checkRegenerationStatus = async () => {
    try {
      const status = await getRegenerationStatus();
      setRegenerationStatus(status);
      
      // If there's a fatal error, show it as a toast
      if (status.fatalError && !status.inProgress) {
        toast.error(status.fatalError);
      }
    } catch (error) {
      console.error('Error checking regeneration status:', error);
      // Don't show toast here as this might be called frequently
    }
  };

  const handleRegenerateEmbeddings = async () => {
    try {
      setIsLoading(true);
      const result = await regenerateAllEmbeddings();
      
      if (result.success) {
        toast.success('Embedding regeneration started successfully');
        await checkRegenerationStatus();
      } else {
        // If there's an API key error, show a more specific message
        if (result.hasAPIKeyError) {
          toast.error('OpenAI API key is invalid or missing. Switching to Local Model (Xenova).');
        } else {
          toast.error(result.message || 'Failed to start embedding regeneration');
        }
      }
    } catch (error) {
      console.error('Error regenerating embeddings:', error);
      toast.error('Failed to start embedding regeneration');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-start mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Regenerate Embeddings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              You've changed your embedding provider to <strong>{provider}</strong>. 
              Existing embeddings were generated with a different provider and need to be regenerated.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              This process will regenerate embeddings for all your notes and transcripts. 
              It may take some time depending on the amount of content.
            </p>
          </div>
        </div>

        {regenerationStatus?.inProgress ? (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            <div className="flex items-center mb-2">
              <Loader className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-2 animate-spin" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Regeneration in progress
              </span>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {regenerationStatus.completed} of {regenerationStatus.total} items processed
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${regenerationStatus.total > 0 ? (regenerationStatus.completed / regenerationStatus.total) * 100 : 0}%` }}
              ></div>
            </div>
            {regenerationStatus.errorCount && regenerationStatus.errorCount > 0 && (
              <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                {regenerationStatus.errorCount} errors encountered. Regeneration will continue with remaining items.
              </div>
            )}
          </div>
        ) : regenerationStatus?.fatalError ? (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-md">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Error during regeneration
                </span>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {regenerationStatus.hasAPIKeyError ? 
                    'Your OpenAI API key is invalid or missing. The system has automatically switched to the Local Model (Xenova).' : 
                    regenerationStatus.fatalError}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-end space-x-3 mt-6">
            <button
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              onClick={handleRegenerateEmbeddings}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                'Regenerate Embeddings'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmbeddingRegenerationConfirmation;
