import React, { useRef } from 'react';
import { Copy, Save } from 'lucide-react';
import EditorToolbar from '../notes/editor/EditorToolbar';
import ContentEditable from 'react-contenteditable';

interface ContentEditorProps {
  editableContent: string;
  handleContentChange: (e: { target: { value: string } }) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  formatText: (command: string, value?: string) => void;
  saveContent: () => Promise<void>;
  handleCancelEditContent: () => void;
  handleCopyEditableContent: () => Promise<void>;
  hasEditableContent: () => boolean;
  isSaving: boolean;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  editableContent,
  handleContentChange,
  handlePaste,
  formatText,
  saveContent,
  handleCancelEditContent,
  handleCopyEditableContent,
  hasEditableContent,
  isSaving
}) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Formatting Toolbar */}
      <EditorToolbar formatText={formatText} />
      
      {/* Editor Content */}
      <div className="flex flex-col flex-grow mt-4">
        <div className="flex-grow relative">
          {hasEditableContent() && (
            <button
              onClick={handleCopyEditableContent}
              className="absolute top-2 right-2 p-2 z-10 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              title="Copy content"
            >
              <Copy size={16} />
            </button>
          )}
          <ContentEditable
            innerRef={contentEditableRef}
            html={editableContent}
            onChange={handleContentChange}
            onPaste={handlePaste}
            tagName="div"
            className="min-h-[300px] p-4 bg-white dark:bg-transparent rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-y-auto font-mono text-sm max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed"
            style={{
              minHeight: "300px",
              maxHeight: "calc(100vh - 250px)", // Adjust based on header, toolbar and button heights
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(156 163 175) transparent'
            }}
          />
        </div>
        
        {/* Save Button */}
        <div className="mt-4 flex justify-end space-x-3">
          <button 
            onClick={handleCancelEditContent}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={saveContent}
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
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default ContentEditor;
