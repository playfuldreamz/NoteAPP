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
# MessageHistoryManager might be removed or used differently later for pre-graph summarization
# from .conversation.history.message_history_manager import MessageHistoryManager

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
        casual_exchange_count: Tracks the number of consecutive casual exchanges.
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
    casual_exchange_count: int = 0


class NoteAppChatAgent:
    """Agent for handling NoteApp chat interactions using LangGraph."""

    def __init__(self, llm: BaseChatModel, tools: List[BaseTool], checkpointer: BaseCheckpointSaver):
        """Initialize the chat agent with an LLM, tools, and LangGraph workflow."""
        self.llm = llm
        self.base_tools = {tool.name: tool for tool in tools} # Store tools in a dict for easy access

        # Initialize conversation handlers (can be used by nodes)
        # self.classifier = ConversationClassifier(llm=llm) # Removed
        self.response_generator = ResponseGenerator(llm=llm)
        self.message_analyzer = MessageAnalyzer() # MessageAnalyzer instantiates its own IntentClassifier
        # self.history_manager = MessageHistoryManager() # Removed

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
            analysis_result_obj = self.message_analyzer.analyze(user_input, conversation_context_for_analyzer)
            analysis_dict = {
                "intent": analysis_result_obj.intent.value,
                "sentiment": analysis_result_obj.sentiment.value,
                "confidence": analysis_result_obj.confidence,
                "syntax_has_question": analysis_result_obj.syntax.has_question,
                "keywords": analysis_result_obj.keywords,
                "requires_tool": analysis_result_obj.requires_tool,
                "required_tools": analysis_result_obj.required_tools,
                "requires_context": analysis_result_obj.requires_context
            }
            print(f"Message Analysis Result: {analysis_dict}")

            update_payload: Dict[str, Any] = {
                "initial_analysis": analysis_dict,
                "iteration_count": iteration_count,
                "search_query": None # Initialize search_query to None
            }

            intent_val = analysis_dict["intent"]
            keywords = analysis_dict["keywords"]
            requires_tool = analysis_dict["requires_tool"]
            required_tools_list = analysis_dict.get("required_tools", [])

            # Case 1: Standard search intent
            if intent_val in [IntentType.QUERY_NOTES.value, IntentType.SEARCH_REQUEST.value] and keywords:
                update_payload["search_query"] = user_input
                print(f"Search query (from intent): {update_payload['search_query']}")
            # Case 2: 'Get content' type of action, extract title for search
            elif intent_val == IntentType.ACTION.value and "get_noteapp_content" in required_tools_list:
                user_input_lower = user_input.lower()
                match = re.search(r"(?:content of|full text of|details of) (?:the )?(.*?) note", user_input_lower)
                if match:
                    note_title_to_search = match.group(1).strip()
                    if note_title_to_search:
                        update_payload["search_query"] = note_title_to_search
                        print(f"Search query (extracted for get_content): {note_title_to_search}")
                elif keywords:
                    update_payload["search_query"] = " ".join(keywords)
                    print(f"Search query (keywords for get_content): {update_payload['search_query']}")
                else:
                    update_payload["search_query"] = user_input
                    print(f"Search query (full input for get_content): {update_payload['search_query']}")
            elif requires_tool and not update_payload["search_query"] and keywords:
                update_payload["search_query"] = " ".join(keywords)
                print(f"Search query (general tool requirement with keywords): {update_payload['search_query']}")

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
        # iteration_count = state.get("iteration_count", 0) # Not incremented here

        if not search_query:
            print("--- No search query found in state. Routing to error. ---")
            return {"error_message": "No search query was provided for searching notes.", "casual_exchange_count": 0}

        try:
            search_tool = self.base_tools.get("search_noteapp")
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

            print(f"Parsed search results: {parsed_results}")

            # --- Determine first item to fetch ---
            item_id_for_next_step: Optional[int] = None
            item_type_for_next_step: Optional[str] = None
            fetched_map_in_state = state.get("fetched_content_map", {}) 

            MIN_RELEVANCE_THRESHOLD = 0.0 
            relevant_results_for_first_fetch = sorted(
                [res for res in parsed_results if res.get("relevance", -1.0) >= MIN_RELEVANCE_THRESHOLD],
                key=lambda x: x.get("relevance", -1.0),
                reverse=True
            )

            if relevant_results_for_first_fetch:
                for item in relevant_results_for_first_fetch:
                    item_id = item.get("id")
                    item_type = item.get("type")
                    if item_id is not None and item_type:
                        content_key = f"{item_type}_{item_id}"
                        if content_key not in fetched_map_in_state:
                            item_id_for_next_step = item_id
                            item_type_for_next_step = item_type
                            print(f"--- _search_notes_node determined first item to fetch: {content_key} ---")
                            break
            
            tool_message = ToolMessage(content=tool_output_str, tool_call_id="search_noteapp_0")

            return_payload = {
                "messages": [tool_message],
                "search_results": parsed_results,
                "item_id_to_fetch": item_id_for_next_step,
                "item_type_to_fetch": item_type_for_next_step,
                "error_message": None,
                "casual_exchange_count": 0 # Reset casual exchange count
            }
            
            return return_payload

        except Exception as e:
            print(f"Error in _search_notes_node: {e}")
            traceback.print_exc()
            error_message_content = f"Error while searching notes: {str(e)}"
            tool_error_message = ToolMessage(content=error_message_content, tool_call_id="search_noteapp_error_0", is_error=True)
            return {
                "messages": [tool_error_message],
                "error_message": error_message_content,
                "search_results": [],
                "item_id_to_fetch": None,
                "item_type_to_fetch": None,
                "casual_exchange_count": 0 # Reset casual exchange count
            }

    def _get_content_node(self, state: GraphState) -> Dict[str, Any]:
        print("--- Executing Node: get_content ---")
        item_id = state.get("item_id_to_fetch")
        item_type = state.get("item_type_to_fetch")
        user_id = state["user_id"]
        jwt_token = state["jwt_token"]
        fetched_map = state.get("fetched_content_map", {})

        # If item_id and item_type are not set, try to pick the next relevant, unfetched item
        if item_id is None or item_type is None:
            print("--- item_id/type not in state, attempting to pick next from search_results ---")
            search_results = state.get("search_results", [])
            MIN_RELEVANCE_THRESHOLD = 0.01  # Stricter threshold to avoid irrelevant fetches
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

        # After picking item_id/item_type if needed, always define content_key here
        content_key = f"{item_type}_{item_id}"

        if content_key in state.get("fetched_content_map", {}):
            print(f"--- Content for {content_key} already fetched. Skipping. ---")
            return {
                "item_id_to_fetch": None,
                "item_type_to_fetch": None
            }

        # After picking item_id/item_type if needed, get the tool
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
        updated_fetched_content = {content_key: tool_output_str}

        return {
            "messages": [tool_message],
            "fetched_content_map": updated_fetched_content,
            "item_id_to_fetch": None, # Clear after fetching
            "item_type_to_fetch": None, # Clear after fetching
            "error_message": None
        }

    async def _synthesize_answer_node(self, state: GraphState) -> Dict[str, Any]:
        print("--- Executing Node: synthesize_answer ---")
        user_input = state["user_input"]
        current_conversation_messages = state["messages"]
        fetched_content_map = state.get("fetched_content_map", {})
        search_results = state.get("search_results", [])

        def extract_subject(query):
            m = re.search(r"do i have (any )?notes (on|about|regarding) (.*?)[?]$", query, re.IGNORECASE)
            if m: return m.group(3).strip()
            m2 = re.search(r"(?:provide|show|get|give me) (?:the )?(?:full )?content of (?:the )?(.*?) note", query, re.IGNORECASE)
            if m2: return m2.group(1).strip()
            return query.strip()

        def extract_target_title_from_get_request(query_text):
            match = re.search(r"(?:content of|text of|details of|full text of|provide the content for) (?:the )?\"?(.*?)\"? note", query_text, re.IGNORECASE)
            if match: return match.group(1).strip().lower()
            return None

        # Build context_from_fetched_content (ensure it's just the raw content if possible)
        context_from_fetched_content = ""
        specifically_requested_content_text = None
        identified_target_title = None

        user_input_lower = user_input.lower()
        is_get_content_request = (
            "content of" in user_input_lower or
            "full text of" in user_input_lower or
            "details of" in user_input_lower or
            "provide the content for" in user_input_lower
        )

        if is_get_content_request:
            target_title_query = extract_target_title_from_get_request(user_input)
            if target_title_query and fetched_content_map:
                for item_key, full_content_text_from_tool in fetched_content_map.items():
                    title_match_in_tool_output = re.match(r"(?:Note|Transcript):\s*(.*?)\n", full_content_text_from_tool, re.IGNORECASE)
                    if title_match_in_tool_output:
                        actual_title_in_content = title_match_in_tool_output.group(1).strip().lower()
                        if target_title_query == actual_title_in_content:
                            content_part_match = re.search(r"Content:\n(.*)", full_content_text_from_tool, re.DOTALL | re.IGNORECASE)
                            if content_part_match:
                                specifically_requested_content_text = content_part_match.group(1).strip()
                                identified_target_title = actual_title_in_content.title()
                                break
        if not specifically_requested_content_text and fetched_content_map:
            context_from_fetched_content += "\n\nHere is some content I found previously:\n"
            for item_key, content_text in fetched_content_map.items():
                context_from_fetched_content += f"\n--- Content from {item_key.replace('_', ' ')} ---\n"
                context_from_fetched_content += f"{content_text.strip()}\n"
            context_from_fetched_content += "--- End of fetched content ---\n"

        # Prepare context from search results (if no specific content was fetched)
        context_from_search_results = ""
        if not fetched_content_map and search_results:
            context_from_search_results += "\nI also found the following items that might be relevant:\n"
            for item in search_results[:3]:
                context_from_search_results += f"- {item['type'].capitalize()} (ID: {item['id']}): {item['title']} [Relevance: {item['relevance']:.2f}]\n"

        # Add the raw tool output as plain text if available (from ToolMessage)
        tool_output_text = ""
        for msg in current_conversation_messages:
            if isinstance(msg, ToolMessage):
                tool_output_text += f"\nTool Output:\n{msg.content}\n"

        user_input_lower = user_input.lower()
        is_get_content_request = (
            "content of" in user_input_lower or
            "full text of" in user_input_lower or
            "details of" in user_input_lower or
            "provide the content for" in user_input_lower
        )
        has_fetched_any_content = bool(fetched_content_map)
        MIN_RELEVANCE_THRESHOLD = 0.01
        initial_search_had_relevant_results = any(
            item.get("relevance", -1.0) >= MIN_RELEVANCE_THRESHOLD for item in search_results
        ) if search_results else False

        system_prompt_content = ""

        if is_get_content_request and specifically_requested_content_text is not None:
            system_prompt_content = (
                f"You are NoteApp's helpful assistant. The user asked for the full content of the note titled '{identified_target_title}'. "
                "You have this content. Please present the following content verbatim. Do not add any commentary before or after it, and preserve all original formatting including line breaks and list styles."
                "\n\nHere is the content:\n"
                f"{specifically_requested_content_text}"
            )
        elif is_get_content_request and has_fetched_any_content:
            system_prompt_content = (
                "You are NoteApp's helpful assistant. The user asked for the content of a specific note. "
                "You couldn't find an exact match for the requested title among the content you've already fetched. "
                "Politely inform the user you couldn't find the specific note they asked for by that exact title. "
                "You can then list the titles of notes for which you *do* have content, and ask if they'd like to see one of those instead, or if they'd like to try a new search."
                f"{context_from_fetched_content}"
            )
        elif is_get_content_request and not has_fetched_any_content:
            subject = extract_subject(user_input)
            system_prompt_content = (
                f"You are NoteApp's helpful assistant. The user asked for content related to '{subject}'. "
                "It seems I was unable to retrieve specific content for this request in the previous steps. "
                "Please inform the user that you couldn't retrieve the specific content and ask if they'd like to try searching again or rephrasing."
            )
        elif not initial_search_had_relevant_results and not has_fetched_any_content:
            subject = extract_subject(user_input)
            system_prompt_content = (
                "You are NoteApp's helpful assistant. The user asked: '"
                f"{user_input}"
                "'.\nNo relevant notes or transcripts were found for this request.\n"
                f"Politely inform the user that you could not find any relevant notes about '{subject}', and suggest they add a note or clarify their request.\n"
                f"Always mention the subject ('{subject}') in your response.\n"
                "Do not attempt to answer the question directly.\n"
                "Your response should be plain text, without any markdown formatting.\n"
            )
        else:
            system_prompt_content = (
                "You are NoteApp's helpful assistant. Your task is to answer the user's question based on the preceding conversation history, "
                "which includes their original query and any information retrieved from tools (like search results or note content).\n"
                "Please synthesize a comprehensive and direct answer. Do not use markdown like asterisks for lists if the original content does not use them; try to preserve original formatting if presenting content directly.\n"
                "If you use information from a specific note or transcript, mention its title or ID.\n"
                "If, after reviewing all provided context (search results and fetched content), no information truly addresses the user's query, "
                "then politely state that you couldn't find the specific information they were looking for, even if some items were found by search.\n"
                "Always mention the main subject of the user's query in your response.\n"
                "Do not refer to the tools themselves in your final answer unless it's to explain why you couldn't find something.\n"
                f"{context_from_fetched_content}"
                f"{context_from_search_results}"
                f"{tool_output_text}"
            )
        prompt_messages = [SystemMessage(content=system_prompt_content)]
        prompt_messages.extend(current_conversation_messages)
        print(f"DEBUG: System Prompt for LLM synthesis: {system_prompt_content}")
        try:
            response = await self.llm.ainvoke(prompt_messages)
            answer = response.content.strip()
            print(f"Synthesized Answer from LLM: {answer}")
            if not answer:
                subject = extract_subject(user_input)
                if has_fetched_any_content or initial_search_had_relevant_results:
                    answer = f"I found some information regarding '{subject}', but I'm having trouble formulating a specific answer. Could you rephrase or ask something more specific about it?"
                else:
                    answer = f"I'm sorry, I could not find any relevant notes about '{subject}'. If you want to add a note or clarify your request, please let me know."
                print(f"LLM returned empty, using fallback: {answer}")
            return {
                "messages": [AIMessage(content=answer)],
                "final_answer": answer,
                "error_message": None
            }
        except Exception as e:
            print(f"Error in _synthesize_answer_node LLM call: {e}")
            traceback.print_exc()
            subject = extract_subject(user_input)
            fallback = f"I'm sorry, I had trouble processing your request about '{subject}'. Please try again."
            return {
                "messages": [AIMessage(content=fallback)],
                "final_answer": fallback,
                "error_message": f"Error during answer synthesis: {str(e)}"
            }

    async def _casual_chat_node(self, state: GraphState) -> Dict[str, Any]:
        print("--- Executing Node: casual_chat ---")
        user_input = state["user_input"]
        messages = state["messages"]
        casual_exchange_count = state.get("casual_exchange_count", 0) + 1


        conversation_context_for_casual_chat = ConversationContext(
            chat_history=[msg for msg in messages[:-1] if isinstance(msg, (HumanMessage, AIMessage))],
            current_message=user_input
        )

        try:
            casual_reply = await self.response_generator.generate_response(conversation_context_for_casual_chat)
            print(f"Casual Reply Generated: {casual_reply}")
            return {
                "messages": [AIMessage(content=casual_reply)],
                "final_answer": casual_reply,
                "casual_exchange_count": casual_exchange_count
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
