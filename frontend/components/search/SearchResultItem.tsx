import { formatDistanceToNow } from 'date-fns';
import { DocumentTextIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import { SearchResult } from '../../types/search';

interface SearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

export default function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  // Format the timestamp
  const formattedDate = result.timestamp 
    ? formatDistanceToNow(new Date(result.timestamp), { addSuffix: true })
    : 'Unknown date';

  // Get a preview of the content (truncate to ~150 chars)
  const contentPreview = result.content 
    ? result.content.substring(0, 150) + (result.content.length > 150 ? '...' : '')
    : 'No content';

  // Calculate relevance percentage
  const relevancePercentage = Math.round(result.relevance * 100);

  return (
    <div 
      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {result.type === 'note' ? (
            <DocumentTextIcon className="w-5 h-5 text-blue-500" />
          ) : (
            <MicrophoneIcon className="w-5 h-5 text-purple-500" />
          )}
        </div>
        
        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {result.title || (result.type === 'note' ? 'Untitled Note' : 'Untitled Recording')}
            </h3>
            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">
              {relevancePercentage}% match
            </span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2">
            <span className="capitalize">{result.type}</span>
            <span className="mx-2">•</span>
            <span>{formattedDate}</span>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line line-clamp-2">
            {contentPreview}
          </p>
          
          {result.summary && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">Summary:</span> {result.summary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
