import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from './Modal'; // Import the Modal component

interface NoteListProps {
  notes: Array<{ id: number; content: string; transcript: string; timestamp: string }>;
  onDelete: (id: number) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string>('');

  const handleDelete = async (id: number) => {
    const response = await fetch(`${process.env.API_URL}/notes/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      onDelete(id);
      toast.success('Note deleted!'); // Notify user
    } else {
      toast.error('Failed to delete note.');
    }
  };

  const handleSeeMore = (content: string) => {
    setSelectedNote(content);
    setIsModalOpen(true);
  };

  const truncateText = (text: string) => {
    const words = text.split(' ');
    return words.length > 5 ? words.slice(0, 5).join(' ') + '...' : text; // Truncate at 5th word
  };

  const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Your Notes</h2>
      <ul>
        {sortedNotes.map((note) => (
          <li key={note.id} className="mb-4 p-4 border border-gray-300 rounded-md max-h-24 overflow-hidden">
            <div className="flex justify-between">
              <div>
                <p className="text-lg inline"> {/* Changed to normal text */}
                  {truncateText(note.content)}
                </p>
                {note.content.split(' ').length > 5 && ( // Check for truncation
                  <button
                    onClick={() => handleSeeMore(note.content)}
                    className="text-blue-500 hover:underline text-xs ml-2"
                  >
                    See more
                  </button>
                )}
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} content={selectedNote} />
    </div>
  );
};

export default NoteList;
