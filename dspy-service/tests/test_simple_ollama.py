"""
Simple test to verify direct Ollama integration without DSPy
This helps isolate whether issues are with Ollama itself or the DSPy integration
"""
import os
import requests
import json
import sys

def test_ollama_directly():
    """Test Ollama API directly without DSPy"""
    print("Testing direct Ollama connection...")
    
    # Define the prompt
    prompt = "Please tell me a short joke about programming."
    
    # Create the request JSON
    data = {
        "model": "gemma3:4b-it-qat",
        "prompt": prompt,
        "stream": False
    }
    
    try:
        print(f"Sending prompt to Ollama: '{prompt}'")
        # Make the API request
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=data,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        
        print("\nOllama Response:")
        print("-" * 40)
        print(result.get("response", "No response"))
        print("-" * 40)
        print(f"Done in {result.get('eval_count', 0)} tokens, {result.get('eval_duration', 0)/1000000:.2f}s")
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = test_ollama_directly()
    sys.exit(0 if success else 1)
