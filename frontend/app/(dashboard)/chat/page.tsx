'use client';

import { useState, useEffect } from 'react';
import { sendChatMessage, checkChatServiceHealth } from '../../../services/chatService';
import { 
  getChatSessions, 
  createChatSession, 
  deleteChatSession, 
  addMessageToChatSession,
  ChatMessage as ChatMessageType,
  ChatSession
} from '../../../services/chatHistoryService';
import ChatSidebar from '../../../components/chat/ChatSidebar';
import ChatMessageHistory from '../../../components/chat/ChatMessageHistory';
import ChatInput from '../../../components/chat/ChatInput';
import LoadingIndicator from '../../../components/chat/LoadingIndicator';
import StatusAlert from '../../../components/chat/StatusAlert';
import { toast } from 'react-toastify';

export default function ChatPage() {
  // Chat service status
  const [isChatServiceHealthy, setIsChatServiceHealthy] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Chat sessions state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessageType[]>([]);

  // Initialize by loading sessions and checking service health
  useEffect(() => {
    // Load chat sessions from localStorage
    const sessions = getChatSessions();
    setChatSessions(sessions);
    
    // If there are sessions, set the first one as active
    // Otherwise create a new session
    if (sessions.length > 0) {
      setActiveChatId(sessions[0].id);
      setCurrentMessages(sessions[0].messages);
    } else {
      const newSession = createChatSession();
      setChatSessions([newSession]);
      setActiveChatId(newSession.id);
      setCurrentMessages([]);
    }
    
    // Check chat service health
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
  const formatChatHistoryForAPI = (messages: ChatMessageType[]) => {
    return messages.reduce((acc: [string, string][], msg, index, array) => {
      if (msg.role === 'user' && index + 1 < array.length && array[index + 1].role === 'assistant') {
        acc.push([msg.content, array[index + 1].content]);
      }
      return acc;
    }, []);
  };

  // Handle creating a new chat
  const handleNewChat = () => {
    const newSession = createChatSession();
    setChatSessions(prevSessions => [newSession, ...prevSessions]);
    setActiveChatId(newSession.id);
    setCurrentMessages([]);
    setError(null);
  };

  // Handle selecting a chat
  const handleSelectChat = (chatId: string) => {
    const session = chatSessions.find(s => s.id === chatId);
    if (session) {
      setActiveChatId(chatId);
      setCurrentMessages(session.messages);
      setError(null);
    }
  };

  // Handle deleting a chat
  const handleDeleteChat = (chatId: string) => {
    deleteChatSession(chatId);
    const updatedSessions = chatSessions.filter(s => s.id !== chatId);
    setChatSessions(updatedSessions);
    
    // If the active chat is deleted, select another one
    if (chatId === activeChatId) {
      if (updatedSessions.length > 0) {
        setActiveChatId(updatedSessions[0].id);
        setCurrentMessages(updatedSessions[0].messages);
      } else {
        // If no sessions left, create a new one
        const newSession = createChatSession();
        setChatSessions([newSession]);
        setActiveChatId(newSession.id);
        setCurrentMessages([]);
      }
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !activeChatId) return;
    if (!isChatServiceHealthy) {
      toast.error('Chat service is unavailable. Please try again later.');
      return;
    }
    
    // Add user message to state
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: ChatMessageType = {
      role: 'user',
      content: message,
      timestamp
    };
    
    const updatedMessages = [...currentMessages, userMessage];
    setCurrentMessages(updatedMessages);
    
    // Add message to the chat session
    const updatedSession = addMessageToChatSession(activeChatId, userMessage);
    if (updatedSession) {
      // Update the sessions list with the updated session
      setChatSessions(prevSessions => 
        prevSessions.map(s => s.id === activeChatId ? updatedSession : s)
      );
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Format chat history for API (excluding the latest user message)
      const chatHistory = formatChatHistoryForAPI(currentMessages);
      
      // Send message to backend
      const response = await sendChatMessage(message, chatHistory);
      
      // Add assistant response to state
      const assistantMessage: ChatMessageType = {
        role: 'assistant',
        content: response.final_answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const messagesWithResponse = [...updatedMessages, assistantMessage];
      setCurrentMessages(messagesWithResponse);
      
      // Add assistant message to the chat session
      const finalUpdatedSession = addMessageToChatSession(activeChatId, assistantMessage);
      if (finalUpdatedSession) {
        setChatSessions(prevSessions => 
          prevSessions.map(s => s.id === activeChatId ? finalUpdatedSession : s)
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(`Failed to send message: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Format chat data for sidebar display
  const formatChatsForSidebar = () => {
    return chatSessions.map(session => ({
      id: session.id,
      title: session.title,
      timestamp: new Date(session.updatedAt).toLocaleDateString(),
      messageCount: session.messages.length
    }));
  };

  return (
    <div className="flex h-[calc(100vh-10rem)]">
      {/* Chat sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700">
        <ChatSidebar
          chats={formatChatsForSidebar()}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
        />
      </div>
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-4 border border-gray-200 dark:border-gray-700">
          {currentMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center max-w-md px-4">
                <h3 className="text-xl font-semibold mb-2">Chat with NoteApp Assistant</h3>
                <p>
                  Start a conversation with the NoteApp Assistant. Ask questions about your notes, 
                  request summaries, or get help with general topics.
                </p>
              </div>
            </div>
          ) : (
            <ChatMessageHistory messages={currentMessages} />
          )}
        </div>
        
        <div className="relative">
          {/* Service status alert */}
          {isChatServiceHealthy === false && (
            <StatusAlert 
              message="The chat service is currently unavailable. Please try again later." 
              type="error"
            />
          )}
          
          {/* Error alert */}
          {error && (
            <StatusAlert
              message={error}
              type="warning"
            />
          )}
          
          <div className="flex items-end gap-2">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading}
              disabled={isChatServiceHealthy === false}
            />
            {isLoading && <LoadingIndicator />}
          </div>
        </div>
      </div>
    </div>
  );
}
