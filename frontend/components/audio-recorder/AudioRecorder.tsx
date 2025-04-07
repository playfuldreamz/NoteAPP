'use client'; // Ensure this is a Client Component

import React from 'react';
import { Maximize2 } from 'lucide-react';
import { useRecording } from '../../context/RecordingContext';
import RecordingControls from './RecordingControls';
import RecorderSettings from './RecorderSettings';
import TranscriptionDisplay from './TranscriptionDisplay';
import RecorderActions from './RecorderActions';
import ProviderIndicator from './ProviderIndicator';
import WaveformVisualizer from './WaveformVisualizer';
import { useTranscription } from '../../context/TranscriptionContext';

interface AudioRecorderContainerProps {
  updateTranscripts?: () => void;
}

const AudioRecorderContainer: React.FC<AudioRecorderContainerProps> = ({
  updateTranscripts
}) => {
  const [showSettings, setShowSettings] = React.useState(false);
  const { activeProvider, provider } = useTranscription();
  
  const {
    isRecording,
    isPaused,
    elapsedTime,
    audioStream,
    transcript,
    isEnhancing,
    isSaving,
    showEnhanced,
    startRecording,
    stopRecording,
    pauseRecording,
    saveTranscript,
    enhanceTranscript,
    resetRecording,
    setIsMaximized
  } = useRecording();

  // Handle successful save
  React.useEffect(() => {
    if (!isSaving && updateTranscripts) {
      updateTranscripts();
    }
  }, [isSaving, updateTranscripts]);

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex flex-col">
        {/* Recording Controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <RecordingControls 
              isRecording={isRecording}
              isPaused={isPaused}
              elapsedTime={elapsedTime}
              onStart={startRecording}
              onStop={stopRecording}
              onPause={pauseRecording}
            />
            <ProviderIndicator 
              toggleSettings={() => setShowSettings(!showSettings)} 
            />
          </div>
          <button
            onClick={() => setIsMaximized(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Maximize Recorder"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
        
        {/* Waveform Visualizer */}
        <div 
          style={{ 
            height: isRecording && !isPaused ? 'auto' : '0',
            overflow: 'hidden',
            marginBottom: isRecording && !isPaused ? '16px' : '0',
            transition: 'all 0.3s ease-in-out'
          }}
        >
          <div 
            className={`transition-all duration-300 ease-in-out ${
              isRecording && !isPaused ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ height: isRecording && !isPaused ? '75px' : '0' }}
          >
            <WaveformVisualizer 
              isRecording={isRecording}
              isPaused={isPaused}
              audioStream={audioStream}
              height={75}
              theme="dark"
            />
          </div>
        </div>
        
        {/* Settings dropdown */}
        <div 
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showSettings ? 'opacity-100' : 'opacity-0'
          }`}
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
            originalTranscript={transcript}
            interimTranscript=""
            enhancedTranscript={transcript}
            showEnhanced={showEnhanced}
            isEnhancing={isEnhancing}
            enhancementProgress={0}
          />
        </div>
        
        {/* Recorder Actions */}
        <div>
          <RecorderActions
            transcript={transcript}
            isRecording={isRecording}
            isEnhancing={isEnhancing}
            isSaving={isSaving}
            canEnhance={activeProvider === 'webspeech' && provider === 'webspeech'}
            onEnhance={enhanceTranscript}
            onSave={saveTranscript}
            onReset={resetRecording}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioRecorderContainer;