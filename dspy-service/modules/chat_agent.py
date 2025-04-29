import dspy
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

        # Instantiate the ReAct agent with the signature and tools
        self.agent = dspy.ReAct(
            ConversationalAgentSignature,
            tools=[search_tool, content_tool]
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
            # Pass user_id within the kwargs, which ReAct should pass down to tools
            prediction = self.agent(
                user_input=user_input,
                chat_history=chat_history,
                user_id=user_id # Pass user_id here
            )
            logger.info(f"Agent prediction successful. Final Answer: {prediction.final_answer[:100]}...")
            logger.debug(f"Agent thought process: {prediction.thought}")
            return prediction
        except Exception as e:
            logger.error(f"Error during agent forward pass: {e}", exc_info=True)
            # Return a structured error or re-raise
            # For now, let's create a dummy Prediction with error info
            return dspy.Prediction(
                thought=f"Error occurred: {e}",
                final_answer="Sorry, I encountered an error while processing your request."
            )
