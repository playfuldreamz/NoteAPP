"""Tool analysis and requirements detection module."""
from typing import Dict, List, Tuple
from .intent import IntentType
from .features import SyntaxFeatures

class ToolAnalyzer:
    """Analyzes tool requirements for messages."""

    def __init__(self):
        self.tool_indicators = {
            "search": {
                "keywords": ["find", "search", "look", "where", "any", "list"],
                "tools": ["search_noteapp", "get_noteapp_content"]
            },
            "create": {
                "keywords": ["create", "add", "new", "make"],
                "tools": ["create_note"]
            },
            "update": {
                "keywords": ["update", "edit", "change", "modify"],
                "tools": ["update_note"]
            },
            "delete": {
                "keywords": ["delete", "remove", "clear"],
                "tools": ["delete_note"]
            }
        }

        # Intents that typically require tools
        self.tool_requiring_intents = {
            IntentType.QUERY_NOTES: ["search_noteapp"],
            IntentType.SEARCH_REQUEST: ["search_noteapp", "get_noteapp_content"],
            IntentType.ACTION: []  # Will be determined by keywords
        }

    def determine_required_tools(self, intent: IntentType, syntax: SyntaxFeatures, keywords: List[str]) -> Tuple[bool, List[str]]:
        """Determine which tools might be needed based on intent and syntax features."""
        required_tools = []

        # Add default tools based on intent
        if intent in self.tool_requiring_intents:
            required_tools.extend(self.tool_requiring_intents[intent])

        # Check keywords against tool indicators
        for category, indicators in self.tool_indicators.items():
            if any(keyword in keywords for keyword in indicators["keywords"]):
                required_tools.extend(indicators["tools"])

        # Remove duplicates while preserving order
        unique_tools = list(dict.fromkeys(required_tools))
        
        return bool(unique_tools), unique_tools
