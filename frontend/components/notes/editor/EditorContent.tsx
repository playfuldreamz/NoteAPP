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
  const contentEditableRef = useRef<any>(null);
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
    <div className="flex flex-col flex-grow overflow-hidden">
      {/* Editor with fixed height and scrolling */}
      <div className="relative">
        {hasContent() && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors z-10"
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
          className="flex-grow p-4 bg-white dark:bg-gray-800 dark:text-gray-200 font-mono text-sm max-w-none rounded-lg shadow-sm overflow-y-auto"
          style={{
            minHeight: "300px",
            maxHeight: "calc(100vh - 250px)", // Adjust based on header, toolbar and button heights
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(156 163 175) transparent'
          }}
        />
      </div>
      {/* Save button in sticky container at bottom */}
      <div className="sticky bottom-0 pt-4 bg-white dark:bg-gray-900 z-10">
        <button 
          onClick={saveNote}
          disabled={isSaving}
          className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all focus:outline-none ${
            isSaving
              ? 'bg-blue-200 dark:bg-blue-900 text-blue-50 dark:text-blue-200 cursor-not-allowed'
              : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-md active:scale-[0.98]'
          }`}
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Note'}
        </button>
      </div>
    </div>
  );
};

export default EditorContent;
