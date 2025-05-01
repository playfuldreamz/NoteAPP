# DSPy service configuration
# This file contains default configurations for the DSPy service

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# LLM Provider Configuration
DEFAULT_LLM_PROVIDER = 'ollama'  # Options: openai, gemini, anthropic, ollama, lmstudio
DEFAULT_LLM_MODELS = {
    'openai': 'gpt-4o-mini',
    'gemini': 'gemini-1.5-pro-latest',  # Versioned Gemini model ID
    'anthropic': 'claude-3-sonnet',
    'ollama': 'gemma3:4b-it-qat',  # Using gemma3:4b-it-qat model from Ollama
    'lmstudio': 'Meta-Llama-3-8B-Instruct'
}

# Server Configuration
HOST = os.environ.get('HOST', 'localhost')
PORT = int(os.environ.get('PORT', 5001))
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'info').upper()

# DSPy Configuration
MAX_TOKENS = 400

# Node.js Backend Configuration
NODE_BACKEND_URL = os.environ.get('NODE_BACKEND_URL', 'http://localhost:5000')

# Get LLM provider and model - environment vars override defaults
def get_llm_config():
    """
    Gets the LLM configuration from environment or defaults
    Returns: tuple(provider, model, api_key)
    """
    provider = os.environ.get('DSPY_LLM_PROVIDER', DEFAULT_LLM_PROVIDER).lower()
    
    # Get the model based on the provider
    if provider in DEFAULT_LLM_MODELS:
        model = os.environ.get('DSPY_LLM_MODEL', DEFAULT_LLM_MODELS[provider])
    else:
        model = os.environ.get('DSPY_LLM_MODEL', 'gemini-1.5-pro-latest')  # Fallback to gemini-pro
      # Get the appropriate API key based on provider
    api_key = None
    if provider == 'openai':
        api_key = os.environ.get('OPENAI_API_KEY')
    elif provider in ['gemini', 'google']:
        api_key = os.environ.get('GEMINI_API_KEY')
        # Ensure we use the correct provider prefix for LiteLLM
        provider = 'gemini'  # LiteLLM expects "gemini" not "google"
    elif provider == 'anthropic':
        api_key = os.environ.get('ANTHROPIC_API_KEY')
    # For ollama/lmstudio, no API key needed
    
    return provider, model, api_key
