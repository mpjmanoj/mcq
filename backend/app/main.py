import re
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from .database import engine, get_db, Base
from .models import QuizSession, Participant, Question, Answer, utc_now
from .seed_data import QUESTIONS_DATA
from .connection_manager import ws_manager

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mud Crab Farming Quiz Competition API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Seed Helper -----------------
def get_or_create_active_session(db: Session) -> QuizSession:
    # Try to find the most recent session
    session = db.query(QuizSession).order_by(desc(QuizSession.created_at)).first()
    if not session:
        session = QuizSession(
            title="Mud Crab Farming Quiz Competition",
            status="WAITING",
            total_questions=len(QUESTIONS_DATA),
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # Seed questions for this session
        for q_data in QUESTIONS_DATA:
            q = Question(
                session_id=session.id,
                question_number=q_data["question_number"],
                question_text=q_data["question_text"],
                option_a=q_data["option_a"],
                option_b=q_data["option_b"],
                option_c=q_data["option_c"],
                option_d=q_data["option_d"],
                correct_option=q_data["correct_option"],
                explanation=q_data.get("explanation", ""),
            )
            db.add(q)
        db.commit()
    return session

@app.on_event("startup")
def startup_event():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        get_or_create_active_session(db)
    finally:
        db.close()

# ----------------- Pydantic Schemas -----------------
class JoinRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    mobile_number: str = Field(..., min_length=8, max_length=15)

class AnswerRequest(BaseModel):
    participant_id: str
    question_number: int
    selected_option: str

class QuestionEditRequest(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    explanation: Optional[str] = ""

# ----------------- Helper Functions -----------------
def format_time_seconds(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"

def mask_mobile(mobile: str) -> str:
    if len(mobile) >= 4:
        return "X" * (len(mobile) - 4) + mobile[-4:]
    return "XXXX"

def compute_leaderboard(session: QuizSession, db: Session, mask_numbers: bool = True):
    participants = (
        db.query(Participant)
        .filter(Participant.session_id == session.id)
        .order_by(
            desc(Participant.score),
            asc(Participant.total_time_seconds),
            asc(Participant.joined_at),
        )
        .all()
    )

    leaderboard = []
    for rank, p in enumerate(participants, start=1):
        leaderboard.append({
            "rank": rank,
            "id": p.id,
            "name": p.name,
            "mobile": mask_mobile(p.mobile_number) if mask_numbers else p.mobile_number,
            "raw_mobile": p.mobile_number,
            "status": p.status,
            "score": p.score,
            "questions_answered": p.questions_answered,
            "total_questions": session.total_questions,
            "completed": p.status == "COMPLETED",
            "total_time_seconds": round(p.total_time_seconds, 1),
            "formatted_time": format_time_seconds(p.total_time_seconds),
        })
    return leaderboard

# ----------------- REST Endpoints -----------------

@app.get("/api/quiz/session")
def get_session_info(db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    participants = db.query(Participant).filter(Participant.session_id == session.id).all()
    return {
        "id": session.id,
        "title": session.title,
        "status": session.status,
        "total_questions": session.total_questions,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "participant_count": len(participants),
    }

@app.post("/api/participants/join")
async def join_quiz(req: JoinRequest, db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    clean_name = req.name.strip()
    clean_mobile = re.sub(r"\D", "", req.mobile_number.strip())

    if len(clean_name) < 2:
        raise HTTPException(status_code=400, detail="Full name must be at least 2 characters.")
    if len(clean_mobile) < 10 or len(clean_mobile) > 13:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile phone number.")

    # Check for existing participant with same mobile in this session
    existing = (
        db.query(Participant)
        .filter(Participant.session_id == session.id, Participant.mobile_number == clean_mobile)
        .first()
    )

    if existing:
        # Re-attach existing participant
        return {
            "participant_id": existing.id,
            "name": existing.name,
            "mobile": mask_mobile(existing.mobile_number),
            "status": existing.status,
            "quiz_status": session.status,
            "questions_answered": existing.questions_answered,
            "score": existing.score,
            "message": "This mobile number has already joined the quiz. Reconnecting existing session.",
            "is_reconnect": True,
        }

    # If quiz is already LIVE or COMPLETED, lock out new participants
    if session.status != "WAITING":
        raise HTTPException(
            status_code=403,
            detail="Registration is closed. The quiz competition has already begun or completed.",
        )

    # Create new participant
    new_participant = Participant(
        session_id=session.id,
        name=clean_name,
        mobile_number=clean_mobile,
        status="WAITING",
    )
    db.add(new_participant)
    db.commit()
    db.refresh(new_participant)

    # Total count and participant list
    participants = db.query(Participant).filter(Participant.session_id == session.id).order_by(Participant.joined_at).all()
    names_list = [{"id": p.id, "name": p.name, "mobile": mask_mobile(p.mobile_number)} for p in participants]

    # Real-time broadcast to screens and admin
    await ws_manager.broadcast_to_screens(
        "participant_joined",
        {
            "id": new_participant.id,
            "name": new_participant.name,
            "count": len(participants),
            "participants": names_list,
        },
    )

    return {
        "participant_id": new_participant.id,
        "name": new_participant.name,
        "mobile": mask_mobile(new_participant.mobile_number),
        "status": new_participant.status,
        "quiz_status": session.status,
        "questions_answered": 0,
        "score": 0,
        "message": "Successfully registered! Welcome to the competition.",
        "is_reconnect": False,
    }

@app.get("/api/participants")
def list_participants(db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    participants = (
        db.query(Participant)
        .filter(Participant.session_id == session.id)
        .order_by(Participant.joined_at)
        .all()
    )
    return {
        "count": len(participants),
        "session_status": session.status,
        "participants": [
            {
                "id": p.id,
                "name": p.name,
                "mobile": mask_mobile(p.mobile_number),
                "raw_mobile": p.mobile_number,
                "status": p.status,
                "score": p.score,
                "questions_answered": p.questions_answered,
                "joined_at": p.joined_at.isoformat(),
            }
            for p in participants
        ],
    }

@app.get("/api/participants/{participant_id}")
def get_participant_status(participant_id: str, db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found.")

    # Determine next question number
    next_question = participant.questions_answered + 1
    if next_question > session.total_questions:
        next_question = session.total_questions

    return {
        "id": participant.id,
        "name": participant.name,
        "mobile": mask_mobile(participant.mobile_number),
        "status": participant.status,
        "score": participant.score,
        "questions_answered": participant.questions_answered,
        "total_questions": session.total_questions,
        "next_question": next_question,
        "quiz_status": session.status,
    }

@app.delete("/api/participants/{participant_id}")
async def remove_participant(participant_id: str, db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found.")

    db.delete(participant)
    db.commit()

    participants = db.query(Participant).filter(Participant.session_id == session.id).all()
    names_list = [{"id": p.id, "name": p.name, "mobile": mask_mobile(p.mobile_number)} for p in participants]

    await ws_manager.broadcast_to_screens(
        "participant_removed",
        {
            "participant_id": participant_id,
            "count": len(participants),
            "participants": names_list,
        },
    )
    return {"message": "Participant removed successfully.", "count": len(participants)}

@app.post("/api/quiz/start")
async def start_quiz(db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    if session.status != "WAITING":
        return {"status": session.status, "message": f"Quiz is already in {session.status} state."}

    now = utc_now()
    session.status = "LIVE"
    session.started_at = now

    # Update all waiting participants to PLAYING
    participants = db.query(Participant).filter(Participant.session_id == session.id).all()
    for p in participants:
        if p.status == "WAITING":
            p.status = "PLAYING"
    db.commit()

    # Broadcast START event to all screens, admins, and participant mobiles
    await ws_manager.broadcast_all(
        "quiz_started",
        {
            "session_id": session.id,
            "started_at": now.isoformat(),
            "total_questions": session.total_questions,
        },
    )

    return {"status": "LIVE", "started_at": now.isoformat(), "participant_count": len(participants)}

@app.get("/api/quiz/questions/{question_number}")
def get_question_for_player(question_number: int, db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    question = (
        db.query(Question)
        .filter(Question.session_id == session.id, Question.question_number == question_number)
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail=f"Question {question_number} not found.")

    # CRITICAL SECURITY REQUIREMENT: NEVER SEND correct_option TO PARTICIPANT
    return {
        "question_number": question.question_number,
        "total_questions": session.total_questions,
        "question_text": question.question_text,
        "option_a": question.option_a,
        "option_b": question.option_b,
        "option_c": question.option_c,
        "option_d": question.option_d,
    }

@app.post("/api/quiz/answer")
async def submit_answer(req: AnswerRequest, db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    if session.status != "LIVE":
        raise HTTPException(status_code=400, detail="Quiz is not in LIVE state.")

    participant = db.query(Participant).filter(Participant.id == req.participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found.")

    question = (
        db.query(Question)
        .filter(Question.session_id == session.id, Question.question_number == req.question_number)
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    # Prevent duplicate submissions for the same question
    existing_answer = (
        db.query(Answer)
        .filter(Answer.participant_id == participant.id, Answer.question_id == question.id)
        .first()
    )
    if existing_answer:
        return {
            "status": "already_submitted",
            "message": "Answer already submitted for this question.",
            "next_question": min(participant.questions_answered + 1, session.total_questions),
            "completed": participant.status == "COMPLETED",
        }

    # Strict sequential flow check: question_number must match next expected question
    expected_q = participant.questions_answered + 1
    if req.question_number != expected_q:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid question sequence. Expected question {expected_q}, received {req.question_number}."
        )

    now = utc_now()
    selected = req.selected_option.strip().upper()
    is_correct = (selected == question.correct_option.strip().upper())

    # Calculate response time
    elapsed_total = 0.0
    if session.started_at:
        elapsed_total = (now - session.started_at.replace(tzinfo=timezone.utc)).total_seconds()

    # Create answer record
    ans = Answer(
        participant_id=participant.id,
        question_id=question.id,
        selected_option=selected,
        is_correct=is_correct,
        response_time=max(0.0, elapsed_total),
        answered_at=now,
    )
    db.add(ans)

    if is_correct:
        participant.score += 1
    participant.questions_answered += 1

    # Check if participant completed all questions
    is_completed = False
    if participant.questions_answered >= session.total_questions:
        participant.status = "COMPLETED"
        participant.completed_at = now
        participant.total_time_seconds = max(0.0, elapsed_total)
        is_completed = True
    else:
        # Keep cumulative time tracked
        participant.total_time_seconds = max(0.0, elapsed_total)

    db.commit()
    db.refresh(participant)

    # Broadcast leaderboard & activity update to screens and admins
    lb = compute_leaderboard(session, db, mask_numbers=True)
    await ws_manager.broadcast_to_screens(
        "leaderboard_updated",
        {
            "leaderboard": lb,
            "last_activity": {
                "name": participant.name,
                "question": req.question_number,
                "score": participant.score,
                "completed": is_completed,
            },
        },
    )

    if is_completed:
        await ws_manager.broadcast_to_screens(
            "participant_completed",
            {
                "participant_id": participant.id,
                "name": participant.name,
                "score": participant.score,
                "total_time": format_time_seconds(participant.total_time_seconds),
            },
        )

    next_q = participant.questions_answered + 1
    return {
        "status": "success",
        "question_number": req.question_number,
        "next_question": next_q if next_q <= session.total_questions else None,
        "completed": is_completed,
        "score": participant.score,
    }

@app.get("/api/quiz/leaderboard")
def get_leaderboard(admin: bool = False, db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    lb = compute_leaderboard(session, db, mask_numbers=not admin)
    return {
        "status": session.status,
        "total_questions": session.total_questions,
        "count": len(lb),
        "leaderboard": lb,
    }

@app.post("/api/quiz/end")
async def end_quiz(db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    now = utc_now()
    session.status = "COMPLETED"
    session.completed_at = now

    # Finalize any ongoing participants
    participants = db.query(Participant).filter(Participant.session_id == session.id).all()
    for p in participants:
        if p.status == "PLAYING":
            p.status = "COMPLETED"
            if not p.completed_at:
                p.completed_at = now
                if session.started_at:
                    p.total_time_seconds = (now - session.started_at.replace(tzinfo=timezone.utc)).total_seconds()
    db.commit()

    lb = compute_leaderboard(session, db, mask_numbers=True)
    top3 = lb[:3]

    await ws_manager.broadcast_all(
        "quiz_completed",
        {
            "session_id": session.id,
            "completed_at": now.isoformat(),
            "top3": top3,
            "leaderboard": lb,
        },
    )

    return {"status": "COMPLETED", "top3": top3, "leaderboard": lb}

@app.post("/api/quiz/reset")
async def reset_quiz(db: Session = Depends(get_db)):
    # Archive current session by creating a new active session
    new_session = QuizSession(
        title="Mud Crab Farming Quiz Competition",
        status="WAITING",
        total_questions=len(QUESTIONS_DATA),
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Copy questions to new session
    for q_data in QUESTIONS_DATA:
        q = Question(
            session_id=new_session.id,
            question_number=q_data["question_number"],
            question_text=q_data["question_text"],
            option_a=q_data["option_a"],
            option_b=q_data["option_b"],
            option_c=q_data["option_c"],
            option_d=q_data["option_d"],
            correct_option=q_data["correct_option"],
            explanation=q_data.get("explanation", ""),
        )
        db.add(q)
    db.commit()

    # Broadcast reset to all screens and devices
    await ws_manager.broadcast_all(
        "quiz_reset",
        {
            "session_id": new_session.id,
            "status": "WAITING",
            "message": "Competition has been reset. Ready for new participants!",
        },
    )

    return {"status": "WAITING", "session_id": new_session.id, "message": "Competition session reset successfully."}

# ----------------- Admin Question Bank -----------------

@app.get("/api/admin/questions")
def get_all_questions_for_admin(db: Session = Depends(get_db)):
    session = get_or_create_active_session(db)
    questions = (
        db.query(Question)
        .filter(Question.session_id == session.id)
        .order_by(Question.question_number)
        .all()
    )
    return [
        {
            "id": q.id,
            "question_number": q.question_number,
            "question_text": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "correct_option": q.correct_option,
            "explanation": q.explanation,
        }
        for q in questions
    ]

@app.put("/api/admin/questions/{question_id}")
def update_question(question_id: int, req: QuestionEditRequest, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    q.question_text = req.question_text
    q.option_a = req.option_a
    q.option_b = req.option_b
    q.option_c = req.option_c
    q.option_d = req.option_d
    q.correct_option = req.correct_option.strip().upper()
    q.explanation = req.explanation or ""
    db.commit()
    db.refresh(q)
    return {"message": "Question updated successfully.", "id": q.id}

# ----------------- WebSocket Real-Time Endpoint -----------------

@app.websocket("/ws/quiz/{client_type}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_type: str,
    client_id: Optional[str] = Query(default=""),
    db: Session = Depends(get_db),
):
    await ws_manager.connect(websocket, client_type, client_id)
    session = get_or_create_active_session(db)

    # Send initial welcome state on connect
    try:
        if client_type in ["display", "admin"]:
            participants = db.query(Participant).filter(Participant.session_id == session.id).all()
            names_list = [{"id": p.id, "name": p.name, "mobile": mask_mobile(p.mobile_number)} for p in participants]
            lb = compute_leaderboard(session, db, mask_numbers=(client_type == "display"))
            await websocket.send_json({
                "event": "initial_state",
                "data": {
                    "session_id": session.id,
                    "status": session.status,
                    "participant_count": len(participants),
                    "participants": names_list,
                    "leaderboard": lb,
                }
            })

        while True:
            data = await websocket.receive_text()
            # Heartbeat ping/pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, client_type, client_id)
    except Exception as e:
        ws_manager.disconnect(websocket, client_type, client_id)
