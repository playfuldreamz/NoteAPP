"""Module for NoteApp chat agent nodes that synthesize responses and handle errors."""
from typing import Dict, Any, List
import traceback
import re

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.language_models import BaseChatModel

from .graph_state import GraphState

async def extract_subject(query: str, llm: BaseChatModel) -> str:
    """Extract the main subject from a user query using an LLM."""
    prompt_template = (
        "You are an expert at identifying the core subject of a user's query. "
        "Please extract the main subject from the following user query. "
        "The subject should be a concise noun phrase representing what the query is about. "
        "Respond with ONLY the extracted subject. "
        "For example:\n"
        "Query: 'do i have notes on project alpha?' -> Subject: 'project alpha'\n"
        "Query: 'can you give me a recipe for pepperoni pizza' -> Subject: 'a recipe for pepperoni pizza'\n"
        "Query: 'what\'s the weather like?' -> Subject: 'the weather'\n"
        "Query: 'tell me about the new marketing strategy' -> Subject: 'the new marketing strategy'\n\n"
        "User Query: \"{user_query}\"\n"
        "Extracted Subject:"
    )
    
    subject_extraction_prompt = prompt_template.format(user_query=query)
    
    try:
        response = await llm.ainvoke([HumanMessage(content=subject_extraction_prompt)])
        extracted_subject = response.content.strip()
        
        # Basic validation: if LLM returns something very short, empty, or the original query, fallback.
        if not extracted_subject or len(extracted_subject) < 3 or extracted_subject.lower() == query.lower():
            print(f"LLM subject extraction yielded unusable result ('{extracted_subject}'), falling back to original query for subject.")
            return query.strip() # Fallback to original query
            
        return extracted_subject
    except Exception as e:
        print(f"Error during LLM subject extraction: {e}. Falling back to original query.")
        return query.strip() # Fallback to original query

def extract_target_title_from_get_request(query_text: str) -> str:
    """Extract the target note title from a get content request."""
    match = re.search(r"(?:content of|text of|details of|full text of|provide the content for) (?:the )?\"?(.*?)\"? note", query_text, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    return None

def handle_error_node(state: GraphState) -> Dict[str, Any]:
    """Node for handling errors in the graph execution."""
    print("--- Executing Node: handle_error ---")
    error_msg = state.get("error_message") or "An unexpected error occurred. Please try again."
    return {
        "messages": [AIMessage(content=error_msg)],
        "final_answer": error_msg
    }

async def synthesize_answer_node(state: GraphState, llm: BaseChatModel) -> Dict[str, Any]:
    """Node for synthesizing final answers using the LLM."""
    print("--- Executing Node: synthesize_answer ---")
    user_input = state["user_input"]
    current_conversation_messages = state["messages"]
    fetched_content_map = state.get("fetched_content_map", {})
    search_results = state.get("search_results", [])

    # Build context from fetched content
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
                title_match = re.match(r"(?:Note|Transcript):\s*(.*?)\n", full_content_text_from_tool, re.IGNORECASE)
                if title_match:
                    actual_title = title_match.group(1).strip().lower()
                    if target_title_query == actual_title:
                        content_part_match = re.search(r"Content:\n(.*)", full_content_text_from_tool, re.DOTALL | re.IGNORECASE)
                        if content_part_match:
                            specifically_requested_content_text = content_part_match.group(1).strip()
                            identified_target_title = actual_title.title()
                            break

    if not specifically_requested_content_text and fetched_content_map:
        context_from_fetched_content += "\n\nHere is some content I found previously:\n"
        for item_key, content_text in fetched_content_map.items():
            context_from_fetched_content += f"\n--- Content from {item_key.replace('_', ' ')} ---\n"
            context_from_fetched_content += f"{content_text.strip()}\n"
        context_from_fetched_content += "--- End of fetched content ---\n"

    # Prepare context from search results if no content was fetched
    context_from_search_results = ""
    if not fetched_content_map and search_results:
        context_from_search_results += "\nI also found the following items that might be relevant:\n"
        for item in search_results[:3]:
            context_from_search_results += f"- {item['type'].capitalize()} (ID: {item['id']}): {item['title']} [Relevance: {item['relevance']:.2f}]\n"

    # Add tool outputs as context
    tool_output_text = ""
    for msg in current_conversation_messages:
        if isinstance(msg, ToolMessage):
            tool_output_text += f"\nTool Output:\n{msg.content}\n"

    has_fetched_any_content = bool(fetched_content_map)
    MIN_RELEVANCE_THRESHOLD = 0.01
    initial_search_had_relevant_results = any(
        item.get("relevance", -1.0) >= MIN_RELEVANCE_THRESHOLD for item in search_results
    ) if search_results else False

    # Determine the appropriate system prompt based on context
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
        subject = await extract_subject(user_input, llm)
        system_prompt_content = (
            f"You are NoteApp's helpful assistant. The user asked for content related to '{subject}'. "
            "It seems I was unable to retrieve specific content for this request in the previous steps. "
            "Please inform the user that you couldn't retrieve the specific content and ask if they'd like to try searching again or rephrasing."
        )
    elif not initial_search_had_relevant_results and not has_fetched_any_content:
        subject = await extract_subject(user_input, llm)
        system_prompt_content = (
            f"You are NoteApp's helpful assistant. The user's query is: '{user_input}'\n\n"
            f"First, clearly inform the user that you could not find any relevant notes or transcripts in their collection about '{subject}'.\n\n"
            "After you have stated that no notes or transcripts were found, THEN attempt to answer the user's original query ('{user_input}') using your general knowledge.\n"
            "If you can provide a general answer, do so directly after the statement about not finding notes.\n"
            "If you cannot answer the query from your general knowledge, then after stating that no notes/transcripts were found, simply state that you are also unable to answer the query using your general knowledge.\n"
            "Your response should be plain text, without any markdown formatting."
        )
    else:
        system_prompt_content = (
            "You are NoteApp's helpful assistant. Your task is to answer the user's question based on the preceding conversation history, "
            "which includes their original query and any information retrieved from tools (like search results or note content).\n"
            "Please synthesize a comprehensive answer. Do not use markdown like asterisks for lists if the original content does not use them; try to preserve original formatting if presenting content directly.\n"
            "If you use information from a specific note or transcript, mention its title or ID.\n"
            "If the user asked a question like 'do I have notes on X?' and you found relevant notes, confirm their existence and ask if the user would like to see the content of any specific item, even if you have already fetched some content internally. List the titles of the top 1-2 relevant items found.\n"
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
        response = await llm.ainvoke(prompt_messages)
        answer = response.content.strip()
        print(f"Synthesized Answer from LLM: {answer}")
        
        if not answer:
            subject = await extract_subject(user_input, llm)
            if has_fetched_any_content or initial_search_had_relevant_results:
                answer = f"I found some information regarding '{subject}', but I'm having trouble formulating a specific answer. Could you rephrase or ask something more specific about it?"
            else: # This case corresponds to 'not initial_search_had_relevant_results and not has_fetched_any_content'
                answer = (
                    f"I'm sorry, I could not find any relevant notes or transcripts about '{subject}'. "
                    "Additionally, I'm unable to provide a general answer to your query at this time. "
                    "You might want to try rephrasing or asking something else."
                )
            print(f"LLM returned empty, using fallback: {answer}")
        
        return {
            "messages": [AIMessage(content=answer)],
            "final_answer": answer,
            "error_message": None
        }

    except Exception as e:
        print(f"Error in synthesize_answer_node LLM call: {e}")
        traceback.print_exc()
        subject = await extract_subject(user_input, llm)
        fallback = f"I'm sorry, I had trouble processing your request about '{subject}'. Please try again."
        return {
            "messages": [AIMessage(content=fallback)],
            "final_answer": fallback,
            "error_message": f"Error during answer synthesis: {str(e)}"
        }
