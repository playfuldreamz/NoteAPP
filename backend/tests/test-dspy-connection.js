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

// Test direct DSPy service - get content for note
async function testDirectGetNoteContent() {
    try {
        console.log('\nTesting direct "get content for note" request to DSPy service...');
        
        const response = await fetch('http://localhost:5001/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_input: 'get content for note 15',
                chat_history: [
                    ["find notes about DSPy", "{\"results\": [{\"id\": 15, \"type\": \"note\", \"title\": \"DSPy Planning\", \"relevance\": 0.85, \"preview\": \"Initial thoughts on DSPy integration...\"}]}"]
                ],
                user_id: '1'  // Pass as string to avoid any type issues
            })
        });
        
        if (!response.ok) {
            console.error(`Direct get note content request failed with status: ${response.status}`);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('Direct get note content response:', data);
    } catch (error) {
        console.error('Error making direct get note content request:', error);
    }
}

// Test direct DSPy service connection (port 5001)
// testChatRequest();

// Test direct get note content to DSPy service
testDirectGetNoteContent();

// Test via Node.js backend (port 5000)
async function testBackendIntegration() {
    try {
        console.log('\nTesting chat request through Node.js backend...');
        // Get the JWT token (this is for testing only - in a real app, use a proper login flow)
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhYWEiLCJpYXQiOjE3NDU4NzU1NDF9.su3QTqoZMy6bZr1jbeNzPxK7X466_TUutneDHyyuYDQ";
        
        const response = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userInput: 'What can you tell me about DSPy?',
                chatHistory: []
            })
        });
        
        if (!response.ok) {
            console.error(`Backend chat request failed with status: ${response.status}`);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('Node.js backend chat response:', data);
    } catch (error) {
        console.error('Error making backend chat request:', error);
    }
}

// Test getting content for a specific note (with simulated chat history)
async function testGetNoteContent() {
    try {
        console.log('\nTesting "get content for note" functionality...');
        // Get the JWT token (this is for testing only - in a real app, use a proper login flow)
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhYWEiLCJpYXQiOjE3NDU4NzU1NDF9.su3QTqoZMy6bZr1jbeNzPxK7X466_TUutneDHyyuYDQ";
        
        // Set up the request with chat history containing search results
        const response = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userInput: "get content for note 15",
                chatHistory: [
                    ["find notes about DSPy", "{\"results\": [{\"id\": 15, \"type\": \"note\", \"title\": \"DSPy Planning\", \"relevance\": 0.85, \"preview\": \"Initial thoughts on DSPy integration...\"}]}"]
                ]
            })
        });
        
        if (!response.ok) {
            console.error(`Get note content request failed with status: ${response.status}`);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('Get note content response:', data);
    } catch (error) {
        console.error('Error making get note content request:', error);
    }
}

// Uncomment to test full integration through the backend
// testBackendIntegration();

// Uncomment to test getting note content
// testGetNoteContent();
