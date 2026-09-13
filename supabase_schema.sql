-- =========================================================
-- SIMPLE SUPABASE SCHEMA — MUD CRAB QUIZ
-- Paste and Click 'Run' in Supabase SQL Editor
-- =========================================================

-- 1. Quiz Sessions
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT 'Mud Crab Fattening & RAS Machinery Examination',
    status TEXT DEFAULT 'WAITING',
    total_questions INT DEFAULT 59,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Participants
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    status TEXT DEFAULT 'WAITING',
    score INT DEFAULT 0,
    questions_answered INT DEFAULT 0,
    total_time_seconds FLOAT DEFAULT 0.0,
    joined_at TIMESTAMP DEFAULT NOW()
);

-- 3. Questions
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    session_id TEXT REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option VARCHAR(1) NOT NULL,
    explanation TEXT
);

-- 4. Answers
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
    question_id INT NOT NULL,
    selected_option VARCHAR(1) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMP DEFAULT NOW()
);

-- Drop foreign key constraint on question_id if it exists to allow direct question_number tracking
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_question_id_fkey;

-- Performance Indexes for 20+ concurrent participants
CREATE INDEX IF NOT EXISTS idx_participants_session_score ON participants(session_id, score DESC, total_time_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_answers_participant ON answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_questions_session_num ON questions(session_id, question_number);

-- Allow public access for live tournament competition
ALTER TABLE quiz_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;

