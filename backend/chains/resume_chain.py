from langchain_groq import ChatGroq

llm = ChatGroq(model="llama-3.3-70b-versatile")

resume_prompt = """
Summarize the resume into:
- Skills
- Experience
- Strengths

Resume:
{resume}
"""

def summarize_resume(resume):
    return llm.invoke(resume_prompt.format(resume=resume)).content