# Script to verify available Google Gemini models
import os
import requests
from dotenv import load_dotenv
import json

def list_gemini_models():
    """
    Fetches the list of available Gemini models from the Google Generative Language API.
    """
    load_dotenv()
    api_key = os.environ.get('GEMINI_API_KEY')
    
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment")
        return
    
    # API endpoint for listing models
    url = "https://generativelanguage.googleapis.com/v1beta/models"
    
    # Make the request
    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        # Check for errors
        if not response.ok:
            print(f"Error: {response.status_code} - {response.reason}")
            print(f"Response: {response.text}")
            return
        
        # Parse the response
        models_data = response.json()
        
        # Extract and print model information
        print("\n==== Available Gemini Model IDs ====\n")
        
        gemini_models = [model for model in models_data.get("models", []) 
                        if "gemini" in model.get("name", "").lower()]
        
        if not gemini_models:
            print("No Gemini models found in the response.")
            return
        
        # Print in a formatted way
        print(f"Found {len(gemini_models)} Gemini models:")
        print("-" * 80)
        print(f"{'Model Name':<30} | {'Display Name':<30} | {'Version':<10}")
        print("-" * 80)
        
        for model in gemini_models:
            name = model.get("name", "").split("/")[-1]  # Extract just the model ID
            display_name = model.get("displayName", "N/A")
            version = model.get("version", "N/A")
            print(f"{name:<30} | {display_name:<30} | {version:<10}")
        
        # Recommended model for DSPy
        print("\nRecommended model for your DSPy configuration:")
        recommended = next((m for m in gemini_models if "pro" in m.get("name", "").lower() 
                          and "latest" in m.get("name", "").lower()), gemini_models[0])
        
        rec_name = recommended.get("name", "").split("/")[-1]
        print(f"\nDSPY_LLM_MODEL={rec_name}")
        
        # Full data for debugging
        print("\nFull model data (for debugging):")
        print(json.dumps(models_data, indent=2))
        
    except Exception as e:
        print(f"Error fetching models: {e}")

if __name__ == "__main__":
    list_gemini_models()
