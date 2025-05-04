const axios = require('axios');

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:5002';

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
        console.log(`[CHAT] Connecting to chat service at ${CHAT_SERVICE_URL}`);
        
        try {
            const response = await axios.post(`${CHAT_SERVICE_URL}/chat`, {
                userInput,
                chatHistory,
                userId,
                token
            });
            
            console.log('[CHAT] Received response from chat service');
            return response.data;
        } catch (error) {
            console.error('[CHAT] Error connecting to chat service:', 
                error.response?.status || 'No response',
                error.response?.data || error.message);
                
            throw new Error(error.response?.data?.detail || 'Failed to get response from chat service');
        }
    }

    /**
     * Check if the chat service is healthy
     * @returns {Promise<boolean>} True if the service is healthy
     */
    static async checkHealth() {
        console.log(`[CHAT] Checking health of chat service at ${CHAT_SERVICE_URL}`);
        
        try {
            const response = await axios.get(`${CHAT_SERVICE_URL}/health`);
            const isHealthy = response.data.status === 'healthy';
            console.log(`[CHAT] Health check result: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
            return isHealthy;
        } catch (error) {
            console.error('[CHAT] Health check failed:', 
                error.response?.status || 'No response',
                error.message);
            return false;
        }
    }
}

module.exports = ChatIntegrationService;
