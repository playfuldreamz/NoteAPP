import dspy
from typing import List, Tuple

class ConversationalAgentSignature(dspy.Signature):
    """
    Engages in a conversation to answer questions and perform actions based on the user's notes and transcripts.
    Carefully check the chat history for context. Use the search_items tool to find relevant notes or transcripts based on the user's query and history.
    If specific details are needed from an item found via search, use the get_item_content tool with the correct item_type ('note' or 'transcript') and item_id.
    Synthesize information from the tools and chat history to provide a comprehensive final answer.
    If you need to use a tool, your thought process should indicate the tool name and the exact input arguments.
    """
    user_input: str = dspy.InputField(desc="The latest query or command from the user.")
    chat_history: List[Tuple[str, str]] = dspy.InputField(desc="The history of the conversation (user, agent pairs).")
    # user_id is implicitly passed to tools via the forward method context

    thought: str = dspy.OutputField(desc="The step-by-step reasoning process to arrive at the answer, including which tool to use and why, and the arguments for the tool if applicable.")
    final_answer: str = dspy.OutputField(desc="The final, comprehensive response to the user.")
