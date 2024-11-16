import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Save } from 'lucide-react';

interface NoteSaverProps {
  transcript: string;
  onSave: () => void;
}

const NoteSaver: React.FC<NoteSaverProps> = ({ transcript, onSave }) => {
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const saveNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Cannot save an empty note.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to save notes');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:5000/notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: noteContent,
          transcript: transcript
        })
      });

      if (response.ok) {
        toast.success('Note saved successfully!');
        setNoteContent(''); // Clear the input
        onSave(); // Refresh the notes list
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save note');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save note. Please try again');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <textarea
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        placeholder="Write your note here..."
        className="w-full h-32 p-2 border border-gray-300 rounded-md mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={isSaving}
      />
      <button 
        onClick={saveNote}
        disabled={isSaving}
        className={`flex items-center gap-2 ${
          isSaving 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-green-500 hover:bg-green-600'
        } text-white px-4 py-2 rounded-md transition-colors`}
      >
        <Save size={20} />
        {isSaving ? 'Saving...' : 'Save Note'}
      </button>
    </div>
  );
};

export default NoteSaver;
