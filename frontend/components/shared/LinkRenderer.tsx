import React, { useMemo } from 'react';

interface LinkRendererProps {
  content: string;
  onLinkClick?: (title: string) => void;
}

const LinkRenderer: React.FC<LinkRendererProps> = ({ content, onLinkClick }) => {
  // Parse and render content with links highlighted as clickable elements
  const renderedContent = useMemo(() => {
    if (!content) return null;
    
    // Pattern to match [[Target Title]] syntax
    const linkPattern = /\[\[([^\[\]]+)\]\]/g;
    
    // Split content into segments (text + links)
    const segments: { isLink: boolean; text: string }[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = linkPattern.exec(content)) !== null) {
      const linkText = match[1];
      const fullMatch = match[0];
      const matchIndex = match.index;
      
      // Add the text before this link
      if (matchIndex > lastIndex) {
        segments.push({
          isLink: false,
          text: content.substring(lastIndex, matchIndex)
        });
      }
      
      // Add the link itself
      segments.push({
        isLink: true,
        text: linkText
      });
      
      lastIndex = matchIndex + fullMatch.length;
    }
    
    // Add any remaining text after the last link
    if (lastIndex < content.length) {
      segments.push({
        isLink: false,
        text: content.substring(lastIndex)
      });
    }
    
    // Render segments
    return segments.map((segment, index) => {
      if (segment.isLink) {
        return (
          <button
            key={index}
            onClick={() => onLinkClick?.(segment.text)}
            className="px-1 py-0.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors font-medium text-sm"
          >
            {segment.text}
          </button>
        );
      } else {
        // Split regular text by newlines to preserve line breaks
        return (
          <React.Fragment key={index}>
            {segment.text.split('\n').map((line, lineIndex, array) => (
              <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < array.length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      }
    });
  }, [content, onLinkClick]);

  return <div className="whitespace-pre-wrap">{renderedContent}</div>;
};

export default LinkRenderer;
