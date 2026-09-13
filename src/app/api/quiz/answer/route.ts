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

    // Check if an answer for this question already exists for this participant
    const { data: existingAnswers } = await sb
      .from("answers")
      .select("*")
      .eq("participant_id", participantId)
      .eq("question_id", questionNumber);

    const existing = existingAnswers && existingAnswers.length > 0 ? existingAnswers[0] : null;

    let currentScore = participant.score || 0;
    if (existing) {
      if (existing.is_correct && !isCorrect) {
        currentScore = Math.max(0, currentScore - 1);
      } else if (!existing.is_correct && isCorrect) {
        currentScore += 1;
      }
      // Update existing answer
      await sb
        .from("answers")
        .update({
          selected_option: selectedOption,
          is_correct: isCorrect,
        })
        .eq("id", existing.id);
    } else {
      if (isCorrect) {
        currentScore += 1;
      }
      // Insert new answer
      await sb.from("answers").insert([
        {
          id: "ans-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          participant_id: participantId,
          question_id: questionNumber,
          selected_option: selectedOption,
          is_correct: isCorrect,
        },
      ]);
    }

    // Get true unique answered count
    const { data: allAns } = await sb
      .from("answers")
      .select("question_id")
      .eq("participant_id", participantId);

    const uniqueCount = new Set(allAns?.map((a) => a.question_id)).size;
    const totalQ = session.total_questions || INITIAL_QUESTIONS.length;
    const isCompleted = uniqueCount >= totalQ;

    // Elapsed time calculation
    const now = new Date();
    let elapsed = participant.total_time_seconds || 0.0;
    if (participant.joined_at) {
      elapsed = Math.max(0.0, (now.getTime() - new Date(participant.joined_at).getTime()) / 1000);
    }

    // Update participant - only confirmed schema columns
    const updatePayload: Record<string, unknown> = {
      score: currentScore,
      questions_answered: uniqueCount,
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

    const nextQ = questionNumber + 1;

    return NextResponse.json({
      status: "success",
      question_number: questionNumber,
      next_question: nextQ <= totalQ ? nextQ : null,
      completed: isCompleted,
      all_completed: allCompleted,
      score: currentScore,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
