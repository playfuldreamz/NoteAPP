import { v4 as uuidv4 } from 'uuid';

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
 * Get all chat sessions from localStorage
 */
export function getChatSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  
  const sessionsJson = localStorage.getItem(STORAGE_KEY);
  if (!sessionsJson) return [];
  
  try {
    return JSON.parse(sessionsJson);
  } catch (e) {
    console.error('Failed to parse chat sessions:', e);
    return [];
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
 * Create a new chat session
 */
export function createChatSession(): ChatSession {
  const newSession: ChatSession = {
    id: uuidv4(),
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };
  
  const sessions = getChatSessions();
  saveChatSessions([newSession, ...sessions]);
  
  return newSession;
}

/**
 * Get a chat session by ID
 */
export function getChatSession(id: string): ChatSession | null {
  const sessions = getChatSessions();
  return sessions.find(session => session.id === id) || null;
}

/**
 * Update a chat session
 */
export function updateChatSession(updatedSession: ChatSession): void {
  const sessions = getChatSessions();
  const index = sessions.findIndex(session => session.id === updatedSession.id);
  
  if (index !== -1) {
    // Update the session with the new data and updated timestamp
    sessions[index] = {
      ...updatedSession,
      updatedAt: new Date().toISOString()
    };
    
    saveChatSessions(sessions);
  }
}

/**
 * Auto-generate a title for a chat based on the first user message
 */
export function generateChatTitle(message: string): string {
  // Truncate message if it's too long
  if (message.length > 60) {
    return message.substring(0, 57) + '...';
  }
  return message;
}

/**
 * Delete a chat session
 */
export function deleteChatSession(id: string): void {
  const sessions = getChatSessions();
  const filteredSessions = sessions.filter(session => session.id !== id);
  saveChatSessions(filteredSessions);
}

/**
 * Add a message to a chat session
 */
export function addMessageToChatSession(
  sessionId: string, 
  message: ChatMessage
): ChatSession | null {
  const sessions = getChatSessions();
  const index = sessions.findIndex(session => session.id === sessionId);
  
  if (index !== -1) {
    // Add message to the session
    const updatedSession = {
      ...sessions[index],
      messages: [...sessions[index].messages, message],
      updatedAt: new Date().toISOString()
    };
    
    // Update title if it's still "New Chat" and this is the first user message
    if (updatedSession.title === 'New Chat' && message.role === 'user' && updatedSession.messages.length <= 2) {
      updatedSession.title = generateChatTitle(message.content);
    }
    
    sessions[index] = updatedSession;
    saveChatSessions(sessions);
    
    return updatedSession;
  }
  
  return null;
}
