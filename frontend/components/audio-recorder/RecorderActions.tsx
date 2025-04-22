import React, { useState } from 'react';
import { RefreshCw, Save, RotateCcw, Loader } from 'lucide-react';
import ConfirmationPopover from '../shared/ConfirmationPopover';

interface RecorderActionsProps {
  transcript: string;
  isRecording: boolean;
  isEnhancing: boolean;
  isSaving: boolean;
  canEnhance: boolean; // Prop to determine if enhance button should be shown/enabled
  onEnhance: () => void;
  onSave: () => void;
  onReset: () => void;
}

const RecorderActions: React.FC<RecorderActionsProps> = ({
  transcript,
  isRecording,
  isEnhancing,
  isSaving,
  canEnhance,
  onEnhance,
  onSave,
  onReset,
}) => {
  const hasContent = transcript.trim().length > 0;
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {canEnhance && (
          <button
            onClick={onEnhance}
            className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-all ${
              !hasContent || isEnhancing || isRecording || isSaving
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 active:scale-[0.98]'
            }`}
            disabled={!hasContent || isEnhancing || isRecording || isSaving}
            title={hasContent ? 'Enhance transcript using AI' : 'No transcript to enhance'}
          >
            {isEnhancing ? (
              <>
                <Loader size={16} className="shrink-0 animate-spin" />
                <span>Enhancing...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} className="shrink-0" />
                <span>Enhance</span>
              </>
            )}
          </button>
      )}
      <button
        onClick={onSave}
        className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-all ${
          !hasContent || isSaving || isRecording || isEnhancing
            ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-[0.98]'
        }`}
        disabled={!hasContent || isSaving || isRecording || isEnhancing}
        title={hasContent ? 'Save transcript' : 'No transcript to save'}
      >
        {isSaving ? (
          <Loader size={16} className="shrink-0 animate-spin" />
        ) : (
          <Save size={16} className="shrink-0" />
        )}
        <span>{isSaving ? 'Saving...' : 'Save'}</span>
      </button>

      {showResetConfirm ? (
        <ConfirmationPopover
          isOpen={true}
          message="This will clear your current transcript. Are you sure you want to reset?"
          onConfirm={() => {
            onReset();
            setShowResetConfirm(false);
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      ) : (
        <button
          onClick={() => setShowResetConfirm(true)}
          className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-all ${
            isRecording
              ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-[0.98]'
          }`}
          disabled={isRecording}
          title="Reset transcript and timer"
        >
          <RotateCcw size={16} className="shrink-0" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
};

export default RecorderActions;