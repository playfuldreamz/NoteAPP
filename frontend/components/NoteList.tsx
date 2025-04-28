import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from './modal/index';
import { ChevronUp, Trash2, Eye, Search, Sparkles, Download } from 'lucide-react';
import TranscriptActions from './TranscriptActions';
import { generateTranscriptTitle, updateNoteTitle } from '../services/ai';
import useDownloadDocument, { DownloadOptions } from '../hooks/useDownloadDocument';
import useTitleGeneration from '../hooks/useTitleGeneration';
import { deleteResource, bulkDeleteResources } from '../services/deleteService';
import { useTagsContext } from '../context/TagsContext';
import { formatUTCTimestampToLongLocal } from '../utils/dateUtils';

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
  summary?: string | null;
  tags: Tag[];
}

interface NoteListProps {
  notes: Note[];
  onDelete: (id: number) => void;
  onTitleUpdate: () => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes = [], onDelete, onTitleUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string>('');
  const [selectedNoteTitle, setSelectedNoteTitle] = useState<string>('');
  const [selectedNoteId, setSelectedNoteId] = useState<number>(0);
  const [selectedNoteSummary, setSelectedNoteSummary] = useState<string | null>(null);
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
    // Ensure notes is an array before spreading
    if (!notes || !Array.isArray(notes)) {
      setFilteredNotes([]);
      setVisibleNotes([]);
      setShowLoadMore(false);
      return;
    }
    
    const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFilteredNotes(sortedNotes);
    setVisibleNotes(sortedNotes.slice(0, 5));
    setShowLoadMore(sortedNotes.length > 5);
  }, [notes]);

  useEffect(() => {
    if (!notes || !Array.isArray(notes)) return;
    
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
      // Update local state to remove the deleted note
      setFilteredNotes(prev => {
        const newFiltered = prev.filter(n => n.id !== id);
        return newFiltered;
      });
      
      // Update visible notes while maintaining 5 items
      setVisibleNotes(prev => {
        const remainingNotes = prev.filter(n => n.id !== id);
        // If we now have fewer than 5 visible notes, add more from filtered notes if available
        if (remainingNotes.length < 5) {
          const newFiltered = filteredNotes.filter(n => n.id !== id);
          return newFiltered.slice(0, 5);
        }
        return remainingNotes;
      });
      
      toast.success('Note deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete note');
    }
  };

  const handleSeeMore = (content: string, title: string, id: number) => {
    // Find the note to get its summary
    const note = filteredNotes.find(n => n.id === id);
    
    setSelectedNote(content);
    setSelectedNoteTitle(title);
    setSelectedNoteId(id);
    setSelectedNoteSummary(note?.summary || null);
    setIsModalOpen(true);
  };

  const handleRegenerateTitle = async () => {
    if (!selectedNote || !selectedNoteId) return;
    
    // Set loading state to true before starting title generation
    setIsRegeneratingTitle(true);
    
    try {
      // Create an update function to update the note title in the UI
      const updateNoteTitle = (id: number, title: string) => {
        setSelectedNoteTitle(title);
        
        // Update the title in the notes list
        const updateNote = (note: Note) => {
          if (note.id === id) {
            return { ...note, title };
          }
          return note;
        };
        
        setFilteredNotes(prev => prev.map(updateNote));
        setVisibleNotes(prev => prev.map(updateNote));
        
        // Call the parent's onTitleUpdate callback
        if (onTitleUpdate) {
          onTitleUpdate();
        }
      };
      
      // Use the useTitleGeneration hook to handle title generation
      await handleGenerateTitle(
        selectedNoteId,
        selectedNote,
        updateNoteTitle,
        'note',
        selectedNoteTitle // Pass current title to ensure we get a different one
      );
    } catch (error) {
      console.error('Error regenerating title:', error);
      toast.error('Failed to regenerate title');
    } finally {
      // Set loading state to false after title generation completes
      setIsRegeneratingTitle(false);
    }
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
      
      // Update local state by removing deleted notes
      setFilteredNotes(prev => prev.filter(n => !ids.includes(n.id)));
      setVisibleNotes(prev => prev.filter(n => !ids.includes(n.id)));
      
      // Refresh parent component
      onTitleUpdate();
      
      // Clear selection
      setSelectedNoteIds(new Set());
      
      toast.success('Notes deleted successfully!');
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
        onRefresh={() => onTitleUpdate()}
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
                      }, 'note')}
                      disabled={loadingTitles[note.id]}
                      className="text-xs text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      {loadingTitles[note.id] ? 'Generating...' : 'Generate Title'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    aria-label="Select download format"
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
                    className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download note"
                  >
                    <Download size={16} className={isDownloading ? 'opacity-50' : ''} />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                    aria-label="View full note"
                    onClick={() => handleSeeMore(note.content, note.title || 'Untitled Note', note.id)}
                    className="text-blue-500 hover:underline text-xs ml-2"
                  >
                    <Eye size={16} />
                  </button>
                )}
              </div>
              {renderNoteTags(note)}
              <div className="text-xs text-gray-400 mt-2 flex justify-between items-center">
                <span>{formatUTCTimestampToLongLocal(note.timestamp)}</span>
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
          <button
            aria-label="Show less"
            title="Show less"
            onClick={handleShowLess}
            className="text-blue-500 hover:underline text-sm"
          >
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
          initialSummary={selectedNoteSummary}
          onTagsUpdate={handleTagsUpdate}
          onRegenerateTitle={handleRegenerateTitle}
          isRegeneratingTitle={isRegeneratingTitle}
          onTitleUpdate={onTitleUpdate} // Ensure the callback is passed to the Modal
          onSummaryUpdate={(summary) => {
            // Update the summary in the notes list when it changes
            setSelectedNoteSummary(summary);
            setFilteredNotes(prev => prev.map(n => 
              n.id === selectedNoteId ? { ...n, summary } : n
            ));
            setVisibleNotes(prev => prev.map(n => 
              n.id === selectedNoteId ? { ...n, summary } : n  
            ));
          }}
        >
          <div className="mt-4">
          </div>
        </Modal>
      )}
    </div>
  );
};

export default NoteList;
