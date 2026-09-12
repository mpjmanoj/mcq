import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabaseServer";
import { INITIAL_QUESTIONS } from "@/lib/questions";

export async function POST() {
  try {
    const sb = getSupabase();
    const newSession = {
      id: "session-" + Date.now(),
      title: "Mud Crab Farming Quiz Competition",
      status: "WAITING",
      total_questions: 20,
    };

    const { data: created, error } = await sb
      .from("quiz_sessions")
      .insert([newSession])
      .select();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

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

    return NextResponse.json({
      status: "WAITING",
      session_id: newSession.id,
      message: "Competition session reset successfully.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
