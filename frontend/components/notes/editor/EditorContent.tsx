import React, { useRef } from 'react';
import ContentEditable from 'react-contenteditable';
import { Save } from 'lucide-react';

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

  return (
    <div className="flex flex-col flex-grow">
      <div className="flex-grow relative">
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
