import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isAdmin = searchParams.get("admin") === "true";

    const session = await getOrCreateSession();
    const sb = getSupabase();

    const { data: participants } = await sb
      .from("participants")
      .select("*")
      .eq("session_id", session.id)
      .order("score", { ascending: false })
      .order("total_time_seconds", { ascending: true })
      .order("joined_at", { ascending: true });

    const totalQ = session.total_questions || 59;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leaderboard = (participants || []).map((p: any, idx: number) => {
      const mob = p.mobile_number || "";
      const masked = mob.length >= 4 ? "XXXX" + mob.slice(-4) : "XXXX";
      const timeSec = p.total_time_seconds || 0.0;

      return {
        rank: idx + 1,
        id: p.id,
        name: p.name,
        mobile: isAdmin ? mob : masked,
        raw_mobile: mob,
        status: p.status || "WAITING",
        score: p.score || 0,
        questions_answered: p.questions_answered || 0,
        total_questions: totalQ,
        completed: p.status === "COMPLETED",
        total_time_seconds: timeSec,
        formatted_time: formatTime(timeSec),
      };
    });

    return NextResponse.json({
      status: session.status,
      total_questions: totalQ,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
