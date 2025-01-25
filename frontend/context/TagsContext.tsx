'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import { Tag } from '../services/ai';

interface TagsContextType {
  itemTags: Record<string, Tag[]>;
  updateItemTags: (itemId: number, itemType: string, tags: Tag[]) => void;
  getItemTags: (itemId: number, itemType: string) => Tag[];
}

const TagsContext = createContext<TagsContextType | undefined>(undefined);

export function TagsProvider({ children }: { children: React.ReactNode }) {
  // Store tags for each item using a composite key of type_id
  const [itemTags, setItemTags] = useState<Record<string, Tag[]>>({});

  const updateItemTags = useCallback((itemId: number, itemType: string, tags: Tag[]) => {
    const key = `${itemType}_${itemId}`;
    setItemTags(prev => ({
      ...prev,
      [key]: tags
    }));
  }, []);

  const getItemTags = useCallback((itemId: number, itemType: string) => {
    const key = `${itemType}_${itemId}`;
    return itemTags[key] || [];
  }, [itemTags]);

  return (
    <TagsContext.Provider value={{ itemTags, updateItemTags, getItemTags }}>
      {children}
    </TagsContext.Provider>
  );
}

export function useTagsContext() {
  const context = useContext(TagsContext);
  if (context === undefined) {
    throw new Error('useTagsContext must be used within a TagsProvider');
  }
  return context;
}
