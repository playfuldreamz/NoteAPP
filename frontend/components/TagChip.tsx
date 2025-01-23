import React from 'react';

interface Tag {
  id: number;
  name: string;
}

interface TagChipProps {
  tag: string | Tag;
  isSelected?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const TagChip: React.FC<TagChipProps> = ({
  tag,
  isSelected = false,
  onToggle,
  onRemove,
  onClick,
  disabled = false,
  className = ''
}) => {
  const tagName = typeof tag === 'string' ? tag : tag.name;
  
  return (
    <button
      onClick={onClick || onToggle}
      disabled={disabled}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
        ${
          isSelected
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}`}
    >
      {tagName}
      {onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-2 hover:text-red-500"
        >
          ×
        </span>
      )}
    </button>
  );
};

export default TagChip;
