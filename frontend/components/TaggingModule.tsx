'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // Track the last analyzed content to prevent unnecessary refreshes
  const lastAnalyzedContent = useRef<string>('');
  // Track if we're in the middle of a tag operation
  const isTagOperationInProgress = useRef(false);
  // Store the current content for comparison
  const currentContentRef = useRef<string>(content);
  
  // Update the content ref when content changes
  useEffect(() => {
    currentContentRef.current = content;
  }, [content]);

  // Reset state when item changes
  useEffect(() => {
    setSelectedTags(initialTags);
    setSuggestedTags([]);
    setIsLoadingTags(true);
    setIsLoadingSuggestedTags(true);
    lastAnalyzedContent.current = '';
    isTagOperationInProgress.current = false;
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

  // Analyze content for suggested tags - completely separated from tag selection
  const analyzeSuggestedTags = useCallback(async () => {
    // Skip if we're in the middle of a tag operation
    if (isTagOperationInProgress.current) return;
    
    const contentToAnalyze = currentContentRef.current;
    
    // Skip if content hasn't changed since last analysis
    if (contentToAnalyze === lastAnalyzedContent.current) return;
    
    if (!contentToAnalyze.trim()) {
      setSuggestedTags([]);
      setIsLoadingSuggestedTags(false);
      return;
    }

    try {
      setIsLoadingSuggestedTags(true);
      const suggestions = await analyzeContentForTags(contentToAnalyze);

      // Only update if we're not in the middle of a tag operation
      // and if the content hasn't changed during the API call
      if (!isTagOperationInProgress.current && contentToAnalyze === currentContentRef.current) {
        // Filter out tags that are already selected
        const filteredSuggestions = suggestions.filter(
          suggestion => !selectedTags.some(tag =>
            tag.name.toLowerCase() === suggestion.toLowerCase()
          )
        );

        setSuggestedTags(filteredSuggestions);
        lastAnalyzedContent.current = contentToAnalyze;
      }
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
  }, [selectedTags]);
  
  // Debounced content analysis
  useEffect(() => {
    // Skip if we're in the middle of a tag operation
    if (isTagOperationInProgress.current) return;
    
    // Skip if content hasn't changed
    if (content === lastAnalyzedContent.current) return;
    
    const debounceTimer = setTimeout(analyzeSuggestedTags, 1000);
    return () => clearTimeout(debounceTimer);
  }, [content, analyzeSuggestedTags]);

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

    // Set flag to prevent suggestion refreshes during tag operations
    isTagOperationInProgress.current = true;
    setIsSaving(true);
    
    // Store the current suggestions to restore them later
    const currentSuggestions = [...suggestedTags];
    
    try {
      // Immediately remove the selected tag from suggestions for better UX
      setSuggestedTags(prevSuggestions => 
        prevSuggestions.filter(suggestion => 
          suggestion.toLowerCase() !== tagName.toLowerCase()
        )
      );
      
      // First try to add the existing tag
      const existingTag = tags.find(tag => 
        tag.name.toLowerCase() === tagName.toLowerCase()
      );
      
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
      try {
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
        // Handle the "User already has this tag" error
        if (error instanceof Error && error.message.includes('User already has this tag')) {
          // Find the existing tag in the list of all tags
          const allTags = await getAllTags();
          const existingTag = allTags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
          
          if (existingTag) {
            // Check if the tag is already associated with this item
            if (!selectedTags.some(tag => tag.id === existingTag.id)) {
              // Add the existing tag to the current item
              await addTagToItem(normalizedType, itemId, existingTag);
              
              // Update UI state
              const updatedTags = [...selectedTags, existingTag];
              setSelectedTags(updatedTags);
              updateItemTags(itemId, normalizedType, updatedTags);
              if (onTagsUpdate) {
                onTagsUpdate(updatedTags);
              }
              
              // Immediately remove the selected tag from suggestions
              setSuggestedTags(prevSuggestions => 
                prevSuggestions.filter(suggestion => 
                  suggestion.toLowerCase() !== tagName.toLowerCase()
                )
              );
              
              toast.success('Tag added successfully');
            } else {
              toast.info('This tag is already added to this item');
            }
          } else {
            throw new Error('Failed to find existing tag');
          }
        } else {
          throw error; // Re-throw if it's not the specific error we're handling
        }
      }
    } catch (error) {
      console.error('Error handling tag click:', error);
      toast.error('Failed to add tag');
      
      // Restore the suggestions if there was an error
      setSuggestedTags(currentSuggestions);
    } finally {
      setIsSaving(false);
      
      // Keep the flag on for a short time to prevent immediate refreshes
      setTimeout(() => {
        isTagOperationInProgress.current = false;
      }, 1000);
    }
  };

  const handleCreateTag = async (tagName: string): Promise<Tag | null> => {
    // Set flag to prevent suggestion refreshes during tag operations
    isTagOperationInProgress.current = true;
    setIsSaving(true);
    
    try {
      // First check if tag already exists in the user's tags
      const existingTag = tags.find(tag => 
        tag.name.toLowerCase() === tagName.toLowerCase()
      );
      
      if (existingTag) {
        // Check if this tag is already on this item
        if (selectedTags.some(tag => tag.id === existingTag.id)) {
          toast.info('This tag is already added to this item');
          return null;
        }
        
        // Add the existing tag to the current item
        const response = await addTagToItem(normalizedType, itemId, existingTag);
        
        if (response) {
          // Update UI state
          const updatedTags = [...selectedTags, existingTag];
          setSelectedTags(updatedTags);
          updateItemTags(itemId, normalizedType, updatedTags);
          if (onTagsUpdate) {
            onTagsUpdate(updatedTags);
          }
          
          toast.success('Tag added successfully');
          return existingTag;
        }
      } else {
        // Tag doesn't exist, create a new one
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
      }
      
      return null;
    } catch (error) {
      console.error('Error handling tag creation:', error);
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          toast.error('Please log in to create tags');
        } else if (error.message.includes('400')) {
          toast.error('Invalid tag name');
        } else {
          toast.error('Failed to create or add tag');
        }
      } else {
        toast.error('Failed to create or add tag');
      }
      return null;
    } finally {
      setIsSaving(false);
      
      // Keep the flag on for a short time to prevent immediate refreshes
      setTimeout(() => {
        isTagOperationInProgress.current = false;
      }, 1000);
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

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      if (error.message.includes('400')) return 'Invalid request - please check your input';
      if (error.message.includes('404')) return 'Resource not found';
      if (error.message.includes('500')) return 'Server error - please try again';
      return error.message;
    }
    return 'Failed to update tags';
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
