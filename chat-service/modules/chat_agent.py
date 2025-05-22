from typing import List, Dict, Any, Optional, TypedDict as PydanticTypedDict # Use Pydantic's TypedDict for dataclass_transform
from typing_extensions import Annotated # For add_messages

from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage # Added ToolMessage
import traceback
import re # For parsing tool output
import json # For parsing tool output if it's structured

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.base import BaseCheckpointSaver # For type hinting

from .conversation import (
    ConversationClassifier,
    ResponseGenerator,
    ConversationContext, # May need to adapt or replace its usage
    MessageAnalyzer,
    IntentType
)
from .conversation.history.message_history_manager import MessageHistoryManager

# --- Define Graph State ---
class GraphState(PydanticTypedDict):
    """
    Represents the state of our graph.

    Attributes:
        messages: The list of messages accumulated so far.
        user_input: The current input from the user.
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
    """
    messages: Annotated[List[Any], add_messages] # Can be HumanMessage, AIMessage, ToolMessage
    user_input: str
    user_id: str
    jwt_token: str
    initial_analysis: Optional[Dict[str, Any]] = None # Store MessageAnalysis output
    search_query: Optional[str] = None
    search_results: Optional[List[Dict]] = None
    item_id_to_fetch: Optional[int] = None
    item_type_to_fetch: Optional[str] = None
    fetched_content_map: Annotated[Dict[str, str], lambda x, y: {**x, **y}] # Simple dict merge
    final_answer: Optional[str] = None
    error_message: Optional[str] = None
    iteration_count: int = 0 # To prevent potential infinite loops during development


class NoteAppChatAgent:
    """Agent for handling NoteApp chat interactions using LangGraph."""

    def __init__(self, llm: BaseChatModel, tools: List[BaseTool], checkpointer: BaseCheckpointSaver):
        """Initialize the chat agent with an LLM, tools, and LangGraph workflow."""
        self.llm = llm
        self.base_tools = {tool.name: tool for tool in tools} # Store tools in a dict for easy access

        # Initialize conversation handlers (can be used by nodes)
        self.classifier = ConversationClassifier(llm=llm)
        self.response_generator = ResponseGenerator(llm=llm)
        self.message_analyzer = MessageAnalyzer()
        self.history_manager = MessageHistoryManager() # For initial history processing

        # --- Build the LangGraph Workflow ---
        workflow_builder = StateGraph(GraphState)

        # Define Nodes (we'll implement these functions in Phase 2)
        workflow_builder.add_node("analyze_input", self._analyze_input_node)
        workflow_builder.add_node("search_notes", self._search_notes_node)
        workflow_builder.add_node("get_content", self._get_content_node)
        workflow_builder.add_node("synthesize_answer", self._synthesize_answer_node)
        workflow_builder.add_node("casual_chat", self._casual_chat_node)
        workflow_builder.add_node("handle_error", self._handle_error_node)

        # Define Edges (we'll implement routing logic in Phase 3)
        workflow_builder.set_entry_point("analyze_input")

        workflow_builder.add_conditional_edges(
            "analyze_input",
            self._route_after_analysis,
            {
                "search_notes": "search_notes",
                "casual_chat": "casual_chat",
                "synthesize_answer": "synthesize_answer", # e.g., if no tools needed
                "handle_error": "handle_error"
            }
        )
        workflow_builder.add_conditional_edges(
            "search_notes",
            self._route_after_search,
            {
                "get_content": "get_content",
                "synthesize_answer": "synthesize_answer", # No relevant results or error
                "handle_error": "handle_error"
            }
        )
        workflow_builder.add_conditional_edges(
            "get_content",
            self._route_after_get_content,
            {
                "get_content": "get_content", # Loop to get more content (different item)
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
        print("--- Executing Node: analyze_input ---")
        user_input = state["user_input"]
        messages = state["messages"]
        iteration_count = state.get("iteration_count", 0) + 1

        if iteration_count > 5: # Safety break for too many iterations without resolution
            print("--- Max iterations reached in analyze_input. Routing to error. ---")
            return {
                "error_message": "I seem to be stuck in a loop. Could you please rephrase your request?",
                "iteration_count": iteration_count
            }

        # Prepare ConversationContext for MessageAnalyzer
        conversation_context_for_analyzer = ConversationContext(
            chat_history=messages[:-1], # All but the current user message
            current_message=user_input
        )

        try:
            analysis_result = self.message_analyzer.analyze(user_input, conversation_context_for_analyzer)
            print(f"Message Analysis Result: Intent={analysis_result.intent.value}, Confidence={analysis_result.confidence:.2f}, RequiresTool={analysis_result.requires_tool}")

            update_payload: Dict[str, Any] = {
                "initial_analysis": {
                    "intent": analysis_result.intent.value,
                    "sentiment": analysis_result.sentiment.value,
                    "confidence": analysis_result.confidence,
                    "syntax_has_question": analysis_result.syntax.has_question,
                    "keywords": analysis_result.keywords,
                    "requires_tool": analysis_result.requires_tool,
                    "required_tools": analysis_result.required_tools,
                    "requires_context": analysis_result.requires_context
                },
                "iteration_count": iteration_count
            }

            # If intent is to query notes or search, set up the search query
            if analysis_result.intent in [IntentType.QUERY_NOTES, IntentType.SEARCH_REQUEST] and analysis_result.keywords:
                update_payload["search_query"] = user_input
                print(f"Search query set to: {update_payload['search_query']}")

            return update_payload

        except Exception as e:
            print(f"Error in _analyze_input_node: {e}")
            traceback.print_exc()
            return {
                "error_message": f"Error during input analysis: {str(e)}",
                "iteration_count": iteration_count
            }

    def _search_notes_node(self, state: GraphState) -> Dict[str, Any]:
        print("--- Executing Node: search_notes ---")
        search_query = state.get("search_query")
        user_id = state["user_id"]
        jwt_token = state["jwt_token"]
        iteration_count = state.get("iteration_count", 0) # Get current, don't increment here

        if not search_query:
            print("--- No search query found in state. Routing to error. ---")
            return {"error_message": "No search query was provided for searching notes."}

        try:
            search_tool = self.base_tools.get("search_noteapp")
            if not search_tool:
                print("--- search_noteapp tool not found. ---")
                return {"error_message": "Search tool is not available."}

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

            print(f"Parsed search results: {parsed_results}")

            # Add a ToolMessage to the messages list
            tool_message = ToolMessage(content=tool_output_str, tool_call_id="search_noteapp_0") # Placeholder tool_call_id

            return {
                "messages": [tool_message], # Append tool output to history
                "search_results": parsed_results,
                "error_message": None # Clear any previous error
            }

        except Exception as e:
            print(f"Error in _search_notes_node: {e}")
            traceback.print_exc()
            error_message_content = f"Error while searching notes: {str(e)}"
            tool_error_message = ToolMessage(content=error_message_content, tool_call_id="search_noteapp_error_0", is_error=True)
            return {
                "messages": [tool_error_message],
                "error_message": error_message_content,
                "search_results": [] # Ensure search_results is empty on error
            }

    def _get_content_node(self, state: GraphState) -> Dict[str, Any]:
        print("--- Executing Node: get_content ---")
        item_id = state.get("item_id_to_fetch")
        item_type = state.get("item_type_to_fetch")
        user_id = state["user_id"]
        jwt_token = state["jwt_token"]
        fetched_map = state.get("fetched_content_map", {})

        if item_id is None or item_type is None:
            print("--- item_id_to_fetch or item_type_to_fetch not found in state. Routing to error. ---")
            return {"error_message": "Missing item ID or type to fetch content."}

        # Construct the key for the fetched_content_map
        content_key = f"{item_type}_{item_id}"
        if content_key in fetched_map:
            print(f"--- Content for {content_key} already fetched. Skipping. ---")
            # This case should ideally be prevented by routing logic,
            # but it's a good safeguard. We don't want to add another ToolMessage.
            # We might just pass through or decide to synthesize if this happens.
            # For now, let's assume routing handles this and this node is only called for new content.
            # If routing *can* lead here, we need to decide what to do.
            # Let's proceed as if it's new content to fetch.
            pass # Or, if this indicates an issue, route to error or synthesize.

        try:
            get_content_tool = self.base_tools.get("get_noteapp_content")
            if not get_content_tool:
                print("--- get_noteapp_content tool not found. ---")
                return {"error_message": "Get content tool is not available."}

            # Set authentication for the tool
            if hasattr(get_content_tool, "set_auth"):
                get_content_tool.set_auth(jwt_token=jwt_token, user_id=user_id)
            else:
                print("Warning: get_noteapp_content tool does not have set_auth method.")

            # Prepare the input for the tool.
            # Your GetNoteAppContentTool._run expects a JSON string.
            tool_input_dict = {"item_id": item_id, "item_type": item_type}
            tool_input_json_str = json.dumps(tool_input_dict)

            print(f"Invoking get_noteapp_content tool with input: {tool_input_json_str}")
            tool_output_str = get_content_tool.run(tool_input_json_str) # Pass JSON string
            print(f"Raw output from get_noteapp_content: {tool_output_str[:200]}...")

            # Add a ToolMessage to the messages list
            tool_message = ToolMessage(content=tool_output_str, tool_call_id=f"get_content_{item_id}")

            # Update the fetched_content_map
            # The reducer `lambda x, y: {**x, **y}` for fetched_content_map will merge this.
            updated_fetched_content = {content_key: tool_output_str}

            return {
                "messages": [tool_message],
                "fetched_content_map": updated_fetched_content,
                "item_id_to_fetch": None, # Clear after fetching
                "item_type_to_fetch": None, # Clear after fetching
                "error_message": None
            }

        except Exception as e:
            print(f"Error in _get_content_node: {e}")
            traceback.print_exc()
            error_message_content = f"Error while fetching content for {item_type} ID {item_id}: {str(e)}"
            tool_error_message = ToolMessage(
                content=error_message_content,
                tool_call_id=f"get_content_{item_id}_error",
                is_error=True
            )
            return {
                "messages": [tool_error_message],
                "error_message": error_message_content,
                "item_id_to_fetch": None, # Clear even on error to prevent re-fetch loop on this item
                "item_type_to_fetch": None
            }

    async def _synthesize_answer_node(self, state: GraphState) -> Dict[str, Any]:
        print("--- Executing Node: synthesize_answer ---")
        user_input = state["user_input"]  # The original user query for this turn
        current_conversation_messages = state["messages"]
        fetched_content_map = state.get("fetched_content_map", {})
        search_results_summary = state.get("search_results", [])

        # 1. Prepare context from fetched content
        context_from_fetched_content = ""
        if fetched_content_map:
            context_from_fetched_content += "\n\nHere is the content I found for you:\n"
            for item_key, content_text in fetched_content_map.items():
                context_from_fetched_content += f"\n--- Content from {item_key.replace('_', ' ')} ---\n"
                context_from_fetched_content += f"{content_text.strip()}\n"
            context_from_fetched_content += "--- End of fetched content ---\n"

        # 2. Prepare context from search results (if no specific content was fetched)
        context_from_search_results = ""
        if not fetched_content_map and search_results_summary:
            context_from_search_results += "\nI also found the following items that might be relevant:\n"
            for item in search_results_summary[:3]:
                context_from_search_results += f"- {item['type'].capitalize()} (ID: {item['id']}): {item['title']} [Relevance: {item['relevance']:.2f}]\n"

        # 3. Construct the prompt for the LLM
        prompt_messages = [
            SystemMessage(
                content="You are NoteApp's helpful assistant. Your task is to answer the user's question based on the preceding conversation history, which includes their original query and any information retrieved from tools (like search results or note content).\n"
                        "Please synthesize a comprehensive and direct answer.\n"
                        "If you use information from a specific note or transcript, mention its title or ID.\n"
                        "If no relevant information was found by the tools, clearly state that and, if appropriate, ask for clarification or suggest alternatives.\n"
                        "Do not refer to the tools themselves in your final answer unless it's to explain why you couldn't find something."
                        f"{context_from_fetched_content}"
                        # Optionally add summary of other search results:
                        f"{context_from_search_results}"
            )
        ]
        prompt_messages.extend(current_conversation_messages)

        print(f"DEBUG: Messages being sent to LLM for synthesis: {prompt_messages}")

        try:
            response = await self.llm.ainvoke(prompt_messages)
            answer = response.content
            print(f"Synthesized Answer from LLM: {answer}")

            return {
                "messages": [AIMessage(content=answer)],
                "final_answer": answer,
                "error_message": None
            }
        except Exception as e:
            print(f"Error in _synthesize_answer_node LLM call: {e}")
            traceback.print_exc()
            fallback = "I'm sorry, I had trouble putting together an answer based on the information I found."
            return {
                "messages": [AIMessage(content=fallback)],
                "final_answer": fallback,
                "error_message": f"Error during answer synthesis: {str(e)}"
            }

    async def _casual_chat_node(self, state: GraphState) -> Dict[str, Any]:
        print("--- Executing Node: casual_chat ---")
        user_input = state["user_input"]
        # messages state already contains the full history including the latest user message

        # Construct ConversationContext for ResponseGenerator
        conversation_context_for_casual_chat = ConversationContext(
            chat_history=state['messages'][:-1], # History up to the last user message
            current_message=user_input
        )

        try:
            # ResponseGenerator.generate_response is async
            casual_reply = await self.response_generator.generate_response(conversation_context_for_casual_chat)
            print(f"Casual Reply Generated: {casual_reply}")

            return {
                "messages": [AIMessage(content=casual_reply)], # This will be appended to the state's messages
                "final_answer": casual_reply
            }
        except Exception as e:
            print(f"Error in _casual_chat_node: {e}")
            traceback.print_exc()
            fallback_reply = "I'm not sure how to respond to that right now, but I'm here to help with your notes!"
            return {
                "messages": [AIMessage(content=fallback_reply)],
                "final_answer": fallback_reply,
                "error_message": f"Error during casual chat generation: {str(e)}"
            }

    def _handle_error_node(self, state: GraphState) -> Dict[str, Any]:
        print("--- Executing Node: handle_error ---")
        error_msg = state.get("error_message") or "An unexpected error occurred. Please try again."
        # Add the error as an AI message to the history
        return {
            "messages": [AIMessage(content=error_msg)],
            "final_answer": error_msg
        }

    # --- Routing Functions (Phase 3) ---
    def _route_after_analysis(self, state: GraphState) -> str:
        print("--- Routing: after_analysis ---")
        if state.get("error_message"):
            print("Error found in analysis, routing to handle_error.")
            return "handle_error"

        analysis = state.get("initial_analysis")
        if not analysis:
            print("No initial analysis found, routing to handle_error.")
            state["error_message"] = "Internal error: Input analysis was not performed."
            return "handle_error"

        intent_str = analysis.get("intent")
        requires_tool = analysis.get("requires_tool", False)
        search_query = state.get("search_query")

        print(f"Routing based on: Intent='{intent_str}', RequiresTool={requires_tool}, SearchQuerySet={bool(search_query)}")

        if intent_str == IntentType.CASUAL.value or \
           (intent_str == IntentType.EMOTIONAL.value and not requires_tool):
            print("Routing to casual_chat.")
            return "casual_chat"
        
        if intent_str in [IntentType.QUERY_NOTES.value, IntentType.SEARCH_REQUEST.value] and search_query:
            print("Routing to search_notes.")
            return "search_notes"

        if requires_tool and not search_query:
            print("Tools required but no search query. Routing to synthesize_answer for now.")
            return "synthesize_answer"

        print("No specific tool route and not casual. Routing to synthesize_answer.")
        return "synthesize_answer"

    def _route_after_search(self, state: GraphState) -> str:
        print("--- Routing: after_search ---")
        iteration_count = state.get("iteration_count", 0)

        if state.get("error_message"):
            print("Error found after search_notes, routing to handle_error.")
            return "handle_error"

        search_results = state.get("search_results")
        fetched_content_map = state.get("fetched_content_map", {})

        # Define a minimum relevance threshold
        MIN_RELEVANCE_THRESHOLD = 0.0  # Adjust as needed

        if not search_results:
            print("No search results found, routing to synthesize_answer.")
            return "synthesize_answer"

        # Filter by relevance and sort
        relevant_results = sorted(
            [res for res in search_results if res.get("relevance", -1.0) >= MIN_RELEVANCE_THRESHOLD],
            key=lambda x: x.get("relevance", -1.0),
            reverse=True
        )

        if not relevant_results:
            print(f"No results meet relevance threshold ({MIN_RELEVANCE_THRESHOLD}), routing to synthesize_answer.")
            return "synthesize_answer"

        # Find the next relevant item whose content hasn't been fetched yet
        for item in relevant_results:
            item_id = item.get("id")
            item_type = item.get("type")
            content_key = f"{item_type}_{item_id}"
            if item_id is not None and item_type and content_key not in fetched_content_map:
                print(f"Found relevant, unfetched item: {content_key}. Routing to get_content.")
                state["item_id_to_fetch"] = item_id
                state["item_type_to_fetch"] = item_type
                return "get_content"

        print("All relevant items fetched or no new relevant items to fetch. Routing to synthesize_answer.")
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

        MIN_RELEVANCE_THRESHOLD = 0.0
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
            state["item_id_to_fetch"] = next_item_to_fetch["id"]
            state["item_type_to_fetch"] = next_item_to_fetch["type"]
            return "get_content"
        else:
            print("No more relevant unfetched items or fetched enough. Routing to synthesize_answer.")
            return "synthesize_answer"


    async def invoke(self, user_input: str, chat_history: List[Dict], user_id: str, jwt_token: str) -> Dict[str, Any]:
        """Process user input using the LangGraph workflow."""
        print(f"\n--- New Invocation --- User: {user_input[:50]}... ---")
        # Use MessageHistoryManager to prepare initial messages for the graph state
        # This part can be simplified if LangGraph's `add_messages` handles dicts directly
        temp_history_manager = MessageHistoryManager() # Use a temporary one or adapt
        for msg_dict in chat_history: # msg_dict is like {"role": "user", "content": "...">
            temp_history_manager.add_message(msg_dict)
        # The user_input is the current message, add it to history manager to get it formatted
        # Or, handle it separately in the initial state construction.
        # For LangGraph, it's common to pass the current user input separately
        # and have the graph append it to messages.

        # Convert dict messages to LangChain message objects for the graph state
        langchain_messages = []
        for msg_dict in chat_history:
            if msg_dict.get("role") == "user":
                langchain_messages.append(HumanMessage(content=msg_dict.get("content", "")))
            elif msg_dict.get("role") == "assistant":
                langchain_messages.append(AIMessage(content=msg_dict.get("content", "")))
            # Add handling for SystemMessage or ToolMessage if they appear in chat_history

        # Add current user input as the latest message
        langchain_messages.append(HumanMessage(content=user_input))

        initial_graph_state = GraphState(
            messages=langchain_messages,
            user_input=user_input,
            user_id=user_id,
            jwt_token=jwt_token,
            initial_analysis=None,
            search_query=None,
            search_results=None,
            item_id_to_fetch=None,
            item_type_to_fetch=None,
            fetched_content_map={},
            final_answer=None,
            error_message=None,
            iteration_count=0
        )

        # Configuration for the graph invocation, including the thread_id for memory
        # Using user_id as thread_id makes sense for per-user conversation memory
        config = {"configurable": {"thread_id": user_id}}

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

            if isinstance(final_state_result, dict):
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
