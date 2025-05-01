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

#### DSPy ReAct Verbose Flag Deprecation

If you encounter an error like `TypeError` when initializing the ReAct agent in newer DSPy versions:
- This happens because recent versions of DSPy (≥2.5.x) no longer support the `verbose` flag in ReAct constructor
- Solution: Remove the `verbose` parameter and use Python's logger for debug output
- Example:
  ```python
  # Old approach (no longer works)
  self.agent = dspy.ReAct(
      ConversationalAgentSignature,
      tools=[search_tool, content_tool],
      verbose=True,
      max_iters=5
  )
  
  # New approach (works with DSPy 2.5.6+)
  self.agent = dspy.ReAct(
      ConversationalAgentSignature,
      tools=[search_tool, content_tool],
      max_iters=5
  )
  
  # Then enable debug logging elsewhere
  logging.getLogger("dspy").setLevel(logging.DEBUG)
  ```

#### Ollama Integration with DSPy

When using Ollama with DSPy:
- Ollama requires specific configuration for proper integration with DSPy's LM client
- Solution: Use the provider parameter when initializing the LM client
- Example:
  ```python
  # Configure for Ollama specifically
  lm_kwargs = {
      'api_key': 'not-needed',
      'api_base': 'http://localhost:11434',
      'max_tokens': 400
  }
  
  # Use the provider parameter to specify Ollama
  lm = dspy.LM(provider="ollama", model="gemma3:4b-it-qat", **lm_kwargs)
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
- ✅ Ollama integration with gemma3:4b-it-qat local model
- ✅ Testing utilities for diagnosing and verifying functionality

## Next Phases

### Phase 2: Advanced Tools & RAG Integration (May 2025)

**Objective**: Enhance the DSPy agent with advanced retrieval and reasoning capabilities to provide more valuable insights from user content.

#### Implementation Tasks:
1. **Enhanced Search Capabilities**:
   - Implement hybrid search combining semantic and keyword-based approaches
   - Add metadata filtering (by date, tags, type)
   - Develop search ranking improvements with user context awareness
   - Support more complex search queries with multiple constraints

2. **Knowledge Extraction Tools**:
   - Create a `SummarizeContentTool` for generating concise summaries
   - Develop a `ExtractKeyPointsTool` to identify main concepts from notes
   - Implement a `IdentifyEntitiesTool` to recognize people, places, and organizations
   - Create a `ExtractTimelineEventsTool` to build chronological timelines from notes

3. **Question-Answering over Note Contents**:
   - Implement a structured RAG pipeline with query rewriting and transformation
   - Create query-specific content retrieval with dynamic chunking
   - Develop an answer generation module with source attribution
   - Support follow-up questions with context maintenance
   - Add fact verification against source content

4. **Multi-Document Reasoning**:
   - Implement cross-document entity resolution and linking
   - Create a tool for comparing information across multiple notes
   - Develop contextual understanding across document boundaries
   - Support reasoning over contradictory information from multiple sources
   - Add temporal reasoning for documents created at different times

#### Success Criteria:
- Agent can answer complex questions requiring synthesis of multiple documents
- Knowledge extraction tools produce accurate, structured data from unstructured notes
- Search functionality outperforms basic semantic search in accuracy and relevance
- Agent can explain reasoning and cite sources for information provided

### Phase 3: Agent Memory & Stateful Conversations (June 2025)

**Objective**: Create a more personalized and context-aware conversation experience with persistent memory across sessions.

#### Implementation Tasks:
1. **Session Management**:
   - Design and implement a session storage system
   - Create session initialization and continuation mechanisms
   - Develop session context persistence across multiple interactions
   - Implement session timeout and garbage collection logic
   - Add session encryption for security

2. **Conversation Memory**:
   - Create a short-term memory structure for immediate conversation context
   - Implement long-term memory for persistent user insights
   - Develop memory consolidation from short-term to long-term
   - Add memory retrieval based on contextual relevance
   - Create a memory forgetting mechanism to prevent context overflow

3. **Context-Aware Responses**:
   - Implement user intent tracking across conversation turns
   - Develop contextual entity resolution for pronouns and references
   - Create relevance scoring for potential response content
   - Add conversation state tracking (e.g., "user is searching for X")
   - Implement adaptive response formats based on conversation history

4. **User Preference Retention**:
   - Create a user preference model structure
   - Implement preference learning from explicit statements
   - Develop preference inference from implicit signals
   - Add preference application in search ranking and response generation
   - Create tools for users to view and modify stored preferences

#### Success Criteria:
- Agent maintains context across multiple conversation turns without repetition
- User preferences are correctly captured and applied to future interactions
- Long-running conversations remain coherent without context loss
- Agent can recall information from previous sessions when relevant

### Phase 4: UI Integration & Testing (July 2025)

**Objective**: Deliver a seamless, responsive user interface for the DSPy agent and implement comprehensive testing for reliability.

#### Implementation Tasks:
1. **Frontend Chat Interface**:
   - Design and implement a responsive chat UI component
   - Create message typing indicators and loading states
   - Develop markdown and code highlighting support
   - Implement file attachment and preview capabilities
   - Add support for rich responses (tables, charts, formatted text)
   - Create accessibility features (keyboard navigation, screen reader support)

2. **Real-Time Responses**:
   - Implement streaming responses with token-by-token display
   - Create websocket connection for bidirectional communication
   - Develop partial response rendering and progressive enhancement
   - Add response throttling for performance optimization
   - Create typing indicator during agent "thinking" phases

3. **User Feedback Mechanisms**:
   - Implement thumbs up/down feedback collection
   - Create detailed feedback forms for response quality
   - Develop correction submission interface
   - Add feedback aggregation and reporting
   - Implement A/B testing framework for response variations

4. **Error State Handling and Recovery**:
   - Design graceful degradation for API failures
   - Implement automatic retry logic with exponential backoff
   - Create user-friendly error messages for different failure modes
   - Develop session recovery after connection loss
   - Add client-side input validation to prevent common errors
   - Implement crash reporting and diagnostics

#### Success Criteria:
- Chat interface provides a smooth, intuitive user experience
- Streaming responses appear immediately with minimal latency
- Feedback collection gathers actionable data on agent performance
- System gracefully handles errors with appropriate recovery mechanisms
- UI adapts appropriately to different devices and screen sizes

### Phase 5: Production Optimization & Scaling (August 2025)

**Objective**: Prepare the DSPy agent for production deployment with optimizations for performance, cost efficiency, and scalability.

#### Implementation Tasks:
1. **Performance Optimization**:
   - Implement response caching for common queries
   - Develop lazy loading of large context windows
   - Create batching for similar user requests
   - Add intelligent request throttling and prioritization
   - Optimize database queries and indexing

2. **Cost Management**:
   - Implement token usage tracking and reporting
   - Create tiered service levels based on usage patterns
   - Develop model switching for different query complexities
   - Add compression techniques for context windows
   - Implement usage quotas and alerts

3. **Scalability Infrastructure**:
   - Design horizontal scaling for the DSPy service
   - Implement load balancing across service instances
   - Create distributed session state management
   - Develop autoscaling based on request volume
   - Add performance monitoring and alerting

4. **Security Enhancements**:
   - Conduct comprehensive security audit
   - Implement data sanitization and validation
   - Add rate limiting and abuse prevention
   - Create privacy-preserving features for sensitive data
   - Develop compliance documentation and controls

#### Success Criteria:
- System handles high load with stable performance
- Cost per user interaction stays within target thresholds
- Infrastructure scales automatically with changing demand
- Security measures protect against common attack vectors
- Privacy controls meet or exceed regulatory requirements
