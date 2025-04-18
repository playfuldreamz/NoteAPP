import React from 'react';
import SummaryModule from '../../summary/SummaryModule';

interface SummaryTabProps {
  itemId: number;
  normalizedType: 'note' | 'transcript';
  content: string;
  currentSummary: string | null;
  onSummaryGenerated: (summary: string) => void;
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  itemId,
  normalizedType,
  content,
  currentSummary,
  onSummaryGenerated
}) => {
  return (
    <SummaryModule
      itemId={itemId}
      itemType={normalizedType}
      content={content}
      initialSummary={currentSummary}
      onSummaryGenerated={onSummaryGenerated}
    />
  );
};

export default SummaryTab;
