import random
from typing import List, Optional
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import SystemMessage, HumanMessage
from .constants import RESPONSE_TEMPLATES, CASUAL_PATTERNS
from .types import ConversationContext

class ResponseGenerator:
    def __init__(self, llm: Optional[BaseChatModel] = None):
        self.llm = llm

    def _get_template_response(self, pattern_type: str) -> str:
        """Get a response from templates."""
        if pattern_type in RESPONSE_TEMPLATES:
            return random.choice(RESPONSE_TEMPLATES[pattern_type])
        return None

    def _detect_pattern_type(self, message: str) -> str:
        """Detect the type of casual pattern in the message."""
        message = message.lower()
        for pattern_type, pattern in CASUAL_PATTERNS.items():
            if pattern.search(message):
                return pattern_type
        return "general"

    async def generate_response(self, context: ConversationContext) -> str:
        """Generate a response based on the conversation context."""
        # First try template-based response
        pattern_type = self._detect_pattern_type(context.current_message)
        template_response = self._get_template_response(pattern_type)
        
        if template_response and random.random() < 0.7:  # 70% chance to use template
            return template_response

        # If no template or we choose not to use it, use LLM if available
        if self.llm is not None:
            try:
                messages = [
                    SystemMessage(content="""You are a friendly assistant.
                    Respond naturally to casual conversation.
                    Keep responses concise and engaging.
                    Stay friendly and informal."""),
                    *context.chat_history[-2:],
                    HumanMessage(content=context.current_message)
                ]
                response = await self.llm.ainvoke(messages)
                # Remove <think> tags
                response_content = response.content
                if "<think>" in response_content and "</think>" in response_content:
                    start_index = response_content.find("<think>")
                    end_index = response_content.find("</think>") + len("</think>")
                    response_content = response_content.replace(response_content[start_index:end_index], "").strip()
                return response_content

            except Exception as e:
                print(f"Error generating LLM response: {e}")

        # Fallback to template or default response
        return template_response or "I'm here to help! How can I assist you?"
