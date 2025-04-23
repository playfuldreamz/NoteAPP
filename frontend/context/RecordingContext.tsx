'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { useTranscriptionManager } from '../hooks/useTranscriptionManager';
import { useTranscriptSaver } from '../hooks/useTranscriptSaver';
import { toast } from 'react-toastify';
import eventBus from '../utils/eventBus';

interface RecordingContextType {
  isRecording: boolean;
  isPaused: boolean;
  elapsedTime: number;
  audioStream: MediaStream | null;
  transcript: string;
  isEnhancing: boolean;
  isSaving: boolean;
  showEnhanced: boolean;
  isMaximized: boolean;
  enhancedTranscript: string;
  transcriptTitle: string;
  isEditingTitle: boolean;
  editableTitle: string;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  saveTranscript: () => Promise<void>;
  enhanceTranscript: () => Promise<void>;
  resetRecording: () => void;
  setIsMaximized: (isMaximized: boolean) => void;
  setTranscriptTitle: (title: string) => void;
  setIsEditingTitle: (isEditing: boolean) => void;
  setEditableTitle: (title: string) => void;
  handleSaveTitle: () => void;
  handleCancelEdit: () => void;
  setUpdateTranscriptsCallback: (callback: (() => void) | null) => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [transcriptTitle, setTranscriptTitle] = useState('Untitled Transcript');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState('Untitled Transcript');
  const [updateTranscriptsCallback, setUpdateTranscriptsCallback] = useState<(() => void) | null>(null);
  
  const recorder = useRecorder({
    onRecordingStart: () => {
      if (!transcription.originalTranscript) {
        transcription.resetTranscript();
      }
    },
    onRecordingStop: () => {
      transcription.stopTranscription();
    },
    onRecordingPause: () => {
      transcription.pauseTranscription();
    },
    onRecordingResume: () => {
      transcription.resumeTranscription(transcription.originalTranscript);
    }
  });

  const transcription = useTranscriptionManager({
    onTranscriptUpdate: (transcript) => {
      // This will be used by components that need the transcript
    }
  });

  const transcriptSaver = useTranscriptSaver({
    onSaveSuccess: () => {
      transcription.resetTranscript();
      recorder.resetRecording();
    }
  });

  // Handle starting recording with transcription
  const startRecording = async () => {
    if (recorder.isRecording && recorder.isPaused) {
      recorder.resumeRecording();
      return;
    }
    
    const started = await transcription.startTranscription();
    if (started) {
      recorder.startRecording();
    }
  };

  // Handle saving transcript
  const saveTranscript = async () => {
    try {
      await transcriptSaver.saveTranscript(
        transcription.originalTranscript,
        recorder.elapsedTime,
        transcription.showEnhanced,
        transcription.enhancedTranscript,
        transcriptTitle !== 'Untitled Transcript' ? transcriptTitle : undefined
      );
      
      // Reset title after successful save
      setTranscriptTitle('Untitled Transcript');
      setEditableTitle('Untitled Transcript');
      
      // Call the update transcripts callback if it exists and is a function
      if (updateTranscriptsCallback && typeof updateTranscriptsCallback === 'function') {
        // Add a small delay to ensure the database operation is complete
        setTimeout(() => {
          updateTranscriptsCallback();
        }, 500);
      }
      
      // Emit a global event that a transcript was saved
      // This allows any component to listen for transcript saves
      setTimeout(() => {
        eventBus.emit('transcript:saved');
      }, 500);
      
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast.error('Failed to save transcript');
    }
  };

  // Handle title management
  const handleSaveTitle = () => {
    setTranscriptTitle(editableTitle);
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditableTitle(transcriptTitle);
    setIsEditingTitle(false);
  };

  const value = {
    isRecording: recorder.isRecording,
    isPaused: recorder.isPaused,
    elapsedTime: recorder.elapsedTime,
    audioStream: recorder.audioStream,
    transcript: transcription.originalTranscript,
    isEnhancing: transcription.isEnhancing,
    isSaving: transcriptSaver.isSaving,
    showEnhanced: transcription.showEnhanced,
    isMaximized,
    enhancedTranscript: transcription.enhancedTranscript,
    transcriptTitle,
    isEditingTitle,
    editableTitle,
    startRecording,
    stopRecording: recorder.stopRecording,
    pauseRecording: recorder.pauseRecording,
    resumeRecording: () => recorder.resumeRecording(),
    saveTranscript,
    enhanceTranscript: transcription.enhanceTranscript,
    resetRecording: () => {
      recorder.resetRecording();
      transcription.resetTranscript();
      setTranscriptTitle('Untitled Transcript');
      setEditableTitle('Untitled Transcript');
    },
    setIsMaximized,
    setTranscriptTitle,
    setIsEditingTitle,
    setEditableTitle,
    handleSaveTitle,
    handleCancelEdit,
    setUpdateTranscriptsCallback
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}