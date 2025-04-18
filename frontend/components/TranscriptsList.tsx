import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import Modal from './ModalWrapper';
import { ChevronUp, Trash2, Eye, Search, Download } from 'lucide-react';
import TranscriptActions from './TranscriptActions';
import type { TranscriptFilters } from './TranscriptActions';
import { generateTranscriptTitle, updateTranscriptTitle } from '../services/ai';
import useDownloadDocument, { DownloadOptions } from '../hooks/useDownloadDocument';
import useTitleGeneration from '../hooks/useTitleGeneration';
import { deleteResource, bulkDeleteResources } from '../services/deleteService';
import { useTagsContext } from '../context/TagsContext';

interface Tag {
  id: number;
  name: string;
}

interface Transcript {
  id: number;
  text: string;
  title: string;
  date: string;
  summary?: string | null;
  tags?: Tag[];
}

interface TranscriptsListProps {
  transcripts: Transcript[];
  updateTranscripts: () => void;
  onTitleUpdate?: () => void; // Add this line
}

const TranscriptsList: React.FC<TranscriptsListProps> = ({ transcripts: initialTranscripts = [], updateTranscripts, onTitleUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<string>('');
  const [selectedTranscriptTitle, setSelectedTranscriptTitle] = useState<string>('');
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<number>(0);
  const [selectedTranscriptSummary, setSelectedTranscriptSummary] = useState<string | null>(null);
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
  const [visibleTranscripts, setVisibleTranscripts] = useState<Transcript[]>([]);
  const [showLoadMore, setShowLoadMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { downloadDocument, isDownloading } = useDownloadDocument();
  const { loadingTitles, handleGenerateTitle } = useTitleGeneration();
  const [downloadOptions, setDownloadOptions] = useState<Record<number, DownloadOptions>>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTranscriptIds, setSelectedTranscriptIds] = useState<Set<number>>(new Set());
  const { updateItemTags } = useTagsContext();

  const getDownloadOptions = (transcriptId: number): DownloadOptions => ({
    format: downloadOptions[transcriptId]?.format || 'txt',
    includeMetadata: true
  });

  const handleDownloadOptionsChange = (transcriptId: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    setDownloadOptions(prev => ({
      ...prev,
      [transcriptId]: {
        ...getDownloadOptions(transcriptId),
        format: e.target.value as 'txt' | 'json' | 'pdf'
      }
    }));
  };

  const [expandedTags, setExpandedTags] = useState<Record<number, boolean>>({});

  const toggleTagsExpansion = useCallback((transcriptId: number) => {
    setExpandedTags(prev => ({
      ...prev,
      [transcriptId]: !prev[transcriptId]
    }));
  }, []);

  const renderTranscriptTags = useCallback((transcript: Transcript) => {
    const tags = transcript.tags || [];
    const maxVisibleTags = 3;
    const showAll = expandedTags[transcript.id] || false;
    
    return (
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex flex-wrap gap-2">
          {(showAll ? tags : tags.slice(0, maxVisibleTags)).map(tag => (
            <span 
              key={`${transcript.id}-${tag.id}-${tag.name}`}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
            >
              {tag.name}
            </span>
          ))}
        </div>
        {tags.length > maxVisibleTags && (
          <button
            onClick={() => toggleTagsExpansion(transcript.id)}
            className="text-xs text-blue-500 hover:underline self-start"
          >
            {showAll ? 'Show less' : `+${tags.length - maxVisibleTags} more`}
          </button>
        )}
      </div>
    );
  }, [expandedTags, toggleTagsExpansion]);

  const handleTagsUpdate = useCallback((updatedTags: Tag[]) => {
    // Update the tags for the selected transcript in both filteredTranscripts and visibleTranscripts
    const updateTranscript = (transcript: Transcript) => {
      if (transcript.id === selectedTranscriptId) {
        return { ...transcript, tags: updatedTags };
      }
      return transcript;
    };

    setFilteredTranscripts(prev => prev.map(updateTranscript));
    setVisibleTranscripts(prev => prev.map(updateTranscript));
  }, [selectedTranscriptId]);

  const [filteredTranscripts, setFilteredTranscripts] = useState<Transcript[]>([]);
  const applyFilters = (transcripts: Transcript[], filters: TranscriptFilters) => {
    // Ensure transcripts is an array before spreading
    let filtered = transcripts ? [...transcripts] : [];

    // Keyword filter
    if (filters.keyword) {
      const searchTerm = filters.keyword.toLowerCase();
      filtered = filtered.filter(t => 
        t.text.toLowerCase().includes(searchTerm) ||
        t.title.toLowerCase().includes(searchTerm)
      );
    }

    // Date range filter
    if (filters.dateRange?.start && filters.dateRange?.end) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(t => {
        const transcriptDate = new Date(t.date);
        return transcriptDate >= startDate && transcriptDate <= endDate;
      });
    }

    // Length filter
    if (filters.length) {
      const wordCount = (t: Transcript) => t.text.split(' ').length;
      filtered = filtered.filter(t => {
        const words = wordCount(t);
        switch (filters.length) {
          case 'short': return words < 100;
          case 'medium': return words >= 100 && words <= 500;
          case 'long': return words > 500;
          default: return true;
        }
      });
    }

    // Tag filter - must match all selected tags
    if (filters.tags.length > 0) {
      console.log('Applying tag filter with selected tags:', filters.tags);
      filtered = filtered.filter(t => {
        const itemTags = (t.tags || []).map(tag => tag.name);
        console.log(`Checking item ${t.id} with tags:`, itemTags);
        const matchesAll = filters.tags.every((selectedTag: string) => {
          const match = itemTags.includes(selectedTag);
          console.log(`Checking tag ${selectedTag}: ${match}`);
          return match;
        });
        console.log(`Item ${t.id} matches all tags: ${matchesAll}`);
        return matchesAll;
      });
      console.log('Filtered items after tag filter:', filtered);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleFilter = (filters: TranscriptFilters) => {
    const filtered = applyFilters(initialTranscripts, filters);
    setFilteredTranscripts(filtered);
    setVisibleTranscripts(filtered.slice(0, 5));
    setShowLoadMore(filtered.length > 5);
  };

  useEffect(() => {
    handleFilter({ tags: [] }); // Initial load with no filters
  }, [initialTranscripts]);

  useEffect(() => {
    if (!initialTranscripts || !Array.isArray(initialTranscripts)) return;
    
    if (searchQuery) {
      const filtered = initialTranscripts.filter(transcript =>
        transcript.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transcript.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const sortedFiltered = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setFilteredTranscripts(sortedFiltered);
      setVisibleTranscripts(sortedFiltered.slice(0, 5));
      setShowLoadMore(sortedFiltered.length > 5);
    } else {
      const sortedTranscripts = [...initialTranscripts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setFilteredTranscripts(sortedTranscripts);
      setVisibleTranscripts(sortedTranscripts.slice(0, 5));
      setShowLoadMore(sortedTranscripts.length > 5);
    }
  }, [searchQuery, initialTranscripts]);

  useEffect(() => {
    initialTranscripts.forEach(transcript => {
      if (transcript.tags) {
        updateItemTags(transcript.id, 'transcript', transcript.tags);
      }
    });
  }, [initialTranscripts, updateItemTags]);

  const handleDeleteTranscript = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      await deleteResource('transcript', id, token);
      
      // Update filtered transcripts
      setFilteredTranscripts(prev => {
        const newFiltered = prev.filter(t => t.id !== id);
        return newFiltered;
      });
      
      // Update visible transcripts while maintaining 5 items
      setVisibleTranscripts(prev => {
        const remainingTranscripts = prev.filter(t => t.id !== id);
        // If we now have fewer than 5 visible transcripts, add more from filtered if available
        if (remainingTranscripts.length < 5) {
          const newFiltered = filteredTranscripts.filter(t => t.id !== id);
          return newFiltered.slice(0, 5);
        }
        return remainingTranscripts;
      });
      
      toast.success('Transcript deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete transcript');
    }
  };

  const handleSeeMore = (content: string, title: string, id: number) => {
    // Find the transcript to get its summary
    const transcript = filteredTranscripts.find(t => t.id === id);
    
    setSelectedTranscript(content);
    setSelectedTranscriptTitle(title);
    setSelectedTranscriptId(id);
    setSelectedTranscriptSummary(transcript?.summary || null);
    setIsModalOpen(true);
  };

  const truncateText = (text: string | null) => {
    if (!text) return '';
    
    // First, normalize the text by removing HTML tags if any are present
    const cleanText = text.replace(/<[^>]*>/g, '');
    
    // Split by newlines to get separate lines
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length === 0) return '';
    
    // If we have mostly single-character lines (like numbered lists), 
    // treat the whole text as a single chunk
    const singleCharLines = lines.filter(line => line.trim().length <= 2);
    if (singleCharLines.length > lines.length / 2) {
      // It's likely a numbered list or similar pattern
      // Join everything and treat as one chunk of text
      const allText = lines.join(' ');
      const words = allText.split(' ').filter(word => word.trim() !== '');
      return words.length > 10 ? words.slice(0, 10).join(' ') + '...' : allText;
    }
    
    // Otherwise, process normally with line-based approach
    // Take only the first two non-empty lines
    const limitedLines = lines.slice(0, 2);
    
    // For each line, limit to reasonable number of words
    const truncatedLines = limitedLines.map(line => {
      const words = line.split(' ').filter(word => word.trim() !== '');
      return words.length > 5 ? words.slice(0, 5).join(' ') + '...' : line;
    });
    
    // Join the lines back together
    let result = truncatedLines.join(' — ');
    
    // Add ellipsis if there were more lines
    if (lines.length > 2) {
      result += '...';
    }
    
    return result;
  };

  const handleRegenerateTitle = async () => {
    if (!selectedTranscript || !selectedTranscriptId) return;
    
    setIsRegeneratingTitle(true);
    try {
      const newTitle = await generateTranscriptTitle(selectedTranscript);
      await updateTranscriptTitle(selectedTranscriptId, newTitle);
      setSelectedTranscriptTitle(newTitle);
      
      // Update the title in the transcripts list
      const updateTranscript = (transcript: Transcript) => {
        if (transcript.id === selectedTranscriptId) {
          return { ...transcript, title: newTitle };
        }
        return transcript;
      };
      
      setFilteredTranscripts(prev => prev.map(updateTranscript));
      setVisibleTranscripts(prev => prev.map(updateTranscript));
      
      toast.success('Title regenerated successfully');
    } catch (error) {
      console.error('Error regenerating title:', error);
      toast.error('Failed to regenerate title');
    } finally {
      setIsRegeneratingTitle(false);
    }
  };

  const toggleSelection = (transcriptId: number) => {
    setSelectedTranscriptIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transcriptId)) {
        newSet.delete(transcriptId);
      } else {
        newSet.add(transcriptId);
      }
      return newSet;
    });
  };

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    setSelectedTranscriptIds(new Set());
  }, []);

  const handleBulkDelete = async (ids: number[]) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      await bulkDeleteResources('transcript', ids, token);
      updateTranscripts();
      toast.success('Transcripts deleted successfully!');
      setSelectedTranscriptIds(new Set());
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete transcripts');
    }
  };

  const handleBulkDownload = (ids: number[]) => {
    const selectedTranscripts = visibleTranscripts.filter(t => ids.includes(t.id));
    const exportData = selectedTranscripts.map(t => ({
      id: t.id,
      title: t.title,
      text: t.text,
      date: t.date,
      tags: t.tags || []
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
    a.download = `selected_transcripts_${formattedDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (onTitleUpdate) onTitleUpdate();
  }, [isModalOpen, onTitleUpdate]);

  const handleLoadMore = () => {
    const currentLength = visibleTranscripts.length;
    const newVisibleTranscripts = filteredTranscripts.slice(0, currentLength + 5);
    setVisibleTranscripts(newVisibleTranscripts);
    setShowLoadMore(newVisibleTranscripts.length < filteredTranscripts.length);
  };

  const handleShowLess = () => {
    setVisibleTranscripts(filteredTranscripts.slice(0, 5));
    setShowLoadMore(filteredTranscripts.length > 5);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search transcripts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ×
          </button>
        )}
      </div>
      
      <TranscriptActions 
        count={filteredTranscripts.length}
        visibleCount={visibleTranscripts.length}
        itemType="transcript"
        onFilter={handleFilter}
        onSort={() => {
          const sorted = [...filteredTranscripts].reverse();
          setFilteredTranscripts(sorted);
          setVisibleTranscripts(sorted.slice(0, 5));
        }}
        onExport={() => {
          const exportData = filteredTranscripts.map(t => ({
            id: t.id,
            title: t.title,
            text: t.text,
            date: t.date,
            tags: t.tags || []
          }));
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const date = new Date();
          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
          a.download = `transcripts_${formattedDate}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }}
        onRefresh={updateTranscripts}
        onToggleSelection={toggleSelectionMode}
        isSelectionMode={isSelectionMode}
        selectedIds={selectedTranscriptIds}
        onBulkDelete={handleBulkDelete}
        onBulkDownload={handleBulkDownload}
      />
      
      {visibleTranscripts.length === 0 ? (
        <p className="dark:text-gray-200">No transcripts available.</p>
      ) : (
        <div className="space-y-4">
          {visibleTranscripts.map((transcript) => (
            <div
              key={transcript.id}
              className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative transition-all duration-200 ${
                isSelectionMode ? 'cursor-pointer pr-10' : ''
              }`}
              onClick={isSelectionMode ? () => toggleSelection(transcript.id) : undefined}
            >
              <div className={`absolute top-4 right-4 transition-all duration-200 ${isSelectionMode ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`w-4 h-4 border rounded transition-colors duration-200 flex items-center justify-center ${
                  selectedTranscriptIds.has(transcript.id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedTranscriptIds.has(transcript.id) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      {transcript.title || 'Untitled Transcript'}
                    </h3>
                    {(!transcript.title || transcript.title === 'Untitled Transcript') && (
                      <button
                      onClick={() => handleGenerateTitle(transcript.id, transcript.text, (id, title) => {
                        setVisibleTranscripts(prev => prev.map(t => 
                          t.id === id ? { ...t, title } : t
                        ));
                        setFilteredTranscripts(prev => prev.map(t =>
                          t.id === id ? { ...t, title } : t
                        ));
                      }, 'transcript')}
                        className="text-xs text-blue-500 hover:text-blue-700"
                        disabled={loadingTitles[transcript.id]}
                      >
                        {loadingTitles[transcript.id] ? 'Generating...' : 'Generate Title'}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={getDownloadOptions(transcript.id).format}
                      onChange={(e) => handleDownloadOptionsChange(transcript.id, e)}
                      className="text-xs text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors px-1.5 py-1 border border-gray-200 dark:border-gray-700"
                      aria-label="Select download format"
                    >
                      <option value="txt">TXT</option>
                      <option value="json">JSON</option>
                      <option value="pdf">PDF</option>
                    </select>
                    <button
                      onClick={() => downloadDocument({
                        id: transcript.id,
                        type: 'transcript',
                        content: transcript.text,
                        timestamp: transcript.date,
                        title: transcript.title || `Transcript-${transcript.id}`,
                        tags: transcript.tags || []
                      }, getDownloadOptions(transcript.id))}
                      disabled={isDownloading}
                      className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Download transcript"
                    >
                      <Download size={16} className={isDownloading ? 'opacity-50' : ''} />
                    </button>
                    <button
                      onClick={() => handleDeleteTranscript(transcript.id)}
                      className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      title="Delete transcript"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-gray-600 dark:text-gray-300">
                  <p className="text-sm inline">
                    {truncateText(transcript.text)}
                  </p>
                  {transcript.text.split(' ').length > 5 && (
                    <button
                      onClick={() => handleSeeMore(transcript.text, transcript.title || 'Untitled Transcript', transcript.id)}
                      className="text-blue-500 hover:underline text-xs ml-2"
                      aria-label="View full transcript"
                      title="View full transcript"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                </div>
                {renderTranscriptTags(transcript)}
                <div className="text-xs text-gray-400 mt-2 flex justify-between items-center">
                  <span>{new Date(transcript.date).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-4">
        {showLoadMore && (
          <button onClick={handleLoadMore} className="text-blue-500 hover:underline text-sm mr-2">
            Load more
          </button>
        )}
        {visibleTranscripts.length > 5 && (
          <button
            onClick={handleShowLess}
            className="text-blue-500 hover:underline text-sm"
            aria-label="Show less transcripts"
            title="Show less transcripts"
          >
            <ChevronUp size={16} />
          </button>
        )}
      </div>
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          content={selectedTranscript}
          title={selectedTranscriptTitle}
          itemId={selectedTranscriptId}
          type="transcript"
          initialSummary={selectedTranscriptSummary}
          onTagsUpdate={handleTagsUpdate}
          onRegenerateTitle={handleRegenerateTitle}
          isRegeneratingTitle={isRegeneratingTitle}
          onTitleUpdate={updateTranscripts} // Pass updateTranscripts as onTitleUpdate
          onSummaryUpdate={(summary) => {
            // Update the summary in the transcripts list when it changes
            setSelectedTranscriptSummary(summary);
            setFilteredTranscripts(prev => prev.map(t => 
              t.id === selectedTranscriptId ? { ...t, summary } : t
            ));
            setVisibleTranscripts(prev => prev.map(t => 
              t.id === selectedTranscriptId ? { ...t, summary } : t  
            ));
          }}
        >
          <div className="mt-4">
            <h4 className="text-lg font-semibold mb-4 dark:text-gray-200">Modules</h4>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Coming soon: Additional modules will appear here
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TranscriptsList;
