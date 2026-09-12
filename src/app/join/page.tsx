"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Sparkles,
  Trophy,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getApiBaseUrl, getWsUrl } from "@/lib/api";
import { sounds } from "@/lib/sound";

interface QuestionData {
  question_number: number;
  total_questions: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

export default function ParticipantPage() {
  // Participant State
  const [participantId, setParticipantId] = useState<string>("");
  const [participantName, setParticipantName] = useState<string>("");
  const [participantMobile, setParticipantMobile] = useState<string>("");

  // UI / Registration form state
  const [nameInput, setNameInput] = useState<string>("");
  const [mobileInput, setMobileInput] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [isSubmittingJoin, setIsSubmittingJoin] = useState<boolean>(false);

  // Competition flow state
  // "REGISTER" | "WAITING" | "COUNTDOWN" | "PLAYING" | "COMPLETED" | "RESULTS"
  const [flowState, setFlowState] = useState<string>("REGISTER");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [totalParticipantsJoined, setTotalParticipantsJoined] = useState<number>(1);

  // Question & Answering State
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState<boolean>(false);
  const [isAnswerLocked, setIsAnswerLocked] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string>("");

  // Final Results
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalRank, setFinalRank] = useState<number | null>(null);

  // Connection & Audio
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const wsRef = useRef<WebSocket | null>(null);

  // Load stored participant session from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSoundActive(sounds.isSoundEnabled());
      const storedId = localStorage.getItem("crab_quiz_pid");
      const storedName = localStorage.getItem("crab_quiz_name");
      const storedMobile = localStorage.getItem("crab_quiz_mobile");

      if (storedId) {
        setParticipantId(storedId);
        if (storedName) setParticipantName(storedName);
        if (storedMobile) setParticipantMobile(storedMobile);
        // Verify with backend
        checkParticipantStatus(storedId);
      }
    }
  }, []);

  // Fetch participant status & restore question
  const checkParticipantStatus = useCallback(async (pId: string) => {
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/participants/${pId}`);
      if (res.ok) {
        const data = await res.json();
        setParticipantName(data.name);
        setParticipantMobile(data.mobile);

        if (data.quiz_status === "WAITING") {
          setFlowState("WAITING");
        } else if (data.quiz_status === "LIVE") {
          if (data.status === "COMPLETED") {
            setFlowState("COMPLETED");
            setFinalScore(data.score);
          } else {
            setFlowState("PLAYING");
            setCurrentQuestionNumber(data.next_question);
            loadQuestion(data.next_question);
          }
        } else if (data.quiz_status === "COMPLETED") {
          setFlowState("RESULTS");
          setFinalScore(data.score);
          fetchFinalStanding(pId);
        }
      } else {
        // If participant not found in backend (e.g. after reset)
        localStorage.removeItem("crab_quiz_pid");
        setParticipantId("");
        setFlowState("REGISTER");
      }
    } catch {
      // Offline fallback
    }
  }, []);

  const loadQuestion = async (qNum: number) => {
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/quiz/questions/${qNum}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentQuestion(data);
        setSelectedOption(null);
        setIsAnswerLocked(false);
        setFeedbackNotice("");
      }
    } catch {}
  };

  const fetchFinalStanding = async (pId: string) => {
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/quiz/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        const me = data.leaderboard.find((p: { id: string }) => p.id === pId);
        if (me) {
          setFinalRank(me.rank);
          setFinalScore(me.score);
        }
      }
    } catch {}
  };

  // WebSocket Connection
  useEffect(() => {
    if (!participantId) return;

    let active = true;

    const connectWs = () => {
      try {
        const url = getWsUrl("participant", participantId);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!active) return;
          setWsConnected(true);
        };

        ws.onmessage = (e) => {
          if (!active) return;
          try {
            const msg = JSON.parse(e.data);
            if (msg.event === "quiz_started") {
              // 3-2-1 Countdown
              setCountdown(3);
              sounds.playCountdown(false);
              setTimeout(() => {
                setCountdown(2);
                sounds.playCountdown(false);
              }, 1000);
              setTimeout(() => {
                setCountdown(1);
                sounds.playCountdown(false);
              }, 2000);
              setTimeout(() => {
                setCountdown(0);
                sounds.playCountdown(true);
                setFlowState("PLAYING");
                setCurrentQuestionNumber(1);
                loadQuestion(1);
                setTimeout(() => setCountdown(null), 800);
              }, 3000);
            } else if (msg.event === "participant_joined") {
              if (msg.data.count) setTotalParticipantsJoined(msg.data.count);
            } else if (msg.event === "quiz_completed") {
              setFlowState("RESULTS");
              fetchFinalStanding(participantId);
              sounds.playVictory();
            } else if (msg.event === "quiz_reset") {
              // Reset to new tournament
              localStorage.removeItem("crab_quiz_pid");
              setParticipantId("");
              setFlowState("REGISTER");
              setCurrentQuestion(null);
              setFinalScore(null);
              setFinalRank(null);
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!active) return;
          setWsConnected(false);
          setTimeout(connectWs, 3000);
        };
      } catch {
        setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    // Check waiting state periodically
    const pollInterval = setInterval(() => {
      if (flowState === "WAITING") {
        checkParticipantStatus(participantId);
      }
    }, 4000);

    return () => {
      active = false;
      if (wsRef.current) wsRef.current.close();
      clearInterval(pollInterval);
    };
  }, [participantId, flowState, checkParticipantStatus]);

  // Handle Join Registration
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const name = nameInput.trim();
    const cleanMobile = mobileInput.replace(/\D/g, "");

    if (name.length < 2) {
      setFormError("Please enter your full name (minimum 2 characters).");
      return;
    }
    if (cleanMobile.length < 10) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmittingJoin(true);
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/participants/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile_number: cleanMobile }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.detail || "Registration failed. Please try again.");
        setIsSubmittingJoin(false);
        return;
      }

      // Success
      setParticipantId(data.participant_id);
      setParticipantName(data.name);
      setParticipantMobile(data.mobile);
      localStorage.setItem("crab_quiz_pid", data.participant_id);
      localStorage.setItem("crab_quiz_name", data.name);
      localStorage.setItem("crab_quiz_mobile", cleanMobile);

      sounds.playJoin();

      if (data.quiz_status === "WAITING") {
        setFlowState("WAITING");
      } else if (data.quiz_status === "LIVE") {
        setFlowState("PLAYING");
        const nextQ = data.questions_answered + 1;
        setCurrentQuestionNumber(nextQ);
        loadQuestion(nextQ);
      } else {
        setFlowState("RESULTS");
      }
    } catch {
      setFormError("Network error. Unable to reach tournament server.");
    } finally {
      setIsSubmittingJoin(false);
    }
  };

  // Handle Option Select
  const handleSelectOption = (opt: string) => {
    if (isAnswerLocked) return;
    setSelectedOption(opt);
    sounds.playSelect();
  };

  // Handle Answer Submit
  const handleSubmitAnswer = async () => {
    if (!selectedOption || isAnswerLocked || isSubmittingAnswer) return;

    setIsSubmittingAnswer(true);
    sounds.playSubmit();

    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/quiz/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: participantId,
          question_number: currentQuestionNumber,
          selected_option: selectedOption,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsAnswerLocked(true);
        setFeedbackNotice("Answer locked and submitted to server!");

        if (data.completed) {
          // Finished all 20 questions
          setTimeout(() => {
            setFlowState("COMPLETED");
            setFinalScore(data.score);
          }, 800);
        } else if (data.next_question) {
          setTimeout(() => {
            setCurrentQuestionNumber(data.next_question);
            loadQuestion(data.next_question);
          }, 700);
        }
      } else {
        setFeedbackNotice(data.detail || "Error submitting answer.");
      }
    } catch {
      setFeedbackNotice("Submission failed. Please tap again.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const toggleSound = () => {
    const next = sounds.toggleSound();
    setSoundActive(next);
  };

  return (
    <div className="min-h-screen bg-[#060e15] text-slate-100 flex flex-col justify-between max-w-md mx-auto relative px-4 py-5 select-none font-sans">
      {/* Background scanline effect */}
      <div className="scanline-effect" />

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-[#060e15]/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="text-cyan-400 font-mono tracking-widest text-xs uppercase mb-3 animate-pulse">
            COMMENCING ARENA MATCH
          </div>
          <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-teal-400 to-emerald-400">
            {countdown === 0 ? "GO!" : countdown}
          </div>
          <div className="text-slate-400 text-sm font-medium mt-3">
            {countdown === 0 ? "BATTLE HAS COMMENCED!" : "GET READY FOR QUESTION 01"}
          </div>
        </div>
      )}

      {/* Top Mobile Game HUD Bar */}
      <header className="flex items-center justify-between border-b border-cyan-900/50 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-cyan-950 border border-cyan-600/50 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
              MUD CRAB TOURNAMENT — MIDDLE ANDAMAN
            </div>
            <div className="text-xs font-bold text-white tracking-wide">
              {participantName ? participantName : "COMPETITOR TERMINAL"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${
              wsConnected
                ? "bg-emerald-950 text-emerald-300 border-emerald-700/50"
                : "bg-amber-950 text-amber-300 border-amber-700/50"
            }`}
          >
            {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {wsConnected ? "SYNCED" : "RECONNECT"}
          </div>

          <button
            onClick={toggleSound}
            className="p-1.5 rounded border border-cyan-900/60 bg-slate-900 text-slate-300 hover:text-cyan-400"
          >
            {soundActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>
        </div>
      </header>

      {/* Main Container by Flow State */}
      <main className="flex-1 flex flex-col justify-center my-auto">
        {/* ================= STAGE 1: REGISTRATION ================= */}
        {flowState === "REGISTER" && (
          <div className="cyber-card rounded-2xl p-6 border-cyan-800/60 glow-cyan-sm">
            <div className="text-center mb-6">
              <div className="inline-block px-3 py-1 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 text-[11px] font-mono tracking-widest uppercase mb-2">
                PLAYER CHECK-IN
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                ENTER TOURNAMENT
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your real name and 10-digit mobile number to join the live mud crab championship.
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#071520] border border-cyan-900/80 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition-all"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Mobile Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#071520] border border-cyan-900/80 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm font-mono transition-all"
                  maxLength={15}
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Used for tie-breaking identification and session restoration.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmittingJoin}
                className="w-full mt-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 active:scale-[0.98] font-bold text-slate-950 tracking-wide text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingJoin ? (
                  <span className="animate-pulse">CONNECTING...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> JOIN QUIZ
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= STAGE 2: WAITING ROOM ================= */}
        {flowState === "WAITING" && (
          <div className="cyber-card rounded-2xl p-6 border-cyan-800/60 glow-cyan-sm text-center flex flex-col items-center">
            <div className="relative mb-5">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-800/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.3)]">
                <Sparkles className="h-10 w-10 text-cyan-400 animate-spin" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-cyan-400/20 animate-radar pointer-events-none" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-emerald-950 border border-emerald-600/50 text-emerald-300 font-mono text-[11px] font-bold uppercase tracking-widest mb-3">
              YOU&apos;RE IN!
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">
              Welcome, {participantName}.
            </h2>

            <p className="text-sm text-slate-400 max-w-xs mt-2 leading-relaxed">
              The quiz hasn&apos;t started yet. Please wait for the organizer to begin the competition.
            </p>

            {/* Arena Pass Box */}
            <div className="w-full my-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">STATUS</span>
                <span className="font-mono text-cyan-400 font-bold tracking-wider">
                  WAITING FOR QUIZ TO START
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">PLAYER ROSTER</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {totalParticipantsJoined} Participants Joined
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">TOTAL QUESTIONS</span>
                <span className="font-mono text-white font-bold">20 MCQ</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              Automatic transition when the admin starts
            </div>
          </div>
        )}

        {/* ================= STAGE 3: LIVE QUIZ ARENA ================= */}
        {flowState === "PLAYING" && currentQuestion && (
          <div className="flex flex-col flex-1 justify-between">
            {/* Header / Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-cyan-400 font-bold tracking-wider">
                  QUESTION {String(currentQuestion.question_number).padStart(2, "0")} / {currentQuestion.total_questions}
                </span>
                <span className="text-slate-400">
                  {Math.round((currentQuestion.question_number / currentQuestion.total_questions) * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${(currentQuestion.question_number / currentQuestion.total_questions) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="cyber-card rounded-2xl p-5 border-cyan-900/80 mb-4 shadow-xl">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 inline-block mb-3">
                AQUACULTURE KNOWLEDGE
              </span>
              <h3 className="text-base font-bold text-white leading-relaxed">
                {currentQuestion.question_text}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-2.5 mb-5">
              {(["A", "B", "C", "D"] as const).map((optKey) => {
                const optText = currentQuestion[`option_${optKey.toLowerCase()}` as keyof QuestionData];
                const isSelected = selectedOption === optKey;

                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => handleSelectOption(optKey)}
                    disabled={isAnswerLocked}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer active:scale-[0.99] ${
                      isSelected
                        ? "bg-gradient-to-r from-cyan-950 to-teal-950 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                        : "bg-[#091a26]/90 border-slate-800/90 hover:border-cyan-800 text-slate-200"
                    } ${isAnswerLocked ? "opacity-75 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`h-7 w-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-cyan-400 text-black border-cyan-300"
                          : "bg-slate-900 text-slate-400 border-slate-700"
                      }`}
                    >
                      {optKey}
                    </span>
                    <span className={`text-sm font-medium leading-snug pt-0.5 ${isSelected ? "text-white font-semibold" : "text-slate-200"}`}>
                      {optText}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Submission Status Notice */}
            {feedbackNotice && (
              <div className="mb-3 text-center text-xs font-mono text-emerald-400 animate-in fade-in">
                {feedbackNotice}
              </div>
            )}

            {/* Lock & Submit Button */}
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedOption || isAnswerLocked || isSubmittingAnswer}
              className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 active:scale-[0.98] font-bold text-slate-950 tracking-wider text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.35)] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
            >
              {isSubmittingAnswer ? (
                <span className="animate-pulse">LOCKING IN...</span>
              ) : isAnswerLocked ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> ANSWER RECORDED
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" /> SUBMIT ANSWER
                </span>
              )}
            </button>
          </div>
        )}

        {/* ================= STAGE 4: QUIZ COMPLETED ================= */}
        {flowState === "COMPLETED" && (
          <div className="cyber-card rounded-2xl p-6 border-cyan-800/60 glow-cyan-sm text-center flex flex-col items-center">
            <div className="h-20 w-20 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-emerald-950 border border-emerald-600/50 text-emerald-300 font-mono text-[11px] font-bold uppercase tracking-widest mb-3">
              MISSION COMPLETED
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">
              QUIZ COMPLETED
            </h2>

            <p className="text-sm text-slate-400 max-w-xs mt-2 leading-relaxed">
              You have successfully submitted all 20 answers. Your responses and timestamps have been recorded.
            </p>

            <div className="w-full my-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">COMPETITOR</span>
                <span className="font-mono text-white font-bold">{participantName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">QUESTIONS ANSWERED</span>
                <span className="font-mono text-emerald-400 font-bold">20 / 20</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">STATUS</span>
                <span className="font-mono text-cyan-400 font-bold">LOCKED & RECORDED</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Clock className="h-4 w-4 text-cyan-400 animate-spin" />
              Awaiting organizer to conclude competition and reveal final championship rankings...
            </div>
          </div>
        )}

        {/* ================= STAGE 5: FINAL RESULTS ================= */}
        {flowState === "RESULTS" && (
          <div className="cyber-card rounded-2xl p-6 border-amber-500/50 glow-gold text-center flex flex-col items-center">
            <div className="h-20 w-20 rounded-2xl bg-amber-950/80 border border-amber-500 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_35px_rgba(245,158,11,0.5)]">
              <Trophy className="h-10 w-10 text-amber-400 animate-bounce" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-amber-950 border border-amber-600/50 text-amber-300 font-mono text-[11px] font-bold uppercase tracking-widest mb-3">
              OFFICIAL RESULTS
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight">
              {finalRank === 1
                ? "CHAMPION!"
                : finalRank === 2
                ? "2ND PLACE!"
                : finalRank === 3
                ? "3RD PLACE!"
                : "WELL PLAYED!"}
            </h2>

            <div className="my-6 p-5 rounded-2xl bg-slate-900/90 border border-amber-900/50 w-full space-y-4">
              <div>
                <div className="text-[11px] font-mono text-slate-400 uppercase">Your Final Score</div>
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200 font-mono">
                  {finalScore !== null ? `${finalScore} / 20` : "—"}
                </div>
              </div>

              {finalRank && (
                <div className="border-t border-slate-800 pt-3">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Official Standing</div>
                  <div className="text-2xl font-black text-white font-mono">
                    Rank #{finalRank}
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Look at the main arena screen for the complete championship ceremony!
            </p>
          </div>
        )}
      </main>

      {/* Footer System Status Bar */}
      <footer className="border-t border-cyan-900/40 pt-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>MUD CRAB QUIZ ARENA</span>
        <span>SERVER VALIDATED SECURE</span>
      </footer>
    </div>
  );
}
