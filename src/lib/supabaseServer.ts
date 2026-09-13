import { createClient } from "@supabase/supabase-js";
import { INITIAL_QUESTIONS } from "./questions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wvufalstpgdxnhjpqajv.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_fjd7cqMG15FK6RFnN_u3Hw_fpdgvCXe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedClient: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSupabase = (): any => {
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }
  return cachedClient;
};

// In-memory session cache (2-second TTL) for high-performance 20+ user live quizzes
let cachedSession: any = null;
let lastSessionFetchTime = 0;

export async function getOrCreateSession(forceRefresh: boolean = false) {
  const now = Date.now();
  if (!forceRefresh && cachedSession && now - lastSessionFetchTime < 2000) {
    return cachedSession;
  }

  const sb = getSupabase();
  const { data: existing } = await sb
    .from("quiz_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    cachedSession = existing[0];
    lastSessionFetchTime = now;
    return existing[0];
  }

  // Create session
  const newSession = {
    id: "default-session-" + Date.now(),
    title: "Mud Crab Fattening & RAS Machinery Examination",
    status: "WAITING",
    total_questions: INITIAL_QUESTIONS.length,
  };

  const { data: created } = await sb
    .from("quiz_sessions")
    .insert([newSession])
    .select();

  // Seed questions
  const qRows = INITIAL_QUESTIONS.map((q) => ({
    session_id: newSession.id,
    question_number: q.question_number,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_option: q.correct_option,
    explanation: q.explanation,
  }));

  await sb.from("questions").insert(qRows);

  return created ? created[0] : newSession;
}
