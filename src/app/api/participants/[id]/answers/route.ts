import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabaseServer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sb = getSupabase();

    const { data: answers, error } = await sb
      .from("answers")
      .select("question_id, selected_option")
      .eq("participant_id", id);

    if (error) {
      return NextResponse.json({ answers: {} });
    }

    // Map database question IDs to question_numbers (1..59)
    const { data: qList } = await sb
      .from("questions")
      .select("id, question_number");

    const qIdToNum: Record<number, number> = {};
    if (qList) {
      for (const q of qList) {
        qIdToNum[q.id] = q.question_number;
      }
    }

    const ansMap: Record<number, string> = {};
    for (const a of answers || []) {
      const rawId = parseInt(a.question_id as unknown as string, 10);
      const qNum = qIdToNum[rawId] || (rawId <= 59 ? rawId : null);
      if (qNum) {
        ansMap[qNum] = a.selected_option;
      }
    }

    return NextResponse.json({ answers: ansMap });
  } catch {
    return NextResponse.json({ answers: {} });
  }
}
