from typing import List, Dict, Any, Optional, TypedDict as PydanticTypedDict
from typing_extensions import Annotated
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage  # Keep necessary imports for type hints
from langgraph.graph.message import add_messages  # Import for the reducer

# --- Define Graph State ---
class GraphState(PydanticTypedDict):
    """
    Represents the state of our graph.

    Attributes:
        messages: The list of messages accumulated so far.
        user_input: The current input from the user.
        original_user_input: The user's input before typo correction.
        user_id: The ID of the user for authentication and context.
        jwt_token: JWT token for authenticated tool calls.
        initial_analysis: Results from the MessageAnalyzer.
        search_query: The query to be used for searching notes.
        search_results: A list of dictionaries representing search results.
        item_id_to_fetch: The ID of the note/transcript to fetch content for.
        item_type_to_fetch: The type ('note' or 'transcript') of the item to fetch.
        fetched_content_map: A dictionary mapping item_ids (e.g., "note_123") to their fetched content.
        final_answer: The final response to be delivered to the user.
        error_message: Any error message encountered during processing.
        iteration_count: To prevent infinite loops if logic gets stuck.
        casual_exchange_count: Tracks the number of consecutive casual exchanges.
    """
    messages: Annotated[List[Any], add_messages]  # Can be HumanMessage, AIMessage, ToolMessage
    user_input: str
    original_user_input: Optional[str]  # Added to store the original input before correction
    user_id: str
    jwt_token: str
    initial_analysis: Optional[Dict[str, Any]] = None  # Store MessageAnalysis output
    search_query: Optional[str] = None
    search_results: Optional[List[Dict]] = None
    item_id_to_fetch: Optional[int] = None
    item_type_to_fetch: Optional[str] = None
    fetched_content_map: Annotated[Dict[str, str], lambda x, y: {**x, **y}]  # Simple dict merge
    final_answer: Optional[str] = None
    error_message: Optional[str] = None
    iteration_count: int = 0  # To prevent potential infinite loops during development
    casual_exchange_count: int = 0
