import React, { useRef, useState } from 'react';
import ContentEditable from 'react-contenteditable';
import { Save, Copy, Check } from 'lucide-react';
import { toast } from 'react-toastify';

interface EditorContentProps {
  noteContent: string;
  isSaving: boolean;
  handleContentChange: (e: React.FormEvent<HTMLDivElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  saveNote: () => void;
}

const EditorContent: React.FC<EditorContentProps> = ({
  noteContent,
  isSaving,
  handleContentChange,
  handlePaste,
  saveNote
}) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Function to check if there's actual content to copy
  const hasContent = () => {
    // Create a temporary div to extract text from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteContent;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.trim().length > 0;
  };

  // Handle copy functionality
  const handleCopy = async () => {
    try {
      // Create a temporary div to extract text from HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = noteContent;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success('Content copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
      toast.error('Failed to copy content');
    }
  };

  return (
    <div className="flex flex-col flex-grow">
      <div className="flex-grow relative">
        {hasContent() && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-2 z-10 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            title="Copy content"
          >
            {isCopied ? (
              <Check size={16} className="text-green-500" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        )}
        <ContentEditable
          innerRef={contentEditableRef}
          html={noteContent}
          onChange={handleContentChange}
          onPaste={handlePaste}
          tagName="div"
          disabled={false}
          className="min-h-[300px] p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-y-auto font-mono text-sm max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed"
          style={{
            minHeight: "300px",
            maxHeight: "calc(100vh - 250px)", // Adjust based on header, toolbar and button heights
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(156 163 175) transparent'
          }}
        />
      </div>
      
      <div className="mt-4 flex justify-end">
        <button 
          onClick={saveNote}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Note
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EditorContent;
