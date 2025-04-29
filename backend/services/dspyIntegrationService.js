/**
 * Service for integrating with the Python DSPy microservice
 */
const fetch = require('node-fetch'); 

const DSPY_SERVICE_URL = process.env.DSPY_SERVICE_URL || 'http://localhost:5001';

class DspyIntegrationService {
    async checkDSPyHealth() {
        try {
            const response = await fetch(`${DSPY_SERVICE_URL}/health`, {
                method: 'GET',
                timeout: 5000
            });

            if (!response.ok) {
                return { status: 'unhealthy', error: `Status code: ${response.status}` };
            }

            return await response.json();
        } catch (error) {
            console.error('Error checking DSPy service health:', error);
            return { status: 'unhealthy', error: error.message };
        }
    }

    /**
     * Sends a user message and history to the DSPy chat endpoint.
     * @param {string} userInput - The user's latest message.
     * @param {Array<[string, string]>} chatHistory - Conversation history [[user, agent], [user, agent], ...]
     * @param {number | string} userId - The ID of the authenticated user.
     * @returns {Promise<object>} - The response from the DSPy service (e.g., { final_answer: "..." })
     */
    async startChatTurn(userInput, chatHistory, userId) {
        const endpoint = `${DSPY_SERVICE_URL}/chat`;
        console.log(`Sending chat turn to DSPy service for user ${userId}`);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_input: userInput,
                    chat_history: chatHistory,
                    user_id: userId // Send user ID
                }),
                timeout: 60000 // 60 second timeout for potentially long agent turns
            });

            if (!response.ok) {
                let errorBody;
                try {
                    errorBody = await response.json();
                } catch (e) {
                    errorBody = { error: `DSPy service returned status ${response.status}` };
                }
                console.error('Error response from DSPy service:', errorBody);
                throw new Error(errorBody.error || `DSPy service failed with status ${response.status}`);
            }

            const data = await response.json();
            console.log(`Received response from DSPy service for user ${userId}`);
            return data; // Should contain { final_answer: "..." }

        } catch (error) {
            console.error(`Error communicating with DSPy service at ${endpoint}:`, error);
            throw new Error(`Failed to get chat response: ${error.message}`);
        }
    }

    // Add other placeholder functions later: getAdvancedThemes, etc.
}

module.exports = new DspyIntegrationService(); // Export instance
