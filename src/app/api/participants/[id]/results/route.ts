import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";
import { INITIAL_QUESTIONS } from "@/lib/questions";

function formatTimeSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

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

    const { data: answers } = await sb
      .from("answers")
      .select("*")
      .eq("participant_id", id);

    const ansMap: Record<number, { selected_option: string; is_correct: boolean }> = {};
    for (const a of answers || []) {
      const qNum = parseInt(a.question_id as unknown as string, 10);
      if (!isNaN(qNum)) {
        ansMap[qNum] = {
          selected_option: a.selected_option,
          is_correct: !!a.is_correct,
        };
      }
    }

    let correctCount = 0;
    let wrongCount = 0;

    const breakdown = INITIAL_QUESTIONS.map((q) => {
      const ans = ansMap[q.question_number];
      const selected = ans ? ans.selected_option : null;
      const isCorrect = ans ? ans.is_correct : false;

      if (selected !== null) {
        if (isCorrect) correctCount++;
        else wrongCount++;
      }

      return {
        question_number: q.question_number,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        selected_option: selected,
        correct_option: q.correct_option.trim().toUpperCase(),
        is_correct: isCorrect,
        explanation: q.explanation || "",
      };
    });

    const totalQ = session.total_questions || INITIAL_QUESTIONS.length;
    const pct = totalQ > 0 ? Math.round((correctCount / totalQ) * 1000) / 10 : 0;
    const mob = participant.mobile_number || "";

    return NextResponse.json({
      participant_id: participant.id,
      name: participant.name,
      mobile: mob.length >= 4 ? "XXXX" + mob.slice(-4) : "XXXX",
      status: participant.status,
      score: participant.score || 0,
      total_questions: totalQ,
      correct_count: correctCount,
      wrong_count: wrongCount,
      percentage: pct,
      formatted_time: formatTimeSeconds(participant.total_time_seconds || 0),
      questions: breakdown,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
