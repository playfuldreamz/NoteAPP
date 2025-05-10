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
    ConversationContext
)

class NoteAppChatAgent:
    """Agent for handling NoteApp chat interactions using LangChain."""
    
    def __init__(self, llm: BaseChatModel, tools: List[BaseTool]):
        """Initialize the chat agent with an LLM and tools."""
        self.llm = llm
        self.base_tools = tools
        
        # Initialize conversation handlers
        self.classifier = ConversationClassifier(llm=llm)
        self.response_generator = ResponseGenerator(llm=llm)
        
        # Prompt specifically formatted for ReAct agent
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful assistant for NoteApp, designed to help users find and understand their notes and transcripts.
            You have access to the following tools: {tool_names}

            Tool descriptions: {tools}
            
            Follow these guidelines:
            
            For note-related questions:
            - Use search_noteapp first to find relevant content
            - Always use get_noteapp_content to retrieve full note content
            - Read ALL search results carefully
            - Check note titles for relevance
            - Synthesize information from multiple sources
            
            When presenting information:
            - Never just say "yes/no" - provide details
            - Summarize key points
            - Structure responses for readability
            - Highlight important items
            - Maintain friendly tone
            - Suggest follow-up topics
            
            For casual conversation:
            - Respond naturally without tools
            - Keep the friendly tone
            
            TOOL USAGE:
            search_noteapp:
            - Action Input: "your search query"
            
            get_noteapp_content:
            - Action Input: {{"item_id": number, "item_type": "note"}}
            
            Use format:
            Question: <input question>
            Thought: <reasoning>
            Action: <tool_name or "None">
            Action Input: <parameters>
            Observation: <result>
            ... (repeat as needed)
            Thought: <final reasoning>
            Final Answer: <response>"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            ("ai", "{agent_scratchpad}")
        ])

    async def invoke(self, user_input: str, chat_history: List[Dict], user_id: str, jwt_token: str) -> Dict[str, Any]:
        """Process user input and return appropriate response."""
        # Format chat history into LangChain message format
        formatted_history = []
        for msg in chat_history:
            if msg.get("role") == "assistant":
                formatted_history.append(AIMessage(content=msg["content"]))
            else:
                formatted_history.append(HumanMessage(content=msg["content"]))

        # Create conversation context
        context = ConversationContext(
            chat_history=formatted_history,
            current_message=user_input
        )

        # Check for casual conversation using our new classifier
        try:
            classification = await self.classifier.classify(context)
            if classification.is_casual:
                print(f"Detected casual conversation (confidence: {classification.confidence:.2f})")
                print(f"Reasons: {', '.join(classification.reasons)}")
                casual_response = await self.response_generator.generate_response(context)
                return {"final_answer": casual_response}
        except Exception as e:
            print(f"Error during casual conversation check: {e}. Proceeding with full agent.")

        # Initialize tools with authentication context
        request_tools = []
        for tool in self.base_tools:
            try:
                tool.set_auth(jwt_token=jwt_token, user_id=user_id)
            except AttributeError:
                pass  # Mock tools may not need auth
            request_tools.append(tool)

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
            max_iterations=20
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
            return {"final_answer": result["output"]}
            
        except Exception as e:
            print(f"Error during agent invocation: {e}")
            traceback.print_exc()
            return {
                "final_answer": "I encountered an error while processing your request. Please try again or rephrase your question.",
                "error": str(e)
            }