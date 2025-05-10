from typing import Dict, List, Pattern
import re

# Confidence thresholds
MIN_CONFIDENCE_THRESHOLD = 0.6
PATTERN_MATCH_CONFIDENCE = 0.9
CONTEXT_MATCH_CONFIDENCE = 0.7

# Weight configurations
WEIGHTS: Dict[str, float] = {
    "exact_match": 1.0,
    "pattern_match": 0.8,
    "context_continuation": 0.9,  # Increased to give more weight to conversation flow
    "message_length": 0.3,
    "llm_classification": 0.5
}

# Casual conversation patterns
CASUAL_PHRASES: List[str] = [
    # Greetings
    "how are you", "how's it going", "what's up", "hey", "hi", "hello",
    "good morning", "good afternoon", "good evening", "good night",
    # Acknowledgments
    "thanks", "thank you", "thx", "ty", "cool", "nice", "great",
    "ok", "okay", "k", "bye", "goodbye", "see you", "later",
    # Simple responses
    "yes", "no", "yeah", "nah", "sure", "good", "fine", "not bad",
    # Common internet slang
    "hbu", "wbu", "sup", "nvm", "brb", "gtg", "idk", "idc",
    # Follow-ups
    "what about you", "and you", "same here", "me too",
    # Status responses
    "im good", "i'm good", "nothing new", "nothing much", "not much",
    # Intent phrases
    "just wanted to", "wanted to say", "just saying", "just to say",
    "just checking", "just wondering", "just curious", "just thinking",
    # Conversational intents
    "can we talk", "let's chat", "wanna talk", "want to chat",
    "have a minute", "got a sec", "do you have time"
]

# Regex patterns for casual conversation
CASUAL_PATTERNS: Dict[str, Pattern] = {
    "greeting": re.compile(r"(?i)^(hey+|hi+|hello+|sup+)\b\s*"),
    "how_are_you": re.compile(r"(?i).*\b(how are (you|u)|how('s| is) it going)\b"),
    "thanks": re.compile(r"(?i).*\b(thanks|thank you|thx|ty)\b"),
    "goodbye": re.compile(r"(?i).*\b(bye|goodbye|see you|cya|later)\b"),
    "acknowledgment": re.compile(r"(?i)^(ok|okay|k|sure|yep|yeah|yes|no|nah|fine)\b"),
    "about_you": re.compile(r"(?i).*\b(what about (you|u)|how about (you|u)|(and|but) (you|u)|hbu|wbu)\b"),
    "status": re.compile(r"(?i)^(i'?m\s+)?(good|fine|great|ok|okay|alright)[\s,!.]*$"),
    "nothing_new": re.compile(r"(?i)(nothing|not) (much|new|really)[\s,!.]*"),
    "repeated_chars": re.compile(r"(\w)\1{2,}"),  # Matches repeated characters like "heyyy"
    "casual_intent": re.compile(r"(?i)(just|wanted to|trying to)?\s*(say|tell you|chat|talk|check|wonder|think)"),
    "open_ended": re.compile(r"(?i).*\b(anything|something) (to say|on your mind)\??"),
    "casual_question": re.compile(r"(?i)\b(what do you|what would you|do you have|can you) (think|say|like|want|help with)\b"),
    "check_time": re.compile(r"(?i)\b(have a (minute|sec|moment)|got a (sec|minute)|do you have time)\b"),
    "transition_intent": re.compile(r"(?i)\b(by the way|while we('re| are)|speaking of|that reminds me|on that note)\b")
}

# Response templates
RESPONSE_TEMPLATES: Dict[str, List[str]] = {
    # Basic casual responses
    "greeting": [
        "Hey! How's your day going?",
        "Hi there! What's new?",
        "Hello! How are you today?"
    ],
    "how_are_you": [
        "I'm doing great, thanks for asking! How about you?",
        "All good here! How are you doing?",
        "Pretty good! How's your day been?"
    ],
    "thanks": [
        "You're welcome!",
        "Anytime!",
        "No problem at all!"
    ],
    "goodbye": [
        "Goodbye! Have a great day!",
        "See you later!",
        "Take care!"
    ],
    
    # Transitional responses
    "casual_to_notes": [
        "That's interesting! Have you thought about keeping notes on this?",
        "Would you like to save some of these thoughts in your notes?",
        "This seems worth noting down. Should we create a quick note about it?"
    ],
    "note_suggestion": [
        "By the way, you have some related notes that might interest you.",
        "This reminds me of some notes you've written before.",
        "Would you like to see your previous notes about this topic?"
    ],
    
    # Re-engagement responses
    "check_interest": [
        "Are you interested in exploring this topic further in your notes?",
        "Would you like to organize these thoughts somewhere?",
        "Should we look up what you've written about this before?"
    ],
    "feature_reminder": [
        "Remember, you can always ask me to help find or organize your notes!",
        "I'm here to help you manage your notes and ideas.",
        "Feel free to ask about any of your notes or topics you're interested in."
    ],

    # Casual intent responses
    "casual_intent": [
        "I'm here! What's on your mind?",
        "Of course, I'm always happy to chat! What would you like to talk about?",
        "Sure thing! How can I help you today?"
    ],
    "open_ended": [
        "I can help with lots of things! We could look through your notes, brainstorm ideas, or just chat. What interests you?",
        "I'm here to help with whatever you need - managing notes, finding information, or just talking things through.",
        "I'd be happy to help with your notes or have a friendly chat. What would you prefer?"
    ],
    "check_time": [
        "Absolutely! I'm here to help. What's on your mind?",
        "Of course, I always have time to chat. What would you like to discuss?",
        "I'm all ears! What can I help you with?"
    ],
    "transition": [
        "Good point! Would you like to explore that topic further?",
        "That's a nice connection. Should we look into it more?",
        "Interesting transition! Would you like to dive deeper into that?"
    ]
}
