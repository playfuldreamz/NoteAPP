import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Save } from 'lucide-react';
import { summarizeContent } from '../services/ai';

interface NoteSaverProps {
  transcript: string;
  onSave: () => void;
}

const NoteSaver: React.FC<NoteSaverProps> = ({ transcript, onSave }) => {
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

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
    setIsGeneratingTitle(true);
    let title = 'Untitled Note'; // Default title
    
    try {
      // Generate title using AI
      try {
        title = await summarizeContent(noteContent);
        console.log('Generated title:', title);
      } catch (error) {
        console.error('Title generation error:', error);
        toast.warning('Could not generate title. Using default title...');
      }
      
      // Save note with generated or default title
      const response = await fetch('http://localhost:5000/notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: noteContent,
          transcript: transcript,
          title: title
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save note');
      }

      toast.success('Note saved successfully!');
      setNoteContent(''); // Clear the input
      onSave(); // Refresh the notes list
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save note. Please try again');
    } finally {
      setIsSaving(false);
      setIsGeneratingTitle(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
      <textarea
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        placeholder="Write your note here..."
        className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded-md mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
        disabled={isSaving || isGeneratingTitle}
      />
      <button 
        onClick={saveNote}
        disabled={isSaving || isGeneratingTitle}
        className={`flex items-center gap-2 ${
          isSaving || isGeneratingTitle
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-green-500 hover:bg-green-600'
        } text-white px-4 py-2 rounded-md transition-colors`}
      >
        <Save size={20} />
        {isGeneratingTitle ? 'Generating Title...' : isSaving ? 'Saving...' : 'Save Note'}
      </button>
    </div>
  );
};

export default NoteSaver;
