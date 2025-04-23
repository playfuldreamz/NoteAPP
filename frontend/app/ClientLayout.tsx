'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import Sidebar from '../components/layout/Sidebar';
import MainContent from '../components/layout/MainContent';
import SettingsModal from '../components/settings/SettingsModal';
import { TagsProvider } from '../context/TagsContext';
import { TranscriptionProviderContext } from '../context/TranscriptionContext';
import { RecordingProvider } from '../context/RecordingContext';
import MinimizedRecorder from '../components/audio-recorder/MinimizedRecorder';
import MaximizedRecorderModal from '../components/audio-recorder/MaximizedRecorderModal';
import { getAIProvider, getEmbeddingProvider } from '../services/ai';
import { ThemeProvider } from '../context/ThemeContext';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [currentModel, setCurrentModel] = useState('');
  const [modelSource, setModelSource] = useState('');
  const [embeddingProvider, setEmbeddingProvider] = useState('xenova');
  const [embeddingSource, setEmbeddingSource] = useState('default');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    setIsAuthenticated(true);
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, [router]);

  // Fetch AI provider and embedding provider when authenticated or settings change
  useEffect(() => {
    if (isAuthenticated) {
      const fetchProviders = async () => {
        try {
          // Fetch both providers in parallel
          const [aiConfig, embeddingConfig] = await Promise.all([
            getAIProvider(),
            getEmbeddingProvider()
          ]);
          
          // Update AI provider state
          setCurrentModel(aiConfig.provider);
          setModelSource(aiConfig.source);
          
          // Update embedding provider state
          setEmbeddingProvider(embeddingConfig.provider);
          setEmbeddingSource(embeddingConfig.source);
        } catch (error) {
          console.error('Failed to fetch providers:', error);
        }
      };
      fetchProviders();
    }
  }, [isAuthenticated, isSettingsOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    router.push('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  const isHubPage = pathname === '/hub';

  return (
    <ThemeProvider>
      <TagsProvider>
        <TranscriptionProviderContext>
          <RecordingProvider>
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
              <Navbar
                username={username}
                currentModel={currentModel}
                modelSource={modelSource}
                embeddingProvider={embeddingProvider}
                embeddingSource={embeddingSource}
                isAuthenticated={isAuthenticated}
                onLogout={handleLogout}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
              
              <main className="flex-1 mt-16">
                <Sidebar 
                  onLogout={handleLogout}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
                <MainContent>
                  {children}
                </MainContent>
              </main>

              <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                setUsername={setUsername}
                currentModel={currentModel}
                modelSource={modelSource}
              />

              {/* Only show MinimizedRecorder when recording is active and not on /hub */}
              {!isHubPage && <MinimizedRecorder />}

              {/* MaximizedRecorderModal is conditionally rendered by its own visibility state */}
              <MaximizedRecorderModal />
            </div>
          </RecordingProvider>
        </TranscriptionProviderContext>
      </TagsProvider>
    </ThemeProvider>
  );
}
