"""Module for NoteApp chat agent graph routing logic."""
from typing import Dict, Any
from .graph_state import GraphState
from ..conversation.intent import IntentType


def route_after_analysis(state: GraphState) -> str:
    """Route to next node after input analysis."""
    print("--- Routing: after_analysis ---")
    if state.get("error_message"):
        print("Error found in analysis, routing to handle_error.")
        return "handle_error"

    analysis = state.get("initial_analysis")
    if not analysis:
        print("No initial analysis found, routing to handle_error.")
        return "handle_error"

    intent_str = analysis.get("intent")
    requires_tool = analysis.get("requires_tool", False)
    search_query = state.get("search_query")

    print(f"Routing based on: Intent='{intent_str}', RequiresTool={requires_tool}, SearchQuerySet={bool(search_query)}")

    # Path 1: If _analyze_input_node explicitly prepared a search_query, always prioritize search.
    if search_query:
        print(f"Search query ('{search_query}') is set. Routing to search_notes.")
        return "search_notes"

    # Path 2: If no search query was prepared, check for casual chat.
    if intent_str == IntentType.CASUAL.value or \
       (intent_str == IntentType.EMOTIONAL.value and not requires_tool):
        print("No search query, and intent is casual. Routing to casual_chat.")
        return "casual_chat"
    
    # Path 3: Tools might be required by analysis, but _analyze_input_node didn't form a search query.
    if requires_tool:
        print(f"Tools required ('{analysis.get('required_tools')}') but no search query. Routing to synthesize_answer.")
        return "synthesize_answer"

    # Path 4: Default/Fallback
    print("Default: No search query, not casual, no explicit tool need from analysis. Routing to synthesize_answer.")
    return "synthesize_answer"


def route_after_search(state: GraphState) -> str:
    """Route to next node after search operation."""
    print("--- Routing: after_search ---")
    # iteration_count = state.get("iteration_count", 0) # Not used here

    if state.get("error_message"):
        print("Error found after search_notes, routing to handle_error.")
        return "handle_error"

    # item_id_to_fetch and item_type_to_fetch are now set by _search_notes_node's return
    current_item_id_to_fetch = state.get("item_id_to_fetch")
    current_item_type_to_fetch = state.get("item_type_to_fetch")

    if current_item_id_to_fetch is not None and current_item_type_to_fetch is not None:
        print(f"--- Routing to get_content for item ID: {current_item_id_to_fetch}, Type: {current_item_type_to_fetch} ---")
        return "get_content"
    else:
        # This case means _search_notes_node found no new relevant items to fetch initially
        print("--- No specific new item to fetch determined by search_notes. Routing to synthesize_answer. ---")
        return "synthesize_answer"


def route_after_get_content(state: GraphState) -> str:
    """Route to next node after content retrieval."""
    print("--- Routing: after_get_content ---")
    if state.get("error_message"):
        print("Error found after get_content, routing to synthesize_answer (or handle_error if no content at all).")
        if not state.get("fetched_content_map"):
            return "handle_error"
        return "synthesize_answer"

    fetched_content_map = state.get("fetched_content_map", {})
    search_results = state.get("search_results", [])
    MAX_ITEMS_TO_FETCH = 2

    if len(fetched_content_map) >= MAX_ITEMS_TO_FETCH:
        print(f"Reached max items to fetch ({MAX_ITEMS_TO_FETCH}). Routing to synthesize_answer.")
        return "synthesize_answer"

    # In _route_after_get_content, use a stricter threshold and do not set state directly
    MIN_RELEVANCE_THRESHOLD = 0.1  # Stricter threshold to avoid irrelevant fetches
    next_item_to_fetch = None
    if search_results:
        sorted_relevant_results = sorted(
            [res for res in search_results if res.get("relevance", -1.0) >= MIN_RELEVANCE_THRESHOLD],
            key=lambda x: x.get("relevance", -1.0),
            reverse=True
        )
        for item in sorted_relevant_results:
            item_id = item.get("id")
            item_type = item.get("type")
            content_key = f"{item_type}_{item_id}"
            if item_id is not None and item_type and content_key not in fetched_content_map:
                next_item_to_fetch = item
                break

    if next_item_to_fetch:
        print(f"More relevant, unfetched content available ({next_item_to_fetch['type']}_{next_item_to_fetch['id']}). Routing back to get_content.")
        # Do not set state here; _get_content_node will pick the next item
        return "get_content"
    else:
        print("No more relevant unfetched items or fetched enough. Routing to synthesize_answer.")
        return "synthesize_answer"
