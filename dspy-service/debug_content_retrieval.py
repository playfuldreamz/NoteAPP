# Enhanced test script for debugging content retrieval
import requests
import os
import json
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_direct_note_access():
    """Test direct access to note content endpoint"""
    load_dotenv()
    
    NODE_BACKEND_URL = os.environ.get('NODE_BACKEND_URL', 'http://localhost:5000')
    note_id = 15
    user_id = 1
    
    # Test direct access to note endpoint with userId query param
    api_endpoint = f"{NODE_BACKEND_URL}/api/notes/{note_id}?userId={user_id}"
    
    logger.info(f"Testing direct access to {api_endpoint}")
    
    # Add headers to help identify this as a DSPy service request
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'DSPy-Service/1.0',
        'X-DSPy-Service': 'true'
    }
    
    # Try multiple times with a small delay in case the server is still starting
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            response = requests.get(api_endpoint, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Success! Got response: {json.dumps(data, indent=2)}")
            logger.info(f"Note content: {data.get('content', 'No content')[:100]}...")
            
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error accessing note (attempt {attempt+1}/{max_retries}): {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Status code: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text}")
            
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                import time
                time.sleep(retry_delay)
            else:
                logger.error("All attempts failed.")
                return False

def test_note_retrieval_via_content_tool():
    """Test content retrieval through our GetItemContentTool"""
    load_dotenv()
    
    NODE_BACKEND_URL = os.environ.get('NODE_BACKEND_URL', 'http://localhost:5000')
    note_id = 15
    user_id = 1
    
    item_ref = {
        "item_type": "note",
        "item_id": note_id
    }
    
    try:
        # Import the function directly
        from tools.content_tool import get_item_content_func
        
        # Call the function
        logger.info(f"Testing content tool with note_id={note_id}, user_id={user_id}")
        result = get_item_content_func(item_ref, user_id)
        
        try:
            # Try to parse as JSON in case of error
            result_json = json.loads(result)
            if "error" in result_json:
                logger.error(f"Tool returned error: {result_json['error']}")
            else:
                logger.info(f"Got JSON result: {json.dumps(result_json, indent=2)}")
        except json.JSONDecodeError:
            # Not JSON, likely the actual content
            logger.info(f"Got content (first 100 chars): {result[:100]}...")
            
        return True
    except Exception as e:
        logger.error(f"Error testing content tool: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

def test_dspy_chat_request():
    """Test a complete DSPy chat request for note content"""
    load_dotenv()

    endpoint = "http://localhost:5001/chat"
    user_input = "get content for note 15"
    # Create chat history with simulated search results
    chat_history = [
        ["find notes about DSPy", 
         json.dumps({
             "results": [{
                 "id": 15, 
                 "type": "note", 
                 "title": "DSPy Planning", 
                 "relevance": 0.85, 
                 "preview": "Initial thoughts on DSPy integration..."
             }]
         })
        ]
    ]
    
    payload = {
        "user_input": user_input,
        "chat_history": chat_history,
        "user_id": "1"  # as string
    }
    
    logger.info(f"Testing DSPy chat endpoint with payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            endpoint,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30  # Longer timeout for LLM processing
        )
        response.raise_for_status()
        
        result = response.json()
        logger.info(f"DSPy chat response: {json.dumps(result, indent=2)}")
        return True
    except Exception as e:
        logger.error(f"Error with DSPy chat request: {e}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Status code: {e.response.status_code}")
            logger.error(f"Response text: {e.response.text}")
        return False

if __name__ == "__main__":
    print("-" * 50)
    print("CONTENT RETRIEVAL DEBUGGING TESTS")
    print("-" * 50)
    
    # Test direct note access first
    print("\n1. Testing direct note access...")
    if test_direct_note_access():
        print("✓ Direct note access test completed")
    else:
        print("✗ Direct note access test failed")
    
    # Test the content tool function directly
    print("\n2. Testing note content retrieval via tool...")
    if test_note_retrieval_via_content_tool():
        print("✓ Content tool test completed")
    else: 
        print("✗ Content tool test failed")
    
    # Test the full DSPy chat flow
    print("\n3. Testing full DSPy chat request...")
    if test_dspy_chat_request():
        print("✓ DSPy chat request test completed")
    else:
        print("✗ DSPy chat request test failed")
        
    print("\nAll tests completed. Check logs above for details.")
    print("-" * 50)
