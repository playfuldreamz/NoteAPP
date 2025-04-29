# Simple test script for DSPy LM configuration
import os
import dspy
from dotenv import load_dotenv

def test_dspy_config():
    load_dotenv()
    provider = os.environ.get('DSPY_LLM_PROVIDER', 'gemini')
    model = os.environ.get('DSPY_LLM_MODEL', 'gemini-1.5-pro-latest')
    
    # Get the appropriate API key
    api_key = None
    if provider == 'openai':
        api_key = os.environ.get('OPENAI_API_KEY')
    elif provider in ['gemini', 'google']:
        api_key = os.environ.get('GEMINI_API_KEY')
        provider = 'gemini'  # Ensure we use the correct provider for LiteLLM
    elif provider == 'anthropic':
        api_key = os.environ.get('ANTHROPIC_API_KEY')    
    if not api_key and provider not in ['ollama', 'lmstudio']:
        print(f"Error: Missing API key for {provider}")
        return
    
    try:
        # The key is to use the provider/model format
        model_name = f"{provider}/{model}"
        print(f"Using model: {model_name}")
        
        # Create the LM using the factory method
        lm = dspy.LM(model_name, api_key=api_key)
        dspy.configure(lm=lm)
        
        print("DSPy configured successfully!")
        
        # Try to make a simple completion call
        result = lm("What's the weather like today?")
        print("\nTest completion result:")
        print(result)
    except Exception as e:
        print(f"Error configuring DSPy: {e}")

if __name__ == "__main__":
    test_dspy_config()
