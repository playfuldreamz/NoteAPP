'use client'; // Ensure this is a Client Component

import React, { useState, useEffect } from 'react';
import { useRecorder } from '../../hooks/useRecorder';
import { useTranscriptionManager } from '../../hooks/useTranscriptionManager';
import { useTranscriptSaver } from '../../hooks/useTranscriptSaver';
import { useTranscription } from '../../context/TranscriptionContext';

// Import the modular components
import RecordingControls from './RecordingControls';
import RecorderSettings from './RecorderSettings';
import TranscriptionDisplay from './TranscriptionDisplay';
import RecorderActions from './RecorderActions';
import ProviderIndicator from './ProviderIndicator';
import WaveformVisualizer from './WaveformVisualizer';

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
  
  // Get the current transcription provider
  const { activeProvider } = useTranscription();
  
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
      recorder.resumeRecording();
      return;
    }
    
    // Start speech recognition and recording
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
      <div className="flex flex-col">
        {/* Recording Controls */}
        <div className="flex justify-between items-center mb-4">
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
        
        {/* Waveform Visualizer - Only visible when actively recording (not paused) */}
        <div 
          style={{ 
            height: recorder.isRecording && !recorder.isPaused ? 'auto' : '0',
            overflow: 'hidden',
            marginBottom: recorder.isRecording && !recorder.isPaused ? '16px' : '0',
            transition: 'all 0.3s ease-in-out'
          }}
        >
          <div 
            className={`transition-all duration-300 ease-in-out ${recorder.isRecording && !recorder.isPaused ? 'opacity-100' : 'opacity-0'}`}
            style={{ 
              height: recorder.isRecording && !recorder.isPaused ? '75px' : '0',
              overflow: 'hidden'
            }}
          >
            <WaveformVisualizer 
              isRecording={recorder.isRecording}
              isPaused={recorder.isPaused}
              audioStream={recorder.audioStream}
              height={75}
              theme={typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}
            />
          </div>
        </div>
        
        {/* Settings dropdown */}
        <div 
          className={`transition-all duration-300 ease-in-out overflow-hidden ${showSettings ? 'opacity-100' : 'opacity-0'}`}
          style={{
            height: showSettings ? 'auto' : '0',
            marginBottom: showSettings ? '16px' : '0',
            padding: showSettings ? '0.5rem 0' : '0',
            position: 'relative',
            visibility: showSettings ? 'visible' : 'hidden'
          }}
        >
          <RecorderSettings
            showSettings={showSettings}
            toggleSettings={() => setShowSettings(!showSettings)}
          />
        </div>

        {/* Transcription Display */}
        <div className="mb-4">
          <TranscriptionDisplay
            originalTranscript={transcription.originalTranscript}
            interimTranscript=""
            enhancedTranscript={transcription.enhancedTranscript}
            showEnhanced={transcription.showEnhanced}
            isEnhancing={transcription.isEnhancing}
            enhancementProgress={0}
          />
        </div>
        
        {/* Recorder Actions */}
        <div>
          <RecorderActions
            transcript={transcription.originalTranscript}
            isRecording={recorder.isRecording}
            isEnhancing={transcription.isEnhancing}
            isSaving={transcriptSaver.isSaving}
            canEnhance={activeProvider === 'webspeech'}
            onEnhance={transcription.enhanceTranscript}
            onSave={handleSaveTranscript}
            onReset={transcriptSaver.resetTranscript}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioRecorderContainer;