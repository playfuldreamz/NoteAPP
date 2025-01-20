import React from 'react';

interface TagChipProps {
  tag: string;
  isSelected?: boolean;
  onToggle: () => void;
}

const TagChip: React.FC<TagChipProps> = ({ tag, isSelected = false, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
        ${
          isSelected 
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
        }`}
    >
      {tag}
    </button>
  );
};

export default TagChip;