import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from './Modal';
import { ChevronUp, Trash2, Eye, Search, Sparkles, Download } from 'lucide-react';
import TranscriptActions from './TranscriptActions';
import { generateTranscriptTitle, updateTranscriptTitle } from '../services/ai';
import useDownloadDocument, { DownloadOptions } from '../hooks/useDownloadDocument';
import useTitleGeneration from '../hooks/useTitleGeneration';
import { deleteResource, bulkDeleteResources } from '../services/deleteService';
import { useTagsContext } from '../context/TagsContext';

interface Tag {
  id: number;
  name: string;
}

interface Note {
  id: number;
  content: string;
  transcript: string;
  timestamp: string;
  title: string;
  user_id: number;
  tags: Tag[];
}

interface NoteListProps {
  notes: Note[];
  onDelete: (id: number) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string>('');
  const [selectedNoteTitle, setSelectedNoteTitle] = useState<string>('');
  const [selectedNoteId, setSelectedNoteId] = useState<number>(0);
  const [visibleNotes, setVisibleNotes] = useState<Note[]>([]);
  const [showLoadMore, setShowLoadMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
  const { loadingTitles, handleGenerateTitle } = useTitleGeneration();
  const { downloadDocument, isDownloading } = useDownloadDocument();
  const [downloadOptions, setDownloadOptions] = useState<Record<number, DownloadOptions>>({});
  const [expandedTags, setExpandedTags] = useState<Record<number, boolean>>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<number>>(new Set());
  const { updateItemTags } = useTagsContext();

  const toggleTagsExpansion = useCallback((noteId: number) => {
    setExpandedTags(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  }, []);

  const handleTagsUpdate = useCallback((updatedTags: Tag[]) => {
    // Update the tags for the selected note in both filteredNotes and visibleNotes
    const updateNote = (note: Note) => {
      if (note.id === selectedNoteId) {
        return { ...note, tags: updatedTags };
      }
      return note;
    };

    setFilteredNotes(prev => prev.map(updateNote));
    setVisibleNotes(prev => prev.map(updateNote));
  }, [selectedNoteId]);

  const getDownloadOptions = (noteId: number): DownloadOptions => ({
    format: downloadOptions[noteId]?.format || 'txt',
    includeMetadata: true
  });

  const handleDownloadOptionsChange = (noteId: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    setDownloadOptions(prev => ({
      ...prev,
      [noteId]: {
        ...getDownloadOptions(noteId),
        format: e.target.value as 'txt' | 'json' | 'pdf'
      }
    }));
  };

  const renderNoteTags = useCallback((note: Note) => {
    const tags = note.tags || [];
    const maxVisibleTags = 3;
    const showAll = expandedTags[note.id] || false;
    
    return (
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex flex-wrap gap-2">
          {(showAll ? tags : tags.slice(0, maxVisibleTags)).map(tag => (
            <span 
              key={`${note.id}-${tag.id}-${tag.name}`}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
            >
              {tag.name}
            </span>
          ))}
        </div>
        {tags.length > maxVisibleTags && (
          <button
            onClick={() => toggleTagsExpansion(note.id)}
            className="text-xs text-blue-500 hover:underline self-start"
          >
            {showAll ? 'Show less' : `+${tags.length - maxVisibleTags} more`}
          </button>
        )}
      </div>
    );
  }, [expandedTags, toggleTagsExpansion]);

  const renderTags = (note: Note) => {
    const tags = note.tags || [];
    const maxVisibleTags = 3;
    const showAll = expandedTags[note.id] || false;
    
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
            onClick={() => toggleTagsExpansion(note.id)}
            className="text-xs text-blue-500 hover:underline self-start"
          >
            {showAll ? 'Show less' : `+${tags.length - maxVisibleTags} more`}
          </button>
        )}
      </div>
    );
  };

  const toggleSelection = (noteId: number) => {
    setSelectedNoteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    setSelectedNoteIds(new Set());
  }, []);

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

  useEffect(() => {
    notes.forEach(note => {
      if (note.tags) {
        updateItemTags(note.id, 'note', note.tags);
      }
    });
  }, [notes, updateItemTags]);

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      await deleteResource('note', id, token);
      onDelete(id);
      toast.success('Note deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete note');
    }
  };

  const handleSeeMore = (content: string, title: string, id: number) => {
    setSelectedNote(content);
    setSelectedNoteTitle(title);
    setSelectedNoteId(id);
    setIsModalOpen(true);
  };

  const handleRegenerateTitle = async () => {
    if (!selectedNote || !selectedNoteId) return;
    
    setIsRegeneratingTitle(true);
    try {
      const newTitle = await generateTranscriptTitle(selectedNote);
      await updateTranscriptTitle(selectedNoteId, newTitle);
      setSelectedNoteTitle(newTitle);
      
      // Update the title in the notes list
      const updateNote = (note: Note) => {
        if (note.id === selectedNoteId) {
          return { ...note, title: newTitle };
        }
        return note;
      };
      
      setFilteredNotes(prev => prev.map(updateNote));
      setVisibleNotes(prev => prev.map(updateNote));
      
      toast.success('Title regenerated successfully');
    } catch (error) {
      console.error('Error regenerating title:', error);
      toast.error('Failed to regenerate title');
    } finally {
      setIsRegeneratingTitle(false);
    }
  };

  const truncateText = (text: string | null) => {
    if (!text) return '';
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

  const handleBulkDelete = async (ids: number[]) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      await bulkDeleteResources('note', ids, token);
      ids.forEach(id => onDelete(id));
      toast.success('Notes deleted successfully!');
      setSelectedNoteIds(new Set());
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete notes');
    }
  };

  const handleBulkDownload = (ids: number[]) => {
    const selectedNotes = visibleNotes.filter(n => ids.includes(n.id));
    const exportData = selectedNotes.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      transcript: n.transcript,
      timestamp: n.timestamp,
      tags: n.tags || []
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
    a.download = `selected_notes_${formattedDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        count={filteredNotes.length}
        visibleCount={visibleNotes.length}
        itemType="note"
        onFilter={(filters) => {
          const filtered = notes.filter(note => {
            // Keyword filter
            if (filters.keyword) {
              const searchTerm = filters.keyword.toLowerCase();
              if (!note.title.toLowerCase().includes(searchTerm) &&
                  !note.content.toLowerCase().includes(searchTerm)) {
                return false;
              }
            }
            // Date range filter
            if (filters.dateRange?.start && filters.dateRange?.end) {
              const noteDate = new Date(note.timestamp);
              const startDate = new Date(filters.dateRange.start);
              const endDate = new Date(filters.dateRange.end);
              if (noteDate < startDate || noteDate > endDate) {
                return false;
              }
            }
            // Length filter
            if (filters.length) {
              const wordCount = note.content.split(/\s+/).length;
              switch (filters.length) {
                case 'short':
                  if (wordCount >= 100) return false;
                  break;
                case 'medium':
                  if (wordCount < 100 || wordCount > 500) return false;
                  break;
                case 'long':
                  if (wordCount <= 500) return false;
                  break;
              }
            }
            // Tag filter - must match all selected tags
            console.log('Note object:', note);
            if (filters.tags.length > 0) {
              console.log('Applying tag filter with selected tags:', filters.tags);
              const itemTags = (note.tags || []).map(tag => tag.name);
              console.log(`Checking note ${note.id} with tags:`, itemTags);
              const matchesAll = filters.tags.every(selectedTag => {
                const match = itemTags.includes(selectedTag);
                console.log(`Checking tag ${selectedTag}: ${match}`);
                return match;
              });
              console.log(`Note ${note.id} matches all tags: ${matchesAll}`);
              if (!matchesAll) {
                return false;
              }
            }
            return true;
          });
          const sortedFiltered = filtered.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setFilteredNotes(sortedFiltered);
          setVisibleNotes(sortedFiltered.slice(0, 5));
          setShowLoadMore(sortedFiltered.length > 5);
        }}
        onSort={() => {
          const sorted = [...filteredNotes].reverse();
          setFilteredNotes(sorted);
          setVisibleNotes(sorted.slice(0, 5));
        }}
        onExport={() => {
          const exportData = filteredNotes.map(n => ({
            id: n.id,
            title: n.title,
            content: n.content,
            transcript: n.transcript,
            timestamp: n.timestamp,
            tags: n.tags || []
          }));
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const date = new Date();
          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
          a.download = `notes_${formattedDate}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }}
        onRefresh={() => onDelete(-1)}
        onToggleSelection={toggleSelectionMode}
        isSelectionMode={isSelectionMode}
        selectedIds={selectedNoteIds}
        onBulkDelete={handleBulkDelete}
        onBulkDownload={handleBulkDownload}
      />
      <div className="space-y-4">
        {visibleNotes.map((note) => (
          <div
            key={note.id}
            className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative transition-all duration-200 ${
              isSelectionMode ? 'cursor-pointer pr-10' : ''
            }`}
            onClick={isSelectionMode ? () => toggleSelection(note.id) : undefined}
          >
            <div className={`absolute top-4 right-4 transition-all duration-200 ${isSelectionMode ? 'opacity-100' : 'opacity-0'}`}>
              <div className={`w-4 h-4 border rounded transition-colors duration-200 flex items-center justify-center ${
                selectedNoteIds.has(note.id)
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selectedNoteIds.has(note.id) && (
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
                  <select
                    value={getDownloadOptions(note.id).format}
                    onChange={(e) => handleDownloadOptionsChange(note.id, e)}
                    className="text-xs text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors px-1.5 py-1 border border-gray-200 dark:border-gray-700"
                  >
                    <option value="txt">TXT</option>
                    <option value="json">JSON</option>
                    <option value="pdf">PDF</option>
                  </select>
                  <button
                    onClick={() => downloadDocument({
                      ...note,
                      type: 'note',
                      content: note.content
                    }, getDownloadOptions(note.id))}
                    disabled={isDownloading}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download note"
                  >
                    <Download size={16} className={isDownloading ? 'opacity-50' : ''} />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    title="Delete note"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                <p className="text-sm inline">
                  {truncateText(note.content)}
                </p>
                {note.content && note.content.split(' ').length > 5 && (
                  <button
                    onClick={() => handleSeeMore(note.content, note.title || 'Untitled Note', note.id)}
                    className="text-blue-500 hover:underline text-xs ml-2"
                  >
                    <Eye size={16} />
                  </button>
                )}
              </div>
              {renderNoteTags(note)}
              <div className="text-xs text-gray-400 mt-2 flex justify-between items-center">
                <span>{new Date(note.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
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
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          content={selectedNote}
          title={selectedNoteTitle}
          itemId={selectedNoteId}
          type="note"
          onTagsUpdate={handleTagsUpdate}
          onRegenerateTitle={handleRegenerateTitle}
          isRegeneratingTitle={isRegeneratingTitle}
        >
          <div className="mt-4">
          </div>
        </Modal>
      )}
    </div>
  );
};

export default NoteList;
