import React from 'react';
import { Target, Zap, Clock, Calendar, FileText, Mic } from 'lucide-react';

interface Tag {
  tag: string;
  count: number;
  source?: 'note' | 'transcript' | 'combined';
}

interface FocusAreasProps {
  noteTags?: Array<{ tag: string; count: number }>;
  transcriptTags?: Array<{ tag: string; count: number }>;
  isLoading?: boolean;
}

const FocusAreas: React.FC<FocusAreasProps> = ({ 
  noteTags = [],
  transcriptTags = [],
  isLoading = false 
}) => {
  // Combine and merge tags from both sources
  const combinedTags = React.useMemo(() => {
    const tagMap = new Map<string, Tag>();
    
    // Add note tags
    noteTags.forEach(tag => {
      tagMap.set(tag.tag.toLowerCase(), {
        tag: tag.tag,
        count: tag.count,
        source: 'note'
      });
    });
    
    // Add or merge transcript tags
    transcriptTags.forEach(tag => {
      const lowerTag = tag.tag.toLowerCase();
      if (tagMap.has(lowerTag)) {
        const existing = tagMap.get(lowerTag)!;
        tagMap.set(lowerTag, {
          tag: tag.tag, // Keep the original case
          count: existing.count + tag.count,
          source: 'combined'
        });
      } else {
        tagMap.set(lowerTag, {
          tag: tag.tag,
          count: tag.count,
          source: 'transcript'
        });
      }
    });
    
    // Convert to array and sort by count
    return Array.from(tagMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6); // Show top 6 tags
  }, [noteTags, transcriptTags]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Focus Areas</h3>
      </div>
      
      {combinedTags.length > 0 ? (
        <div className="space-y-3">
          {combinedTags.map((tag, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full ${
                    tag.source === 'note' 
                      ? 'bg-blue-500 dark:bg-blue-400' 
                      : tag.source === 'transcript' 
                        ? 'bg-purple-500 dark:bg-purple-400'
                        : 'bg-emerald-500 dark:bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, (tag.count / Math.max(...combinedTags.map(t => t.count))) * 100)}%` }}
                ></div>
              </div>
              <div className="flex items-center gap-1">
                {tag.source === 'note' ? (
                  <FileText className="w-3 h-3 text-blue-500" />
                ) : tag.source === 'transcript' ? (
                  <Mic className="w-3 h-3 text-purple-500" />
                ) : (
                  <div className="flex -space-x-1">
                    <FileText className="w-3 h-3 text-blue-500" />
                    <Mic className="w-3 h-3 text-purple-500" />
                  </div>
                )}
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {tag.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[140px] text-center">
          <Zap className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Add tags to your notes to see focus areas</p>
        </div>
      )}
      
      <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Updated just now</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Last 7 days</span>
        </div>
      </div>
    </div>
  );
};

export default FocusAreas;
