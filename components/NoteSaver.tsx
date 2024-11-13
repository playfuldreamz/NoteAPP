import React, { useState } from 'react';

interface NoteSaverProps {
  transcript: string;
}

const NoteSaver: React.FC<NoteSaverProps> = ({ transcript }) => {
  const [noteContent, setNoteContent] = useState('');

  const saveNote = async () => {
    const response = await fetch('/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: noteContent,
        transcript: transcript,
      }),
    });

    if (response.ok) {
      alert('Note saved successfully!');
      setNoteContent('');
    } else {
      alert('Failed to save note.');
    }
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
