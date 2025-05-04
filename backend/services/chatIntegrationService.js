const axios = require('axios');

const CHAT_SERVICE_URL = 'http://localhost:5002';

class ChatIntegrationService {
    /**
     * Initialize a new chat turn with the Python chat service
     * @param {string} userInput - The user's message
     * @param {Array} chatHistory - Previous messages in the conversation
     * @param {string} userId - The user's ID
     * @param {string} token - JWT token for authentication
     * @returns {Promise<Object>} The chat service response
     */
    static async startChatTurn(userInput, chatHistory, userId, token) {
        try {
            const response = await axios.post(`${CHAT_SERVICE_URL}/chat`, {
                userInput,
                chatHistory,
                userId,
                token
            });
            
            return response.data;
        } catch (error) {
            console.error('Error in chat service:', error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || 'Failed to get response from chat service');
        }
    }

    /**
     * Check if the chat service is healthy
     * @returns {Promise<boolean>} True if the service is healthy
     */
    static async checkHealth() {
        try {
            const response = await axios.get(`${CHAT_SERVICE_URL}/health`);
            return response.data.status === 'healthy';
        } catch (error) {
            console.error('Chat service health check failed:', error.message);
            return false;
        }
    }
}

module.exports = ChatIntegrationService;
