from langchain_groq import ChatGroq
import json

llm = ChatGroq(model="llama-3.3-70b-versatile")

def generate_followup(q, a):
    return llm.invoke(f"""
The interviewer needs a follow-up question based on the candidate's previous response.

Previous question:
{q}

Candidate answer:
{a}

Write a deeper follow-up interview question that follows naturally from the candidate's answer and probes their skills, reasoning, or experience in more detail.

Rules:
- Return only the follow-up question.
- CRITICAL: Ensure the follow-up is different from the original question and explores a specific detail mentioned in the candidate's answer.
- Do not include labels like "Question:".
- Do not include an expected answer, explanation, bullets, or formatting.
- Output a single plain-text question ending with a question mark.
""").content.strip()

def should_ask_followup(q, a, followup_count, max_followups=2):
    if followup_count >= max_followups:
        return False

    result = llm.invoke(f"""
You are deciding whether an interviewer should stay on the current topic or switch to a different topic.

Current topic question:
{q}

Candidate answer:
{a}

Follow-up questions already asked on this topic: {followup_count}
Maximum allowed follow-up questions on this topic: {max_followups}

Decision rules:
- Return true only if the answer shows meaningful technical depth, specifics, reasoning, or hands-on experience worth probing further.
- CRITICAL: Return false if the answer is "I don't know", "Not sure", or similar non-answers.
- Return false if the answer is vague, short, generic, uncertain, repetitive, or does not show enough depth to justify another follow-up.
- Never allow more than {max_followups} follow-up questions for the same topic.

Return valid JSON only:
{{
  "ask_followup": true_or_false
}}
""").content.strip()

    start = result.find("{")
    end = result.rfind("}")
    if start == -1 or end == -1:
        return False

    try:
        parsed = json.loads(result[start:end + 1])
    except json.JSONDecodeError:
        return False

    return bool(parsed.get("ask_followup"))
