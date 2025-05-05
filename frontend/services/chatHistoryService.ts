import { v4 as uuidv4 } from 'uuid';
import { API_BASE_URL } from '../config';

// Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'noteapp_chat_sessions';

/**
 * Get chat sessions from localStorage (fallback method)
 */
function getLocalChatSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  
  const sessionsJson = localStorage.getItem(STORAGE_KEY);
  if (!sessionsJson) return [];
  
  try {
    return JSON.parse(sessionsJson);
  } catch (e) {
    console.error('Failed to parse chat sessions from localStorage:', e);
    return [];
  }
}

/**
 * Get all chat sessions from the API
 */
export async function getChatSessions(): Promise<ChatSession[]> {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.warn('No authentication token found - reverting to localStorage');
      return getLocalChatSessions();
    }
    
    const response = await fetch(`${API_BASE_URL}/api/chat-sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Authentication failed - invalid or expired token');
        return getLocalChatSessions();
      }
      throw new Error(`Failed to fetch chat sessions: ${response.statusText}`);
    }
    
    const sessions = await response.json();
    return sessions;
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return getLocalChatSessions();
  }
}

/**
 * Save chat sessions to localStorage
 */
function saveChatSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Create a new chat session in the API
 */
export async function createChatSession(): Promise<ChatSession> {
  const newSession: ChatSession = {
    id: uuidv4(),
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };
  
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.warn('No authentication token found - saving to localStorage only');
      const localSessions = getLocalChatSessions();
      saveChatSessions([newSession, ...localSessions]);
      return newSession;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/chat-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: newSession.id,
        title: newSession.title
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create chat session: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating chat session:', error);
    // Fall back to localStorage
    const localSessions = getLocalChatSessions();
    saveChatSessions([newSession, ...localSessions]);
    return newSession;
  }
}

/**
 * Get a chat session by ID
 */
export async function getChatSession(id: string): Promise<ChatSession | null> {
  try {
    const sessions = await getChatSessions();
    return sessions.find(session => session.id === id) || null;
  } catch (error) {
    console.error('Error getting chat session:', error);
    const localSessions = getLocalChatSessions();
    return localSessions.find(session => session.id === id) || null;
  }
}

/**
 * Update a chat session
 */
export async function updateChatSession(updatedSession: ChatSession): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Fall back to localStorage
      const localSessions = getLocalChatSessions();
      const index = localSessions.findIndex(session => session.id === updatedSession.id);
      if (index !== -1) {
        localSessions[index] = {
          ...updatedSession,
          updatedAt: new Date().toISOString()
        };
        saveChatSessions(localSessions);
      }
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/chat-sessions/${updatedSession.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: updatedSession.title
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update chat session: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating chat session:', error);
    // Fall back to localStorage
    const localSessions = getLocalChatSessions();
    const index = localSessions.findIndex(session => session.id === updatedSession.id);
    if (index !== -1) {
      localSessions[index] = {
        ...updatedSession,
        updatedAt: new Date().toISOString()
      };
      saveChatSessions(localSessions);
    }
  }
}

/**
 * Auto-generate a title for a chat based on the first user message
 * Uses AI if available, falls back to using the message content directly
 */
export async function generateChatTitle(message: string): Promise<string> {
  try {
    // Try to use AI summarization
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/ai/tasks/summarize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            content: message,
            isChatTitle: true  // Indicate this is for a chat title
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.title) {
            return data.title;
          }
        }
      } catch (error) {
        console.warn('Failed to generate AI title for chat, falling back to message content', error);
        // Continue with fallback approach
      }
    }
  } catch (error) {
    console.warn('Error in generateChatTitle:', error);
  }

  // Fallback: Use the message itself (truncated if needed)
  if (message.length > 60) {
    return message.substring(0, 57) + '...';
  }
  return message;
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(id: string): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Fall back to localStorage
      const localSessions = getLocalChatSessions();
      const filteredSessions = localSessions.filter(session => session.id !== id);
      saveChatSessions(filteredSessions);
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/chat-sessions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete chat session: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting chat session:', error);
    // Fall back to localStorage
    const localSessions = getLocalChatSessions();
    const filteredSessions = localSessions.filter(session => session.id !== id);
    saveChatSessions(filteredSessions);
  }
}

/**
 * Add a message to a chat session
 */
export async function addMessageToChatSession(
  sessionId: string, 
  message: ChatMessage
): Promise<ChatSession | null> {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Fall back to localStorage
      return addMessageToLocalChatSession(sessionId, message);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/chat-sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add message to chat session: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding message to chat session:', error);
    // Fall back to localStorage
    return addMessageToLocalChatSession(sessionId, message);
  }
}

/**
 * Helper function to add a message to a local chat session
 */
async function addMessageToLocalChatSession(
  sessionId: string, 
  message: ChatMessage
): Promise<ChatSession | null> {
  const localSessions = getLocalChatSessions();
  const index = localSessions.findIndex(session => session.id === sessionId);
  
  if (index !== -1) {
    // Add message to the session
    const updatedSession = {
      ...localSessions[index],
      messages: [...localSessions[index].messages, message],
      updatedAt: new Date().toISOString()
    };
    
    // Update title if it's still "New Chat" and this is the first user message
    if (updatedSession.title === 'New Chat' && message.role === 'user' && updatedSession.messages.length <= 2) {
      updatedSession.title = await generateChatTitle(message.content);
    }
    
    localSessions[index] = updatedSession;
    saveChatSessions(localSessions);
    
    return updatedSession;
  }
  
  return null;
}
