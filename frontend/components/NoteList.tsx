import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from './Modal';
import { ChevronUp, Trash2, Eye } from 'lucide-react';

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

  useEffect(() => {
    const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setVisibleNotes(sortedNotes.slice(0, 5));
    setShowLoadMore(sortedNotes.length > 5);
  }, [notes]);

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
    const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const newVisibleNotes = sortedNotes.slice(0, currentLength + 5);
    setVisibleNotes(newVisibleNotes);
    setShowLoadMore(newVisibleNotes.length < sortedNotes.length);
  };

  const handleShowLess = () => {
    const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setVisibleNotes(sortedNotes.slice(0, 5));
    setShowLoadMore(sortedNotes.length > 5);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <ul>
        {visibleNotes.map((note) => (
          <li key={note.id} className="mb-4 p-4 border border-gray-300 rounded-md">
            <div className="flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  {note.title || 'Untitled Note'}
                </h3>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="text-gray-600">
                <p className="text-base inline">
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
              <div className="text-xs text-gray-400 mt-2">
                {new Date(note.timestamp).toLocaleString()}
              </div>
            </div>
          </li>
        ))}
      </ul>
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
