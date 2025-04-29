// Simple test script to check DSPy service health
const fetch = require('node-fetch');

async function checkDspyHealth() {
    try {
        const response = await fetch('http://localhost:5001/health');
        if (!response.ok) {
            console.error(`Health check failed with status: ${response.status}`);
            return;
        }
        const data = await response.json();
        console.log('DSPy service health check result:', data);
    } catch (error) {
        console.error('Error checking DSPy health:', error);
    }
}

checkDspyHealth();

// Test a simple chat request to debug
async function testChatRequest() {
    try {
        const response = await fetch('http://localhost:5001/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_input: 'test message',
                chat_history: [],
                user_id: '1'  // Pass as string to avoid any type issues
            })
        });
        
        if (!response.ok) {
            console.error(`Chat request failed with status: ${response.status}`);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('DSPy chat response:', data);
    } catch (error) {
        console.error('Error making chat request:', error);
    }
}

// Uncomment to test direct chat request
testChatRequest();
