from langchain_groq import ChatGroq

llm = ChatGroq(model="llama-3.3-70b-versatile")

def generate_question(role, summary, history=None):
    history_block = ""
    if history:
        history_block = f"""
Previous interview topics already covered:
{history}

Ask about a different skill, project, or area than the ones already covered.
"""

    return llm.invoke(f"""
Generate exactly ONE interview question for the role "{role}" based on the resume summary below.

Resume summary:
{summary}

{history_block}

Rules:
- CRITICAL: Do NOT repeat any questions or topics that have already been covered in the history.
- If the candidate failed to answer a previous question (e.g., said "I don't know"), do NOT re-ask it or stay on that topic. Move to a completely different skill, project, or area from the resume.
- Return only the interview question.
- Do not include labels like "Question:".
- Do not include an expected answer, explanation, bullets, or formatting.
- Output a single plain-text question ending with a question mark.
""").content.strip()
