import { NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";

export async function POST() {
  try {
    const session = await getOrCreateSession();
    const sb = getSupabase();
    const now = new Date().toISOString();

    // Only update confirmed columns in quiz_sessions
    const { error: sessErr } = await sb
      .from("quiz_sessions")
      .update({ status: "LIVE" })
      .eq("id", session.id);

    if (sessErr) {
      console.error("Error updating quiz_sessions status to LIVE:", sessErr);
      return NextResponse.json({ detail: sessErr.message }, { status: 500 });
    }

    // Update participants
    const { error: partErr } = await sb
      .from("participants")
      .update({ status: "PLAYING" })
      .eq("session_id", session.id)
      .eq("status", "WAITING");

    if (partErr) {
      console.error("Error updating participants status to PLAYING:", partErr);
    }

    return NextResponse.json({
      status: "LIVE",
      session_id: session.id,
      started_at: now,
      message: "Mud Crab Quiz Competition has begun!",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
