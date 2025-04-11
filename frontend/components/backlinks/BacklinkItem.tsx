import React from 'react';
import { BacklinkItem as BacklinkItemType } from '../../services/linkService';

interface BacklinkItemProps {
  backlink: BacklinkItemType;
  onClick?: (backlink: BacklinkItemType) => void;
}

const BacklinkItemComponent: React.FC<BacklinkItemProps> = ({ backlink, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(backlink);
    } else {
      // Navigate to the source item
      window.location.href = `/${backlink.sourceType === 'note' ? 'notes' : 'transcripts'}/${backlink.sourceId}`;
    }
  };

  const sourceTypeIcon = backlink.sourceType === 'note' ? (
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
    >
      <div className="flex-shrink-0">
        {sourceTypeIcon}
      </div>
      <div className="flex-grow overflow-hidden">
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {backlink.sourceTitle || `Untitled ${backlink.sourceType.charAt(0).toUpperCase() + backlink.sourceType.slice(1)}`}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {backlink.sourceType.charAt(0).toUpperCase() + backlink.sourceType.slice(1)}
        </p>
      </div>
    </button>  );
};

export default BacklinkItemComponent;
