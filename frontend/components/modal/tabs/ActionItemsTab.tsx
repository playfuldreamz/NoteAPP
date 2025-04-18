import React from 'react';
import ActionItemsModule from '../../ActionItemsModule';

interface ActionItemsTabProps {
  itemId: number;
  normalizedType: 'note' | 'transcript';
  content: string;
}

const ActionItemsTab: React.FC<ActionItemsTabProps> = ({
  itemId,
  normalizedType,
  content
}) => {
  return (
    <ActionItemsModule
      itemId={itemId}
      type={normalizedType}
      content={content}
    />
  );
};

export default ActionItemsTab;
