from typing import List, Dict, Any
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import AIMessage, HumanMessage
from langchain.agents import AgentExecutor, create_react_agent

class NoteAppChatAgent:
    """Agent for handling NoteApp chat interactions using LangChain."""

    def __init__(self, llm: BaseChatModel, tools: List[BaseTool]):
        """Initialize the chat agent with an LLM and tools.
        
        Args:
            llm: The language model to use
            tools: List of tools available to the agent
        """
        self.llm = llm
        self.base_tools = tools
        
        # Create the prompt template for the agent
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful assistant for NoteApp, designed to help users find and understand their notes and transcripts. 
            You have access to the following tools: {tool_names}
            
            When users ask questions, use these tools to search through their content and provide relevant information.
            Always be concise and to the point in your responses.
            If you need to look up specific content, first search for relevant items, then get their full content.
            
            Follow these guidelines:
            1. If asked about specific content, use search_noteapp first
            2. Use get_noteapp_content to retrieve full details of relevant items
            3. Synthesize information from multiple sources when needed
            4. If you can't find relevant information, say so clearly"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

    async def invoke(self, user_input: str, chat_history: List[Dict], user_id: str, jwt_token: str) -> Dict[str, Any]:
        """Process a user message and return a response.
        
        Args:
            user_input: The user's message
            chat_history: List of previous messages
            user_id: The ID of the current user
            jwt_token: JWT token for authentication
        
        Returns:
            Dict containing the final answer
        """
        # Format chat history into LangChain message format
        formatted_history = []
        for msg in chat_history:
            if msg.get("role") == "assistant":
                formatted_history.append(AIMessage(content=msg["content"]))
            else:
                formatted_history.append(HumanMessage(content=msg["content"]))

        # Initialize tools with authentication context
        request_tools = []
        for tool in self.base_tools:
            # Assume tools have set_auth method to handle authentication
            tool.set_auth(jwt_token=jwt_token, user_id=user_id)
            request_tools.append(tool)

        # Create a new agent instance with the authenticated tools
        agent = create_react_agent(
            llm=self.llm,
            tools=request_tools,
            prompt=self.prompt
        )

        # Create the executor
        executor = AgentExecutor(
            agent=agent,
            tools=request_tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5  # Prevent infinite loops
        )

        # Prepare input for the agent
        input_dict = {
            "input": user_input,
            "chat_history": formatted_history
        }

        try:
            # Execute the agent
            result = await executor.ainvoke(input_dict)
            return {"final_answer": result["output"]}
        except Exception as e:
            # Log the error and return a friendly message
            return {
                "final_answer": "I encountered an error while processing your request. Please try again or rephrase your question.",
                "error": str(e)
            }
