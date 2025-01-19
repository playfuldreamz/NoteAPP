import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from './Modal';
import { ChevronUp, Trash2, Eye, Search, Sparkles, Download } from 'lucide-react';
import TranscriptActions from './TranscriptActions';
import useTitleGeneration from '../hooks/useTitleGeneration';
import { useDownloadNote, DownloadOptions } from '../hooks/useDownloadNote';

interface NoteListProps {
  notes: Array<{
    id: number;
    content: string;
    transcript: string;
    timestamp: string;
    title: string;
  }>;
  onDelete: (id: number) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string>('');
  const [visibleNotes, setVisibleNotes] = useState<Array<{
    id: number;
    content: string;
    transcript: string;
    timestamp: string;
    title: string;
  }>>([]);
  const [showLoadMore, setShowLoadMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<Array<{
    id: number;
    content: string;
    transcript: string;
    timestamp: string;
    title: string;
  }>>([]);
  const { loadingTitles, handleGenerateTitle } = useTitleGeneration();
  const { downloadNote, isDownloading } = useDownloadNote();
  const [downloadOptions, setDownloadOptions] = useState<DownloadOptions>({
    format: 'txt',
    includeTranscript: true,
    includeMetadata: true
  });

  useEffect(() => {
    const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFilteredNotes(sortedNotes);
    setVisibleNotes(sortedNotes.slice(0, 5));
    setShowLoadMore(sortedNotes.length > 5);
  }, [notes]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const sortedFiltered = filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFilteredNotes(sortedFiltered);
      setVisibleNotes(sortedFiltered.slice(0, 5));
      setShowLoadMore(sortedFiltered.length > 5);
    } else {
      const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFilteredNotes(sortedNotes);
      setVisibleNotes(sortedNotes.slice(0, 5));
      setShowLoadMore(sortedNotes.length > 5);
    }
  }, [searchQuery, notes]);

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`http://localhost:5000/notes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        onDelete(id);
        toast.success('Note deleted!');
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.message || 'Failed to delete note');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleSeeMore = (content: string) => {
    setSelectedNote(content);
    setIsModalOpen(true);
  };

  const truncateText = (text: string) => {
    const words = text.split(' ');
    return words.length > 5 ? words.slice(0, 5).join(' ') + '...' : text;
  };

  const handleLoadMore = () => {
    const currentLength = visibleNotes.length;
    const newVisibleNotes = filteredNotes.slice(0, currentLength + 5);
    setVisibleNotes(newVisibleNotes);
    setShowLoadMore(newVisibleNotes.length < filteredNotes.length);
  };

  const handleShowLess = () => {
    setVisibleNotes(filteredNotes.slice(0, 5));
    setShowLoadMore(filteredNotes.length > 5);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search notes..."
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
        count={notes.length}
        onFilter={() => console.log('Filter clicked')}
        onSort={() => console.log('Sort clicked')}
        onExport={() => console.log('Export clicked')}
      />
      {visibleNotes.length === 0 ? (
        <p className="dark:text-gray-200">No notes available.</p>
      ) : (
        <ul>
          {visibleNotes.map((note) => (
          <li key={note.id} className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md">
            <div className="flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {note.title || 'Untitled Note'}
                  </h3>
                  {(!note.title || note.title === 'Untitled Note') && (
                    <button
                      onClick={() => handleGenerateTitle(note.id, note.content, (id, title) => {
                        const updatedNotes = notes.map(n =>
                          n.id === id ? { ...n, title } : n
                        );
                        setFilteredNotes(updatedNotes);
                        setVisibleNotes(updatedNotes.slice(0, visibleNotes.length));
                      })}
                      disabled={loadingTitles[note.id]}
                      className="text-xs text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      {loadingTitles[note.id] ? 'Generating...' : 'Generate Title'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => downloadNote(note, downloadOptions)}
                    disabled={isDownloading}
                    className="text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                    title="Download note"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
<div className="text-gray-600 dark:text-gray-300">
  <p className="text-sm inline">
    {truncateText(note.content)}
  </p>
                {note.content.split(' ').length > 5 && (
                  <button
                    onClick={() => handleSeeMore(note.content)}
                    className="text-blue-500 hover:underline text-xs ml-2"
                  >
                    <Eye size={16} />
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-2 flex justify-between items-center">
                <span>{new Date(note.timestamp).toLocaleString()}</span>
                <select
                  value={downloadOptions.format}
                  onChange={(e) => setDownloadOptions((prev: DownloadOptions) => ({
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
        ))}
      </ul>
      )}
      <div className="flex justify-end mt-4">
        {showLoadMore && (
          <button onClick={handleLoadMore} className="text-blue-500 hover:underline text-sm mr-2">
            Load more
          </button>
        )}
        {visibleNotes.length > 5 && (
          <button onClick={handleShowLess} className="text-blue-500 hover:underline text-sm">
            <ChevronUp size={16} />
          </button>
        )}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} content={selectedNote} />
    </div>
  );
};

export default NoteList;
