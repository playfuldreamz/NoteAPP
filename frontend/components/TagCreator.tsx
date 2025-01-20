import React, { useState } from 'react';

interface TagCreatorProps {
  onCreate: (name: string) => void;
  disabled?: boolean;
}

const TagCreator: React.FC<TagCreatorProps> = ({ onCreate, disabled = false }) => {
  const [tagName, setTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (tagName.trim()) {
      try {
        await onCreate(tagName);
        setTagName('');
      } catch (error) {
        console.error('Failed to create tag:', error);
      }
    }
  };

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={tagName}
        onChange={(e) => setTagName(e.target.value)}
        placeholder="New tag name"
        className={`flex-1 p-1 border border-gray-300 dark:border-gray-600 rounded-md ${
          disabled ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : 'dark:bg-gray-700 dark:text-gray-200'
        }`}
        disabled={disabled}
      />
      <button
        onClick={handleCreate}
        disabled={!tagName.trim() || disabled}
        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Create
      </button>
    </div>
  );
};

export default TagCreator;