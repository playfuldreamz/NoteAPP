from typing import List, Dict, Any
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain.agents import AgentExecutor, create_react_agent
import traceback

from .conversation import (
    ConversationClassifier,
    ResponseGenerator,
    ConversationContext,
    MessageAnalyzer,
    IntentType
)
from .conversation.history.message_history_manager import MessageHistoryManager

class NoteAppChatAgent:
    """Agent for handling NoteApp chat interactions using LangChain."""
    
    def __init__(self, llm: BaseChatModel, tools: List[BaseTool]):
        """Initialize the chat agent with an LLM and tools."""
        self.llm = llm
        self.base_tools = tools
        
        # Initialize conversation handlers
        self.classifier = ConversationClassifier(llm=llm)
        self.response_generator = ResponseGenerator(llm=llm)
        self.message_analyzer = MessageAnalyzer()
        self.history_manager = MessageHistoryManager()
        
        # Enhanced ReAct prompt with explicit format requirements and examples
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful assistant for NoteApp, designed to help users find and understand their notes and transcripts.

            You have access to the following tools: {tool_names}

            Tool descriptions: {tools}            
            
            Follow these strict guidelines:

            For ALL responses, you MUST follow the ReAct format:
            Thought: Explain your reasoning about what to do next
            Action: Specify which tool to use (or "None" for direct response)
            Action Input: Exact parameters to pass to the tool
            Observation: The tool's response or [None if no tool used]
            ... (repeat Thought/Action/Action Input/Observation as needed)
            Final Answer: Your complete response to the user            
            
             
            IMPORTANT: After each tool call:
            - Read the Observation carefully
            - Decide what to do next based on that Observation
            - NEVER call get_noteapp_content with the same item_id twice
            - Move to Final Answer once you have enough information
            - When user asks about "that note" or "the note", check chat history 
              to identify which note they're referring to            
             
            For note-related questions:
            1. Start with search_noteapp:
               - Use the exact search term the user provided
               - Don't try to interpret or expand the search unless asked
               - For exact matches, include the term in quotes
             
            2. After getting search results:
               - Look at relevance scores and titles
               - Select ONLY the 1-2 most relevant items with matching terms
               - Pay special attention to title matches
               
            3. For each selected item, ONE TIME ONLY:
               - Call get_noteapp_content to get the full content
               - After getting content, ANALYZE it before any other action
               - If content fully answers the question, go straight to Final Answer
               - NEVER retrieve the same item_id twice
               - Stop after maximum 2 items
            
            4. Write Final Answer:
               - Summarize information from retrieved notes
               - If you found other relevant items but didn't retrieve them, mention their existence
               - If more notes exist but weren't retrieved, mention their existence in the Final Answer

            For "full content" requests:
            - If you just retrieved the note's content, return it directly
            - If you have the note ID, use get_noteapp_content immediately
            - Return the full content without summarizing

            For casual conversation:
            1. Use Thought and Final Answer only (no actions needed)
            2. Keep a natural, friendly tone
            3. Consider context from previous messages

            EXAMPLE 1 - Notes query:
            Human: Do I have any notes about Python?
            Thought: I should search for notes related to Python first
            Action: search_noteapp
            Action Input: "Python programming language tutorials notes"
            Observation: [Found 3 notes:
            - "Python Basics Tutorial" (id: 123)
            - "Advanced Python Decorators" (id: 124)
            - "Python Setup Guide" (id: 125)]
            Thought: Let me start with the Python Basics Tutorial since it seems most relevant
            Action: get_noteapp_content
            Action Input: {{"item_id": 123, "item_type": "note"}}
            Observation: [Note contains: "Introduction to Python basics including variables, loops, and functions..."]
            Thought: This basic tutorial is helpful, but let's also check the setup guide for a complete answer
            Action: get_noteapp_content
            Action Input: {{"item_id": 125, "item_type": "note"}}
            Observation: [Note contains: "Step-by-step guide for installing Python and setting up your development environment..."]
            Thought: I now have enough information to provide a comprehensive answer. The decorators note isn't needed since the user asked for general Python notes.
            Final Answer: Yes! I found several helpful Python notes. You have a beginner-friendly tutorial covering Python basics (variables, loops, and functions), and a detailed setup guide that walks through Python installation and environment setup. Would you like me to focus on any specific aspect of these notes?

            EXAMPLE 2 - Casual conversation:
            Human: How are you doing today?
            Thought: This is a casual greeting, I should respond naturally
            Final Answer: I'm doing great, thanks for asking! How are you?"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            ("ai", "{agent_scratchpad}")
        ])

    async def invoke(self, user_input: str, chat_history: List[Dict], user_id: str, jwt_token: str) -> Dict[str, Any]:
        """Process user input and return appropriate response."""
        # Add messages to history manager
        for msg in chat_history:
            self.history_manager.add_message(msg)
        
        # Add current user message
        self.history_manager.add_message({"role": "user", "content": user_input})

        # Get formatted history from manager
        formatted_history = self.history_manager.get_formatted_history()

        # Create conversation context
        context = ConversationContext(
            chat_history=formatted_history,
            current_message=user_input
        )

        # Debug token stats
        token_stats = self.history_manager.get_token_stats()
        print(f"Token stats: {token_stats}")

        # Analyze message intent and features
        try:
            analysis = self.message_analyzer.analyze(user_input, context)
            print(f"Message Analysis: Intent={analysis.intent.value}, Confidence={analysis.confidence:.2f}")
            print(f"Requires tools: {analysis.requires_tool}, Tools: {analysis.required_tools}")
            print(f"Keywords: {analysis.keywords}")
            
            # Enhanced casual conversation and creative request detection
            should_use_casual = (
                # Standard casual conversation criteria
                (analysis.intent in [IntentType.EMOTIONAL, IntentType.CASUAL] and 
                 analysis.confidence >= 0.4 and   # Lowered threshold for better coverage
                 not analysis.requires_tool and   # No tools needed
                 (len(user_input.split()) < 20    # Allow longer messages
                  or analysis.confidence > 0.8))  # High confidence overrides length
                or
                # Creative requests and message composition criteria
                (any(word in user_input.lower() for word in ['craft', 'write', 'create', 'compose', 'draft']) and
                 any(word in user_input.lower() for word in ['message', 'msg', 'messga', 'text', 'note', 'wish']))
            )
            
            if should_use_casual:
                casual_response = await self.response_generator.generate_response(context)
                self.history_manager.add_message({"role": "assistant", "content": casual_response})
                return {"final_answer": casual_response}
            
        except Exception as e:
            print(f"Error during message analysis: {e}. Proceeding with full agent.")
            
        # Initialize tools with authentication context
        request_tools = []
        for tool in self.base_tools:
            try:
                tool.set_auth(jwt_token=jwt_token, user_id=user_id)
            except AttributeError:
                pass  # Mock tools may not need auth
            
            # Only include tools that were detected as required, or all tools if no specific tools were detected
            if not analysis.required_tools or tool.name in analysis.required_tools:
                request_tools.append(tool)

        if not request_tools:
            # If no tools are available, fall back to casual response
            casual_response = await self.response_generator.generate_response(context)
            self.history_manager.add_message({"role": "assistant", "content": casual_response})
            return {"final_answer": casual_response}

        # Generate tool descriptions for the prompt
        tool_names = ", ".join([tool.name for tool in request_tools])
        tools_descriptions = "\n".join([f"{tool.name}: {tool.description}" for tool in request_tools])

        # Create agent and executor
        agent = create_react_agent(
            llm=self.llm,
            tools=request_tools,
            prompt=self.prompt
        )

        executor = AgentExecutor(
            agent=agent,
            tools=request_tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=10
        )

        try:
            # Execute agent with input
            input_dict = {
                "input": user_input,
                "chat_history": formatted_history,
                "tool_names": tool_names,
                "tools": tools_descriptions
            }

            print(f"Input to executor: {input_dict}")
            result = await executor.ainvoke(input_dict)
            assistant_response = result["output"]
            self.history_manager.add_message({"role": "assistant", "content": assistant_response})
            return {"final_answer": assistant_response}
            
        except Exception as e:
            print(f"Error during agent invocation: {e}")
            traceback.print_exc()
            error_response = "I encountered an error while processing your request. Please try again or rephrase your question."
            self.history_manager.add_message({"role": "assistant", "content": error_response})
            return {
                "final_answer": error_response,
                "error": str(e)
            }
