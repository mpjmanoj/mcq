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

    // Query question ID in Supabase for this session to satisfy foreign key constraint if active
    const { data: qRows } = await sb
      .from("questions")
      .select("id")
      .eq("session_id", session.id)
      .eq("question_number", questionNumber)
      .limit(1);

    const dbQuestionId = qRows && qRows.length > 0 ? qRows[0].id : null;
    const targetQId = dbQuestionId || questionNumber;

    // Check if an answer for this question already exists for this participant
    let existingQuery = sb
      .from("answers")
      .select("*")
      .eq("participant_id", participantId);

    if (dbQuestionId) {
      existingQuery = existingQuery.or(`question_id.eq.${dbQuestionId},question_id.eq.${questionNumber}`);
    } else {
      existingQuery = existingQuery.eq("question_id", questionNumber);
    }

    const { data: existingAnswers } = await existingQuery;
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
          answered_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      if (isCorrect) {
        currentScore += 1;
      }
      // Insert new answer - try targetQId first, fallback to questionNumber
      const { error: insErr } = await sb.from("answers").insert([
        {
          id: "ans-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          participant_id: participantId,
          question_id: targetQId,
          selected_option: selectedOption,
          is_correct: isCorrect,
        },
      ]);

      if (insErr && dbQuestionId && targetQId !== questionNumber) {
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
    }

    // Get true unique answered count
    const { data: allAns } = await sb
      .from("answers")
      .select("question_id")
      .eq("participant_id", participantId);

    const answeredSet = new Set(allAns?.map((a: any) => a.question_id));
    if (dbQuestionId) answeredSet.add(dbQuestionId);
    answeredSet.add(questionNumber);

    const totalQ = session.total_questions || INITIAL_QUESTIONS.length;
    const uniqueCount = Math.min(
      totalQ,
      Math.max(answeredSet.size, (participant.questions_answered || 0) + (existing ? 0 : 1))
    );
    const isCompleted = uniqueCount >= totalQ;

    // Elapsed time calculation
    const now = new Date();
    let elapsed = participant.total_time_seconds || 0.0;
    if (participant.joined_at) {
      elapsed = Math.max(0.0, (now.getTime() - new Date(participant.joined_at).getTime()) / 1000);
    }

    // Update participant - guaranteed score & answered count
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
      console.error("Error updating participant score/progress:", updateErr);
    }

    // Only check if all finished when this participant completes all questions
    let allCompleted = false;
    if (isCompleted) {
      const { data: allParticipants } = await sb
        .from("participants")
        .select("id, status, questions_answered")
        .eq("session_id", session.id);

      if (allParticipants && allParticipants.length > 0) {
        allCompleted = allParticipants.every(
          (p: any) => p.status === "COMPLETED" || (p.questions_answered || 0) >= totalQ
        );

        if (allCompleted) {
          console.log(`[Auto-End] All ${allParticipants.length} participants completed the quiz. Marking session as COMPLETED.`);
          await sb
            .from("quiz_sessions")
            .update({ status: "COMPLETED" })
            .eq("id", session.id);
        }
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
