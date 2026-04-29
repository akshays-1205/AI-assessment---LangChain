from backend.agent.agent import agent

def run_agent(input_text, context):
    return agent.run(f"""
You are an AI interviewer.

Context:
{context}

User said:
{input_text}

Decide whether to:
- Ask new question
- Ask follow-up
""")