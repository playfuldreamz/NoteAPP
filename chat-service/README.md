# NoteApp Chat Service

This directory contains the NoteApp Chat Service, a Python-based component responsible for providing conversational AI capabilities within the NoteApp ecosystem. It leverages LangGraph to create a stateful, agentic chat experience, enabling users to interact with their notes and the application through natural language.

## Features

- **Conversational AI Agent:** Powered by LangGraph for robust, multi-turn conversation management.
- **Intent Recognition:** Analyzes user input to determine intent (e.g., query notes, casual chat).
- **Note Interaction:**
    - Semantic search for notes and transcripts.
    - Retrieval of specific note/transcript content.
- **Answer Synthesis:** Generates context-aware responses based on retrieved information or general knowledge.
- **Casual Conversation:** Handles off-topic or general chit-chat.
- **Tool Usage:** Utilizes custom tools to interact with the main NoteApp backend (e.g., fetching notes, user data).
- **Configurable LLM:** Integrates with Large Language Models (LLMs) for understanding and generation.
- **Error Handling:** Graceful management of errors within the conversation flow.
- **Stateful Conversations:** Remembers context across multiple turns using a checkpointer.

## Architecture

The Chat Service is built around the `NoteAppChatAgent` which uses LangGraph to define a state machine (graph) representing the flow of conversation. Key components include:

- **`chat_server.py`:** The main entry point that starts a FastAPI server to expose the chat functionality via HTTP endpoints.
- **`chat_agent.py`:** Contains the core `NoteAppChatAgent` class, defining the LangGraph workflow, nodes (processing steps), and edges (routing logic).
    - **Nodes:**
        - `analyze_input`: Classifies user intent and extracts key information.
        - `search_notes`: Uses a tool to search for relevant notes/transcripts in NoteApp.
        - `get_content`: Uses a tool to fetch the full content of a specific note/transcript.
        - `synthesize_answer`: Generates a final response to the user based on context and LLM.
        - `casual_chat`: Handles non-note-related conversation.
        - `handle_error`: Manages and reports errors.
- **`tools/noteapp_tools.py`:** Defines custom LangChain tools that the agent uses to interact with the NoteApp backend API (e.g., `SearchNoteAppTool`, `GetNoteAppContentTool`). These tools are crucial for fetching and manipulating data.
- **`config.py`:** Manages configuration settings for the service, such as LLM details, API keys (if managed directly by this service), and service host/port.
- **`modules/conversation/`:** Contains a suite of modules for advanced conversational processing, including message analysis (e.g., `analyzer.py`, `classifier.py`), intent recognition (`intent.py`), keyword extraction (`keywords.py`), response generation (`response.py`), and sentiment analysis (`sentiment.py`). This directory is central to the agent's ability to understand and respond to user input effectively.

## Prerequisites

- Python 3.9 or higher
- Virtual environment tool (e.g., `venv`)
- Access to a running NoteApp backend instance for tool interaction.

## Installation

1.  **Navigate to the chat-service directory:**
    ```powershell
    cd c:\\Users\\obose\\Documents\\GitHub\\AI\\NoteAPP\\chat-service
    ```

2.  **Create and activate a virtual environment:**
    ```powershell
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    ```
    For Linux/macOS:
    ```bash
    # python3 -m venv venv
    # source venv/bin/activate
    ```

3.  **Install required packages:**
    ```powershell
    pip install -r requirements.txt
    ```

## Configuration

The Chat Service requires configuration, typically managed via a `.env` file in the `chat-service` directory. Key settings might include:

```env
# .env example
CHAT_SERVICE_HOST=localhost
CHAT_SERVICE_PORT=8010

# LLM Configuration (example for OpenAI)
OPENAI_API_KEY="your_openai_api_key"
LLM_MODEL_NAME="gpt-3.5-turbo"

# NoteApp Backend API Configuration
NOTEAPP_API_BASE_URL="http://localhost:3001/api" # Or your actual backend URL
# Potentially an API key or token for the chat service to authenticate with the backend
NOTEAPP_INTERNAL_API_KEY="a_secure_key_for_service_to_service_auth"
```

Refer to `config.py` and the specific LLM and tool implementations for all required environment variables.

## Starting the Service

1.  **Ensure all configurations in your `.env` file are correct.**
2.  **Start the Chat Service server:**
    ```powershell
    python chat_server.py
    ```
    The server will typically use Uvicorn to run the FastAPI application.

3.  **Verify server is running:**
    - The console should indicate that the Uvicorn server has started, usually on `http://localhost:8010` (or as configured).
    - Check logs for any initialization errors.

## API and Usage

The `chat_server.py` exposes HTTP endpoints (e.g., `/chat`) that the NoteApp backend can call to interact with the chat agent. The typical payload would include the user's message, conversation history, user ID, and any necessary authentication tokens.

### Testing

A `test_chat.py` script may be available to directly test the chat service functionality by sending requests to its local endpoint.

```powershell
# Example: Run the test script (if available and configured)
python test_chat.py
```

## Key Modules and Files

-   `chat_server.py`: FastAPI application, server entry point.
-   `chat_agent.py`: Core `NoteAppChatAgent` logic and LangGraph workflow.
-   `config.py`: Loads and provides configuration settings.
-   `requirements.txt`: Python package dependencies.
-   `tools/noteapp_tools.py`: Custom tools for NoteApp backend integration.
-   `modules/`: Contains sub-modules for specific tasks like conversation analysis.

## Troubleshooting

-   **Connection Errors to LLM:** Verify API keys and internet connectivity. Check LLM provider status.
-   **Tool Execution Errors:** Ensure the NoteApp backend is running and accessible at the configured `NOTEAPP_API_BASE_URL`. Verify any authentication keys between the chat service and backend.
-   **Dependency Issues:** Ensure all packages in `requirements.txt` are installed correctly in the active virtual environment.
-   **Configuration Errors:** Double-check all environment variables in the `.env` file for correctness.

## Future Improvements

-   Enhanced context management for very long conversations.
-   More sophisticated tool error handling and retries.
-   Support for more LLM providers.
-   Streaming responses for lower perceived latency.
