'use client';

import React, { createContext, useContext, useState } from 'react';
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
    onTranscriptUpdate: () => {
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
    // --- Resume Logic (remains the same) ---
    if (recorder.isRecording && recorder.isPaused) {
      console.log("Resuming recording...");
      const streamToResume = await recorder.startRecording(selectedProvider === 'realtimestt');

      if (selectedProvider === 'realtimestt' && !streamToResume) {
          console.error("Failed to get existing stream on resume for RealtimeSTT.");
          toast.error("Failed to resume RealtimeSTT stream.");
          return;
      }

      console.log(`Resuming transcription for ${selectedProvider}. Passing stream: ${!!streamToResume}`);
      transcription.resumeTranscription(transcription.originalTranscript, streamToResume ?? undefined);
      return;
    }

    // --- Start New Recording Logic ---
    console.log(`Attempting to start new recording with provider: ${selectedProvider}`);
    let streamForTranscription: MediaStream | null = null;
    let recorderStarted = false; // Flag to track if recorder UI/timer was started
    let transcriptionSuccessfullyStarted = false; // Flag for cleanup

    try {
      // If using RealtimeSTT, start recorder first to get the stream
      if (selectedProvider === 'realtimestt') {
        console.log("Starting recorder to get stream for RealtimeSTT...");
        streamForTranscription = await recorder.startRecording(true); // Manage stream

        if (!streamForTranscription) {
          toast.error("Failed to get microphone stream for RealtimeSTT.");
          return; // Exit early if stream fails
        }
        recorderStarted = true; // Recorder is managing the stream
        console.log("Recorder started, stream obtained for RealtimeSTT:", streamForTranscription);

        // Now start transcription with the obtained stream
        console.log(`Starting transcription provider: ${selectedProvider}...`);
        transcriptionSuccessfullyStarted = await transcription.startTranscription(streamForTranscription);

        if (!transcriptionSuccessfullyStarted) {
          toast.error(`Failed to start ${selectedProvider} transcription.`);
          // Recorder was started, so stop it
          recorder.stopRecording();
          return;
        }
        console.log("RealtimeSTT recording and transcription successfully started.");

      } else {
        // For other providers (WebSpeech, AssemblyAI, Deepgram, etc.)
        // Start transcription provider FIRST to check prerequisites (like API keys)
        console.log(`Attempting to start transcription provider: ${selectedProvider}...`);
        // Pass undefined for stream initially; WebSpeech handles this, others check config
        transcriptionSuccessfullyStarted = await transcription.startTranscription(undefined);

        if (!transcriptionSuccessfullyStarted) {
          // If transcription failed (e.g., missing API key), the provider should show a toast.
          console.log(`Transcription provider ${selectedProvider} failed to start (e.g., missing API key). Recorder UI will not start.`);
          // No need to call recorder.stopRecording() as it hasn't started yet.
          return; // Exit before starting recorder UI
        }

        // If transcription provider initialized successfully, THEN start the recorder UI/timer
        console.log(`Transcription provider ${selectedProvider} started. Now starting recorder UI/timer...`);
        const recorderResult = await recorder.startRecording(false); // Start UI/timer only

        // Check if recorder UI started successfully (expecting null for manageStream=false)
        if (recorderResult === null) {
             recorderStarted = true; // UI/Timer started successfully
             console.log(`Recorder UI/timer started for ${selectedProvider}.`);
        } else {
             // If recorder failed to start even for UI state (unexpected)
             toast.error("Failed to initialize recorder state.");
             // Need to stop the transcription provider since it successfully started but recorder failed
             transcription.stopTranscription();
             transcriptionSuccessfullyStarted = false; // Update flag for cleanup block
             return;
        }
        console.log(`${selectedProvider} recording and transcription successfully started.`);
      }

    } catch (error) {
      console.error("Error during startRecording:", error);
      toast.error(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
      // Clean up if necessary
      if (recorderStarted) {
        recorder.stopRecording();
      }
      // Ensure transcription is stopped if it started before an error occurred
      if (transcriptionSuccessfullyStarted) {
          transcription.stopTranscription();
      }
    }
  };

  // --- Adjusted Pause/Resume/Stop handlers ---

  const stopRecording = () => {
    console.log("Context: stopRecording called.");
    if (recorder.isRecording) {
        recorder.stopRecording(); // Stops recorder state, timer, and stream (if managed)
        transcription.stopTranscription(); // Ensure transcription provider is stopped
        console.log("Context: Recorder and Transcription stopped.");
    } else {
        console.log("Context: Stop called but recorder wasn't active.");
    }
  };

  const pauseRecording = () => {
    console.log("Context: pauseRecording called.");
    if (recorder.isRecording && !recorder.isPaused) {
        recorder.pauseRecording(); // Pauses recorder state and timer
        transcription.pauseTranscription(); // Signal transcription provider to pause
        console.log("Context: Recorder and Transcription paused.");
    }
  };

  const resumeRecording = () => {
     // The main logic is now handled within startRecording when isPaused is true
     console.log("Attempting to resume via startRecording...");
     startRecording();
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