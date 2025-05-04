'use client';

import { useState, useEffect } from 'react';
import { sendChatMessage, checkChatServiceHealth } from '../../../services/chatService';
import ChatMessageHistory from '../../../components/chat/ChatMessageHistory';
import ChatInput from '../../../components/chat/ChatInput';
import LoadingIndicator from '../../../components/chat/LoadingIndicator';
import { toast } from 'react-toastify';
import { AlertTriangle } from 'lucide-react';

type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChatServiceHealthy, setIsChatServiceHealthy] = useState<boolean | null>(null);

  // Check chat service health on page load
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const isHealthy = await checkChatServiceHealth();
        setIsChatServiceHealthy(isHealthy);
      } catch (err) {
        setIsChatServiceHealthy(false);
        console.error('Failed to check chat service health:', err);
      }
    };
    
    checkHealth();
  }, []);

  // Function to format chat history for the API
  const formatChatHistoryForAPI = (messages: ChatMessage[]) => {
    return messages.reduce((acc: [string, string][], msg, index, array) => {
      if (msg.role === 'user' && index + 1 < array.length && array[index + 1].role === 'assistant') {
        acc.push([msg.content, array[index + 1].content]);
      }
      return acc;
    }, []);
  };

  // Handle sending a new message
  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    // Add user message to state
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      // Format chat history for API (excluding the latest user message)
      const chatHistory = formatChatHistoryForAPI(messages);
      
      // Send message to backend
      const response = await sendChatMessage(message, chatHistory);
      
      // Add assistant response to state
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.final_answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(`Failed to send message: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chat with NoteApp Assistant</h1>
      
      {isChatServiceHealthy === false ? (
        <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg shadow-sm overflow-hidden mb-4 border border-red-200 dark:border-red-800 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle size={48} className="text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">Chat Service Unavailable</h2>
            <p className="text-gray-700 dark:text-gray-300 max-w-md mx-auto">
              The chat service is currently unavailable. Please try again later or contact support if the issue persists.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-4 border border-gray-200 dark:border-gray-700">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <p className="text-center max-w-md px-4">
                  Start a conversation with the NoteApp Assistant. Ask questions about your notes, 
                  request summaries, or get help with general topics.
                </p>
              </div>
            ) : (
              <ChatMessageHistory messages={messages} />
            )}
          </div>
          
          <div className="relative">
            {error && (
              <div className="absolute -top-10 left-0 right-0 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm px-4 py-2 rounded-md">
                {error}
              </div>
            )}
            
            <div className="flex items-end gap-2">
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
              {isLoading && <LoadingIndicator />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
