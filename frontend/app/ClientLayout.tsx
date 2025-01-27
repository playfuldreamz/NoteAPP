"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import Sidebar from '../components/layout/Sidebar';
import MainContent from '../components/layout/MainContent';
import SettingsModal from '../components/SettingsModal';
import { TagsProvider } from '../context/TagsContext';
import { TranscriptionProviderContext } from '../context/TranscriptionContext';
import { getAIProvider } from '../services/ai';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [currentModel, setCurrentModel] = useState('');
  const [modelSource, setModelSource] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const router = useRouter();

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

  // Fetch AI provider when authenticated or settings change
  useEffect(() => {
    if (isAuthenticated) {
      const fetchAIProvider = async () => {
        try {
          const config = await getAIProvider();
          setCurrentModel(config.provider);
          setModelSource(config.source);
        } catch (error) {
          console.error('Failed to fetch AI provider:', error);
          // Don't show error toast as this is not critical for user experience
        }
      };
      fetchAIProvider();
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

  return (
    <TagsProvider>
      <TranscriptionProviderContext>
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <Navbar
            username={username}
            currentModel={currentModel}
            modelSource={modelSource}
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
        </div>
      </TranscriptionProviderContext>
    </TagsProvider>
  );
}
