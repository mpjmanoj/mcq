import { NextRequest, NextResponse } from "next/server";
import { INITIAL_QUESTIONS } from "@/lib/questions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ question_number: string }> }
) {
  try {
    const { question_number } = await params;
    const qNum = parseInt(question_number, 10);

    const question = INITIAL_QUESTIONS.find((q) => q.question_number === qNum);

    if (!question) {
      return NextResponse.json({ detail: `Question ${qNum} not found.` }, { status: 404 });
    }

    // CRITICAL SECURITY: Never return correct_option or explanation to participant!
    return NextResponse.json({
      question_number: question.question_number,
      total_questions: INITIAL_QUESTIONS.length,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
