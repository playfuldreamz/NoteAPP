import React from 'react';
import TaggingModule from '../../TaggingModule';
import { Tag } from '../../../services/ai';

interface TagsTabProps {
  itemId: number;
  normalizedType: 'note' | 'transcript';
  content: string;
  tags: Tag[];
  onTagsUpdate?: (tags: Tag[]) => void;
}

const TagsTab: React.FC<TagsTabProps> = ({
  itemId,
  normalizedType,
  content,
  tags,
  onTagsUpdate
}) => {
  return (
    <TaggingModule
      type={normalizedType}
      itemId={itemId}
      content={content}
      initialTags={tags}
      onTagsUpdate={onTagsUpdate}
    />
  );
};

export default TagsTab;
