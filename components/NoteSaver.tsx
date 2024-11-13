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
    <div>
      <h2>Save Your Note</h2>
      <textarea
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        placeholder="Write your note here..."
      />
      <button onClick={saveNote}>Save Note</button>
    </div>
  );
};

export default NoteSaver;
