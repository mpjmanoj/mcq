from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, default="Mud Crab Farming Quiz Competition")
    status = Column(String, default="WAITING")  # WAITING, LIVE, COMPLETED
    total_questions = Column(Integer, default=59)
    created_at = Column(DateTime, default=utc_now)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    participants = relationship("Participant", back_populates="session", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="session", cascade="all, delete-orphan")

class Participant(Base):
    __tablename__ = "participants"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("quiz_sessions.id"), nullable=False)
    name = Column(String, nullable=False)
    mobile_number = Column(String, nullable=False)
    joined_at = Column(DateTime, default=utc_now)
    status = Column(String, default="WAITING")  # WAITING, PLAYING, COMPLETED, DISCONNECTED
    score = Column(Integer, default=0)
    questions_answered = Column(Integer, default=0)
    completed_at = Column(DateTime, nullable=True)
    total_time_seconds = Column(Float, default=0.0)

    session = relationship("QuizSession", back_populates="participants")
    answers = relationship("Answer", back_populates="participant", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("quiz_sessions.id"), nullable=True)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct_option = Column(String(1), nullable=False)  # 'A', 'B', 'C', 'D'
    explanation = Column(Text, nullable=True)

    session = relationship("QuizSession", back_populates="questions")
    answers = relationship("Answer", back_populates="question")

class Answer(Base):
    __tablename__ = "answers"

    id = Column(String, primary_key=True, default=generate_uuid)
    participant_id = Column(String, ForeignKey("participants.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_option = Column(String(1), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    response_time = Column(Float, default=0.0)
    answered_at = Column(DateTime, default=utc_now)

    participant = relationship("Participant", back_populates="answers")
    question = relationship("Question", back_populates="answers")
