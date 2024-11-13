import React, { useEffect, useState } from 'react';

// Define the structure of a note
interface Note {
  id: number;
  content: string;
}

const NoteList = () => {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    const fetchNotes = async () => {
      const response = await fetch('/notes');
      const data = await response.json();
      setNotes(data);
    };

    fetchNotes();
  }, []);

  const deleteNote = async (id: number) => {
    const response = await fetch(`/notes/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setNotes(notes.filter(note => note.id !== id));
    } else {
      alert('Failed to delete note.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Saved Notes</h2>
      <ul>
        {notes.map(note => (
          <li key={note.id} className="mb-4 p-4 border border-gray-300 rounded-md">
            <p className="mb-2">{note.content}</p>
            <button 
              onClick={() => deleteNote(note.id)}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NoteList;
