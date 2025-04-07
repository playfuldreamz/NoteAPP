'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { useTranscriptionManager } from '../hooks/useTranscriptionManager';
import { useTranscriptSaver } from '../hooks/useTranscriptSaver';
import { toast } from 'react-toastify';

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
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  saveTranscript: () => Promise<void>;
  enhanceTranscript: () => Promise<void>;
  resetRecording: () => void;
  setIsMaximized: (isMaximized: boolean) => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [isMaximized, setIsMaximized] = useState(false);
  
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
        transcription.enhancedTranscript
      );
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast.error('Failed to save transcript');
    }
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
    startRecording,
    stopRecording: recorder.stopRecording,
    pauseRecording: recorder.pauseRecording,
    resumeRecording: () => recorder.resumeRecording(),
    saveTranscript,
    enhanceTranscript: transcription.enhanceTranscript,
    resetRecording: () => {
      recorder.resetRecording();
      transcription.resetTranscript();
    },
    setIsMaximized
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