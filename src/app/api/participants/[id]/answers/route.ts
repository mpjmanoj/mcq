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

    const ansMap: Record<number, string> = {};
    for (const a of answers || []) {
      const qNum = parseInt(a.question_id as unknown as string, 10);
      if (!isNaN(qNum)) {
        ansMap[qNum] = a.selected_option;
      }
    }

    return NextResponse.json({ answers: ansMap });
  } catch {
    return NextResponse.json({ answers: {} });
  }
}
