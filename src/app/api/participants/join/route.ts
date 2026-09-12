import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getOrCreateSession } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    const rawMobile = (body.mobile_number || "").toString().trim();
    const cleanMobile = rawMobile.replace(/\D/g, "");

    if (name.length < 2) {
      return NextResponse.json(
        { detail: "Full name must be at least 2 characters." },
        { status: 400 }
      );
    }
    if (cleanMobile.length < 10) {
      return NextResponse.json(
        { detail: "Please enter a valid 10-digit mobile phone number." },
        { status: 400 }
      );
    }

    const session = await getOrCreateSession();
    const sb = getSupabase();

    // Check for existing participant
    const { data: existingList } = await sb
      .from("participants")
      .select("*")
      .eq("session_id", session.id)
      .eq("mobile_number", cleanMobile);

    const existing = existingList && existingList.length > 0 ? existingList[0] : null;

    if (existing) {
      return NextResponse.json({
        participant_id: existing.id,
        name: existing.name,
        mobile: "XXXX" + cleanMobile.slice(-4),
        status: existing.status,
        quiz_status: session.status,
        questions_answered: existing.questions_answered || 0,
        score: existing.score || 0,
        message: "This mobile number has already joined the quiz. Reconnecting existing session.",
        is_reconnect: true,
      });
    }

    // If quiz has already started
    if (session.status !== "WAITING") {
      return NextResponse.json(
        { detail: "Registration is closed. The quiz competition has already begun or completed." },
        { status: 403 }
      );
    }

    // Create participant
    const newParticipant = {
      id: "part-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      session_id: session.id,
      name,
      mobile_number: cleanMobile,
      status: "WAITING",
      score: 0,
      questions_answered: 0,
      total_time_seconds: 0.0,
    };

    const { data: inserted, error: insertErr } = await sb
      .from("participants")
      .insert([newParticipant])
      .select();

    if (insertErr) {
      return NextResponse.json(
        { detail: "Database error registering participant: " + insertErr.message },
        { status: 500 }
      );
    }

    const p = inserted && inserted.length > 0 ? inserted[0] : newParticipant;

    return NextResponse.json({
      participant_id: p.id,
      name: p.name,
      mobile: "XXXX" + cleanMobile.slice(-4),
      status: p.status,
      quiz_status: session.status,
      questions_answered: 0,
      score: 0,
      message: "Successfully registered! Welcome to the competition.",
      is_reconnect: false,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
