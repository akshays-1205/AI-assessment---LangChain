from langchain_groq import ChatGroq
import json

llm = ChatGroq(model="llama-3.3-70b-versatile")

def _clamp_score(value, default=1):
    try:
        score = int(value)
    except (TypeError, ValueError):
        score = default
    return max(1, min(10, score))


def _format_history(history):
    if not history:
        return ""

    lines = []
    for idx, entry in enumerate(history, start=1):
        question = entry.get("question", "")
        answer = entry.get("answer", "")
        lines.append(f"{idx}. Question: {question}\nAnswer: {answer}")

    return "\n\n".join(lines)


def evaluate(history):
    prompt = f"""
You are an objective interviewer evaluator.
Assess the candidate's responses using exactly three integer scores from 1 to 10.
Include 1 line explanation but no other extra fields.

History of the interview:
{_format_history(history)}

Return only valid JSON with the exact keys:
{{
  "knowledge": <score>,
  "communication": <score>,
  "problem_solving": <score>
}}

Scoring guidelines:
- If the candidate answers "I don't know" or provides no meaningful information, the score must be 1.
- Only provide high scores for detailed, accurate, and insightful responses.
"""

    res = llm.invoke(prompt).content.strip()
    start = res.find("{")
    end = res.rfind("}")
    if start == -1 or end == -1:
        return {
            "knowledge": 1,
            "communication": 1,
            "problem_solving": 1,
        }

    try:
        parsed = json.loads(res[start:end + 1])
    except json.JSONDecodeError:
        return {
            "knowledge": 1,
            "communication": 1,
            "problem_solving": 1,
        }

    return {
        "knowledge": _clamp_score(parsed.get("knowledge")),
        "communication": _clamp_score(parsed.get("communication")),
        "problem_solving": _clamp_score(parsed.get("problem_solving")),
    }
