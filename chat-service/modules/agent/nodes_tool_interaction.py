"""Module for NoteApp chat agent nodes that interact with tools."""
from typing import Dict, Any, Optional, List
import traceback
import json
import re
from langchain_core.messages import ToolMessage
from langchain_core.tools import BaseTool
from .graph_state import GraphState

def search_notes_node(state: GraphState, base_tools: Dict[str, BaseTool]) -> Dict[str, Any]:
    """Node for searching notes using the search_noteapp tool."""
    print("--- Executing Node: search_notes ---")
    search_query = state.get("search_query")
    user_id = state["user_id"]
    jwt_token = state["jwt_token"]

    if not search_query:
        print("--- No search query found in state. Routing to error. ---")
        return {"error_message": "No search query was provided for searching notes.", "casual_exchange_count": 0}

    try:
        search_tool = base_tools.get("search_noteapp")
        if not search_tool:
            print("--- search_noteapp tool not found. ---")
            return {"error_message": "Search tool is not available.", "casual_exchange_count": 0}

        # Set authentication for the tool
        if hasattr(search_tool, "set_auth"):
            search_tool.set_auth(jwt_token=jwt_token, user_id=user_id)
        else:
            print("Warning: search_noteapp tool does not have set_auth method.")

        print(f"Invoking search_noteapp tool with query: '{search_query}'")
        tool_output_str = search_tool.run(search_query)
        print(f"Raw output from search_noteapp: {tool_output_str[:200]}...")

        # --- Parse the tool_output_str to extract structured search results ---
        parsed_results = []
        item_pattern = re.compile(
            r"-\s*(Note|Transcript)\s*\(ID:\s*(\d+)\):\s*(.*?)\s*\[Relevance:\s*(-?\d+\.\d+)\].*?(?:\[TITLE MATCH\])?"
        )
        for line in tool_output_str.split('\n'):
            match = item_pattern.match(line.strip())
            if match:
                item_type, item_id_str, title, relevance_str = match.groups()
                try:
                    parsed_results.append({
                        "id": int(item_id_str),
                        "type": item_type.lower(),
                        "title": title.strip(),
                        "relevance": float(relevance_str)
                    })
                except ValueError:
                    print(f"Warning: Could not parse item_id or relevance for line: {line}")

        # --- Determine first item to fetch ---
        item_id_for_next_step: Optional[int] = None
        item_type_for_next_step: Optional[str] = None
        fetched_map_in_state = state.get("fetched_content_map", {})

        MIN_RELEVANCE_THRESHOLD = 0.0
        relevant_results = sorted(
            [res for res in parsed_results if res.get("relevance", -1.0) >= MIN_RELEVANCE_THRESHOLD],
            key=lambda x: x.get("relevance", -1.0),
            reverse=True
        )

        if relevant_results:
            for item in relevant_results:
                item_id = item.get("id")
                item_type = item.get("type")
                if item_id is not None and item_type:
                    content_key = f"{item_type}_{item_id}"
                    if content_key not in fetched_map_in_state:
                        item_id_for_next_step = item_id
                        item_type_for_next_step = item_type
                        break

        tool_message = ToolMessage(content=tool_output_str, tool_call_id="search_noteapp_0")
        return {
            "messages": [tool_message],
            "search_results": parsed_results,
            "item_id_to_fetch": item_id_for_next_step,
            "item_type_to_fetch": item_type_for_next_step,
            "error_message": None,
            "casual_exchange_count": 0
        }

    except Exception as e:
        print(f"Error in search_notes_node: {e}")
        traceback.print_exc()
        error_message_content = f"Error while searching notes: {str(e)}"
        tool_error_message = ToolMessage(
            content=error_message_content,
            tool_call_id="search_noteapp_error_0",
            is_error=True
        )
        return {
            "messages": [tool_error_message],
            "error_message": error_message_content,
            "search_results": [],
            "item_id_to_fetch": None,
            "item_type_to_fetch": None,
            "casual_exchange_count": 0
        }

def get_content_node(state: GraphState, base_tools: Dict[str, BaseTool]) -> Dict[str, Any]:
    """Node for retrieving content using the get_noteapp_content tool."""
    print("--- Executing Node: get_content ---")
    item_id = state.get("item_id_to_fetch")
    item_type = state.get("item_type_to_fetch")
    user_id = state["user_id"]
    jwt_token = state["jwt_token"]
    fetched_map = state.get("fetched_content_map", {})

    # If item_id and item_type are not set, try to pick next relevant item
    if item_id is None or item_type is None:
        print("--- item_id/type not in state, attempting to pick next from search_results ---")
        search_results = state.get("search_results", [])
        MIN_RELEVANCE_THRESHOLD = 0.01
        next_item_details = None
        if search_results:
            sorted_relevant_results = sorted(
                [res for res in search_results if res.get("relevance", -1.0) >= MIN_RELEVANCE_THRESHOLD],
                key=lambda x: x.get("relevance", -1.0),
                reverse=True
            )
            for item_data in sorted_relevant_results:
                _id = item_data.get("id")
                _type = item_data.get("type")
                content_key = f"{_type}_{_id}"
                if _id is not None and _type and content_key not in fetched_map:
                    next_item_details = item_data
                    break

        if next_item_details:
            item_id = next_item_details["id"]
            item_type = next_item_details["type"]
            print(f"--- Picked next item to fetch: {item_type}_{item_id} ---")
        else:
            print("--- No suitable next item to fetch from search_results. ---")
            return {"error_message": "No more relevant items to fetch content for."}

    if item_id is None or item_type is None:
        print("--- item_id_to_fetch or item_type_to_fetch still not found. Error. ---")
        return {"error_message": "Missing item ID or type to fetch content after trying to pick next."}

    content_key = f"{item_type}_{item_id}"
    if content_key in state.get("fetched_content_map", {}):
        print(f"--- Content for {content_key} already fetched. Skipping. ---")
        return {
            "item_id_to_fetch": None,
            "item_type_to_fetch": None
        }

    get_content_tool = base_tools.get("get_noteapp_content")
    if not get_content_tool:
        print("--- get_noteapp_content tool not found. ---")
        return {"error_message": "Get content tool is not available."}

    if hasattr(get_content_tool, "set_auth"):
        get_content_tool.set_auth(jwt_token=jwt_token, user_id=user_id)
    else:
        print("Warning: get_noteapp_content tool does not have set_auth method.")

    tool_input = {"item_id": item_id, "item_type": item_type}
    tool_input_json = json.dumps(tool_input)
    print(f"Invoking get_noteapp_content tool with input: {tool_input_json}")
    
    try:
        tool_output_str = get_content_tool.run(tool_input_json)
        print(f"Raw output from get_noteapp_content: {tool_output_str[:200]}...")

        tool_message = ToolMessage(content=tool_output_str, tool_call_id=f"get_content_{item_id}")
        updated_fetched_content = {content_key: tool_output_str}

        return {
            "messages": [tool_message],
            "fetched_content_map": updated_fetched_content,
            "item_id_to_fetch": None,
            "item_type_to_fetch": None,
            "error_message": None
        }
    except Exception as e:
        print(f"Error in get_content_node: {e}")
        traceback.print_exc()
        return {
            "error_message": f"Error fetching content: {str(e)}",
            "messages": [],
            "fetched_content_map": {}
        }
