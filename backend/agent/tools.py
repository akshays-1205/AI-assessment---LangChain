from langchain.tools import tool
from backend.chains.question_chain import generate_question
from backend.chains.followup_chain import generate_followup

@tool
def ask_question(input: str) -> str:
    try:
        role, summary = input.split("||", 1)
    except ValueError:
        return "Error: expected input format role||summary"
    return generate_question(role.strip(), summary.strip())

@tool
def ask_followup(input: str) -> str:
    try:
        q, a = input.split("||", 1)
    except ValueError:
        return "Error: expected input format question||answer"
    return generate_followup(q.strip(), a.strip())
