# Import patch first to ensure proper adapter configuration
from modules import dspy_config_patch

import dspy
import os
from typing import Any, Dict
# Use absolute imports instead of relative imports
from signatures.agent_signature import ConversationalAgentSignature
from tools.search_tool import SearchItemsTool
from tools.content_tool import GetItemContentTool
import logging

logger = logging.getLogger(__name__)

class ChatAgent(dspy.Module):
    """A conversational agent that interacts with user notes and transcripts."""
    def __init__(self):
        super().__init__()
        # Instantiate tools
        search_tool = SearchItemsTool()
        content_tool = GetItemContentTool()
        
        # Configure ReAct with limited iterations and tools
        react_kwargs = {
            "max_iters": 5,   # Limit iterations to avoid issues
        }
        
        # Instantiate the ReAct agent with the signature and tools
        self.agent = dspy.ReAct(
            ConversationalAgentSignature,
            tools=[search_tool, content_tool],
            **react_kwargs
        )
        logger.info("ChatAgent initialized with ReAct and tools.")

    def forward(self, user_input: str, chat_history: list, user_id: str | int):
        """
        Runs one turn of the conversational agent.

        Args:
            user_input (str): The user's latest message.
            chat_history (list): The conversation history.
            user_id (str | int): The ID of the user for context.

        Returns:
            dspy.Prediction: The agent's prediction including thought and final_answer.
        """
        logger.info(f"ChatAgent forward pass. User Input: '{user_input}', History Length: {len(chat_history)}, UserID: {user_id}")
        try:
            # For non-note queries, use the full ReAct agent
            prediction = self.agent(
                user_input=user_input,
                chat_history=chat_history,
                user_id=user_id
            )
            logger.info(f"Agent prediction successful. Final Answer: {prediction.final_answer[:100]}...")
            logger.debug(f"Agent thought process: {prediction.thought}")
            return prediction
        except Exception as e:
            logger.error(f"Error during agent forward pass: {e}", exc_info=True)
            # Handle Ollama-specific errors
            if "Invalid Message passed in {'role': 'system'" in str(e):
                logger.warning("Detected Ollama system message format issue - returning fallback response")
                # Provide a helpful response that doesn't need the full agent capabilities
                if "search" in user_input.lower() or "find" in user_input.lower():
                    return dspy.Prediction(
                        thought="User wants to search for content, but there's an issue with the agent.",
                        final_answer="I can search for information in your notes. Could you please specify what you're looking for in more detail?"
                    )
                elif "content" in user_input.lower() or "note" in user_input.lower():
                    return dspy.Prediction(
                        thought="User wants content from a specific note.",
                        final_answer="I can retrieve note content for you. Please specify which note you'd like to see by ID or by describing what it contains."
                    )
            
            # Return a structured error or re-raise
            # For now, let's create a dummy Prediction with error info
            return dspy.Prediction(
                thought=f"Error occurred: {e}",
                final_answer="Sorry, I encountered an error while processing your request."
            )
