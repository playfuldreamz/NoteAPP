import { API_BASE_URL } from '../config';

/**
 * Send a chat message to the backend
 * @param userInput The user's message
 * @param chatHistory The previous chat history for context
 * @returns The response from the chat service
 */
export async function sendChatMessage(
  userInput: string, 
  chatHistory: [string, string][]
): Promise<{ final_answer: string }> {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Format the chat history for the API
    const formattedHistory = chatHistory.map((pair) => [
      { role: 'user', content: pair[0] },
      { role: 'assistant', content: pair[1] }
    ]).flat();
    
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        message: userInput,
        history: formattedHistory
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to send chat message');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    throw error;
  }
}

/**
 * Check the health status of the chat service
 * @returns Boolean indicating if the chat service is healthy
 */
export async function checkChatServiceHealth(): Promise<boolean> {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return false;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/chat/health`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.healthy === true;
  } catch (error) {
    console.error('Error checking chat service health:', error);
    return false;
  }
}
