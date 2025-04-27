'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { useTranscriptionManager } from '../hooks/useTranscriptionManager';
import { useTranscriptSaver } from '../hooks/useTranscriptSaver';
import { toast } from 'react-toastify';
import eventBus from '../utils/eventBus';
import { useTranscription } from '../context/TranscriptionContext';

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

  const { provider: selectedProvider } = useTranscription(); // Get selected provider

  // Handle starting recording with transcription
  const startRecording = async () => {
    // --- Resume Logic ---
    if (recorder.isRecording && recorder.isPaused) {
      console.log("Resuming recording...");
      // Call startRecording to handle resume logic internally (including timer)
      // It should return the existing stream if manageStream=true was used initially
      const streamToResume = await recorder.startRecording(selectedProvider === 'realtimestt');

      if (selectedProvider === 'realtimestt' && !streamToResume) {
          console.error("Failed to get existing stream on resume for RealtimeSTT.");
          toast.error("Failed to resume RealtimeSTT stream.");
          // Optionally stop if resume fails critically
          // recorder.stopRecording();
          // transcription.stopTranscription();
          return;
      }

      console.log(`Resuming transcription for ${selectedProvider}. Passing stream: ${!!streamToResume}`);
      // Resume transcription provider, passing the stream if needed
      transcription.resumeTranscription(transcription.originalTranscript, streamToResume ?? undefined);
      return;
    }

    // --- Start New Recording Logic ---
    console.log(`Attempting to start new recording with provider: ${selectedProvider}`);
    let streamForTranscription: MediaStream | null = null; // Use null initially
    let recorderStarted = false;

    try {
      // If using RealtimeSTT, the recorder MUST manage the stream and return it
      if (selectedProvider === 'realtimestt') {
        console.log("Starting recorder to get stream for RealtimeSTT...");
        // Capture the stream directly from the promise result
        streamForTranscription = await recorder.startRecording(true);

        if (!streamForTranscription) {
          // If recorder failed (e.g., permissions denied or other error)
          toast.error("Failed to get microphone stream for RealtimeSTT.");
          // Ensure recorder state is stopped if it partially started
          if (recorder.isRecording) recorder.stopRecording();
          return;
        }

        recorderStarted = true; // Recorder is managing the stream
        console.log("Recorder started, stream obtained for RealtimeSTT:", streamForTranscription);

      } else {
        // For other providers (like WebSpeech), start recorder WITHOUT managing the stream (UI/timer only).
        // It will return null as no stream was acquired.
        console.log(`Starting recorder UI/timer for ${selectedProvider}...`);
        const recorderSuccess = await recorder.startRecording(false); // Returns null

         if (!recorderSuccess === null) { // Check if it explicitly returned null (success for manageStream=false)
             // If recorder failed to start even for UI state (unexpected)
             toast.error("Failed to initialize recorder state.");
             // Clean up recorder if it was started during a failed attempt
             if (recorder.isRecording) recorder.stopRecording();
             return;
         }
        recorderStarted = true; // UI/Timer started successfully
        console.log(`Recorder UI/timer started for ${selectedProvider}.`);
      }

      // Now start the transcription provider
      console.log(`Starting transcription provider: ${selectedProvider}...`);
      // Pass the stream ONLY if it's realtimestt and we successfully got it
      const transcriptionStarted = await transcription.startTranscription(
        streamForTranscription ?? undefined // Pass the captured stream or undefined
      );

      if (!transcriptionStarted) {
        toast.error(`Failed to start ${selectedProvider} transcription.`);
        // If transcription failed, stop the recorder if it was started
        if (recorderStarted) {
          recorder.stopRecording(); // This will also stop the stream tracks via the hook's stopRecording
        }
        return;
      }

      console.log("Recording and transcription successfully started.");

    } catch (error) {
      console.error("Error during startRecording:", error);
      toast.error(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
      // Clean up recorder if it was started during a failed attempt
      if (recorderStarted) {
        recorder.stopRecording();
      }
    }
  };

  // --- Adjusted Pause/Resume/Stop handlers ---

  const pauseRecording = () => {
    console.log("Pausing recording...");
    recorder.pauseRecording(); // Pause recorder timer/state
    // Also pause transcription provider
    transcription.pauseTranscription();
    console.log("Recording paused.");
  };

  const resumeRecording = () => {
     // The main logic is now handled within startRecording when isPaused is true
     console.log("Attempting to resume via startRecording...");
     startRecording();
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    recorder.stopRecording(); // Stops recorder state/timer AND calls its onRecordingStop callback
    // The onRecordingStop callback in useRecorder setup already calls transcription.stopTranscription()
    console.log("Recording stopped via recorder.stopRecording().");
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
    audioStream: recorder.audioStream, // Still expose the stream if needed elsewhere
    transcript: transcription.originalTranscript,
    isEnhancing: transcription.isEnhancing,
    isSaving: transcriptSaver.isSaving,
    showEnhanced: transcription.showEnhanced,
    isMaximized,
    enhancedTranscript: transcription.enhancedTranscript,
    transcriptTitle,
    isEditingTitle,
    editableTitle,
    startRecording, // Use the new startRecording
    stopRecording, // Use the new stopRecording
    pauseRecording, // Use the new pauseRecording
    resumeRecording, // Use the new resumeRecording
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