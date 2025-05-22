from typing import Dict, Any
import traceback
import re

from langchain_core.messages import AIMessage, HumanMessage

from .graph_state import GraphState
from .nodes_synthesis import extract_target_title_from_get_request
from ..conversation.analyzer import MessageAnalyzer
from ..conversation.response import ResponseGenerator
from ..conversation.types import ConversationContext
from ..conversation.intent import IntentType

def analyze_input_node(state: GraphState, message_analyzer: MessageAnalyzer) -> Dict[str, Any]:
    print("--- Executing Node: analyze_input ---")
    user_input = state["user_input"]
    messages = state["messages"]
    iteration_count = state.get("iteration_count", 0) + 1

    if iteration_count > 5:
        print("--- Max iterations reached in analyze_input. Routing to error. ---")
        return {
            "error_message": "I seem to be stuck in a loop. Could you please rephrase your request?",
            "iteration_count": iteration_count
        }

    conversation_context_for_analyzer = ConversationContext(
        chat_history=messages[:-1],
        current_message=user_input
    )

    try:
        analysis_result_obj = message_analyzer.analyze(user_input, conversation_context_for_analyzer)
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
            "search_query": None
        }

        intent_val = analysis_dict["intent"]
        keywords = analysis_dict["keywords"]
        requires_tool = analysis_dict["requires_tool"]
        required_tools_list = analysis_dict.get("required_tools", [])        # First check for content retrieval requests
        note_title_to_search = extract_target_title_from_get_request(user_input)
        if note_title_to_search:
            # This is a content retrieval request, override intent
            analysis_dict["intent"] = IntentType.ACTION.value
            update_payload["search_query"] = note_title_to_search
        # Otherwise handle regular searches
        elif intent_val in [IntentType.QUERY_NOTES.value, IntentType.SEARCH_REQUEST.value] and keywords:
            update_payload["search_query"] = user_input
        elif requires_tool and not update_payload["search_query"] and keywords:
            update_payload["search_query"] = " ".join(keywords)
        
        if update_payload.get("search_query"):
             print(f"Search query set: {update_payload['search_query']}")
        return update_payload
    except Exception as e:
        print(f"Error in analyze_input_node: {e}")
        traceback.print_exc()
        return {"error_message": f"Error during input analysis: {str(e)}", "iteration_count": iteration_count}

async def casual_chat_node(state: GraphState, response_generator: ResponseGenerator) -> Dict[str, Any]:
    print("--- Executing Node: casual_chat ---")
    user_input = state["user_input"]
    messages = state["messages"]
    casual_exchange_count = state.get("casual_exchange_count", 0) + 1

    conversation_context_for_casual_chat = ConversationContext(
        chat_history=[msg for msg in messages[:-1] if isinstance(msg, (HumanMessage, AIMessage))],
        current_message=user_input
    )
    try:
        casual_reply = await response_generator.generate_response(conversation_context_for_casual_chat)
        print(f"Casual Reply Generated: {casual_reply}")
        return {
            "messages": [AIMessage(content=casual_reply)],
            "final_answer": casual_reply,
            "casual_exchange_count": casual_exchange_count
        }
    except Exception as e:
        print(f"Error in casual_chat_node: {e}")
        traceback.print_exc()
        fallback_reply = "I'm not sure how to respond to that right now, but I'm here to help with your notes!"
        return {
            "messages": [AIMessage(content=fallback_reply)],
            "final_answer": fallback_reply,
            "error_message": f"Error during casual chat generation: {str(e)}"
        }
