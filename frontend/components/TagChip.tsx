import React from 'react';
import { Tag } from '../services/ai';

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
    <div 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
        ${isSelected 
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' 
          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}
        ${className}
        ${onClick || onToggle ? 'cursor-pointer' : ''}
      `}
      onClick={disabled ? undefined : (onClick || onToggle)}
      role={onClick || onToggle ? "button" : undefined}
      tabIndex={onClick || onToggle ? 0 : undefined}
      onKeyPress={
        onClick || onToggle 
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.() || onToggle?.();
              }
            }
          : undefined
      }
    >
      {tagName}
      {onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              onRemove();
            }
          }}
          className="ml-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!disabled) {
                onRemove();
              }
            }
          }}
        >
          ×
        </span>
      )}
    </div>
  );
};

export default TagChip;
