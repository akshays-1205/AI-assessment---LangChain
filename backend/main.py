from fastapi import FastAPI, UploadFile, HTTPException, Form, File, Body
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from utils.parser import parse_resume
from chains.resume_chain import summarize_resume
from chains.question_chain import generate_question
from chains.followup_chain import generate_followup, should_ask_followup
from chains.evaluation_chain import evaluate
from utils.storage import save_assessment_data

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = {}
MAX_FOLLOWUPS_PER_TOPIC = 2

def fallback_evaluation():
    return {
        "knowledge": 1,
        "communication": 1,
        "problem_solving": 1,
    }

def format_history_for_next_topic(history):
    if not history:
        return ""

    items = []
    for idx, entry in enumerate(history, start=1):
        items.append(
            f"{idx}. Question: {entry['question']}\nAnswer summary: {entry['answer']}"
        )
    return "\n\n".join(items)

@app.post("/start")
async def start(
    email: str = Form(...),
    role: str = Form(...),
    question_limit: int = Form(...),
    file: UploadFile = File(...),
):
    session_id = str(uuid.uuid4())
    question_limit = max(1, question_limit)

    resume = parse_resume(file.file)
    summary = summarize_resume(resume)

    question = generate_question(role, summary)
    sessions[session_id] = {
        "role": role,
        "summary": summary,
        "history": [],
        "last_question": question,
        "question_limit": question_limit,
        "asked_topics": 1,
        "current_topic_followups": 0,
        "completed": False,
        "evaluation": None,
    }

    return {
        "session_id": session_id,
        "summary": summary,
        "question": question,
        "question_limit": question_limit,
    }

@app.post("/chat")
async def chat(
    session_id: str = Body(...),
    answer: str = Body(...),
):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    current_question = session.get("last_question")
    is_completed = session.get("completed", False)

    if is_completed:
        return {
            "response": "Interview completed.",
            "completed": True,
            "evaluation": session.get("evaluation"),
        }

    if not current_question:
        raise HTTPException(status_code=400, detail="No active question found for this session")

    session["history"].append({"question": current_question, "answer": answer})
    question_limit = session.get("question_limit", 1)
    total_questions_asked = len(session["history"])
    current_topic_followups = session.get("current_topic_followups", 0)

    if total_questions_asked >= question_limit:
        session["last_question"] = None
        session["completed"] = True
        try:
            evaluation = evaluate(session["history"])
        except Exception:
            evaluation = fallback_evaluation()
        session["evaluation"] = evaluation
        
        save_assessment_data(session_id, session["summary"], session["history"])
        
        return {
            "response": "Interview completed.",
            "completed": True,
            "evaluation": evaluation,
        }

    if should_ask_followup(
        current_question,
        answer,
        current_topic_followups,
        MAX_FOLLOWUPS_PER_TOPIC,
    ):
        response = generate_followup(current_question, answer)
        session["last_question"] = response
        session["current_topic_followups"] = current_topic_followups + 1
        return {"response": response, "completed": False}

    asked_topics = session.get("asked_topics", 1)
    
    # Ensure the next question is not a duplicate
    history_questions = [h["question"].strip().lower() for h in session["history"]]
    next_topic_question = ""
    for _ in range(3):
        next_topic_question = generate_question(
            session["role"],
            session["summary"],
            format_history_for_next_topic(session["history"]),
        )
        if next_topic_question.strip().lower() not in history_questions:
            break

    session["asked_topics"] = asked_topics + 1
    session["current_topic_followups"] = 0
    session["last_question"] = next_topic_question

    return {
        "response": next_topic_question,
        "completed": False,
    }
