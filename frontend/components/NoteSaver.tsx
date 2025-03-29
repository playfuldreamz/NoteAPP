import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Save, Settings, Maximize2 } from 'lucide-react';
import { summarizeContent, InvalidAPIKeyError } from '../services/ai';
import SettingsModal from './settings/SettingsModal';
import NoteEditorModal from './notes/NoteEditorModal';

interface NoteSaverProps {
  transcript: string;
  onSave: () => void;
}

const NoteSaver: React.FC<NoteSaverProps> = ({ transcript, onSave }) => {
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExpandedEditor, setShowExpandedEditor] = useState(false);

  // Maximum content size to try if we get a payload too large error
  const MAX_FALLBACK_CONTENT_SIZE = 100000; // ~100KB

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
              <button
                onClick={() => setShowSettings(true)}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                <Settings size={14} />
                Update API Key in Settings
              </button>
            </div>,
            { autoClose: false, closeOnClick: false }
          );
        } else {
          toast.warning('Could not generate title. Using default title...');
        }
      }
      
      // Save note with generated or default title
      try {
        const response = await fetch('http://localhost:5000/api/notes', {
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

        if (!response.ok) {
          // Check if it's a payload too large error
          if (response.status === 413) {
            throw new Error('PAYLOAD_TOO_LARGE');
          }
          const data = await response.json();
          throw new Error(data.error || 'Failed to save note');
        }

        const data = await response.json();
        console.log('Attempting to show success toast');
        toast.success('Note saved successfully!');
        setNoteContent(''); // Clear the input
        onSave(); // Refresh the notes list
      } catch (error) {
        // Handle payload too large error with a fallback approach
        if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
          console.warn('Payload too large, attempting to save with reduced content...');
          toast.info('Note is very large, attempting to save with a simplified format...');
          
          // Try saving with just the content and a default title
          try {
            // Truncate content if it's extremely large
            let truncatedContent = noteContent;
            if (noteContent.length > MAX_FALLBACK_CONTENT_SIZE) {
              truncatedContent = noteContent.substring(0, MAX_FALLBACK_CONTENT_SIZE) + 
                "\n\n[Note was truncated due to size limitations]";
            }
            
            const fallbackResponse = await fetch('http://localhost:5000/api/notes', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: truncatedContent,
                title: 'Untitled Large Note'
              })
            });

            if (!fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              throw new Error(fallbackData.error || 'Failed to save note even with reduced content');
            }

            console.log('Saved note with fallback approach');
            toast.success('Note saved successfully with simplified format!');
            setNoteContent(''); // Clear the input
            onSave(); // Refresh the notes list
          } catch (fallbackError) {
            console.error('Fallback save error:', fallbackError);
            toast.error('Failed to save note even with reduced size. Please try with less content.');
          }
        } else {
          // Handle other errors
          console.error('Save error:', error);
          console.log('Attempting to show error toast');
          toast.error('Failed to save note. Please try again');
        }
      }
    } catch (error) {
      console.error('Overall save error:', error);
      toast.error('Failed to save note. Please try again');
    } finally {
      setIsSaving(false);
      setIsGeneratingTitle(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8 relative">
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Write your note here..."
          className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded-md mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
          disabled={isSaving || isGeneratingTitle}
        />
        <div className="flex justify-between items-center">
          <button 
            onClick={saveNote}
            disabled={isSaving || isGeneratingTitle}
            className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
              isSaving || isGeneratingTitle
                ? 'bg-blue-200 dark:bg-blue-900 text-blue-50 dark:text-blue-200 cursor-not-allowed'
                : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-md active:scale-[0.98]'
            } w-full sm:w-auto`}
          >
            <Save size={20} />
            {isGeneratingTitle ? 'Generating Title...' : isSaving ? 'Saving...' : 'Save Note'}
          </button>
          <button
            onClick={() => setShowExpandedEditor(true)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            title="Expand editor"
          >
            <Maximize2 size={20} />
          </button>
        </div>
      </div>
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        setUsername={() => {}}
        currentModel=""
        modelSource=""
      />
      <NoteEditorModal
        isOpen={showExpandedEditor}
        onClose={() => setShowExpandedEditor(false)}
        initialContent={noteContent}
        transcript={transcript}
        onSave={() => {
          onSave();
          setNoteContent('');
          setShowExpandedEditor(false);
        }}
        onContentChange={(htmlContent) => {
          // Convert HTML content back to plain text for the textarea
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          
          // Process the content to extract plain text with proper line breaks
          const processNode = (node: Node): string => {
            let result = '';
            
            if (node.nodeType === Node.TEXT_NODE) {
              result += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // Handle different element types
              if (node.nodeName === 'BR') {
                result += '\n';
              } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
                // For block elements, add a newline if needed
                if (result && !result.endsWith('\n') && node.previousSibling) {
                  result += '\n';
                }
                
                // Process all child nodes
                for (let i = 0; i < node.childNodes.length; i++) {
                  result += processNode(node.childNodes[i]);
                }
                
                // Add a newline after block elements if they have content
                if (node.childNodes.length > 0 && !result.endsWith('\n') && node.nextSibling) {
                  result += '\n';
                }
              } else {
                // For other elements, just process their children
                for (let i = 0; i < node.childNodes.length; i++) {
                  result += processNode(node.childNodes[i]);
                }
              }
            }
            
            return result;
          };
          
          let plainText = processNode(tempDiv);
          
          // Normalize newlines - replace multiple consecutive newlines with a maximum of two
          plainText = plainText.replace(/\n{3,}/g, '\n\n');
          
          // Trim leading/trailing whitespace
          plainText = plainText.trim();
          
          // Update the textarea content
          setNoteContent(plainText);
        }}
      />
    </>
  );
};

export default NoteSaver;
