'use client';

import { useState, useEffect } from 'react';
import { sendChatMessage, checkChatServiceHealth } from '../../../services/chatService';
import { 
  getChatSessions, 
  createChatSession, 
  deleteChatSession,
  updateChatSession,
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
import { Menu, X } from 'lucide-react'; // Import icons for menu toggle

export default function ChatPage() {
  // Chat service status
  const [isChatServiceHealthy, setIsChatServiceHealthy] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Chat sessions state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessageType[]>([]);
  
  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Initialize by loading sessions and checking service health
  useEffect(() => {
    // Load chat sessions from API
    const loadSessions = async () => {
      try {
        setIsLoading(true);
        const sessions = await getChatSessions();
        setChatSessions(sessions);
        
        // If there are sessions, set the first one as active
        // Otherwise create a new session
        if (sessions.length > 0) {
          setActiveChatId(sessions[0].id);
          setCurrentMessages(sessions[0].messages);
        } else {
          const newSession = await createChatSession();
          setChatSessions([newSession]);
          setActiveChatId(newSession.id);
          setCurrentMessages([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load chat sessions';
        console.error('Error loading chat sessions:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
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
    
    loadSessions();
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
  const handleNewChat = async () => {
    try {
      setIsLoading(true);
      const newSession = await createChatSession();
      setChatSessions(prevSessions => [newSession, ...prevSessions]);
      setActiveChatId(newSession.id);
      setCurrentMessages([]);
      setError(null);
      // Close sidebar on mobile after creating a new chat
      setIsSidebarOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create new chat';
      console.error('Error creating new chat:', err);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selecting a chat
  const handleSelectChat = async (chatId: string) => {
    try {
      const session = chatSessions.find(s => s.id === chatId);
      if (session) {
        setActiveChatId(chatId);
        setCurrentMessages(session.messages);
        setError(null);
        // Close sidebar on mobile after selecting a chat
        setIsSidebarOpen(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select chat';
      console.error('Error selecting chat:', err);
      setError(errorMessage);
    }
  };
  // Handle deleting a chat
  const handleDeleteChat = async (chatId: string) => {
    try {
      setIsLoading(true);
      await deleteChatSession(chatId);
      const updatedSessions = chatSessions.filter(s => s.id !== chatId);
      setChatSessions(updatedSessions);
      
      // If the active chat is deleted, select another one
      if (chatId === activeChatId) {
        if (updatedSessions.length > 0) {
          setActiveChatId(updatedSessions[0].id);
          setCurrentMessages(updatedSessions[0].messages);
        } else {
          // If no sessions left, create a new one
          const newSession = await createChatSession();
          setChatSessions([newSession]);
          setActiveChatId(newSession.id);
          setCurrentMessages([]);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete chat';
      console.error('Error deleting chat:', err);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle renaming a chat session
  const handleRenameChat = async (chatId: string, newTitle: string) => {
    try {
      // Find the chat session to update
      const sessionToUpdate = chatSessions.find(s => s.id === chatId);
      
      if (!sessionToUpdate) {
        toast.error('Chat session not found');
        return;
      }
      
      // Update session with new title
      const updatedSession = {
        ...sessionToUpdate,
        title: newTitle
      };
      
      // Call API to update the session
      await updateChatSession(updatedSession);
      
      // Update state
      setChatSessions(prevSessions => 
        prevSessions.map(s => s.id === chatId ? {...s, title: newTitle} : s)
      );
      
      toast.success('Chat renamed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename chat';
      console.error('Error renaming chat:', err);
      toast.error(errorMessage);
    }
  };// Handle sending a new message
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
    setIsLoading(true);
    
    try {
      const updatedSession = await addMessageToChatSession(activeChatId, userMessage);
      
      if (updatedSession) {
        // Update the sessions list with the updated session
        setChatSessions(prevSessions => 
          prevSessions.map(s => s.id === activeChatId ? updatedSession : s)
        );
      }
      
      setError(null);
      
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
      const finalUpdatedSession = await addMessageToChatSession(activeChatId, assistantMessage);
      
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

  // Toggle sidebar visibility (for mobile)
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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
  
  // Get active chat title
  const getActiveChatTitle = () => {
    const activeChat = chatSessions.find(s => s.id === activeChatId);
    return activeChat?.title || 'New Chat';
  };
    return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-10rem)] md:h-[calc(100vh-10rem)] relative">
      {/* Mobile menu toggle button */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden fixed top-2 left-2 z-50 p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-md"
        aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      
      {/* Mobile chat title (only shown when sidebar is closed) */}
      {!isSidebarOpen && (
        <div className="md:hidden fixed top-2 left-12 right-2 z-40 text-center">
          <h2 className="font-medium text-gray-700 dark:text-gray-300 truncate px-4">
            {getActiveChatTitle()}
          </h2>
        </div>
      )}
      
      {/* Chat sidebar - hidden on mobile unless toggled */}
      <div 
        className={`${
          isSidebarOpen ? 'block' : 'hidden'
        } md:block fixed md:static top-0 left-0 h-full w-full md:w-64 z-40 md:z-auto md:mr-3 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700`}
      >        <ChatSidebar
          chats={formatChatsForSidebar()}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
        />
      </div>
      
      {/* Dark overlay when mobile sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col p-2 pt-12 md:pt-2 md:pl-3 w-full h-full">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-2 sm:mb-4 border border-gray-200 dark:border-gray-700">
          {currentMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center max-w-md px-3 sm:px-6 py-4 sm:py-8">
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Chat with NoteApp Assistant</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  Start a conversation with the NoteApp Assistant. Ask questions about your notes, 
                  request summaries, or get help with general topics.
                </p>
              </div>
            </div>
          ) : (
            <ChatMessageHistory messages={currentMessages} />
          )}
        </div>
        <div className="relative px-1 pb-1 mt-auto">
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
