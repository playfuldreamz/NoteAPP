import os
import logging
import sys
from dotenv import load_dotenv
import dspy 
from flask import Flask, request, jsonify 
# from fastapi import FastAPI, HTTPException # <-- Or FastAPI

# --- Add current directory to Python path for imports ---
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# --- Import Agent and Tools ---
from modules.chat_agent import ChatAgent
# Tools are used by the agent, direct import not needed here unless testing

# --- Basic Logging Setup ---
# (Keep existing logger setup)
logger = logging.getLogger(__name__)

# --- Global Variables ---
config = {}
# agent_instance = None # Instantiate per request for now, or manage sessions later

# --- Configuration Loading ---
def load_config():
    # Import the centralized configuration from config.py
    from config import HOST, PORT, LOG_LEVEL, get_llm_config
    
    # Load server config values from config
    global config
    config = {
        'host': HOST,
        'port': PORT,
        'log_level': LOG_LEVEL
    }
    
    # Set logging level
    logging.basicConfig(
        level=getattr(logging, config['log_level'], logging.INFO),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # --- DSPy Configuration ---
    llm_provider, llm_model, api_key = get_llm_config()
    
    logger.info(f"Configuring DSPy LLM Provider: {llm_provider}, Model: {llm_model}")    # Use the modern dspy.LM factory method with simplified config
    import dspy
    from config import MAX_TOKENS
    
    if not api_key and llm_provider not in ['ollama', 'lmstudio']:
        logger.error(f"API key not found for provider {llm_provider}")
        raise ValueError(f"Missing API key for {llm_provider}")
    
    try:
        # Create model name with provider prefix
        model_name = f"{llm_provider}/{llm_model}"
        
        # Configure LM based on provider
        if llm_provider == 'ollama':
            # Ollama doesn't need API key
            lm = dspy.LM(model_name)
        elif llm_provider == 'lmstudio':
            # LMStudio uses OpenAI-compatible API
            base_url = os.environ.get('LOCAL_LLM_BASE_URL')
            lm_kwargs = {'api_key': 'not-needed'}
            if base_url:
                lm_kwargs['api_base'] = base_url
            lm = dspy.LM(model_name, **lm_kwargs)
        else:
            # Standard providers (OpenAI, Google, Anthropic)
            lm_kwargs = {
                'api_key': api_key
            }
            if llm_provider == 'openai':
                lm_kwargs['max_tokens'] = MAX_TOKENS
            
            lm = dspy.LM(model_name, **lm_kwargs)
          logger.info(f"Configured DSPy for {llm_provider.capitalize()} with model {llm_model}")
        
        # Set the LM as the default for DSPy
        dspy.configure(lm=lm)
        logger.info("DSPy configured successfully")
    except Exception as e:
        logger.error(f"Failed to configure DSPy LM: {e}")
        raise

    # Configure DSPy globally
    dspy.configure(lm=lm)
    logger.info("DSPy configured successfully.")


# --- Flask App Setup ---
app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint."""
    return jsonify({"status": "ok"})

# --- NEW CHAT ENDPOINT ---
@app.route('/chat', methods=['POST'])
def chat_endpoint():
    """Handles a single turn of conversation with the ChatAgent."""
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    user_input = data.get('user_input')
    chat_history = data.get('chat_history', [])
    user_id = data.get('user_id') # Get user_id from request

    if not user_input:
        return jsonify({"error": "Missing 'user_input' in request"}), 400
    if not user_id:
         return jsonify({"error": "Missing 'user_id' in request"}), 400 # User context is crucial

    logger.info(f"Received  request for user {user_id}. Input: '{user_input[:50]}...'")

    try:
        # Instantiate agent per request for now (stateless)
        agent = ChatAgent()
        # Run the agent's forward pass
        prediction = agent.forward(
            user_input=user_input,
            chat_history=chat_history,
            user_id=user_id # Pass user_id to forward
        )

        response_data = {
            "final_answer": prediction.final_answer,
            # Optionally include thought process for debugging
            # "thought": prediction.thought
        }
        logger.info(f"Sending response for user {user_id}: '{response_data['final_answer'][:100]}...'")
        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Error processing chat request for user {user_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to process chat request"}), 500

# --- Main Execution Block ---
if __name__ == "__main__":
    try:
        load_config() # Load .env and configure DSPy
        host = config.get('host', 'localhost')
        port = int(config.get('port', 5001)) # Use different port for Flask/FastAPI
        logger.info(f"Starting DSPy API server on http://{host}:{port}")
        # Run Flask app (use appropriate command for FastAPI if chosen)
        app.run(host=host, port=port, debug=False) # Turn debug off for production
    except Exception as e:
         logger.error(f"Failed to start DSPy service: {e}", exc_info=True)
    finally:
        logger.info("DSPy service shutdown.")
