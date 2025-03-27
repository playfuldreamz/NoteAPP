'use client'; // Ensure this is a Client Component

import React, { useState, useEffect } from 'react';
import { useRecorder } from '../../hooks/useRecorder';
import { useTranscriptionManager } from '../../hooks/useTranscriptionManager';
import { useTranscriptSaver } from '../../hooks/useTranscriptSaver';

// Import the modular components
import RecordingControls from './RecordingControls';
import RecorderSettings from './RecorderSettings';
import TranscriptionDisplay from './TranscriptionDisplay';
import RecorderActions from './RecorderActions';
import ProviderIndicator from './ProviderIndicator';

interface AudioRecorderContainerProps {
  setTranscript: React.Dispatch<React.SetStateAction<string>>; // Keep if parent needs final transcript
  updateTranscripts?: () => void; // Callback to refresh transcript list
  transcript?: string; // Existing transcript if any
}

const AudioRecorderContainer: React.FC<AudioRecorderContainerProps> = ({
  setTranscript,
  updateTranscripts,
  transcript: initialTranscript
}) => {
  // State for UI
  const [showSettings, setShowSettings] = useState(false);
  
  // Use our custom hooks
  const recorder = useRecorder({
    onRecordingStart: () => {
      // Reset any existing transcript when starting a new recording
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
    initialTranscript,
    onTranscriptUpdate: (transcript) => {
      setTranscript(transcript);
    }
  });
  
  const transcriptSaver = useTranscriptSaver({
    onSaveSuccess: () => {
      // Reset states after saving
      transcription.resetTranscript();
      if (updateTranscripts) {
        updateTranscripts();
      }
    },
    onReset: () => {
      transcription.resetTranscript();
    }
  });

  // Coordinate starting recording with transcription
  const handleStartRecording = async () => {
    if (recorder.isRecording && recorder.isPaused) {
      // Resume recording
      recorder.startRecording();
      return;
    }
    
    const started = await transcription.startTranscription();
    if (started) {
      recorder.startRecording();
    }
  };

  // Handle saving transcript
  const handleSaveTranscript = async () => {
    await transcriptSaver.saveTranscript(
      transcription.originalTranscript,
      recorder.elapsedTime,
      transcription.showEnhanced,
      transcription.enhancedTranscript
    );
  };

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <RecordingControls 
              isRecording={recorder.isRecording}
              isPaused={recorder.isPaused}
              elapsedTime={recorder.elapsedTime}
              onStart={handleStartRecording}
              onStop={recorder.stopRecording}
              onPause={recorder.pauseRecording}
            />
            <ProviderIndicator 
              toggleSettings={() => setShowSettings(!showSettings)} 
            />
          </div>
        </div>
        
        {/* Settings dropdown appears here, between controls and transcript */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showSettings ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <RecorderSettings
            showSettings={showSettings}
            toggleSettings={() => setShowSettings(!showSettings)}
          />
        </div>

        <TranscriptionDisplay
          originalTranscript={transcription.originalTranscript}
          interimTranscript=""
          enhancedTranscript={transcription.enhancedTranscript}
          showEnhanced={transcription.showEnhanced}
          isEnhancing={transcription.isEnhancing}
          enhancementProgress={0}
        />
        
        <RecorderActions
          transcript={transcription.originalTranscript}
          isRecording={recorder.isRecording}
          isEnhancing={transcription.isEnhancing}
          isSaving={transcriptSaver.isSaving}
          canEnhance={true}
          onEnhance={transcription.enhanceTranscript}
          onSave={handleSaveTranscript}
          onReset={transcriptSaver.resetTranscript}
        />
      </div>
    </div>
  );
};

export default AudioRecorderContainer;