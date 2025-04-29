# Test script for Gemini configuration with DSPy
import os
import dspy
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_gemini_config():
    # Load environment variables
    load_dotenv()
    
    # Get provider and model from environment (with defaults)
    provider = os.environ.get('DSPY_LLM_PROVIDER', 'gemini')
    model = os.environ.get('DSPY_LLM_MODEL', 'gemini-1.5-pro-latest')
    
    # For Google's Gemini, make sure provider is 'gemini', not 'google'
    if provider == 'google':
        provider = 'gemini'  # LiteLLM expects "gemini" not "google"
    
    # Get the API key
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        logger.error("Missing GEMINI_API_KEY in environment")
        return
    
    logger.info(f"Using provider: {provider}, model: {model}")
    
    try:
        # Create full model name with correct provider prefix
        model_name = f"{provider}/{model}"
        logger.info(f"Full model name: {model_name}")
        
        # Create the language model with DSPy's unified API
        lm = dspy.LM(model_name, api_key=api_key)
        dspy.configure(lm=lm)
        
        logger.info("DSPy configuration successful!")
        
        # Test with a simple prompt
        logger.info("Testing with a simple prompt...")
        response = lm("What is artificial intelligence?")
        
        logger.info("\nModel response:")
        logger.info(response)
        
        logger.info("Test complete. The configuration is working correctly!")
        
    except Exception as e:
        logger.error(f"Error configuring or using DSPy with Gemini: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_gemini_config()
