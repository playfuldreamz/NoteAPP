import logging
import uvicorn
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

from config import (
    CHAT_SERVICE_HOST, CHAT_SERVICE_PORT, LOG_LEVEL,
    validate_config, get_llm_client
)
from modules import NoteAppChatAgent
from tools import SearchNoteAppTool, GetNoteAppContentTool

# Import the ASYNC version of SqliteSaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.checkpoint.base import BaseCheckpointSaver

# Configure logging
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger(__name__)

# Global variable for the agent instance
note_app_agent_instance: Optional[NoteAppChatAgent] = None
checkpointer_instance: Optional[BaseCheckpointSaver] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global note_app_agent_instance, checkpointer_instance
    logger.info("Application startup...")
    if error := validate_config():
        logger.error(f"Configuration error: {error}")
        raise ValueError(f"Configuration error: {error}")
    logger.info("Configuration validated successfully")

    try:
        llm = get_llm_client()
        logger.info("LLM client initialized successfully")
        tools = [SearchNoteAppTool(), GetNoteAppContentTool()]
        async with AsyncSqliteSaver.from_conn_string(":memory:") as chkptr:
            checkpointer_instance = chkptr
            note_app_agent_instance = NoteAppChatAgent(llm=llm, tools=tools, checkpointer=checkpointer_instance)
            logger.info("NoteAppChatAgent initialized with checkpointer.")
            yield
    except Exception as e:
        logger.error(f"Failed during application startup: {e}", exc_info=True)
        raise
    finally:
        logger.info("Application shutdown...")
        if hasattr(checkpointer_instance, "close") and callable(getattr(checkpointer_instance, "close")):
            pass
        logger.info("Application shutdown complete.")

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
    global note_app_agent_instance
    if not note_app_agent_instance:
        logger.error("Chat agent not initialized.")
        raise HTTPException(status_code=503, detail="Chat service is not ready.")
    try:
        chat_history_dicts = [msg.model_dump() for msg in request.chatHistory]
        result = await note_app_agent_instance.invoke(
            user_input=request.userInput,
            chat_history=chat_history_dicts,
            user_id=request.userId,
            jwt_token=request.token
        )
        return ChatResponse(**result)
    except Exception as e:
        logger.error(f"Error processing chat request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-ollama")
async def test_ollama():
    global note_app_agent_instance
    try:
        if not note_app_agent_instance or not hasattr(note_app_agent_instance, "llm"):
            return {"status": "error", "message": "LLM client not initialized"}
        response = await note_app_agent_instance.llm.ainvoke("Say hello!")
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
