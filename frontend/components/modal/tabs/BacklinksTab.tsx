import React from 'react';
import BacklinksDisplay from '../../backlinks/BacklinksDisplay';

interface BacklinksTabProps {
  itemId: number;
  normalizedType: 'note' | 'transcript';
  onBacklinkClick: (backlink: any) => Promise<void>;
}

const BacklinksTab: React.FC<BacklinksTabProps> = ({
  itemId,
  normalizedType,
  onBacklinkClick
}) => {
  return (
    <BacklinksDisplay
      itemId={itemId}
      itemType={normalizedType}
      onBacklinkClick={onBacklinkClick}
    />
  );
};

export default BacklinksTab;
