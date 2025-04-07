'use client';

import React from 'react';
import { Minimize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecording } from '../../context/RecordingContext';
import RecordingControls from './RecordingControls';
import WaveformVisualizer from './WaveformVisualizer';
import TranscriptionDisplay from './TranscriptionDisplay';
import RecorderActions from './RecorderActions';
import RecorderSettings from './RecorderSettings';
import ProviderIndicator from './ProviderIndicator';
import { useTranscription } from '../../context/TranscriptionContext';

const MaximizedRecorderModal: React.FC = () => {
  const {
    isRecording,
    isPaused,
    elapsedTime,
    audioStream,
    transcript,
    isEnhancing,
    isSaving,
    showEnhanced,
    isMaximized,
    startRecording,
    stopRecording,
    pauseRecording,
    saveTranscript,
    enhanceTranscript,
    resetRecording,
    setIsMaximized
  } = useRecording();

  const { activeProvider, provider } = useTranscription();
  const [showSettings, setShowSettings] = React.useState(false);

  if (!isMaximized) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="fixed inset-4 md:inset-10 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-auto"
        >
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold dark:text-gray-100">Voice Recorder</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMaximized(false)}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="Minimize Recorder"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={stopRecording}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="Close Recorder"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex justify-between items-center">
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
            </div>

            {/* Waveform Visualizer */}
            <div 
              style={{ 
                height: isRecording && !isPaused ? 'auto' : '0',
                overflow: 'hidden',
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

            {/* Settings */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                showSettings ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                height: showSettings ? 'auto' : '0',
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MaximizedRecorderModal;