"""Message analysis and intent classification system."""
from typing import Dict, List, Optional
from dataclasses import dataclass

from .intent import IntentType, IntentClassifier
from .sentiment import SentimentType, SentimentAnalyzer
from .features import SyntaxFeatures, SyntaxAnalyzer
from .keywords import KeywordExtractor
from .tools_analyzer import ToolAnalyzer
from .types import ConversationContext
    
@dataclass
class MessageAnalysis:
    """Complete analysis of a message."""
    intent: IntentType
    sentiment: SentimentType
    confidence: float
    syntax: SyntaxFeatures
    keywords: List[str]
    requires_tool: bool
    required_tools: List[str]
    requires_context: bool

class MessageAnalyzer:
    """Analyzes message structure and intent before engaging LLM."""
    
    def __init__(self):
        self.intent_classifier = IntentClassifier()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.syntax_analyzer = SyntaxAnalyzer()
        self.keyword_extractor = KeywordExtractor()
        self.tool_analyzer = ToolAnalyzer()
        
    def analyze(self, message: str, context: Optional[ConversationContext] = None) -> MessageAnalysis:
        """Perform complete analysis of a message."""
        # Handle empty messages
        if not message.strip():
            return MessageAnalysis(
                intent=IntentType.CASUAL,
                sentiment=SentimentType.NEUTRAL,
                confidence=0.0,
                syntax=SyntaxFeatures(),
                keywords=[],
                requires_tool=False,
                required_tools=[],
                requires_context=False
            )
            
        # Extract syntactic features
        syntax_features = self.syntax_analyzer.extract_features(message)
        
        # Classify intent and get confidence
        intent, confidence = self.intent_classifier.classify_intent(message, context)
        
        # Analyze sentiment
        sentiment = self.sentiment_analyzer.analyze_sentiment(message)
        
        # Extract keywords
        keywords = self.keyword_extractor.extract_keywords(message)
        
        # Determine if tools are needed based on intent and syntax
        requires_tool, required_tools = self.tool_analyzer.determine_required_tools(intent, syntax_features, keywords)
        
        # Check if context is needed
        requires_context = self._requires_context(intent, syntax_features)
        
        return MessageAnalysis(
            intent=intent,
            sentiment=sentiment,
            confidence=confidence,
            syntax=syntax_features,
            keywords=keywords,
            requires_tool=requires_tool,
            required_tools=required_tools,
            requires_context=requires_context
        )
    
    def _requires_context(self, intent: IntentType, syntax: SyntaxFeatures) -> bool:
        """Determine if the analysis requires conversation context."""
        return (
            intent in [IntentType.QUERY_NOTES, IntentType.SEARCH_REQUEST] or
            syntax.has_question or
            not syntax.subject_is_notes
        )
