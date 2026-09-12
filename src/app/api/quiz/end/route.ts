import { NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";

export async function POST() {
  try {
    const session = await getOrCreateSession();
    const sb = getSupabase();
    const now = new Date().toISOString();

    // Mark session COMPLETED
    const { error: sessErr } = await sb
      .from("quiz_sessions")
      .update({ status: "COMPLETED" })
      .eq("id", session.id);

    if (sessErr) {
      console.error("Error ending quiz session:", sessErr);
      return NextResponse.json({ detail: sessErr.message }, { status: 500 });
    }

    // Mark remaining playing participants as COMPLETED
    await sb
      .from("participants")
      .update({ status: "COMPLETED" })
      .eq("session_id", session.id)
      .eq("status", "PLAYING");

    return NextResponse.json({
      status: "COMPLETED",
      completed_at: now,
      session_id: session.id,
      message: "Competition ended and winners ready!",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
