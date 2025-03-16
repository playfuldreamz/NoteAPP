'use client';

import React, { useState, useEffect } from 'react';
import {
  analyzeContentForTags,
  createTag,
  getAllTags,
  getTagsForItem,
  addTagToItem,
  removeTagFromItem,
  Tag,
  InvalidAPIKeyError
} from '../services/ai';
import { addUserTag, deleteUserTag } from '../services/userTags';
import { toast } from 'react-toastify';
import TagChip from '@components/TagChip';
import TagCreator from '@components/TagCreator';
import { Settings } from 'lucide-react';
import SettingsModal from './settings/SettingsModal';
import { useTagsContext } from '../context/TagsContext';

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
  const { updateItemTags } = useTagsContext();
  const normalizedType = normalizeType(type);

  // State management
  const [tags, setTags] = useState<Tag[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialTags);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isLoadingSuggestedTags, setIsLoadingSuggestedTags] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
        const [allTags, itemTags] = await Promise.all([
          getAllTags(),
          getTagsForItem(normalizedType, itemId)
        ]);
        setTags(allTags);
        const mergedTags = [...itemTags];
        initialTags.forEach(tag => {
          if (!mergedTags.some(t => t.id === tag.id)) {
            mergedTags.push(tag);
          }
        });
        setSelectedTags(mergedTags);
        updateItemTags(itemId, normalizedType, mergedTags);
        if (onTagsUpdate) {
          onTagsUpdate(mergedTags);
        }
      } catch (error) {
        console.error('Error loading tags:', error);
        toast.error('Failed to load tags');
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadTags();
  }, [type, itemId, initialTags, updateItemTags, onTagsUpdate, normalizedType]);

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

        // Filter out tags that are already selected
        const filteredSuggestions = suggestions.filter(
          suggestion => !selectedTags.some(tag =>
            tag.name.toLowerCase() === suggestion.toLowerCase()
          )
        );

        setSuggestedTags(filteredSuggestions);
      } catch (error) {
        console.error('Error analyzing content:', error);
        if (error instanceof InvalidAPIKeyError) {
          const toastId = toast.error(
            <div className="flex flex-col gap-2">
              <div>AI Provider API key is invalid or expired</div>
              <button
                onClick={() => {
                  setShowSettings(true);
                  toast.dismiss(toastId);
                }}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                <Settings size={14} />
                Update API Key in Settings
              </button>
            </div>,
            {
              autoClose: false,
              closeOnClick: false,
              onClick: () => {
                setShowSettings(true);
                toast.dismiss(toastId);
              }
            }
          );
        } else {
          toast.error('Failed to analyze content for tags');
        }
        setSuggestedTags([]);
      } finally {
        setIsLoadingSuggestedTags(false);
      }
    };

    const debounceTimer = setTimeout(analyzeContent, 1000);
    return () => clearTimeout(debounceTimer);
  }, [content, selectedTags]);

  const handleAddTag = async (tagName: string) => {
    setIsSaving(true);
    try {
      const newTag = await createTag(tagName);
      await addTagToItem(normalizedType, itemId, {
        id: newTag.id,
        name: newTag.name,
        description: newTag.description
      });

      const updatedTags = [...selectedTags, newTag];
      setSelectedTags(updatedTags);
      updateItemTags(itemId, normalizedType, updatedTags);
      if (onTagsUpdate) {
        onTagsUpdate(updatedTags);
      }

      // Only show one success message
      toast.success('Tag added successfully');
    } catch (error) {
      console.error('Error adding tag:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        toast.error('This tag already exists');
      } else {
        toast.error('Failed to add tag');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    setIsSaving(true);
    try {
      await removeTagFromItem(normalizedType, itemId, tagId);

      const updatedTags = selectedTags.filter(tag => tag.id !== tagId);
      setSelectedTags(updatedTags);
      updateItemTags(itemId, normalizedType, updatedTags);
      if (onTagsUpdate) {
        onTagsUpdate(updatedTags);
      }

      toast.success('Tag removed successfully');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTagClick = async (tagName: string) => {
    if (selectedTags.some(tag => tag.name === tagName)) {
      return; // Tag is already selected
    }

    setIsSaving(true);
    try {
      // First try to add the existing tag
      const existingTag = tags.find(tag => tag.name === tagName);
      if (existingTag) {
        await addTagToItem(normalizedType, itemId, existingTag);
        const updatedTags = [...selectedTags, existingTag];
        setSelectedTags(updatedTags);
        updateItemTags(itemId, normalizedType, updatedTags);
        if (onTagsUpdate) {
          onTagsUpdate(updatedTags);
        }
        // Don't show toast here since it's just selecting an existing tag
        return;
      }

      // If tag doesn't exist, create and add it
      const newTag = await createTag(tagName);
      await addTagToItem(normalizedType, itemId, newTag);
      const updatedTags = [...selectedTags, newTag];
      setSelectedTags(updatedTags);
      updateItemTags(itemId, normalizedType, updatedTags);
      if (onTagsUpdate) {
        onTagsUpdate(updatedTags);
      }
      // Only show toast for newly created tags
      toast.success('Tag created successfully');
    } catch (error) {
      console.error('Error handling tag click:', error);
      toast.error('Failed to add tag');
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

      // Add the tag to the item immediately
      const response = await addTagToItem(normalizedType, itemId, newTag);

      if (!response || typeof response.id !== 'number') {
        throw new Error('Invalid response from addTagToItem');
      }

      const addedTag: Tag = {
        id: response.id,
        name: response.name,
        description: response.description || ''
      };

      // Update the UI states
      setTags(prev => [...prev, newTag]);
      const updatedSelectedTags = [...selectedTags, addedTag];
      setSelectedTags(updatedSelectedTags);
      updateItemTags(itemId, normalizedType, updatedSelectedTags);
      if (onTagsUpdate) {
        onTagsUpdate(updatedSelectedTags);
      }

      toast.success('Tag created and added successfully');
      return newTag;
    } catch (error) {
      console.error('Error creating tag:', error);
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          toast.error('Please log in to create tags');
        } else if (error.message.includes('400')) {
          toast.error('Invalid tag name');
        } else if (error.message.includes('You already have this tag')) {
          toast.error('You already have this tag');
        } else {
          toast.error('Failed to create tag');
        }
      } else {
        toast.error('Failed to create tag');
      }
      return null;
    } finally {
      setIsSaving(false);
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
    <>
      <div className="space-y-4">
        {/* Selected Tags */}
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <TagChip
              key={`selected-${tag.id}-${tag.name}`}
              tag={tag}
              onRemove={() => handleRemoveTag(tag.id)}
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
                    onClick={() => handleTagClick(tagName)}
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
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        setUsername={() => {}}
        currentModel=""
        modelSource=""
      />
    </>
  );
};

export default TaggingModule;
