import dspy
import requests
import os
import json
import logging

logger = logging.getLogger(__name__)

# Get Node.js backend URL from environment variable
NODE_BACKEND_URL = os.environ.get('NODE_BACKEND_URL', 'http://localhost:5000')
# Simple token simulation for direct calls during testing (replace with proper auth if needed)
# In a real scenario, the user's token should be passed securely from Node.js
# For now, assume Node.js backend handles auth based on user_id context if needed
# Or pass the actual token from Node.js to Python if the search endpoint requires it.
# Let's assume for now the backend uses user_id passed in request body for filtering.
# If auth token IS needed by backend search, it MUST be passed securely.

def search_items_func(query: str, user_id: str | int, **kwargs) -> str:
    """
    Performs the search by calling the Node.js backend API.

    Args:
        query (str): The semantic search query.
        user_id (str | int): The ID of the user performing the search.

    Returns:
        str: A JSON string representation of the search results,
             or an error message string.
    """
    logger = logging.getLogger(__name__)
    logger.info(f"SearchItemsTool called with query: '{query}' for user_id: {user_id}")
    if not user_id:
        logger.error("SearchItemsTool requires user_id.")
        return json.dumps({"error": "User context missing for search."})

    api_endpoint = f"{NODE_BACKEND_URL}/api/search"
    headers = {'Content-Type': 'application/json'}
    # IMPORTANT: This assumes the Node.js endpoint uses user_id from the
    # authenticated request context. If not, user_id might need to be
    # passed differently or this tool needs the auth token.
    # For now, we pass user_id in the body for clarity, but the Node.js
    # endpoint MUST use the authenticated req.user.id for security.
    payload = {
        "query": query,
        "userId": str(user_id), # Ensure string if needed by backend
        "limit": 5 # Limit results for agent context
    }

    try:
        response = requests.post(api_endpoint, headers=headers, json=payload, timeout=15)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        results = response.json()
        logger.info(f"Search successful. Found {results.get('count', 0)} results.")
        # Format results for the LLM agent - concise summary
        formatted_results = []
        for item in results.get('results', []):
            formatted_results.append({
                "id": item.get('id'),
                "type": item.get('type'),
                "title": item.get('title'),
                "relevance": round(item.get('relevance', 0), 2),
                 # Include a small snippet if available, otherwise just title
                "preview": item.get('summary', item.get('content', ''))[:100] + "..."
            })

        if not formatted_results:
            return json.dumps({"results": "No relevant items found."})

        return json.dumps({"results": formatted_results})

    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling Node.js search API: {e}")
        return json.dumps({"error": f"Failed to connect to search service: {e}"})
    except Exception as e:
        logger.error(f"Error processing search results: {e}")
        return json.dumps({"error": f"Error during search: {e}"})


class SearchItemsTool(dspy.Tool):
    """Searches user's notes and transcripts semantically based on a query."""
    name = "search_items"
    description = "Searches through the user's notes and transcripts based on semantic meaning to find relevant items. Input is the search query string."
    input_variable = "query" # DSPy expects 'query' as input key

    def __init__(self):
        super().__init__(search_items_func)
