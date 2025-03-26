import React from 'react';

interface VoiceInsightsPanelProps {
  children: React.ReactNode;
}

const VoiceInsightsPanel: React.FC<VoiceInsightsPanelProps> = ({ children }) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {children}
    </div>
  );
};

export default VoiceInsightsPanel;
