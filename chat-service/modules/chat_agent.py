from typing import List, Dict, Any, Optional
from functools import partial
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
import traceback
import re
import json

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver

from .agent.graph_state import GraphState
from .agent.nodes_initial import analyze_input_node, casual_chat_node
from .agent.nodes_tool_interaction import search_notes_node, get_content_node
from .agent.nodes_synthesis import synthesize_answer_node, handle_error_node

from .conversation import (
    ResponseGenerator,
    ConversationContext,
    MessageAnalyzer,
    IntentType
)

class NoteAppChatAgent:
    """Agent for handling NoteApp chat interactions using LangGraph."""

    def __init__(self, llm: BaseChatModel, tools: List[BaseTool], checkpointer: BaseCheckpointSaver):
        """Initialize the chat agent with an LLM, tools, and LangGraph workflow."""
        self.llm = llm
        self.base_tools = {tool.name: tool for tool in tools}

        # Initialize conversation handlers
        self.message_analyzer = MessageAnalyzer()
        self.response_generator = ResponseGenerator(llm=llm)

        # --- Build the LangGraph Workflow ---
        workflow_builder = StateGraph(GraphState)

        # Define Nodes using the standalone functions with dependencies
        workflow_builder.add_node(
            "analyze_input",
            partial(analyze_input_node, message_analyzer=self.message_analyzer)
        )
        workflow_builder.add_node(
            "casual_chat",
            partial(casual_chat_node, response_generator=self.response_generator)
        )
        workflow_builder.add_node(
            "search_notes",
            partial(search_notes_node, base_tools=self.base_tools)
        )
        workflow_builder.add_node(
            "get_content",
            partial(get_content_node, base_tools=self.base_tools)
        )
        workflow_builder.add_node(
            "synthesize_answer",
            partial(synthesize_answer_node, llm=self.llm)
        )
        workflow_builder.add_node("handle_error", handle_error_node)

        # Define Edges
        workflow_builder.set_entry_point("analyze_input")

        workflow_builder.add_conditional_edges(
            "analyze_input",
            self._route_after_analysis,
            {
                "search_notes": "search_notes",
                "casual_chat": "casual_chat",
                "synthesize_answer": "synthesize_answer",
                "handle_error": "handle_error"
            }
        )
        workflow_builder.add_conditional_edges(
            "search_notes",
            self._route_after_search,
            {
                "get_content": "get_content",
                "synthesize_answer": "synthesize_answer",
                "handle_error": "handle_error"
            }
        )
        workflow_builder.add_conditional_edges(
            "get_content",
            self._route_after_get_content,
            {
                "get_content": "get_content",
                "synthesize_answer": "synthesize_answer",
                "handle_error": "handle_error"
            }
        )

        workflow_builder.add_edge("casual_chat", END)
        workflow_builder.add_edge("synthesize_answer", END)
        workflow_builder.add_edge("handle_error", END)

        # Compile the graph with the passed-in, active checkpointer
        self.app = workflow_builder.compile(checkpointer=checkpointer)

    # Placeholder for node functions (Phase 2)
    def _analyze_input_node(self, state: GraphState) -> Dict[str, Any]:
        pass  # Implementation moved to nodes_initial.py

    # Node implementations moved to nodes_tool_interaction.py
    def _search_notes_node(self, state: GraphState) -> Dict[str, Any]:
        pass  # Implementation moved to nodes_tool_interaction.py

    def _get_content_node(self, state: GraphState) -> Dict[str, Any]:
        pass  # Implementation moved to nodes_tool_interaction.py

    # Node implementations moved to nodes_synthesis.py
    async def _synthesize_answer_node(self, state: GraphState) -> Dict[str, Any]:
        pass  # Implementation moved to nodes_synthesis.py

    def _handle_error_node(self, state: GraphState) -> Dict[str, Any]:
        pass  # Implementation moved to nodes_synthesis.py

    # --- Routing Functions (Phase 3) ---
    def _route_after_analysis(self, state: GraphState) -> str:
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

    def _route_after_search(self, state: GraphState) -> str:
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

    def _route_after_get_content(self, state: GraphState) -> str:
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


    async def invoke(self, user_input: str, chat_history: List[Dict], user_id: str, jwt_token: str) -> Dict[str, Any]:
        print(f"\\n--- New Invocation --- User: {user_input[:50]}... ---")

        langchain_messages: List[Any] = [] # Ensure it's List[Any] to match GraphState
        for msg_dict in chat_history:
            if msg_dict.get("role") == "user":
                langchain_messages.append(HumanMessage(content=msg_dict.get("content", "")))
            elif msg_dict.get("role") == "assistant": # Changed from "ai" to "assistant" to match common practice
                langchain_messages.append(AIMessage(content=msg_dict.get("content", "")))
        langchain_messages.append(HumanMessage(content=user_input)) # Add current user input

        initial_graph_state = GraphState(
            messages=langchain_messages,
            user_input=user_input,
            user_id=user_id,
            jwt_token=jwt_token,
            initial_analysis=None, search_query=None, search_results=None,
            item_id_to_fetch=None, item_type_to_fetch=None,
            fetched_content_map={}, final_answer=None, error_message=None,
            iteration_count=0,
            casual_exchange_count=0 # Initialize in state
        )
        config = {"configurable": {"thread_id": user_id}} # Ensure thread_id is correctly configured
        final_state_result = None
        try:
            # Stream events to observe the flow and state changes
            async for event in self.app.astream_events(initial_graph_state, config=config, version="v1"):
                kind = event["event"]
                if kind == "on_chat_model_stream":
                    content = event["data"]["chunk"].content
                    if content:
                        print(content, end="") # Stream LLM tokens
                elif kind == "on_tool_end":
                    print(f"\n--- Tool Output: {event['name']} ---")
                    print(event["data"].get("output"))
                    print("--- End Tool Output ---")
                elif kind == "on_chain_end": # In LangGraph, this often corresponds to a node finishing
                    if event["name"] == "LangGraph": # Overall graph completion
                        final_state_result = event["data"].get("output")
                        print(f"\n--- Graph Ended. Final State Output: {final_state_result} ---")


            if not final_state_result: # Fallback if stream doesn't yield final output directly
                 current_state = self.app.get_state(config)
                 final_state_result = current_state.values


            print(f"DEBUG: Raw final_state_result from graph: {final_state_result}")

            assistant_response = None
            error_msg = None

            # Handle the case where the output is a dict with a single node key (e.g. 'synthesize_answer')
            if isinstance(final_state_result, dict) and len(final_state_result) == 1:
                node_data = list(final_state_result.values())[0]
                if isinstance(node_data, dict):
                    assistant_response = node_data.get('final_answer')
                    error_msg = node_data.get('error_message')
                    if not assistant_response and not error_msg:
                        last_messages = node_data.get('messages', [])
                        ai_messages = [m for m in last_messages if isinstance(m, AIMessage)]
                        if ai_messages:
                            assistant_response = ai_messages[-1].content
            elif isinstance(final_state_result, dict):
                assistant_response = final_state_result.get('final_answer')
                error_msg = final_state_result.get('error_message')
                if not assistant_response and not error_msg:
                    last_messages = final_state_result.get('messages', [])
                    ai_messages = [m for m in last_messages if isinstance(m, AIMessage)]
                    if ai_messages:
                        assistant_response = ai_messages[-1].content
            elif isinstance(final_state_result, list):
                # Fallback: try to extract from last node output if graph ever returns a list
                for node_output_dict in reversed(final_state_result):
                    if isinstance(node_output_dict, dict):
                        for node_name, actual_output_data in node_output_dict.items():
                            if isinstance(actual_output_data, dict):
                                if 'final_answer' in actual_output_data and actual_output_data['final_answer']:
                                    assistant_response = actual_output_data['final_answer']
                                if 'error_message' in actual_output_data and actual_output_data['error_message']:
                                    error_msg = actual_output_data['error_message']
                                if assistant_response:
                                    break
                        if assistant_response:
                            break
                if not assistant_response and not error_msg:
                    for node_output_dict in reversed(final_state_result):
                        if isinstance(node_output_dict, dict):
                            for node_name, actual_output_data in node_output_dict.items():
                                if isinstance(actual_output_data, dict) and 'messages' in actual_output_data:
                                    last_messages_from_node = actual_output_data.get('messages', [])
                                    ai_messages = [m for m in last_messages_from_node if isinstance(m, AIMessage)]
                                    if ai_messages:
                                        assistant_response = ai_messages[-1].content
                                        break
                            if assistant_response:
                                break

            if error_msg and not assistant_response:
                assistant_response = error_msg
            elif not assistant_response:
                assistant_response = "I'm sorry, I encountered an issue and couldn't complete your request."

            print(f"DEBUG: Determined assistant_response: {assistant_response}")
            print(f"DEBUG: Determined error_msg: {error_msg}")

            return {"final_answer": assistant_response, "error": error_msg}

        except Exception as e:
            print(f"Error during LangGraph agent invocation: {e}")
            traceback.print_exc()
            error_response = "I encountered a critical error while processing your request."
            # self.history_manager.add_message({"role": "assistant", "content": error_response})
            return {"final_answer": error_response, "error": str(e)}
