# Import patch first to ensure proper adapter configuration
from modules import dspy_config_patch

import dspy
import requests
import os
import json
import logging

logger = logging.getLogger(__name__)
NODE_BACKEND_URL = os.environ.get('NODE_BACKEND_URL', 'http://localhost:5000')

def get_item_content_func(item_ref: dict, user_id: str | int, **kwargs) -> str:
    """
    Fetches item content from the Node.js backend API.

    Args:
        item_ref (dict): Dictionary containing 'item_type' and 'item_id'.
        user_id (str | int): The ID of the user requesting the content.

    Returns:
        str: The full content of the item, or an error message string.
    """
    logger = logging.getLogger(__name__)
    item_type = item_ref.get('item_type')
    item_id = item_ref.get('item_id')

    logger.info(f"GetItemContentTool called for {item_type} ID: {item_id} for user_id: {user_id}")

    if not item_type or not item_id or not user_id:
        logger.error("GetItemContentTool requires item_type, item_id, and user_id.")
        return json.dumps({"error": "Missing required parameters (type, id, user context)."})
    if item_type not in ['note', 'transcript']:
         return json.dumps({"error": "Invalid item_type. Must be 'note' or 'transcript'."})    # Choose the correct plural form for the API endpoint
    api_resource = f"{item_type}s"
    api_endpoint = f"{NODE_BACKEND_URL}/api/{api_resource}/{item_id}"
    
    # We need to add authentication - for now, we'll use a direct API connection
    # This is a simplified approach for testing; in production, you should use a more secure method
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'DSPy-Service/1.0',
        'X-DSPy-Service': 'true'
    }
    
    # Add the userId as a query parameter for this modified API endpoint
    api_endpoint = f"{api_endpoint}?userId={user_id}"
    try:
        logger.info(f"Making request to: {api_endpoint}")
        
        # Add retry logic for robustness
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                # Make the request to the backend API
                response = requests.get(api_endpoint, headers=headers, timeout=10)
                response.raise_for_status()
                break  # Success! Exit the retry loop
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed (attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    import time
                    time.sleep(retry_delay)
                else:
                    # Re-raise the last exception if all retries failed
                    raise

        item_data = response.json()

        # Extract content based on type
        content = item_data.get('content') if item_type == 'note' else item_data.get('text')

        if content is None:
            logger.warning(f"Content field not found for {item_type} {item_id}.")
            return json.dumps({"error": f"Could not retrieve content for {item_type} {item_id}."})

        logger.info(f"Successfully retrieved content for {item_type} {item_id}.")
        # Return only the content string for the LLM
        # Truncate potentially very long content to avoid overwhelming the agent context
        MAX_CONTENT_LENGTH = 4000 # Adjust as needed
        truncated_content = content[:MAX_CONTENT_LENGTH] + ("..." if len(content) > MAX_CONTENT_LENGTH else "")
        return truncated_content
    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling Node.js get content API: {e}")
        logger.error(f"API endpoint: {api_endpoint}")
        
        # More detailed error logging for debugging
        try:
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Status code: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text}")
        except Exception:
            pass
            
        return json.dumps({"error": f"Failed to connect to content service: {e}"})
    except Exception as e:
        logger.error(f"Error processing get content result: {e}")
        logger.error(f"API endpoint: {api_endpoint}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return json.dumps({"error": f"Error retrieving content: {e}"})


class GetItemContentTool(dspy.Tool):
    """Retrieves the full content of a specific note or transcript by its type and ID."""
    name = "get_item_content"
    description = "Fetches the full text content for a specific note or transcript given its type ('note' or 'transcript') and ID."
    input_variable = "item_ref" # Expecting a dict like {"item_type": "note", "item_id": 123}

    def __init__(self):
        super().__init__(get_item_content_func)
