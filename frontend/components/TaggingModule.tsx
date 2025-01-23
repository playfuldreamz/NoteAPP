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
import { addUserTag, deleteUserTag } from '../services/userTags';
import { toast } from 'react-toastify';
import TagChip from '@components/TagChip';
import TagCreator from '@components/TagCreator';

interface TaggingModuleProps {
  type?: string;
  itemId: number;
  content: string;
  initialTags?: Tag[];
  onTagsUpdate?: (tags: Tag[]) => void;
}

// Helper function to validate and normalize type
const normalizeType = (type?: string): 'note' | 'transcript' => {
  if (!type) {
    console.warn('Type not provided, defaulting to "note"');
    return 'note';
  }
  
  const normalized = type.toLowerCase();
  if (['note', 'transcript'].includes(normalized)) {
    return normalized as 'note' | 'transcript';
  }
  
  console.error(`Invalid type: ${type}. Must be 'note' or 'transcript'`);
  return 'note';
};

const TaggingModule: React.FC<TaggingModuleProps> = ({
  type,
  itemId,
  content,
  initialTags = [],
  onTagsUpdate
}) => {
  // State management
  const [tags, setTags] = useState<Tag[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialTags);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isLoadingSuggestedTags, setIsLoadingSuggestedTags] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when item changes
  useEffect(() => {
    setSelectedTags(initialTags);
    setSuggestedTags([]);
    setIsLoadingTags(true);
    setIsLoadingSuggestedTags(true);
  }, [itemId, initialTags]);

  // Load tags when component mounts or item changes
  useEffect(() => {
    const loadTags = async () => {
      try {
        const normalizedType = normalizeType(type);
        const [allTags, itemTags] = await Promise.all([
          getAllTags(),
          getTagsForItem(normalizedType, itemId)
        ]);
        setTags(allTags);
        setSelectedTags(prevTags => {
          // Merge initial tags with item tags, avoiding duplicates
          const mergedTags = [...itemTags];
          initialTags.forEach(tag => {
            if (!mergedTags.some(t => t.id === tag.id)) {
              mergedTags.push(tag);
            }
          });
          return mergedTags;
        });
      } catch (error) {
        console.error('Error loading tags:', error);
        toast.error('Failed to load tags');
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadTags();
  }, [type, itemId, initialTags]);

  // Analyze content for suggested tags
  useEffect(() => {
    const analyzeContent = async () => {
      if (!content.trim()) {
        setSuggestedTags([]);
        setIsLoadingSuggestedTags(false);
        return;
      }

      try {
        setIsLoadingSuggestedTags(true);
        const suggestions = await analyzeContentForTags(content);
        // Filter out suggestions that are already selected
        const filteredSuggestions = suggestions.filter(suggestion => 
          !selectedTags.some(tag => tag.name.toLowerCase() === suggestion.toLowerCase())
        );
        setSuggestedTags(filteredSuggestions);
      } catch (error) {
        console.error('Error analyzing content:', error);
        toast.error('Failed to analyze content for tags');
      } finally {
        setIsLoadingSuggestedTags(false);
      }
    };

    const debounceTimeout = setTimeout(analyzeContent, 500);
    return () => clearTimeout(debounceTimeout);
  }, [content, selectedTags]);

  // Handle tag selection with improved error handling
  const handleTagSelection = async (tag: Tag, retryCount = 0) => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const normalizedType = normalizeType(type);
      const isSelected = selectedTags.some(t => t.id === tag.id);

      if (isSelected) {
        await removeTagFromItem(normalizedType, itemId, tag.id);
        const updatedTags = selectedTags.filter(t => t.id !== tag.id);
        setSelectedTags(updatedTags);
        
        // Check if created_at exists using optional chaining
        if ('created_at' in tag && tag.created_at) {
          try {
            await deleteUserTag(tag.id);
          } catch (error) {
            console.error('Error deleting user tag:', error);
          }
        }
        
        onTagsUpdate?.(updatedTags);
      } else {
        const response = await addTagToItem(normalizedType, itemId, tag);
        if (!response || typeof response.id !== 'number') {
          throw new Error('Invalid response from addTagToItem');
        }

        const addedTag: Tag = {
          id: response.id,
          name: response.name,
          description: response.description || ''
        };

        const updatedTags = [...selectedTags, addedTag];
        setSelectedTags(updatedTags);
        onTagsUpdate?.(updatedTags);
      }
    } catch (error) {
      console.error('Error updating tag:', {
        error,
        itemId,
        tag,
        type,
        retryCount
      });

      // Retry logic for network errors
      if (retryCount < 2 && error instanceof Error && 
          (error.message.includes('500') || error.message.includes('Network Error'))) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        setIsSaving(false);
        return handleTagSelection(tag, retryCount + 1);
      }

      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      if (error.message.includes('400')) return 'Invalid request - please check your input';
      if (error.message.includes('404')) return 'Resource not found';
      if (error.message.includes('500')) return 'Server error - please try again';
      return error.message;
    }
    return 'Failed to update tags';
  };

  const handleCreateTag = async (tagName: string): Promise<Tag | null> => {
    if (isSaving) return null;
    setIsSaving(true);

    try {
      const newTag = await createTag(tagName);
      if (!newTag?.id) throw new Error('Invalid response from createTag');
      
      await addUserTag(newTag.id);
      setTags(prev => [...prev, newTag]);
      return newTag;
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleTagClick = async (existingTag: Tag | null, tagName: string) => {
    if (isSaving) return;
    
    try {
      if (existingTag) {
        await handleTagSelection(existingTag);
      } else {
        const newTag = await handleCreateTag(tagName);
        if (newTag) {
          await handleTagSelection(newTag);
        }
      }
    } catch (error) {
      console.error('Error handling tag click:', error);
      toast.error('Failed to process tag');
    }
  };

  const parseSuggestedTags = (suggestions: string[]): string[] => {
    if (suggestions.length === 0) return [];
    
    // Handle the case where the first item contains delimiters
    if (typeof suggestions[0] === 'string' && suggestions[0].match(/[,*\n]/)) {
      return suggestions[0]
        .replace(/^Tags:\s*/, '')
        .split(/[,*\n]+/)
        .map(tag => tag.trim().replace(/^-/, '').trim())
        .filter(tag => tag.length > 0);
    }
    
    return suggestions;
  };

  return (
    <div className="space-y-4">
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2">
        {selectedTags.map(tag => (
          <TagChip
            key={`selected-${tag.id}-${tag.name}`}
            tag={tag}
            onRemove={() => handleTagSelection(tag)}
            disabled={isSaving}
          />
        ))}
      </div>

      {/* Suggested Tags */}
      {isLoadingSuggestedTags ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Loading Suggested Tags...</h4>
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      ) : suggestedTags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Suggested Tags</h4>
          <div className="flex flex-wrap gap-2">
            {parseSuggestedTags(suggestedTags).map(tagName => {
              const existingTag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
              return (
                <TagChip
                  key={`suggested-${existingTag?.id || tagName}`}
                  tag={existingTag || { id: -1, name: tagName }}
                  onClick={() => handleTagClick(existingTag || null, tagName)}
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
