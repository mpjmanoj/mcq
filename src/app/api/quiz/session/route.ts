import { NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const session = await getOrCreateSession();
    const sb = getSupabase();

    const { count } = await sb
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session.id);

    return NextResponse.json({
      id: session.id,
      title: session.title,
      status: session.status,
      total_questions: session.total_questions || 20,
      created_at: session.created_at,
      started_at: session.started_at,
      completed_at: session.completed_at,
      participant_count: count || 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
