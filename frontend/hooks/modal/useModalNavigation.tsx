import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Tag } from '../../services/ai';
import { API_BASE } from '../../services/userTags';

interface BreadcrumbItem {
  id: number;
  type: string;
  title: string;
  content: string;
  summary: string | null;
  tags: Tag[];
  breadcrumbId: string; // Unique identifier for each breadcrumb item
}

interface UseModalNavigationProps {
  itemId: number;
  type?: 'note' | 'transcript';
  editableTitle: string;
  content: string;
  currentSummary: string | null;
  tags: Tag[];
  setContent: (content: string) => void;
  setEditableTitle: (title: string) => void;
  setSelectedNoteId: (id: number) => void;
  setTags: (tags: Tag[]) => void;
  setCurrentSummary: (summary: string | null) => void;
  setActiveTab: (tab: string) => void;
  setIsEditMode: (isEditMode: boolean) => void;
  setIsEditingTitle: (isEditingTitle: boolean) => void;
  setEditableContent: (content: string) => void;
  setNormalizedType: (type: 'note' | 'transcript') => void;
}

export const useModalNavigation = ({
  itemId,
  type = 'note',
  editableTitle,
  content,
  currentSummary,
  tags,
  setContent,
  setEditableTitle,
  setSelectedNoteId,
  setTags,
  setCurrentSummary,
  setActiveTab,
  setIsEditMode,
  setIsEditingTitle,
  setEditableContent,
  setNormalizedType
}: UseModalNavigationProps) => {
  // Add a breadcrumb stack to track navigation history
  const [breadcrumbStack, setBreadcrumbStack] = useState<BreadcrumbItem[]>([]);
  const [normalizedType, setInternalNormalizedType] = useState(type === 'note' || type === 'transcript' ? type : 'note');

  // Synchronize normalizedType with type prop
  useEffect(() => {
    const newNormalizedType = type === 'note' || type === 'transcript' ? type : 'note';
    setInternalNormalizedType(newNormalizedType);
    setNormalizedType(newNormalizedType);
  }, [type, setNormalizedType]);

  // Function to generate a unique identifier for breadcrumb items
  const generateBreadcrumbId = () => {
    return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
  };

  // Function to handle navigation to a new item
  const navigateToItem = async (
    id: number, 
    type: string, 
    title: string, 
    content: string, 
    tags: Tag[] = [], 
    summary: string | null = null
  ) => {
    // Store current item in breadcrumb stack with a unique identifier
    setBreadcrumbStack(prev => [...prev, {
      id: itemId,
      type: normalizedType,
      title: editableTitle,
      content,
      summary: currentSummary,
      tags,
      breadcrumbId: generateBreadcrumbId()
    }]);

    // Update all modal state for the new item
    setContent(content);
    setEditableTitle(title);
    setSelectedNoteId(id);
    setTags(tags);
    setCurrentSummary(summary);
    // Reset all states
    setIsEditMode(false);
    setIsEditingTitle(false);
    setEditableContent(content);
    // Update the normalized type for the new item
    const newNormalizedType = type === 'note' || type === 'transcript' ? type : 'note';
    setInternalNormalizedType(newNormalizedType);
    setNormalizedType(newNormalizedType);
    // Reset active tab to summary
    setActiveTab('summary');
  };

  // Function to handle back navigation to a specific item in the breadcrumb
  const handleBackNavigation = async (targetItem?: BreadcrumbItem) => {
    if (breadcrumbStack.length > 0) {
      const itemToNavigateTo = targetItem || breadcrumbStack[breadcrumbStack.length - 1];
      
      try {
        // Fetch the previous item's content and data
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Authentication required');
          return;
        }

        // Get the item from the API
        const newNormalizedType = itemToNavigateTo.type === 'note' || itemToNavigateTo.type === 'transcript' 
          ? itemToNavigateTo.type 
          : 'note';
        const itemEndpoint = newNormalizedType === 'note' ? 'notes' : 'transcripts';
        const response = await fetch(`${API_BASE}/api/${itemEndpoint}/${itemToNavigateTo.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${itemToNavigateTo.type}`);
        }
        
        // Get the full item data
        const item = await response.json();
        const linkedContent = newNormalizedType === 'note' ? item.content : item.text;
        const linkedSummary = item.summary || null;
        const linkedTags = item.tags || [];

        // Remove all items after the target item from the stack
        if (targetItem) {
          // Use breadcrumbId for exact matching instead of just the item ID
          const targetIndex = breadcrumbStack.findIndex(item => item.breadcrumbId === targetItem.breadcrumbId);
          if (targetIndex !== -1) {
            // Keep items up to but NOT including the target index (since we're now AT that item)
            setBreadcrumbStack(prev => prev.slice(0, targetIndex));
          }
        } else {
          setBreadcrumbStack(prev => prev.slice(0, -1));
        }

        // Update all modal state for the previous item
        setContent(linkedContent);
        setEditableTitle(itemToNavigateTo.title);
        setSelectedNoteId(itemToNavigateTo.id);
        setTags(linkedTags);
        setCurrentSummary(linkedSummary);
        setActiveTab('summary');
        // Update type state
        setInternalNormalizedType(newNormalizedType);
        setNormalizedType(newNormalizedType);
        // Reset edit states
        setIsEditMode(false);
        setIsEditingTitle(false);
        setEditableContent(linkedContent);

        toast.success(`Returned to: ${itemToNavigateTo.title || 'previous item'}`);
      } catch (error) {
        console.error('Error navigating back:', error);
        toast.error('Failed to navigate back to previous item');
      }
    }
  };

  // Function to handle navigation via link click
  const navigateToLink = async (title: string) => {
    try {
      // Set up loading state
      toast.info(`Loading "${title}"...`, {
        autoClose: 1000
      });
      
      // Call backend to find the item by title
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE}/api/links/find-by-title?title=${encodeURIComponent(title)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to find linked item');
      }

      const data = await response.json();
      
      if (data && data.found) {
        // Fetch the linked item content and update the current modal
        const itemEndpoint = data.type === 'note' ? 'notes' : 'transcripts';
        const linkedItemResponse = await fetch(`${API_BASE}/api/${itemEndpoint}/${data.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!linkedItemResponse.ok) {
          throw new Error('Failed to fetch linked item content');
        }
        
        // Extract content based on item type
        const linkedItem = await linkedItemResponse.json();
        const linkedContent = data.type === 'note' ? linkedItem.content : linkedItem.text;
        const linkedSummary = linkedItem.summary || null;
        const linkedTags = linkedItem.tags || [];
        
        // Update current modal with new content
        await navigateToItem(data.id, data.type, data.title || 'Untitled', linkedContent, linkedTags, linkedSummary);
        
        toast.success(`Navigated to: ${data.title || 'linked item'}`);
      } else {
        toast.info(`No item found with title "${title}"`);
      }
    } catch (error) {
      console.error('Error navigating to linked item:', error);
      toast.error('Failed to navigate to linked item');
    }
  };

  // Function to handle navigation via backlink click
  const navigateToBacklink = async (backlink: any) => {
    try {
      // Set up loading state
      toast.info(`Loading ${backlink.sourceTitle || 'linked item'}...`, {
        autoClose: 1000
      });
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      // Fetch the source item content
      const endpoint = backlink.sourceType === 'note' ? 'notes' : 'transcripts';
      const response = await fetch(`${API_BASE}/api/${endpoint}/${backlink.sourceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${backlink.sourceType}`);
      }
      
      const item = await response.json();
      const linkedContent = backlink.sourceType === 'note' ? item.content : item.text;
      const linkedSummary = item.summary || null;
      const linkedTags = item.tags || [];
      
      // Update modal content with the backlink source
      await navigateToItem(backlink.sourceId, backlink.sourceType, backlink.sourceTitle || 'Untitled', linkedContent, linkedTags, linkedSummary);
      
      toast.success(`Navigated to: ${backlink.sourceTitle || 'linked item'}`);
    } catch (error) {
      console.error('Error navigating to backlink:', error);
      toast.error('Failed to navigate to backlink');
    }
  };

  return {
    breadcrumbStack,
    navigateToItem,
    handleBackNavigation,
    navigateToLink,
    navigateToBacklink
  };
};

export default useModalNavigation;
