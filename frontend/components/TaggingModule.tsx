import React, { useState, useEffect } from 'react';
import { analyzeContentForTags, createTag, getAllTags, Tag } from '../services/ai';
import { toast } from 'react-toastify';
import TagChip from '@components/TagChip';
import TagCreator from '@components/TagCreator';

interface TaggingModuleProps {
  content: string;
  noteId?: number;
  transcriptId?: number;
  onTagsUpdate: (tags: Tag[]) => void;
}

const TaggingModule: React.FC<TaggingModuleProps> = ({ 
  content, 
  noteId, 
  transcriptId, 
  onTagsUpdate 
}) => {
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAllTags();
  }, []);

  const fetchAllTags = async () => {
    try {
      const tags = await getAllTags();
      setAllTags(tags);
    } catch (error) {
      toast.error('Failed to load tags');
      console.error(error);
    }
  };

  const analyzeTags = async () => {
    setIsLoading(true);
    try {
      const tags = await analyzeContentForTags(content);
      setSuggestedTags(tags);
    } catch (error) {
      toast.error('Failed to analyze content for tags');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagToggle = async (tagName: string) => {
    const existingTag = allTags.find(t => t.name === tagName);
    
    if (existingTag) {
      const isSelected = selectedTags.some(t => t.id === existingTag.id);
      if (isSelected) {
        setSelectedTags(prev => prev.filter(t => t.id !== existingTag.id));
      } else {
        setSelectedTags(prev => [...prev, existingTag]);
      }
    } else {
      try {
        const newTag = await createTag(tagName);
        setAllTags(prev => [...prev, newTag]);
        setSelectedTags(prev => [...prev, newTag]);
      } catch (error) {
        toast.error('Failed to create new tag');
        console.error(error);
      }
    }
  };

  const handleCreateTag = async (name: string) => {
    try {
      const newTag = await createTag(name);
      setAllTags(prev => [...prev, newTag]);
      setSelectedTags(prev => [...prev, newTag]);
      setIsCreatingTag(false);
    } catch (error) {
      toast.error('Failed to create tag');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold">Tags</h4>
        <button 
          onClick={analyzeTags} 
          disabled={isLoading}
          className="text-sm text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Content'}
        </button>
      </div>
      
      {/* Suggested Tags Section */}
      {suggestedTags.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium">Suggested Tags</h5>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map(tag => (
              <TagChip 
                key={tag}
                tag={tag}
                onToggle={() => handleTagToggle(tag)}
                isSelected={selectedTags.some(t => t.name === tag)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected Tags Section */}
      <div className="space-y-2">
        <h5 className="text-sm font-medium">Selected Tags</h5>
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <TagChip 
              key={tag.id}
              tag={tag.name}
              onToggle={() => handleTagToggle(tag.name)}
              isSelected
            />
          ))}
        </div>
      </div>

      {/* Tag Creation Section */}
      <div className="space-y-2">
        <button 
          onClick={() => setIsCreatingTag(!isCreatingTag)}
          className="text-sm text-blue-500 hover:text-blue-700"
        >
          {isCreatingTag ? 'Cancel' : 'Create New Tag'}
        </button>
        {isCreatingTag && (
          <TagCreator onCreate={handleCreateTag} />
        )}
      </div>
    </div>
  );
};

export default TaggingModule;