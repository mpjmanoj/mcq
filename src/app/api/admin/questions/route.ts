import { NextResponse } from "next/server";
import { INITIAL_QUESTIONS } from "@/lib/questions";

export async function GET() {
  const list = INITIAL_QUESTIONS.map((q, idx) => ({
    id: idx + 1,
    question_number: q.question_number,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_option: q.correct_option,
    explanation: q.explanation,
  }));
  return NextResponse.json(list);
}
