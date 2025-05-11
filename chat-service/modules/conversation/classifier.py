from typing import List, Optional
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import SystemMessage, HumanMessage

from .types import ClassificationResult, ConversationContext
from .normalizer import MessageNormalizer
from .patterns import PatternMatcher
from .weights import WeightsHandler
from .constants import WEIGHTS

class ConversationClassifier:
    def __init__(self, llm: Optional[BaseChatModel] = None):
        self.llm = llm
        self.normalizer = MessageNormalizer()
        self.pattern_matcher = PatternMatcher()
        self.weights_handler = WeightsHandler()

    async def classify(self, context: ConversationContext) -> ClassificationResult:
        """Classify a message as casual or task-oriented conversation."""
        # Normalize the input
        normalized_text = self.normalizer.normalize(context.current_message)
        characteristics = self.normalizer.get_characteristics(context.current_message)

        # Fast path: Check if message has obvious casual characteristics
        if (characteristics.get("has_repeated_chars") or 
            characteristics.get("starts_lowercase") or 
            characteristics.get("length", 100) < 5):  # Very short messages are likely casual
            return ClassificationResult(
                is_casual=True,
                confidence=0.8,
                reasons=["Message characteristics suggest casual conversation"],
                weights={"characteristics": 0.8}
            )

        # Check for exact matches (also fast path)
        if exact_match := self.pattern_matcher.check_exact_matches(normalized_text):
            return ClassificationResult(
                is_casual=True,
                confidence=1.0,
                reasons=["Exact match found"],
                weights={"exact_match": 1.0}
            )

        # Get all pattern matches
        pattern_matches = self.pattern_matcher.check_regex_patterns(normalized_text)
        
        # Calculate weights
        pattern_weight = self.weights_handler.calculate_pattern_weight(pattern_matches)
        context_weight = self.weights_handler.calculate_context_weight(context)
        char_weight = self.weights_handler.calculate_characteristics_weight(characteristics)
        
        weights = {
            "pattern_match": pattern_weight,
            "context": context_weight,
            "characteristics": char_weight
        }
        
        # Calculate total confidence
        total_weight = sum(weights.values())
        
        # If we're confident enough, no need to use LLM
        if self.weights_handler.is_confident(total_weight):
            return ClassificationResult(
                is_casual=True,
                confidence=total_weight,
                reasons=[f"Pattern matched: {m.pattern_type}" for m in pattern_matches],
                weights=weights
            )

        # If we have an LLM available, use it as a last resort
        if self.llm is not None:
            llm_result = await self._get_llm_classification(context)
            weights["llm_classification"] = llm_result * WEIGHTS["llm_classification"]
            total_weight += weights["llm_classification"]

        return ClassificationResult(
            is_casual=total_weight >= 0.6,
            confidence=total_weight,
            reasons=[
                f"Pattern matched: {m.pattern_type}" for m in pattern_matches
            ] + ["Context analysis", "LLM classification"],
            weights=weights
        )

    async def _get_llm_classification(self, context: ConversationContext) -> float:
        """Get classification from LLM as a last resort."""
        try:
            messages = [
                SystemMessage(content="""You are a message classifier.
                Analyze if the message is casual conversation/small talk.
                Consider the context of previous messages.
                Respond with a confidence score between 0 and 1."""),
                HumanMessage(content=f"Previous messages: {[m.content for m in context.chat_history[-2:] if m]}\nCurrent message: {context.current_message}")
            ]
            response = await self.llm.ainvoke(messages)
            try:
                return float(response.content.strip())
            except ValueError:
                return 0.5
        except Exception as e:
            print(f"Error in LLM classification: {e}")
            return 0.0
