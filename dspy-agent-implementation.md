# DSPy Agent Implementation Tracking

## Phase 1: Core Tools & Basic Agent Structure (Completed)

**Objective**: Implement essential DSPy tools and ChatAgent using dspy.ReAct for the note-taking application.

### Components Implemented
- **Python DSPy Service**:
  - Created `tools/search_tool.py`: Semantic search for notes and transcripts
  - Created `tools/content_tool.py`: Retrieve full content by ID
  - Created `signatures/agent_signature.py`: ReAct agent signature definition
  - Created `modules/chat_agent.py`: Basic conversational agent implementation
  - Created `dspy_server.py`: Flask server with DSPy configuration and chat endpoint
    - Updated to use modern `dspy.LM()` factory API instead of deprecated `dspy.OpenAI`
  - Updated `config.py`: Centralized configuration with Gemini as the default LLM
  - Added `requirements.txt`: Dependencies for the DSPy service (using DSPy 2.5.6+)
  - Added `.env-example`: Template for required environment variables

- **Node.js Backend**:
  - Created `services/dspyIntegrationService.js`: Communication layer with DSPy service
  - Created `routes/ai/dspy_proxy.js`: API endpoints for chat functionality
  - Updated `server.js`: Mounted the DSPy proxy routes
  - Added `.env-example`: Template for Node.js environment variables including DSPy service URL

### Setup and Testing Instructions

#### Initial Setup:
1. Set up Python DSPy service environment:
   ```bash
   cd dspy-service
   # Create and activate virtual environment
   python -m venv .venv
   .\.venv\Scripts\Activate  # On Windows
   # source .venv/bin/activate  # On Linux/Mac
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Create .env file from template
   copy .env-example .env
   # Edit .env with your API keys and preferences
   ```

2. Set up Node.js backend environment:
   ```bash
   cd backend
   
   # Install dependencies if needed
   npm install
   
   # Create .env file from template
   copy .env-example .env
   # Edit .env with your API keys and services config
   ```

#### Running the Services:
1. Start the Python DSPy service:
   ```bash
   cd dspy-service
   # Make sure virtual environment is activated
   python dspy_server.py
   ```

2. Start the Node.js backend:
   ```bash
   cd backend
   npm start
   ```

#### Testing the Chat Endpoint:
1. Test with Postman:
   - POST to `http://localhost:5000/api/chat`
   - Headers:
     - Content-Type: application/json
     - Authorization: Bearer <your_valid_jwt_token>
   - Body Example 1 (Search):
     ```json
     {
       "userInput": "find notes about DSPy",
       "chatHistory": []
     }
     ```
   - Body Example 2 (Content Retrieval):
     ```json
     {
       "userInput": "get content for note 15",
       "chatHistory": [
         ["find notes about DSPy", "{\"results\": [{\"id\": 15, \"type\": \"note\", \"title\": \"DSPy Planning\", \"relevance\": 0.85, \"preview\": \"Initial thoughts on DSPy integration...\"}]}"]
       ]
     }
     ```

2. Test with dedicated test scripts:
   ```powershell
   # Test the DSPy service directly
   cd dspy-service
   .\test_dspy_api.ps1
   
   # Test specific functionality (content retrieval)
   .\test_note_content.ps1
   
   # Debug tool functionality in detail
   python debug_content_retrieval.py
   ```

3. Test with curl (Windows PowerShell):
   ```powershell
   $token = "your_jwt_token"
   $body = @{
     userInput = "find notes about DSPy"
     chatHistory = @()
   } | ConvertTo-Json
   
   Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/chat" `
     -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
     -Body $body
   ```

#### Monitoring and Verification:
- Check the Python terminal for logs showing the agent's reasoning process, tool calls, and response generation
- Check the Node.js terminal for logs showing request handling and proxying
- Review detailed authentication logs for diagnosing service-to-service communication issues
- Verify that the API response contains the expected `final_answer` field

#### Testing Tool Integration:
Before deploying to production, create some test data:
```powershell
# Create a test note with ID 15 for testing content retrieval
cd backend
node create-test-note.js
```

Test the full conversation flow:
1. Search for notes about a topic
2. Reference a specific note from search results
3. Ask for specific content by ID from previous results

### Common Issues and Solutions

#### DSPy API Compatibility

If you encounter an error like `AttributeError: module 'dspy' has no attribute 'OpenAI'`:
- This happens because newer versions of DSPy (2.5+) use a unified LM factory instead of provider-specific classes
- Solution: Update your code to use `dspy.LM('openai/model-name', api_key=key)` instead of `dspy.OpenAI()`
- Example:
  ```python
  # Old approach (no longer works)
  # lm = dspy.OpenAI(model='gpt-4o-mini', api_key=api_key)
  
  # New approach (works with DSPy 2.5.6+)
  lm = dspy.LM('openai/gpt-4o-mini', api_key=api_key)
  dspy.configure(lm=lm)
  ```

#### Google Gemini API Versioned Models

If you encounter a 404 error like `models/gemini-pro is not found for API version v1beta`:
- This happens because Google's API requires specific versioned model IDs
- Solution: Use a versioned model ID like `gemini-1.5-pro-latest` instead of just `gemini-pro`
- Example:
  ```
  # In .env file:
  DSPY_LLM_PROVIDER=gemini
  DSPY_LLM_MODEL=gemini-1.5-pro-latest  # Versioned model ID required
  ```

#### Authentication Between DSPy Service and Node.js Backend

If you encounter authentication errors when DSPy service tools try to access the Node.js backend:
- Problem: The DSPy Python service can't use JWT tokens that the Node.js backend requires
- Solution: Implement a service-to-service authentication bypass in the Node.js middleware:

1. Create a dedicated utility file:
   ```javascript
   // backend/utils/dspyUtils.js
   const isDspyServiceRequest = (req) => {
     // Check if request is from localhost and has userId
     const isLocalRequest = 
       req.ip === '::1' || 
       req.ip === '127.0.0.1' ||
       req.ip.includes('::ffff:127.0.0.1');
     
     const hasUserId = 
       (req.query && req.query.userId) || 
       (req.body && req.body.userId);
     
     return isLocalRequest && hasUserId;
   };
   
   module.exports = { isDspyServiceRequest };
   ```

2. Modify authentication middleware:
   ```javascript
   // backend/middleware/auth.js
   const { isDspyServiceRequest } = require('../utils/dspyUtils');

   const authenticateToken = (req, res, next) => {
     // Bypass authentication for DSPy service
     if (isDspyServiceRequest(req)) {
       const userId = req.query.userId || (req.body ? req.body.userId : null);
       req.user = { id: userId, isDspyService: true };
       return next();
     }
     
     // Normal JWT token authentication
     const token = req.headers['authorization']?.split(' ')[1];
     if (!token) return res.status(401).json({ error: 'Access denied' });
     
     try {
       const verified = jwt.verify(token, JWT_SECRET);
       req.user = verified;
       next();
     } catch (err) {
       res.status(400).json({ error: 'Invalid token' });
     }
   };
   ```

3. Add authentication headers in DSPy tools:
   ```python
   # In content_tool.py and search_tool.py
   headers = {
       'Content-Type': 'application/json',
       'User-Agent': 'DSPy-Service/1.0',
       'X-DSPy-Service': 'true'
   }
   ```

## Current Status (April 2025)

- ✅ Basic DSPy agent integrated with Node.js backend
- ✅ Search and content retrieval tools working
- ✅ Authentication between services configured
- ✅ Gemini LLM integration with proper versioned models
- ✅ Testing utilities for diagnosing and verifying functionality

## Next Phases

### Phase 2: Advanced Tools & RAG Integration
- Implement advanced search capabilities
- Add knowledge extraction tools
- Develop question-answering over note contents
- Implement multi-document reasoning

### Phase 3: Agent Memory & Stateful Conversations
- Session management
- Conversation memory
- Context-aware responses
- User preference retention

### Phase 4: UI Integration & Testing
- Frontend chat interface
- Real-time responses
- User feedback mechanisms
- Error state handling and recovery
