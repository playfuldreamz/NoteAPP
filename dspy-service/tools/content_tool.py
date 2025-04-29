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
         return json.dumps({"error": "Invalid item_type. Must be 'note' or 'transcript'."})

    # Choose the correct plural form for the API endpoint
    api_resource = f"{item_type}s"
    api_endpoint = f"{NODE_BACKEND_URL}/api/{api_resource}/{item_id}"
    # Again, assumes Node.js uses authenticated user ID.
    # Pass user_id in headers or query params if endpoint requires it explicitly.
    headers = {'Content-Type': 'application/json'} # Add Auth header if needed by backend

    try:
        # Note: This assumes the GET endpoint requires authentication implicitly via a token
        # If the GET endpoint needs the user_id explicitly, adjust the call.
        # A common pattern is that the auth middleware on the Node.js side adds req.user.id
        response = requests.get(api_endpoint, headers=headers, timeout=10) # Add auth header if necessary
        response.raise_for_status()

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
        return json.dumps({"error": f"Failed to connect to content service: {e}"})
    except Exception as e:
        logger.error(f"Error processing get content result: {e}")
        return json.dumps({"error": f"Error retrieving content: {e}"})


class GetItemContentTool(dspy.Tool):
    """Retrieves the full content of a specific note or transcript by its type and ID."""
    name = "get_item_content"
    description = "Fetches the full text content for a specific note or transcript given its type ('note' or 'transcript') and ID."
    input_variable = "item_ref" # Expecting a dict like {"item_type": "note", "item_id": 123}

    def __init__(self):
        super().__init__(get_item_content_func)
