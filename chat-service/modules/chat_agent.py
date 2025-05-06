from typing import List, Dict, Any
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate, PromptTemplate
from langchain_core.messages import AIMessage, HumanMessage
from langchain.agents import AgentExecutor, create_react_agent

class NoteAppChatAgent:
    """Agent for handling NoteApp chat interactions using LangChain."""

    def __init__(self, llm: BaseChatModel, tools: List[BaseTool]):
        """Initialize the chat agent with an LLM and tools."""
        self.llm = llm
        self.base_tools = tools
        # Prompt specifically formatted for ReAct agent
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful assistant for NoteApp, designed to help users find and understand their notes and transcripts.
            You have access to the following tools: {tool_names}

            Tool descriptions:
            {tools}
            
            You have two main functions:
            1. Helping users find and interact with their personal notes
            2. Being a helpful general assistant that can provide information and opinions even on topics not in their notes
            
            Follow these guidelines:
              For note-related questions:
            - If asked about specific content in notes, use search_noteapp first
            - When search results show relevant notes (even with low relevance scores), ALWAYS use get_noteapp_content to retrieve their full content
            - Read ALL search results carefully before deciding if a note is relevant
            - If a note's title matches or is similar to the search query, it is likely relevant
            - Synthesize information from multiple sources when needed
            
            For general questions:
            - If the user asks for information or your opinion on topics unrelated to their notes, use your own knowledge
            - You can provide opinions, explanations, and general knowledge without using tools
            - Be helpful, informative, and conversational
            
            For social or casual conversation:
            - Respond naturally without using tools
            
            IMPORTANT: Don't restrict yourself to only providing information from notes. If the user clearly wants your general knowledge or opinions, provide them directly.

            TOOL USAGE GUIDE:
              For search_noteapp tool:
            Action: search_noteapp
            Action Input: "your search query" 
            
            For get_noteapp_content tool:
            Action: get_noteapp_content
            Action Input: {{"item_id": 15, "item_type": "note"}}
            
            Note: For get_noteapp_content, the item_id must be a number (not a string), and item_type must be exactly "note" or "transcript".
            Never use free text descriptions like "ID of relevant item, i.e., 15" or similar.

            Use the following format:
            
            Question: the input question you must answer            Thought: you should always think about what to do
            Action: the action to take, should be one of [{tool_names}] or "None" if no tool is needed
            Action Input: the input to the action (skip if Action is "None")
            Observation: the result of the action (skip if Action is "None")
            ... (this Thought/Action/Action Input/Observation can repeat N times)
            Thought: I now know the final answer
            Final Answer: the final answer to the original input question
            
            IMPORTANT NOTE ABOUT SEARCH RESULTS:
            - If the search returns notes or transcripts with titles matching the query, ALWAYS retrieve at least one of them
            - Don't be misled by negative relevance scores - these are still potentially relevant items
            - When asked if the user has notes on a topic, always check the content of any note with a matching title
            """),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            ("ai", "{agent_scratchpad}"),  # Using "ai" for agent_scratchpad
        ])

    async def invoke(self, user_input: str, chat_history: List[Dict], user_id: str, jwt_token: str) -> Dict[str, Any]:
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
            try:
                tool.set_auth(jwt_token=jwt_token, user_id=user_id)
            except AttributeError:
                pass  # Mock tools may not need auth
            request_tools.append(tool)

        # Generate tool_names and tools strings for the prompt
        tool_names = ", ".join([tool.name for tool in request_tools])
        tools_descriptions = "\n".join([f"{tool.name}: {tool.description}" for tool in request_tools])

        # Create a new agent instance with the authenticated tools
        agent = create_react_agent(
            llm=self.llm,
            tools=request_tools,
            prompt=self.prompt
        )

        # Create the executor with explicit scratchpad handling
        executor = AgentExecutor(
            agent=agent,
            tools=request_tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5
        )        # Prepare input for the agent
        input_dict = {
            "input": user_input,
            "chat_history": formatted_history,
            "tool_names": tool_names,
            "tools": tools_descriptions
        }

        try:
            # Use .ainvoke for async operation
            print(f"Input to executor: {input_dict}")
            result = await executor.ainvoke(input_dict)
            return {"final_answer": result["output"]}
        except Exception as e:
            import traceback
            print(f"Error during agent invocation: {e}")
            traceback.print_exc()
            return {
                "final_answer": "I encountered an error while processing your request. Please try again or rephrase your question.",
                "error": str(e)
            }