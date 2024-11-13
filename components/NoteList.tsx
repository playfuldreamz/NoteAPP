import React from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface NoteListProps {
  notes: Array<{ id: number; content: string; transcript: string; timestamp: string }>;
  onDelete: (id: number) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, onDelete }) => {
  const handleDelete = async (id: number) => {
    const response = await fetch(`${process.env.API_URL}/notes/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      onDelete(id);
    } else {
      toast.error('Failed to delete note.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Your Notes</h2>
      <ul>
        {notes.map((note) => (
          <li key={note.id} className="mb-4 p-4 border border-gray-300 rounded-md">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold">{note.content}</p>
                <p className="text-sm text-gray-500">{note.transcript}</p>
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
    </div>
  );
};

export default NoteList;
