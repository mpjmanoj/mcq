import { NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const session = await getOrCreateSession();
    const sb = getSupabase();

    const { data: participants, error } = await sb
      .from("participants")
      .select("*")
      .eq("session_id", session.id)
      .order("joined_at", { ascending: true });

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    const list = (participants || []).map((p) => {
      const mob = p.mobile_number || "";
      const masked = mob.length >= 4 ? "XXXX" + mob.slice(-4) : "XXXX";
      return {
        id: p.id,
        name: p.name,
        mobile: masked,
        raw_mobile: mob,
        status: p.status,
        score: p.score || 0,
        questions_answered: p.questions_answered || 0,
        joined_at: p.joined_at,
      };
    });

    return NextResponse.json({
      count: list.length,
      session_status: session.status,
      participants: list,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
