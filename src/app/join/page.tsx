"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  Sparkles,
  Trophy,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  X,
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

interface QuestionResult {
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean;
  explanation: string;
}

interface IndividualResults {
  participant_id: string;
  name: string;
  mobile: string;
  status: string;
  score: number;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  percentage: number;
  formatted_time: string;
  questions: QuestionResult[];
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
  const [totalQuestions, setTotalQuestions] = useState<number>(59);

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
  const [answersMap, setAnswersMap] = useState<Record<number, string>>({});
  const [individualResults, setIndividualResults] = useState<IndividualResults | null>(null);
  const [resultsFilter, setResultsFilter] = useState<"all" | "correct" | "wrong">("all");
  const [isLoadingResults, setIsLoadingResults] = useState<boolean>(false);

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

  const fetchAnswersMap = async (pId: string): Promise<Record<number, string>> => {
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/participants/${pId}/answers`);
      if (res.ok) {
        const data = await res.json();
        if (data.answers) {
          setAnswersMap(data.answers);
          return data.answers;
        }
      }
    } catch {}
    return {};
  };

  const fetchIndividualResults = async (pId: string) => {
    setIsLoadingResults(true);
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/participants/${pId}/results`);
      if (res.ok) {
        const data = await res.json();
        setIndividualResults(data);
        if (data.score !== undefined) setFinalScore(data.score);
        if (data.total_questions) setTotalQuestions(data.total_questions);
      }
    } catch {} finally {
      setIsLoadingResults(false);
    }
  };

  // Fetch participant status & restore question
  const checkParticipantStatus = useCallback(async (pId: string) => {
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/participants/${pId}`);
      if (res.ok) {
        const data = await res.json();
        setParticipantName(data.name);
        setParticipantMobile(data.mobile);

        if (data.total_questions) setTotalQuestions(data.total_questions);
        if (data.quiz_status === "WAITING") {
          setFlowState("WAITING");
        } else if (data.quiz_status === "LIVE") {
          const totalQ = data.total_questions || 59;
          if (data.status === "COMPLETED" || (data.questions_answered >= totalQ)) {
            setFlowState("COMPLETED");
            setFinalScore(data.score);
            fetchIndividualResults(pId);
          } else {
            setFlowState("PLAYING");
            setCurrentQuestionNumber(data.next_question);
            const map = await fetchAnswersMap(pId);
            loadQuestion(data.next_question, map);
          }
        } else if (data.quiz_status === "COMPLETED") {
          setFlowState("RESULTS");
          setFinalScore(data.score);
          fetchFinalStanding(pId);
          fetchIndividualResults(pId);
        }
      } else {
        // If participant not found in backend (e.g. after reset or new session)
        localStorage.removeItem("crab_quiz_pid");
        setParticipantId("");
        setFlowState("REGISTER");
      }
    } catch {
      // Offline fallback
    }
  }, []);

  const loadQuestion = async (qNum: number, currentMap?: Record<number, string>) => {
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/quiz/questions/${qNum}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentQuestion(data);
        if (data.total_questions) setTotalQuestions(data.total_questions);
        const map = currentMap || answersMap;
        const prevAnswer = map[qNum] || null;
        setSelectedOption(prevAnswer);
        setIsAnswerLocked(false);
        setFeedbackNotice(prevAnswer ? `Your current choice: Option ${prevAnswer}` : "");
      }
    } catch {}
  };

  const handleGoBack = () => {
    if (currentQuestionNumber > 1) {
      const prevQ = currentQuestionNumber - 1;
      setCurrentQuestionNumber(prevQ);
      loadQuestion(prevQ);
      sounds.playSelect();
    }
  };

  const handleGoNext = () => {
    if (currentQuestionNumber < totalQuestions) {
      const nextQ = currentQuestionNumber + 1;
      setCurrentQuestionNumber(nextQ);
      loadQuestion(nextQ);
      sounds.playSelect();
    }
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
              // Reset to new tournament session
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
      if (flowState === "WAITING" || flowState === "COMPLETED") {
        checkParticipantStatus(participantId);
      }
    }, 3000);

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
    if (!selectedOption || isSubmittingAnswer) return;

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
        const updatedMap = { ...answersMap, [currentQuestionNumber]: selectedOption };
        setAnswersMap(updatedMap);
        setFeedbackNotice(`✓ Question ${currentQuestionNumber} answer recorded!`);

        const isLastQuestion = currentQuestionNumber >= totalQuestions;
        if (data.completed || isLastQuestion) {
          setTimeout(() => {
            setFlowState("COMPLETED");
            setFinalScore(data.score);
            fetchIndividualResults(participantId);
          }, 600);
        } else if (data.next_question) {
          setTimeout(() => {
            setCurrentQuestionNumber(data.next_question);
            loadQuestion(data.next_question, updatedMap);
          }, 400);
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

  const handleResetForNewSession = () => {
    localStorage.removeItem("crab_quiz_pid");
    setParticipantId("");
    setFlowState("REGISTER");
    setCurrentQuestion(null);
    setFinalScore(null);
    setFinalRank(null);
  };

  const toggleSound = () => {
    const next = sounds.toggleSound();
    setSoundActive(next);
  };

  return (
    <div className="min-h-screen bg-[#120c06] text-amber-100 flex flex-col justify-between max-w-md mx-auto relative px-4 py-5 select-none font-sans">
      {/* Background scanline effect */}
      <div className="scanline-effect" />

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-[#120c06]/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="text-amber-400 font-mono tracking-widest text-xs uppercase mb-3 animate-pulse">
            🦀 COMMENCING TOURNAMENT MATCH
          </div>
          <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600">
            {countdown === 0 ? "GO!" : countdown}
          </div>
          <div className="text-amber-200/80 text-sm font-medium mt-3">
            {countdown === 0 ? "MATCH HAS BEGUN!" : "GET READY FOR QUESTION 01"}
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="flex items-center justify-between border-b border-amber-900/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-950/80 border border-amber-600/70 flex items-center justify-center text-base shadow-sm">
            🦀
          </div>
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-amber-400">
              MIDDLE ANDAMAN
            </div>
            <div className="text-xs font-bold text-white tracking-wide">
              Mud Crab Quiz
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Mute Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg border border-amber-900/60 bg-[#1c1209] text-amber-300 hover:text-white"
            title={soundActive ? "Mute Sound" : "Unmute Sound"}
          >
            {soundActive ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-amber-600" />}
          </button>

          {/* Connection Status */}
          <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-md bg-[#1c1209] border border-amber-900/60">
            {wsConnected ? (
              <>
                <Wifi className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">SYNC</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-amber-500" />
                <span className="text-amber-400">LIVE</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Dynamic Viewport */}
      <main className="flex-1 my-auto flex flex-col justify-center py-6">
        {/* ================= STAGE 1: REGISTRATION ================= */}
        {flowState === "REGISTER" && (
          <div className="crab-card rounded-2xl p-6 border-amber-700/60 shadow-xl text-center animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-600/60 text-amber-300 font-mono text-[10px] tracking-wider uppercase mb-4">
              <Sparkles className="h-3 w-3 text-amber-400" /> PLAYER ENTRY PORTAL
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">
              Mud Crab Championship
            </h2>
            <p className="text-xs text-amber-200/70 mt-1 max-w-xs mx-auto">
              Enter your name and mobile number to enter the Middle Andaman quiz arena.
            </p>

            <form onSubmit={handleJoin} className="mt-6 space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-mono uppercase text-amber-300 mb-1.5 font-bold">
                  Full Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Manoj, Vasava Sir"
                  disabled={isSubmittingJoin}
                  className="w-full px-3.5 py-3 rounded-xl bg-[#1a1108] border border-amber-800/70 text-white placeholder-amber-400/30 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-amber-300 mb-1.5 font-bold">
                  10-Digit Mobile Number
                </label>
                <input
                  type="tel"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value)}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  disabled={isSubmittingJoin}
                  className="w-full px-3.5 py-3 rounded-xl bg-[#1a1108] border border-amber-800/70 text-white placeholder-amber-400/30 text-sm font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                  required
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 animate-in shake">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingJoin}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.98] font-black text-slate-950 tracking-wider text-xs uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingJoin ? (
                  <span>CONNECTING TO ARENA...</span>
                ) : (
                  <span>ENTER TOURNAMENT LOBBY</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= STAGE 2: WAITING IN LOBBY ================= */}
        {flowState === "WAITING" && (
          <div className="crab-card rounded-2xl p-6 border-amber-700/60 shadow-xl text-center animate-in fade-in duration-300">
            <div className="h-16 w-16 rounded-2xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-3xl mx-auto mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse">
              🦀
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-emerald-950 border border-emerald-600/50 text-emerald-300 font-mono text-[10px] font-bold uppercase tracking-widest mb-3">
              CONNECTED & VERIFIED
            </div>

            <h2 className="text-xl font-black text-white tracking-tight">
              Welcome, {participantName}!
            </h2>

            <p className="text-xs text-amber-200/70 max-w-xs mx-auto mt-1 leading-relaxed">
              You are officially registered. The {totalQuestions} MCQ examination will commence automatically when the organizer presses Start.
            </p>

            <div className="my-6 p-4 rounded-xl bg-[#1c1209] border border-amber-900/60 text-xs font-mono space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-amber-400/70">Phone</span>
                <span className="text-white font-bold">{participantMobile}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-amber-400/70">Lobby Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Ready to Battle
                </span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-amber-300/80 flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-amber-400 animate-spin" />
              Waiting for organizer kickoff...
            </div>
          </div>
        )}

        {/* ================= STAGE 3: PLAYING QUESTIONS ================= */}
        {flowState === "PLAYING" && currentQuestion && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Top Navigation Header with Back and Next */}
            <div className="flex items-center justify-between text-xs font-mono">
              <button
                onClick={handleGoBack}
                disabled={currentQuestionNumber <= 1}
                className={`py-1.5 px-3 rounded-xl border flex items-center gap-1 text-xs cursor-pointer transition-all ${
                  currentQuestionNumber > 1
                    ? "bg-[#1c1209] border-amber-600/80 text-amber-300 hover:bg-amber-950 active:scale-95 shadow-sm"
                    : "opacity-30 border-amber-900/40 text-amber-700 cursor-not-allowed"
                }`}
                title="Go to previous question"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <div className="flex flex-col items-center">
                <span className="text-amber-300 font-black text-xs tracking-wider">
                  QUESTION {currentQuestionNumber.toString().padStart(2, "0")} / {totalQuestions}
                </span>
                <span className="text-[10px] text-amber-400/70 font-mono">
                  {answersMap[currentQuestionNumber] ? "Answered ✓" : "Not answered yet"}
                </span>
              </div>

              <button
                onClick={handleGoNext}
                disabled={currentQuestionNumber >= totalQuestions}
                className={`py-1.5 px-3 rounded-xl border flex items-center gap-1 text-xs cursor-pointer transition-all ${
                  currentQuestionNumber < totalQuestions
                    ? "bg-[#1c1209] border-amber-600/80 text-amber-300 hover:bg-amber-950 active:scale-95 shadow-sm"
                    : "opacity-30 border-amber-900/40 text-amber-700 cursor-not-allowed"
                }`}
                title="Skip to next question"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Question Jumper (Horizontal Scrollable Pills) */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => {
                const isCurrent = num === currentQuestionNumber;
                const isAnswered = !!answersMap[num];
                return (
                  <button
                    key={num}
                    onClick={() => {
                      setCurrentQuestionNumber(num);
                      loadQuestion(num);
                      sounds.playSelect();
                    }}
                    className={`h-7 w-7 rounded-lg text-[11px] font-mono font-bold shrink-0 flex items-center justify-center border transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-yellow-400 text-slate-950 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.6)] scale-110 font-black"
                        : isAnswered
                        ? "bg-emerald-950 text-emerald-300 border-emerald-600/80"
                        : "bg-[#1c1209] text-amber-400/60 border-amber-900/50 hover:border-amber-600 hover:text-white"
                    }`}
                    title={`Question ${num} ${isAnswered ? "(Answered)" : "(Unanswered)"}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                style={{ width: `${(currentQuestionNumber / totalQuestions) * 100}%` }}
              />
            </div>

            {/* Question Card */}
            <div className="crab-card rounded-2xl p-5 border-amber-700/60 shadow-xl">
              <h3 className="text-base font-bold text-white leading-snug">
                {currentQuestion.question_text}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              {[
                { key: "A", text: currentQuestion.option_a },
                { key: "B", text: currentQuestion.option_b },
                { key: "C", text: currentQuestion.option_c },
                { key: "D", text: currentQuestion.option_d },
              ].map((opt) => {
                const isSelected = selectedOption === opt.key;

                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelectOption(opt.key)}
                    disabled={isAnswerLocked || isSubmittingAnswer}
                    className={`w-full p-4 rounded-xl text-left text-sm font-medium transition-all flex items-center justify-between border cursor-pointer ${
                      isSelected
                        ? "bg-amber-950/90 border-yellow-400 text-yellow-200 shadow-[0_0_20px_rgba(251,191,36,0.35)] scale-[1.01]"
                        : "bg-[#1c1209] border-amber-900/60 text-amber-100 hover:border-amber-600 hover:bg-[#24170c]"
                    } disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-7 w-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? "bg-yellow-400 text-slate-950 border-yellow-300 font-black"
                            : "bg-amber-950 text-amber-400 border-amber-700"
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span>{opt.text}</span>
                    </div>

                    {isSelected && <CheckCircle className="h-5 w-5 text-yellow-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {/* Feedback & Notice */}
            {feedbackNotice && (
              <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-600/70 text-amber-200 text-xs text-center font-mono animate-in fade-in">
                {feedbackNotice}
              </div>
            )}

            {/* Action Buttons Row with Back and Submit */}
            <div className="flex gap-2.5 pt-1">
              {currentQuestionNumber > 1 && (
                <button
                  onClick={handleGoBack}
                  className="w-1/3 py-3.5 px-3 rounded-xl border border-amber-700/80 bg-[#1c1209] text-amber-300 font-bold text-xs flex items-center justify-center gap-1 hover:bg-[#27180c] active:scale-95 cursor-pointer transition-all"
                  title="Return to previous question"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
              )}

              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedOption || isSubmittingAnswer}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.98] font-black text-slate-950 tracking-wider text-xs uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {isSubmittingAnswer ? (
                  <span className="animate-pulse">RECORDING ANSWER...</span>
                ) : currentQuestionNumber >= totalQuestions ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> SUBMIT FINAL ANSWER & FINISH
                  </span>
                ) : answersMap[currentQuestionNumber] && answersMap[currentQuestionNumber] === selectedOption ? (
                  <span className="flex items-center gap-2">
                    <span>NEXT QUESTION</span> <ChevronRight className="h-4 w-4" />
                  </span>
                ) : answersMap[currentQuestionNumber] ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> UPDATE ANSWER & NEXT
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" /> SUBMIT & NEXT QUESTION
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= STAGE 4 & 5: TEST COMPLETED & INDIVIDUAL RESULTS ================= */}
        {(flowState === "COMPLETED" || flowState === "RESULTS") && (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            {/* Hero Result Card */}
            <div className="crab-card rounded-2xl p-5 border-amber-600 shadow-2xl text-center flex flex-col items-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border border-yellow-200 flex items-center justify-center text-slate-950 mb-3 shadow-[0_0_25px_rgba(245,158,11,0.5)]">
                <Trophy className="h-8 w-8 text-slate-950" />
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-amber-950 border border-amber-600 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-widest mb-2">
                EXAMINATION COMPLETE • INDIVIDUAL RESULTS
              </div>

              <h2 className="text-xl font-black text-white tracking-tight">
                {participantName}
              </h2>
              <div className="text-xs text-amber-300/80 font-mono mt-0.5">
                {flowState === "RESULTS" && finalRank ? `Rank #${finalRank} Overall • ` : ""}
                Time: {individualResults?.formatted_time || "Recorded"}
              </div>

              {/* Score Highlight Grid */}
              <div className="my-4 p-4 rounded-xl bg-[#1c1209] border border-amber-800/80 w-full grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center justify-center border-r border-amber-900/60 pr-1">
                  <span className="text-[10px] font-mono text-amber-400/80 uppercase">Score</span>
                  <span className="text-2xl font-black text-yellow-400 font-mono">
                    {individualResults?.score ?? finalScore ?? 0}
                    <span className="text-xs text-amber-400/60">/{totalQuestions}</span>
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center border-r border-amber-900/60 px-1">
                  <span className="text-[10px] font-mono text-emerald-400/80 uppercase">Correct</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono flex items-center gap-0.5">
                    <CheckCircle2 className="h-4 w-4" /> {individualResults?.correct_count ?? 0}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center pl-1">
                  <span className="text-[10px] font-mono text-red-400/80 uppercase">Wrong</span>
                  <span className="text-2xl font-black text-red-400 font-mono flex items-center gap-0.5">
                    <XCircle className="h-4 w-4" /> {individualResults?.wrong_count ?? 0}
                  </span>
                </div>
              </div>

              <div className="w-full flex items-center justify-between text-[11px] font-mono text-amber-300/80 px-1">
                <span>Accuracy: <strong className="text-white">{individualResults?.percentage ?? 0}%</strong></span>
                <span>Total Questions: <strong className="text-white">{totalQuestions}</strong></span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-[#1c1209] border border-amber-900/60 text-xs font-mono">
              <button
                onClick={() => setResultsFilter("all")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  resultsFilter === "all"
                    ? "bg-amber-950 text-yellow-300 font-bold border border-amber-600/80 shadow-sm"
                    : "text-amber-400/70 hover:text-white"
                }`}
              >
                All ({individualResults?.questions.length ?? totalQuestions})
              </button>
              <button
                onClick={() => setResultsFilter("correct")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  resultsFilter === "correct"
                    ? "bg-emerald-950 text-emerald-300 font-bold border border-emerald-600/80 shadow-sm"
                    : "text-amber-400/70 hover:text-white"
                }`}
              >
                ✓ Correct ({individualResults?.correct_count ?? 0})
              </button>
              <button
                onClick={() => setResultsFilter("wrong")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  resultsFilter === "wrong"
                    ? "bg-red-950 text-red-300 font-bold border border-red-600/80 shadow-sm"
                    : "text-amber-400/70 hover:text-white"
                }`}
              >
                ✗ Wrong ({individualResults?.wrong_count ?? 0})
              </button>
            </div>

            {/* Questions Detailed Review List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {isLoadingResults ? (
                <div className="p-8 text-center font-mono text-xs text-amber-400/70 flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 animate-spin" /> Loading complete question breakdown...
                </div>
              ) : (
                (individualResults?.questions || [])
                  .filter((q) => {
                    if (resultsFilter === "correct") return q.is_correct;
                    if (resultsFilter === "wrong") return !q.is_correct;
                    return true;
                  })
                  .map((q) => {
                    const options = [
                      { key: "A", text: q.option_a },
                      { key: "B", text: q.option_b },
                      { key: "C", text: q.option_c },
                      { key: "D", text: q.option_d },
                    ];

                    return (
                      <div
                        key={q.question_number}
                        className={`crab-card rounded-2xl p-4 border text-left space-y-3 transition-all ${
                          q.is_correct
                            ? "border-emerald-700/60 bg-[#121c14]/90"
                            : "border-red-800/60 bg-[#1c1212]/90"
                        }`}
                      >
                        {/* Header: Q# & Verdict */}
                        <div className="flex items-center justify-between border-b border-amber-900/40 pb-2 text-xs font-mono">
                          <span className="font-bold text-amber-300">
                            Q{q.question_number}. Question {q.question_number}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 ${
                              q.is_correct
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-600"
                                : "bg-red-950 text-red-300 border border-red-600"
                            }`}
                          >
                            {q.is_correct ? (
                              <>
                                <Check className="h-3 w-3" /> Correct (+1)
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3" /> Wrong (0)
                              </>
                            )}
                          </span>
                        </div>

                        {/* Question Text */}
                        <p className="text-sm font-semibold text-white leading-relaxed">
                          {q.question_text}
                        </p>

                        {/* 4 Options breakdown */}
                        <div className="space-y-1.5 pt-1">
                          {options.map((opt) => {
                            const isUserChoice = q.selected_option === opt.key;
                            const isOfficialAnswer = q.correct_option === opt.key;

                            let optStyle = "border-amber-900/40 bg-[#170e07]/60 text-amber-200/70";
                            let badge = null;

                            if (isUserChoice && q.is_correct) {
                              optStyle = "border-emerald-500 bg-emerald-950/70 text-emerald-200 font-bold";
                              badge = (
                                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Your Answer (Correct)
                                </span>
                              );
                            } else if (isUserChoice && !q.is_correct) {
                              optStyle = "border-red-500 bg-red-950/70 text-red-200";
                              badge = (
                                <span className="text-[10px] text-red-400 font-mono flex items-center gap-1">
                                  <X className="h-3 w-3" /> Your Answer (Wrong)
                                </span>
                              );
                            } else if (isOfficialAnswer && !q.is_correct) {
                              optStyle = "border-yellow-500 bg-amber-950/80 text-yellow-200 font-bold";
                              badge = (
                                <span className="text-[10px] text-yellow-400 font-mono font-bold">
                                  ★ Correct Answer
                                </span>
                              );
                            }

                            return (
                              <div
                                key={opt.key}
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${optStyle}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="h-5 w-5 rounded font-mono text-[10px] font-bold flex items-center justify-center border border-amber-800 bg-[#1c1209]">
                                    {opt.key}
                                  </span>
                                  <span>{opt.text}</span>
                                </div>
                                {badge}
                              </div>
                            );
                          })}
                        </div>

                        {/* Scientific Explanation */}
                        {q.explanation && (
                          <div className="mt-2 p-2.5 rounded-xl bg-[#1c1209] border border-amber-800/60 text-[11px] font-sans text-amber-200/90 leading-relaxed">
                            <span className="font-bold text-yellow-400 font-mono uppercase text-[10px] block mb-0.5">
                              💡 Aquaculture Analysis:
                            </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Actions: Reconnect or New Round */}
            <div className="pt-2">
              <button
                onClick={handleResetForNewSession}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 font-bold text-slate-950 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <RotateCcw className="h-4 w-4" /> Ready for Next Round / Session
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer System Status Bar */}
      <footer className="border-t border-amber-900/40 pt-3 flex items-center justify-between text-[10px] font-mono text-amber-400/60">
        <span>🦀 MUD CRAB AQUACULTURE CHAMPIONSHIP</span>
        <span>MIDDLE ANDAMAN</span>
      </footer>
    </div>
  );
}
