import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader } from 'lucide-react';

interface TranscriptionDisplayProps {
  originalTranscript: string;
  interimTranscript: string;
  enhancedTranscript: string;
  isEnhancing: boolean;
  enhancementProgress: number;
  showEnhanced: boolean;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  originalTranscript,
  interimTranscript,
  enhancedTranscript,
  isEnhancing,
  enhancementProgress,
  showEnhanced,
}) => {
  const originalTranscriptRef = useRef<HTMLDivElement>(null);
  const enhancedTranscriptRef = useRef<HTMLDivElement>(null);
  const [isOriginalCollapsed, setIsOriginalCollapsed] = useState(false);
  const [isEnhancedCollapsed, setIsEnhancedCollapsed] = useState(false);
  const [isManualScroll, setIsManualScroll] = useState(false);
  
  // Calculate dynamic heights based on content
  const [originalHeight, setOriginalHeight] = useState('min-h-[2.5rem]');
  const [enhancedHeight, setEnhancedHeight] = useState('min-h-[2.5rem]');

  // Update heights based on content
  useEffect(() => {
    if (originalTranscriptRef.current) {
      const contentHeight = originalTranscriptRef.current.scrollHeight;
      const lines = (originalTranscript + interimTranscript).split('\n').length;
      
      // For original transcript - match the enhanced transcript's cleaner appearance
      if (lines <= 1) {
        setOriginalHeight('h-auto overflow-visible');
      } else if (lines <= 5) {
        setOriginalHeight('h-auto overflow-visible');
      } else {
        setOriginalHeight('max-h-[12rem] overflow-y-auto');
      }
    }
  }, [originalTranscript, interimTranscript]);

  // Update enhanced transcript height
  useEffect(() => {
    if (enhancedTranscriptRef.current) {
      const lines = enhancedTranscript.split('\n').length;
      
      // Enhanced transcript already looks good
      if (lines <= 1) {
        setEnhancedHeight('h-auto overflow-visible');
      } else if (lines <= 5) {
        setEnhancedHeight('h-auto overflow-visible');
      } else {
        setEnhancedHeight('max-h-[12rem] overflow-y-auto');
      }
    }
  }, [enhancedTranscript]);

  // Auto-scroll original transcript
  useEffect(() => {
    const transcriptElement = originalTranscriptRef.current;
    if (!transcriptElement) return;

    const isNearBottom =
      transcriptElement.scrollHeight - transcriptElement.scrollTop <= transcriptElement.clientHeight + 50;

    if (!isManualScroll || isNearBottom) {
      transcriptElement.scrollTop = transcriptElement.scrollHeight;
      if (isNearBottom) setIsManualScroll(false); // Reset manual scroll if user scrolls back down
    }
  }, [originalTranscript, interimTranscript, isManualScroll]);

  // Handle manual scroll detection
  useEffect(() => {
    const transcriptElement = originalTranscriptRef.current;
    if (!transcriptElement) return;

    const handleScroll = () => {
      const isNearBottom =
        transcriptElement.scrollHeight - transcriptElement.scrollTop <= transcriptElement.clientHeight + 50;
        // Only set manual scroll if user scrolls up significantly
        if (!isNearBottom && transcriptElement.scrollTop < transcriptElement.scrollHeight - transcriptElement.clientHeight - 50) {
             setIsManualScroll(true);
        } else if (isNearBottom) {
             setIsManualScroll(false); // Auto-reset if scrolled back to bottom
        }
    };

    transcriptElement.addEventListener('scroll', handleScroll);
    return () => transcriptElement.removeEventListener('scroll', handleScroll);
  }, []);


  // Auto-scroll enhanced transcript
  useEffect(() => {
    if (enhancedTranscriptRef.current) {
      enhancedTranscriptRef.current.scrollTop = enhancedTranscriptRef.current.scrollHeight;
    }
  }, [enhancedTranscript]);

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Original Transcript */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <button className="flex items-center cursor-pointer group" onClick={() => setIsOriginalCollapsed(!isOriginalCollapsed)}>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">Original Transcript</h3>
            {isOriginalCollapsed ? <ChevronDown size={16} className="text-gray-400 group-hover:text-blue-500" /> : <ChevronUp size={16} className="text-gray-400 group-hover:text-blue-500" />}
          </button>
        </div>
        <div className={`transition-all duration-300 ease-in-out ${isOriginalCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>
          <div
            ref={originalTranscriptRef}
            className={`p-4 bg-gray-100 dark:bg-gray-700 rounded-lg ${originalHeight} custom-scrollbar transition-all duration-300`}
            aria-live="polite"
          >
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {originalTranscript}
              {interimTranscript && <span className="text-gray-400 dark:text-gray-500"> {interimTranscript}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Transcript */}
      {showEnhanced && (
        <div className={`transition-all duration-500 ${showEnhanced ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-between mb-2">
             <button className="flex items-center cursor-pointer group" onClick={() => setIsEnhancedCollapsed(!isEnhancedCollapsed)}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">Enhanced Transcript</h3>
                {isEnhancedCollapsed ? <ChevronDown size={16} className="text-gray-400 group-hover:text-blue-500" /> : <ChevronUp size={16} className="text-gray-400 group-hover:text-blue-500" />}
            </button>
            {isEnhancing && (
              <div className="flex items-center space-x-2">
                <Loader className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Enhancing... {enhancementProgress}%
                </span>
              </div>
            )}
          </div>
             <div className={`transition-all duration-300 ease-in-out ${isEnhancedCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>
                <div
                    ref={enhancedTranscriptRef}
                    className={`p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg ${enhancedHeight} custom-scrollbar transition-all duration-300`}
                >
                {isEnhancing && enhancementProgress < 100 ? (
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-width duration-300"
                      style={{ width: `${enhancementProgress}%` }}
                    ></div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{enhancedTranscript}</p>
                )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;