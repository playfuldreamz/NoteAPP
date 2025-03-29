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
  const contentEditableRef = useRef<any>(null);

  return (
    <div className="flex flex-col flex-grow overflow-hidden">
      {/* Editor with fixed height and scrolling */}
      <ContentEditable
        innerRef={contentEditableRef}
        html={noteContent}
        onChange={handleContentChange}
        onPaste={handlePaste}
        tagName="div"
        disabled={false}
        className="flex-grow p-4 bg-white dark:bg-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none rounded-lg shadow-sm overflow-y-auto"
        style={{
          minHeight: "300px",
          maxHeight: "calc(100vh - 250px)", // Adjust based on header, toolbar and button heights
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(156 163 175) transparent'
        }}
      />
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
