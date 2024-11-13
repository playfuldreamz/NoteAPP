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
    <div>
      <h2>Saved Notes</h2>
      <ul>
        {notes.map(note => (
          <li key={note.id}>
            <p>{note.content}</p>
            <button onClick={() => deleteNote(note.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NoteList;
