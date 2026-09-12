-- =========================================================
-- MUD CRAB FARMING QUIZ COMPETITION — SUPABASE SQL SCHEMA
-- Run this in your Supabase SQL Editor (https://app.supabase.com)
-- =========================================================

-- 1. Create Quiz Sessions Table
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL DEFAULT 'Mud Crab Farming Quiz Competition',
    status TEXT NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'LIVE', 'COMPLETED'
    total_questions INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 2. Create Participants Table
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'PLAYING', 'COMPLETED', 'DISCONNECTED'
    score INTEGER NOT NULL DEFAULT 0,
    questions_answered INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    total_time_seconds DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

-- Unique index to prevent duplicate phone numbers per active session
CREATE UNIQUE INDEX IF NOT EXISTS idx_participant_session_mobile 
ON participants(session_id, mobile_number);

-- 3. Create Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    session_id TEXT REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option VARCHAR(1) NOT NULL, -- 'A', 'B', 'C', 'D'
    explanation TEXT
);

-- 4. Create Answers Table
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option VARCHAR(1) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    response_time DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index to prevent double submission for the same question
CREATE UNIQUE INDEX IF NOT EXISTS idx_participant_single_answer 
ON answers(participant_id, question_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_participants_score_time ON participants(session_id, score DESC, total_time_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_questions_lookup ON questions(session_id, question_number);

-- Enable Supabase Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;

-- Enable Row Level Security (RLS) with permissive read/write policies for tournament
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on quiz_sessions" ON quiz_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public write on quiz_sessions" ON quiz_sessions FOR ALL USING (true);

CREATE POLICY "Allow public read on participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow public write on participants" ON participants FOR ALL USING (true);

CREATE POLICY "Allow public read on questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow public write on questions" ON questions FOR ALL USING (true);

CREATE POLICY "Allow public read on answers" ON answers FOR SELECT USING (true);
CREATE POLICY "Allow public write on answers" ON answers FOR ALL USING (true);
