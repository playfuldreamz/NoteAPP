import React, { useState, useEffect } from 'react';
import {
  analyzeContentForTags,
  createTag,
  getAllTags,
  getTagsForItem,
  addTagToItem,
  removeTagFromItem,
  Tag
} from '../services/ai';
import { toast } from 'react-toastify';
import TagChip from '@components/TagChip';
import TagCreator from '@components/TagCreator';

interface TaggingModuleProps {
  type: 'note' | 'transcript';
  itemId: number;
  content: string;
  onTagsUpdate: (tags: Tag[]) => void;
}

const TaggingModule: React.FC<TaggingModuleProps> = ({
  type,
  itemId,
  content,
  onTagsUpdate
}) => {
  // State management
  const [tags, setTags] = useState<Tag[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load tags when component mounts
  useEffect(() => {
    const loadTags = async () => {
      try {
        const [allTags, itemTags] = await Promise.all([
          getAllTags(),
          getTagsForItem(type, itemId)
        ]);
        setTags(allTags);
        setSelectedTags(itemTags);
      } catch (error) {
        console.error('Error loading tags:', error);
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadTags();
  }, [type, itemId]);

  // Handle tag selection
  const handleTagSelection = async (tag: Tag) => {
    setIsSaving(true);
    try {
      if (selectedTags.some(t => t.id === tag.id)) {
        await removeTagFromItem(type, itemId, tag.id);
        setSelectedTags(prev => prev.filter(t => t.id !== tag.id));
      } else {
        await addTagToItem(type, itemId, tag.id);
        setSelectedTags(prev => [...prev, tag]);
      }
      onTagsUpdate(selectedTags);
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('Failed to update tags');
    } finally {
      setIsSaving(false);
    }
  };

  // Analyze content for suggested tags
  useEffect(() => {
    const analyzeContent = async () => {
      try {
        const suggestions = await analyzeContentForTags(content);
        setSuggestedTags(suggestions);
      } catch (error) {
        console.error('Error analyzing content:', error);
      }
    };

    analyzeContent();
  }, [content]);

  // Handle tag creation
  const handleCreateTag = async (tagName: string) => {
    try {
      const newTag = await createTag(tagName);
      setTags(prev => [...prev, newTag]);
      await handleTagSelection(newTag);
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2">
        {selectedTags.map(tag => (
          <TagChip
            key={tag.id}
            tag={tag}
            onRemove={() => handleTagSelection(tag)}
            disabled={isSaving}
          />
        ))}
      </div>

      {/* Suggested Tags */}
      {suggestedTags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Suggested Tags</h4>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tagName, index) => {
              const existingTag = tags.find(t => t.name === tagName);
              return (
                <TagChip
                  key={index}
                  tag={existingTag || { id: -1, name: tagName }}
                  onClick={() => {
                    if (existingTag) {
                      handleTagSelection(existingTag);
                    } else {
                      handleCreateTag(tagName);
                    }
                  }}
                  disabled={isSaving}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Tag Creator */}
      <TagCreator onCreate={handleCreateTag} disabled={isSaving} />
    </div>
  );
};

export default TaggingModule;