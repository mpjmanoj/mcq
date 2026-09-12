import { NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";

export async function POST() {
  try {
    const session = await getOrCreateSession();
    const sb = getSupabase();
    const now = new Date().toISOString();

    await sb
      .from("quiz_sessions")
      .update({ status: "COMPLETED", completed_at: now })
      .eq("id", session.id);

    await sb
      .from("participants")
      .update({ status: "COMPLETED" })
      .eq("session_id", session.id)
      .eq("status", "PLAYING");

    return NextResponse.json({
      status: "COMPLETED",
      completed_at: now,
      message: "Competition ended and winners ready!",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
