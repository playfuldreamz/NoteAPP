import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from './Modal';
import { ChevronUp, Trash2, Eye, Search, Download } from 'lucide-react';
import { useDownloadNote, type DownloadOptions } from '../hooks/useDownloadNote';
import useTitleGeneration from '../hooks/useTitleGeneration';

interface Transcript {
  id: number;
  text: string;
  title: string;
  date: string;
}

interface TranscriptsListProps {
  transcripts: Transcript[];
  updateTranscripts: () => void;
}

const TranscriptsList: React.FC<TranscriptsListProps> = ({ transcripts: initialTranscripts, updateTranscripts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<string>('');
  const [visibleTranscripts, setVisibleTranscripts] = useState<Transcript[]>([]);
  const [showLoadMore, setShowLoadMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { downloadNote, isDownloading } = useDownloadNote();
  const [downloadOptions, setDownloadOptions] = useState<DownloadOptions>({
    format: 'txt',
    includeMetadata: true
  });
  const [filteredTranscripts, setFilteredTranscripts] = useState<Transcript[]>([]);
  const { loadingTitles, handleGenerateTitle } = useTitleGeneration();

  useEffect(() => {
    const sortedTranscripts = [...initialTranscripts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setFilteredTranscripts(sortedTranscripts);
    setVisibleTranscripts(sortedTranscripts.slice(0, 5));
    setShowLoadMore(sortedTranscripts.length > 5);
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

      const response = await fetch(`http://localhost:5000/transcripts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        toast.success('Transcript deleted!');
        updateTranscripts(); // Call to update transcripts in parent component
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete transcript');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete transcript');
    }
  };

  const handleSeeMore = (text: string) => {
    setSelectedTranscript(text);
    setIsModalOpen(true);
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
                          transcript: '', // Not applicable for transcripts
                          timestamp: transcript.date,
                          title: transcript.title || `Transcript-${transcript.id}`
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
                      {truncateText(transcript.text)}
                    </p>
                    {transcript.text.split(' ').length > 5 && (
                      <button
                        onClick={() => handleSeeMore(transcript.text)}
                        className="text-blue-500 hover:text-blue-700 transition-colors duration-200 text-xs ml-2"
                      >
                    <Eye size={16} />
                      </button>
                    )}
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} content={selectedTranscript} />
    </div>
  );
};

export default TranscriptsList;
