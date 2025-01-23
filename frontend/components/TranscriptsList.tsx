import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from './Modal';
import { ChevronUp, Trash2, Eye, Search, Download } from 'lucide-react';
import TranscriptActions, { TranscriptFilters } from './TranscriptActions';
import useDownloadNote from '../hooks/useDownloadNote';
import type { DownloadOptions } from '../hooks/useDownloadNote';
import useTitleGeneration from '../hooks/useTitleGeneration';

interface Tag {
  id: number;
  name: string;
}

interface Transcript {
  id: number;
  text: string;
  title: string;
  date: string;
  tags?: Tag[];
}

interface TranscriptsListProps {
  transcripts: Transcript[];
  updateTranscripts: () => void;
}

const TranscriptsList: React.FC<TranscriptsListProps> = ({ transcripts: initialTranscripts, updateTranscripts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<string>('');
  const [selectedTranscriptTitle, setSelectedTranscriptTitle] = useState<string>('');
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<number>(0);
  const [visibleTranscripts, setVisibleTranscripts] = useState<Transcript[]>([]);
  const [showLoadMore, setShowLoadMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { downloadNote, isDownloading } = useDownloadNote();
  const [downloadOptions, setDownloadOptions] = useState<DownloadOptions>({
    format: 'txt',
    includeMetadata: true
  });

  const handleDownloadOptionsChange = (prev: DownloadOptions, newFormat: string): DownloadOptions => {
    return {
      ...prev,
      format: newFormat as 'txt' | 'json' | 'pdf'
    };
  };

  const [expandedTags, setExpandedTags] = useState<Record<number, boolean>>({});

  const toggleTagsExpansion = (transcriptId: number) => {
    setExpandedTags(prev => ({
      ...prev,
      [transcriptId]: !prev[transcriptId]
    }));
  };

  const renderTags = (transcript: Transcript) => {
    const tags = transcript.tags || [];
    const maxVisibleTags = 3;
    const showAll = expandedTags[transcript.id] || false;
    
    return (
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex flex-wrap gap-2">
          {(showAll ? tags : tags.slice(0, maxVisibleTags)).map(tag => (
            <span key={tag.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
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
  };

  const [filteredTranscripts, setFilteredTranscripts] = useState<Transcript[]>([]);
  const { loadingTitles, handleGenerateTitle } = useTitleGeneration();

  const applyFilters = (transcripts: Transcript[], filters: TranscriptFilters) => {
    let filtered = [...transcripts];

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
        const matchesAll = filters.tags.every(selectedTag => {
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

  const handleTagsUpdate = (updatedTags: Tag[]) => {
    // Update the tags for the selected transcript in both filteredTranscripts and visibleTranscripts
    const updateTranscript = (transcript: Transcript) => {
      if (transcript.id === selectedTranscriptId) {
        return { ...transcript, tags: updatedTags };
      }
      return transcript;
    };

    setFilteredTranscripts(prev => prev.map(updateTranscript));
    setVisibleTranscripts(prev => prev.map(updateTranscript));
  };

  useEffect(() => {
    handleFilter({ tags: [] }); // Initial load with no filters
  }, [initialTranscripts]);

  useEffect(() => {
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

  const handleDeleteTranscript = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // First delete associated tags
      const deleteTagsResponse = await fetch(`http://localhost:5000/transcripts/${id}/tags`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!deleteTagsResponse.ok) {
        const data = await deleteTagsResponse.json();
        throw new Error(data.message || 'Failed to delete transcript tags');
      }

      // Then delete the transcript
      const response = await fetch(`http://localhost:5000/transcripts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        toast.success('Transcript deleted!');
        updateTranscripts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete transcript');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete transcript');
    }
  };

  const handleSeeMore = (text: string, title: string, id: number) => {
    setSelectedTranscript(text);
    setIsModalOpen(true);
    setSelectedTranscriptTitle(title);
    setSelectedTranscriptId(id);
  };

  const truncateText = (text: string) => {
    const words = text.split(' ');
    return words.length > 6 ? words.slice(0, 6).join(' ') + '...' : text;
  };

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
        count={initialTranscripts.length}
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
      />
      
      {visibleTranscripts.length === 0 ? (
        <p className="dark:text-gray-200">No transcripts available.</p>
      ) : (
        <ul>
          {visibleTranscripts.map((transcript) => {
            const truncatedText = truncateText(transcript.text);
            return (
              <li 
                key={transcript.id} 
                className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md hover:shadow-lg transition-shadow duration-200"
              >
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
                          })}
                          className="text-xs text-blue-500 hover:text-blue-700"
                          disabled={loadingTitles[transcript.id]}
                        >
                          {loadingTitles[transcript.id] ? 'Generating...' : 'Generate Title'}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteTranscript(transcript.id)}
                        className="text-red-500 hover:text-red-700 transition-colors duration-200"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => downloadNote({
                          id: transcript.id,
                          content: transcript.text,
                          transcript: '',
                          timestamp: transcript.date,
                          title: transcript.title || `Transcript-${transcript.id}`,
                          tags: transcript.tags || []
                        }, downloadOptions)}
                        disabled={isDownloading}
                        className="text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Download transcript"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-gray-600 dark:text-gray-300">
                    <p className="text-sm inline">
                      {truncatedText}
                    </p>
                    {transcript.text.split(' ').length > 5 && (
                      <button
                        onClick={() => handleSeeMore(transcript.text, transcript.title || 'Untitled Transcript', transcript.id)}
                        className="text-blue-500 hover:text-blue-700 transition-colors duration-200 text-xs ml-2"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(transcript.tags || []).map(tag => (
                      <span key={tag.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 mt-2 flex justify-between items-center">
                    <span>
                      {new Date(transcript.date).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <select
                      value={downloadOptions.format}
                      onChange={(e) => setDownloadOptions(prev => ({
                        ...prev,
                        format: e.target.value as 'txt' | 'json' | 'pdf'
                      }))}
                      className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5"
                    >
                      <option value="txt">TXT</option>
                      <option value="json">JSON</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex justify-end mt-4">
        {showLoadMore && (
          <button onClick={handleLoadMore} className="text-blue-500 hover:underline text-sm mr-2">
            Load more
          </button>
        )}
        {visibleTranscripts.length > 5 && (
          <button onClick={handleShowLess} className="text-blue-500 hover:underline text-sm">
            <ChevronUp size={16} />
          </button>
        )}
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        content={selectedTranscript}
        title={selectedTranscriptTitle}
        itemId={selectedTranscriptId || 0}
        onTagsUpdate={handleTagsUpdate}
      >
        <div className="p-4">
          <h4 className="text-lg font-semibold mb-4 dark:text-gray-200">Modules</h4>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Coming soon: Additional modules will appear here
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TranscriptsList;
