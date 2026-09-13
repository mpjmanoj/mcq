import { NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";
import { INITIAL_QUESTIONS } from "@/lib/questions";

export async function GET() {
  try {
    const session = await getOrCreateSession();
    const sb = getSupabase();

    const { data: participants, count } = await sb
      .from("participants")
      .select("id, status, questions_answered", { count: "exact" })
      .eq("session_id", session.id);

    let currentStatus = session.status;
    const totalQ = session.total_questions || INITIAL_QUESTIONS.length;

    // If LIVE, check if all registered participants have finished all questions
    if (currentStatus === "LIVE" && participants && participants.length > 0) {
      const allDone = participants.every(
        (p) => p.status === "COMPLETED" || (p.questions_answered || 0) >= totalQ
      );
      if (allDone) {
        currentStatus = "COMPLETED";
        await sb
          .from("quiz_sessions")
          .update({ status: "COMPLETED" })
          .eq("id", session.id);
      }
    }

    return NextResponse.json({
      id: session.id,
      title: session.title,
      status: currentStatus,
      total_questions: totalQ,
      created_at: session.created_at,
      participant_count: count || (participants ? participants.length : 0),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
