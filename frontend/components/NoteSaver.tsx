import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Save, Settings } from 'lucide-react';
import { summarizeContent, InvalidAPIKeyError } from '../services/ai';
import Link from 'next/link';

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
      console.log('Attempting to show empty note toast');
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
        if (error instanceof InvalidAPIKeyError) {
          toast.error(
            <div className="flex flex-col gap-2">
              <div>AI Provider API key is invalid or expired</div>
              <Link 
                href="/settings?tab=ai" 
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                <Settings size={14} />
                Update API Key in Settings
              </Link>
            </div>,
            { autoClose: false, closeOnClick: false }
          );
        } else {
          toast.warning('Could not generate title. Using default title...');
        }
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

      console.log('Attempting to show success toast');
      toast.success('Note saved successfully!');
      setNoteContent(''); // Clear the input
      onSave(); // Refresh the notes list
    } catch (error) {
      console.error('Save error:', error);
      console.log('Attempting to show error toast');
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
        className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
          isSaving || isGeneratingTitle
            ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-50 dark:text-emerald-200 cursor-not-allowed'
            : 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 hover:shadow-md active:scale-[0.98]'
        } w-full sm:w-auto`}
      >
        <Save size={20} />
        {isGeneratingTitle ? 'Generating Title...' : isSaving ? 'Saving...' : 'Save Note'}
      </button>
    </div>
  );
};

export default NoteSaver;
