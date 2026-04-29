from langchain.agents import initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory
from langchain_groq import ChatGroq
from backend.agent.tools import ask_question, ask_followup

llm = ChatGroq(model="llama3-70b-8192")

memory = ConversationBufferMemory(return_messages=True)

tools = [ask_question, ask_followup]

agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.OPENAI_FUNCTIONS,
    memory=memory,
    verbose=True
)