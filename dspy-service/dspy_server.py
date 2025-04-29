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
    logger.info(f"Configuring DSPy LLM Provider: {llm_provider}, Model: {llm_model}")
    from config import MAX_TOKENS
    
    if not api_key and llm_provider not in ['ollama', 'lmstudio']:
        logger.error(f"API key not found for provider {llm_provider}")
        raise ValueError(f"Missing API key for {llm_provider}")
    
    try:
        # Create full model name with provider prefix - which should be "gemini/" for Gemini models
        # llm_provider should already be "gemini" from config.py's get_llm_config()
        model_name = f"{llm_provider}/{llm_model}"
        logger.info(f"Using unified model name: {model_name}")
        
        # Use the simplified dspy.LM factory API for all providers
        lm_kwargs = {'api_key': api_key}
        
        # Add provider-specific configurations if needed
        if llm_provider == 'openai':
            lm_kwargs['max_tokens'] = MAX_TOKENS
        elif llm_provider in ['ollama', 'lmstudio']:
            # Local models may need base_url and don't require real API keys
            lm_kwargs['api_key'] = 'not-needed'
            base_url = os.environ.get('LOCAL_LLM_BASE_URL')
            if base_url:
                lm_kwargs['api_base'] = base_url
        
        # One unified call to dspy.LM for all providers
        lm = dspy.LM(model_name, **lm_kwargs)
        logger.info(f"Configured DSPy with {model_name}")
        
        # Set the LM as the default for DSPy
        dspy.configure(lm=lm)
        logger.info("DSPy configured successfully")
    except Exception as e:
        logger.error(f"Failed to configure DSPy LM: {e}")
        raise


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
        logger.info(f"Creating ChatAgent instance...")
        agent = ChatAgent()
        logger.info(f"ChatAgent created successfully")
        
        # Run the agent's forward pass
        logger.info(f"Running ChatAgent forward pass for user {user_id}")
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
        logger.error(f"Exception traceback:", exc_info=True)
        return jsonify({"error": f"Failed to process chat request: {str(e)}"}), 500

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
