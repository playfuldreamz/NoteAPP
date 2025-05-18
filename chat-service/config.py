import os
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
load_dotenv()

# Service Configuration
CHAT_SERVICE_HOST = os.getenv("CHAT_SERVICE_HOST", "0.0.0.0")
CHAT_SERVICE_PORT = int(os.getenv("CHAT_SERVICE_PORT", "5002"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# LLM Configuration
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")
LLM_MODEL = os.getenv("LLM_MODEL", "gemma3:4b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# NoteApp Backend Configuration
NOTEAPP_BACKEND_URL = os.getenv("NOTEAPP_BACKEND_URL", "http://localhost:5000")

def get_llm_client():
    """Factory function to create LLM client based on configuration."""
    if LLM_PROVIDER.lower() == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=LLM_MODEL,
            base_url=OLLAMA_BASE_URL,
            temperature=0.1
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {LLM_PROVIDER}")

def validate_config() -> Optional[str]:
    """Validate the configuration and return error message if invalid."""
    if not NOTEAPP_BACKEND_URL:
        return "NOTEAPP_BACKEND_URL is not set"
    if not LLM_MODEL:
        return "LLM_MODEL is not set"
    if not LLM_PROVIDER:
        return "LLM_PROVIDER is not set"
    return None
