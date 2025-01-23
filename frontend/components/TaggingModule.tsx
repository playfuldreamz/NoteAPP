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
  onTagsUpdate
}) => {
  // State management
  const [tags, setTags] = useState<Tag[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isLoadingSuggestedTags, setIsLoadingSuggestedTags] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when item changes
  useEffect(() => {
    setSelectedTags([]);
    setSuggestedTags([]);
    setIsLoadingTags(true);
    setIsLoadingSuggestedTags(true);
  }, [itemId]);

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
        setSelectedTags(itemTags);
      } catch (error) {
        console.error('Error loading tags:', error);
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadTags();
  }, [type, itemId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setSelectedTags([]);
      setSuggestedTags([]);
    };
  }, []);

  // Analyze content for suggested tags
  useEffect(() => {
    const analyzeContent = async () => {
      try {
        setIsLoadingSuggestedTags(true);
        const suggestions = await analyzeContentForTags(content);
        setSuggestedTags(suggestions);
      } catch (error) {
        console.error('Error analyzing content:', error);
      } finally {
        setIsLoadingSuggestedTags(false);
      }
    };

    analyzeContent();
  }, [content]);

  // Handle tag selection with improved error handling
  const handleTagSelection = async (tag: any, retryCount = 0) => {
    console.log('Tagging transcript with ID:', itemId, 'Tag:', tag);
    setIsSaving(true);
    
    try {
      const normalizedType = normalizeType(type);
      console.log('API call details:', {
        type: normalizedType,
        id: itemId,
        tag
      });

      // Validate tag ID for removal
      if (selectedTags.some(t => t.id === tag.id) && !tag.id) {
        throw new Error('Tag ID is required for removal');
      }

      // Execute tag operation
      if (selectedTags.some(t => t.id === tag.id)) {
        await removeTagFromItem(normalizedType, itemId, tag.id);
        setSelectedTags(prev => prev.filter(t => t.id !== tag.id));
        // Check if the tag is a user tag before deleting
        if (tag.created_at) {
          try {
            await deleteUserTag(tag.id);
          } catch (error) {
            console.error('Error deleting user tag:', error);
            toast.error('Failed to delete user tag');
          }
        }
      } else {
        await addTagToItem(normalizedType, itemId, tag);
        setSelectedTags(prev => [...prev, tag]);
      }

      // Notify parent component of updates
      if (onTagsUpdate) {
        onTagsUpdate(selectedTags);
      }
    } catch (error) {
      console.error('Error updating tag:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        itemId,
        tag,
        type,
        retryCount
      });

      // Handle specific error cases
      let errorMessage = 'Failed to update tags';
      
      // Type check the error object
      if (error && typeof error === 'object') {
        // Handle Error instances
        if (error instanceof Error) {
          if (error.message.includes('400')) {
            errorMessage = 'Invalid request - please check your input';
          } else if (error.message.includes('404')) {
            errorMessage = 'Resource not found';
          } else if (error.message.includes('500')) {
            errorMessage = 'Server error - please try again';
          }
        }
        
        // Handle Axios error responses
        if ('response' in error && 
            error.response && 
            typeof error.response === 'object' &&
            'data' in error.response &&
            typeof error.response.data === 'object' &&
            error.response.data !== null) {
          const responseData = error.response.data as { warning?: string };
          if (responseData.warning) {
            errorMessage = responseData.warning;
          }
        }
      }

      // Retry transient errors
      if (retryCount < 2 && error instanceof Error && 
          (error.message.includes('500') || error.message.includes('Network Error'))) {
        console.log(`Retrying tag operation (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return handleTagSelection(tag, retryCount + 1);
      }

      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle tag creation
  const handleCreateTag = async (tagName: string) => {
    try {
      const newTag = await createTag(tagName);
      setTags(prev => [...prev, newTag]);
      await addUserTag(newTag.id); // Add this line
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
