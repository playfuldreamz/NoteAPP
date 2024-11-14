import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface NoteSaverProps {
  transcript: string;
  onSave: () => void; // Add onSave prop
}

const NoteSaver: React.FC<NoteSaverProps> = ({ transcript, onSave }) => {
  const [noteContent, setNoteContent] = useState('');

  const saveNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Cannot save an empty note.'); // Notify user
      return;
    }

    const newNote = {
      id: Date.now(),
      content: noteContent,
      transcript: transcript,
      timestamp: new Date().toISOString(),
    };

    const updatedNotes = [...JSON.parse(localStorage.getItem('notes') || '[]'), newNote];
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    console.log('Saved note:', newNote, 'Updated notes:', updatedNotes);

    toast.success('Note saved successfully!');
    setNoteContent('');
    onSave(); // Call onSave to refresh notes list
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-4">Save Your Note</h2>
      <textarea
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        placeholder="Write your note here..."
        className="w-full h-32 p-2 border border-gray-300 rounded-md mb-4 resize-none"
      />
      <button 
        onClick={saveNote}
        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
      >
        Save Note
      </button>
    </div>
  );
};

export default NoteSaver;
