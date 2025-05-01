import logging
import uvicorn
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

from config import (
    CHAT_SERVICE_HOST,
    CHAT_SERVICE_PORT,
    LOG_LEVEL,
    validate_config,
    get_llm_client
)
from modules import NoteAppChatAgent
from tools import SearchNoteAppTool, GetNoteAppContentTool

# Configure logging
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Configuration validation
    if error := validate_config():
        raise ValueError(f"Configuration error: {error}")
    logger.info("Configuration validated successfully")
    
    # Initialize LLM client
    try:
        global llm_client
        llm_client = get_llm_client()
        logger.info("LLM client initialized successfully")
        yield
    except Exception as e:
        logger.error(f"Failed to initialize LLM client: {e}")
        raise

# Create FastAPI app with lifespan handler
app = FastAPI(title="NoteApp Chat Service", lifespan=lifespan)

# Request and Response Models
class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender (user or assistant)")
    content: str = Field(..., description="Content of the message")

class ChatRequest(BaseModel):
    userInput: str = Field(..., description="The current user message")
    chatHistory: List[ChatMessage] = Field(default_factory=list, description="Previous messages in the conversation")
    userId: str = Field(..., description="ID of the current user")
    token: str = Field(..., description="JWT authentication token")

class ChatResponse(BaseModel):
    final_answer: str = Field(..., description="The agent's response")
    error: Optional[str] = Field(None, description="Error message if something went wrong")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat requests from users.
    
    Args:
        request: The chat request containing user input and context
    
    Returns:
        ChatResponse containing the agent's answer
    """
    try:
        # Initialize tools
        tools = [
            SearchNoteAppTool(),
            GetNoteAppContentTool()
        ]
        
        # Create chat agent
        agent = NoteAppChatAgent(llm=llm_client, tools=tools)
        
        # Process the request
        result = await agent.invoke(
            user_input=request.userInput,
            chat_history=request.chatHistory,
            user_id=request.userId,
            jwt_token=request.token
        )
        
        return ChatResponse(**result)
    
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/test-ollama")
async def test_ollama():
    """Test endpoint to verify Ollama connection."""
    try:
        if not llm_client:
            return {"status": "error", "message": "LLM client not initialized"}
            
        # Try a simple chat completion
        response = await llm_client.ainvoke("Say hello!")
        return {
            "status": "success",
            "message": "Ollama connection successful",
            "response": response.content
        }
    except Exception as e:
        logger.error(f"Error testing Ollama connection: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to Ollama: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(
        "chat_server:app",
        host=CHAT_SERVICE_HOST,
        port=CHAT_SERVICE_PORT,
        reload=True  # Enable auto-reload for development
    )
