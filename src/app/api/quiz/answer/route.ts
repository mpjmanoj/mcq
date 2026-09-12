import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";
import { INITIAL_QUESTIONS } from "@/lib/questions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const participantId = body.participant_id;
    const questionNumber = parseInt(body.question_number, 10);
    const selectedOption = (body.selected_option || "").toString().trim().toUpperCase();

    const session = await getOrCreateSession();
    const sb = getSupabase();

    const { data: pList } = await sb
      .from("participants")
      .select("*")
      .eq("id", participantId);

    const participant = pList && pList.length > 0 ? pList[0] : null;

    if (!participant) {
      return NextResponse.json({ detail: "Participant not found." }, { status: 404 });
    }

    const question = INITIAL_QUESTIONS.find((q) => q.question_number === questionNumber);
    if (!question) {
      return NextResponse.json({ detail: "Question not found." }, { status: 404 });
    }

    const isCorrect = selectedOption === question.correct_option.trim().toUpperCase();
    const answeredCount = (participant.questions_answered || 0) + 1;
    const newScore = (participant.score || 0) + (isCorrect ? 1 : 0);
    const totalQ = session.total_questions || 20;
    const isCompleted = answeredCount >= totalQ;

    // Elapsed time calculation
    const now = new Date();
    let elapsed = participant.total_time_seconds || 0.0;
    if (participant.joined_at) {
      elapsed = Math.max(0.0, (now.getTime() - new Date(participant.joined_at).getTime()) / 1000);
    }

    // Update participant - only confirmed schema columns
    const updatePayload: Record<string, unknown> = {
      score: newScore,
      questions_answered: answeredCount,
      total_time_seconds: Math.round(elapsed * 10) / 10,
    };

    if (isCompleted) {
      updatePayload.status = "COMPLETED";
    }

    const { error: updateErr } = await sb
      .from("participants")
      .update(updatePayload)
      .eq("id", participantId);

    if (updateErr) {
      console.error("Error updating participant answer progress:", updateErr);
    }

    // Record answer
    await sb.from("answers").insert([
      {
        id: "ans-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        participant_id: participantId,
        question_id: questionNumber,
        selected_option: selectedOption,
        is_correct: isCorrect,
      },
    ]);

    // Check if ALL participants in this session have now finished all questions
    let allCompleted = false;
    const { data: allParticipants } = await sb
      .from("participants")
      .select("id, status, questions_answered")
      .eq("session_id", session.id);

    if (allParticipants && allParticipants.length > 0) {
      allCompleted = allParticipants.every(
        (p) => p.status === "COMPLETED" || (p.questions_answered || 0) >= totalQ
      );

      if (allCompleted) {
        // Automatically end the quiz competition when all participants finish!
        console.log(`[Auto-End] All ${allParticipants.length} participants completed the quiz. Marking session as COMPLETED.`);
        await sb
          .from("quiz_sessions")
          .update({ status: "COMPLETED" })
          .eq("id", session.id);
      }
    }

    const nextQ = answeredCount + 1;

    return NextResponse.json({
      status: "success",
      question_number: questionNumber,
      next_question: nextQ <= totalQ ? nextQ : null,
      completed: isCompleted,
      all_completed: allCompleted,
      score: newScore,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
