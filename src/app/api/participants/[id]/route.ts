import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getOrCreateSession();
    const sb = getSupabase();

    const { data: pList } = await sb
      .from("participants")
      .select("*")
      .eq("id", id);

    const participant = pList && pList.length > 0 ? pList[0] : null;

    if (!participant) {
      return NextResponse.json({ detail: "Participant not found." }, { status: 404 });
    }

    // If organizer started a new session, invalidate old participant cache
    if (participant.session_id !== session.id) {
      return NextResponse.json({ detail: "Previous session ended. Ready for new tournament." }, { status: 404 });
    }

    const answered = participant.questions_answered || 0;
    const total = session.total_questions || 20;
    const nextQ = answered >= total ? total : answered + 1;
    const mob = participant.mobile_number || "";

    return NextResponse.json({
      id: participant.id,
      name: participant.name,
      mobile: mob.length >= 4 ? "XXXX" + mob.slice(-4) : "XXXX",
      status: participant.status,
      score: participant.score || 0,
      questions_answered: answered,
      total_questions: total,
      next_question: nextQ,
      quiz_status: session.status,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sb = getSupabase();
    await sb.from("participants").delete().eq("id", id);
    return NextResponse.json({ message: "Participant removed successfully." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
