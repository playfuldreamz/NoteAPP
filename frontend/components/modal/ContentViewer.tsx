import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'react-toastify';
import LinkRenderer from '../shared/LinkRenderer';

interface ContentViewerProps {
  content: string;
  onLinkClick: (title: string) => Promise<void>;
}

const ContentViewer: React.FC<ContentViewerProps> = ({ content, onLinkClick }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      toast.success('Content copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
      toast.error('Failed to copy content');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        title="Copy content"
      >
        {isCopied ? (
          <Check size={16} className="text-green-500" />
        ) : (
          <Copy size={16} />
        )}
      </button>
      <div className="max-w-none pt-10 font-mono text-sm">
        <LinkRenderer 
          content={content}
          onLinkClick={onLinkClick}
        />
      </div>
    </div>
  );
};

export default ContentViewer;
