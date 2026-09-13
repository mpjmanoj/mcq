"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
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
    <div className="min-h-screen bg-[#f3eee3] text-[#1f1b16] flex flex-col justify-between max-w-lg mx-auto relative px-3 py-4 sm:px-6 sm:py-6 select-none font-sans">
      {/* Background soft ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(232,220,200,0.6)_0%,_transparent_70%)] pointer-events-none" />

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-[#231f1a]/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="text-[#f59e0b] font-mono tracking-widest text-xs uppercase mb-3 animate-pulse font-bold">
            CRAB SHACK EXAMINATION
          </div>
          <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600">
            {countdown === 0 ? "GO!" : countdown}
          </div>
          <div className="text-amber-100 text-sm font-medium mt-3">
            {countdown === 0 ? "EXAMINATION HAS COMMENCED!" : "GET READY FOR QUESTION 01"}
          </div>
        </div>
      )}

      {/* Header Bar with Crab Shack Logo */}
      <header className="relative z-10 flex items-center justify-between border-b border-[#c3ad8b]/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-[#c3ad8b] bg-white shadow-sm sm:h-11 sm:w-11">
            <Image src="/logo.png" alt="Crab Shack logo" width={44} height={44} className="object-contain p-1.5" priority />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6d4c2d] sm:text-[10px]">
              Crab Shack
            </p>
            <p className="text-xs font-bold text-[#1f1b16] sm:text-sm tracking-tight">
              Model Examination
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Mute Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl border border-[#c3ad8b] bg-[#efe2cd] text-[#3f3021] hover:bg-white transition-all shadow-sm cursor-pointer"
            title={soundActive ? "Mute Sound" : "Unmute Sound"}
          >
            {soundActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-[#8a5a3c]" />}
          </button>

          {/* Connection Status */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-xl bg-[#efe2cd] border border-[#c3ad8b] text-[#3f3021] font-semibold shadow-sm">
            {wsConnected ? (
              <>
                <Wifi className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700">SYNC</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[#6d4c2d]">LIVE</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Dynamic Viewport */}
      <main className="relative z-10 flex-1 my-auto flex flex-col justify-center py-5">
        {/* ================= STAGE 1: REGISTRATION ================= */}
        {flowState === "REGISTER" && (
          <div className="crab-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#efe2cd] border border-[#c3ad8b] text-[#6d4c2d] text-[10px] font-semibold tracking-[0.2em] uppercase mb-4 shadow-sm">
              <Sparkles className="h-3 w-3 text-[#8a5a3c]" /> Candidate Entry Portal
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1f1b16] tracking-tight">
              Crab Shack Examination
            </h2>
            <p className="text-xs sm:text-sm text-[#5a5146] mt-1.5 max-w-xs mx-auto leading-relaxed">
              Enter your name and mobile number to participate in the official 59-question certification exam.
            </p>

            <form onSubmit={handleJoin} className="mt-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#3f3021] mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Rahul Sharma, Vasava Sir"
                  disabled={isSubmittingJoin}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#c3ad8b] text-[#1f1b16] placeholder-[#5a5146]/50 text-sm focus:outline-none focus:border-[#8a5a3c] focus:ring-1 focus:ring-[#8a5a3c] transition-all shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#3f3021] mb-1.5">
                  10-Digit Phone Number *
                </label>
                <input
                  type="tel"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value)}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  disabled={isSubmittingJoin}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#c3ad8b] text-[#1f1b16] placeholder-[#5a5146]/50 text-sm font-mono focus:outline-none focus:border-[#8a5a3c] focus:ring-1 focus:ring-[#8a5a3c] transition-all shadow-sm"
                  required
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2 animate-in shake">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingJoin}
                className="w-full py-3.5 px-4 rounded-xl bg-[#231f1a] hover:bg-[#4a3225] active:scale-[0.98] font-semibold text-white tracking-wider text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#231f1a]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingJoin ? (
                  <span>CONNECTING TO ARENA...</span>
                ) : (
                  <span>ENTER EXAMINATION LOBBY</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= STAGE 2: WAITING IN LOBBY ================= */}
        {flowState === "WAITING" && (
          <div className="crab-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center animate-in fade-in duration-300">
            <div className="relative h-16 w-16 rounded-2xl border-2 border-[#c3ad8b] bg-white shadow-md mx-auto mb-4 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Crab Shack logo" width={56} height={56} className="object-contain p-2" priority />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-[#dcfce7] border border-emerald-300 text-emerald-800 font-semibold text-[10px] uppercase tracking-wider mb-3">
              ✓ REGISTERED & READY
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1f1b16] tracking-tight">
              Welcome, {participantName}!
            </h2>

            <p className="text-xs sm:text-sm text-[#5a5146] max-w-xs mx-auto mt-1 leading-relaxed">
              You are connected. The {totalQuestions} Model Examination questions will begin automatically on this screen once the examiner starts the test.
            </p>

            <div className="my-6 p-4 rounded-xl bg-[#efe2cd]/70 border border-[#c3ad8b] text-xs space-y-2 text-left text-[#3f3021]">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#6d4c2d]">Registered Phone</span>
                <span className="font-mono font-bold text-[#1f1b16]">{participantMobile}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#6d4c2d]">Lobby Status</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  Ready to Start
                </span>
              </div>
            </div>

            <div className="text-xs font-semibold text-[#6d4c2d] flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-[#8a5a3c] animate-spin" />
              Waiting for instructor kickoff...
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
                    ? "bg-[#efe2cd] border-[#c3ad8b] text-[#3f3021] hover:bg-white active:scale-95 shadow-sm font-semibold"
                    : "opacity-35 border-[#c3ad8b]/40 text-[#5a5146] cursor-not-allowed bg-transparent"
                }`}
                title="Go to previous question"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <div className="flex flex-col items-center">
                <span className="text-[#1f1b16] font-extrabold text-xs tracking-wider">
                  QUESTION {currentQuestionNumber.toString().padStart(2, "0")} OF {totalQuestions}
                </span>
                <span className="text-[10px] text-[#6d4c2d] font-semibold">
                  {answersMap[currentQuestionNumber] ? "Answer Recorded ✓" : "Not Answered Yet"}
                </span>
              </div>

              <button
                onClick={handleGoNext}
                disabled={currentQuestionNumber >= totalQuestions}
                className={`py-1.5 px-3 rounded-xl border flex items-center gap-1 text-xs cursor-pointer transition-all ${
                  currentQuestionNumber < totalQuestions
                    ? "bg-[#efe2cd] border-[#c3ad8b] text-[#3f3021] hover:bg-white active:scale-95 shadow-sm font-semibold"
                    : "opacity-35 border-[#c3ad8b]/40 text-[#5a5146] cursor-not-allowed bg-transparent"
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
                        ? "bg-[#231f1a] text-[#f59e0b] border-2 border-[#8a5a3c] scale-110 shadow-md font-black"
                        : isAnswered
                        ? "bg-[#16a34a] text-white border-emerald-700 shadow-sm"
                        : "bg-[#efe2cd] text-[#6d4c2d] border-[#c3ad8b] hover:bg-white"
                    }`}
                    title={`Question ${num} ${isAnswered ? "(Answered)" : "(Unanswered)"}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#efe2cd] border border-[#c3ad8b]/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8a5a3c] via-[#b45309] to-[#d97706] transition-all duration-300"
                style={{ width: `${(currentQuestionNumber / totalQuestions) * 100}%` }}
              />
            </div>

            {/* Question Card */}
            <div className="crab-card rounded-2xl p-5 border border-[#c3ad8b] bg-[#fff9ee]/95 shadow-xl">
              <h3 className="text-base font-bold text-[#1f1b16] leading-snug">
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
                        ? "bg-[#231f1a] text-white border-2 border-[#8a5a3c] shadow-lg shadow-[#231f1a]/15 scale-[1.01]"
                        : "bg-white/95 border-[#c3ad8b]/80 text-[#1f1b16] hover:border-[#8a5a3c] hover:bg-white shadow-sm"
                    } disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-7 w-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? "bg-[#8a5a3c] text-white border-[#8a5a3c] font-black"
                            : "bg-[#efe2cd] text-[#6d4c2d] border-[#c3ad8b]"
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span className={isSelected ? "text-white font-semibold" : "text-[#1f1b16]"}>{opt.text}</span>
                    </div>

                    {isSelected && <CheckCircle className="h-5 w-5 text-[#f59e0b] shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {/* Feedback & Notice */}
            {feedbackNotice && (
              <div className="p-3 rounded-xl bg-[#efe2cd] border border-[#c3ad8b] text-[#3f3021] text-xs text-center font-semibold animate-in fade-in">
                {feedbackNotice}
              </div>
            )}

            {/* Action Buttons Row with Back and Submit */}
            <div className="flex gap-2.5 pt-1">
              {currentQuestionNumber > 1 && (
                <button
                  onClick={handleGoBack}
                  className="w-1/3 py-3.5 px-3 rounded-xl border border-[#c3ad8b] bg-[#efe2cd] text-[#3f3021] font-bold text-xs flex items-center justify-center gap-1 hover:bg-white active:scale-95 cursor-pointer transition-all shadow-sm"
                  title="Return to previous question"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
              )}

              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedOption || isSubmittingAnswer}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#231f1a] hover:bg-[#4a3225] active:scale-[0.98] font-semibold text-white tracking-wider text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#231f1a]/20 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
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
            <div className="crab-card rounded-2xl sm:rounded-3xl p-6 border border-[#c3ad8b] bg-[#fff9ee]/95 shadow-xl text-center flex flex-col items-center">
              <div className="h-14 w-14 rounded-2xl bg-[#efe2cd] border border-[#c3ad8b] flex items-center justify-center text-[#6d4c2d] mb-3 shadow-sm">
                <Trophy className="h-7 w-7 text-[#6d4c2d]" />
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-[#efe2cd] border border-[#c3ad8b] text-[#6d4c2d] text-[10px] font-semibold uppercase tracking-[0.2em] mb-2">
                EXAMINATION COMPLETE • OFFICIAL RESULTS
              </div>

              <h2 className="text-2xl font-extrabold text-[#1f1b16] tracking-tight">
                {participantName}
              </h2>
              <div className="text-xs text-[#5a5146] font-medium mt-0.5">
                {flowState === "RESULTS" && finalRank ? `Rank #${finalRank} Overall • ` : ""}
                Time Taken: {individualResults?.formatted_time || "Recorded"}
              </div>

              {/* Score Highlight Grid */}
              <div className="my-4 p-4 rounded-2xl bg-[#efe2cd]/80 border border-[#c3ad8b] w-full grid grid-cols-3 gap-2 text-center shadow-inner">
                <div className="flex flex-col items-center justify-center border-r border-[#c3ad8b]/70 pr-1">
                  <span className="text-[10px] font-semibold text-[#6d4c2d] uppercase tracking-wider">Score</span>
                  <span className="text-2xl font-black text-[#1f1b16] font-mono">
                    {individualResults?.score ?? finalScore ?? 0}
                    <span className="text-xs text-[#5a5146]">/{totalQuestions}</span>
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center border-r border-[#c3ad8b]/70 px-1">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Correct</span>
                  <span className="text-2xl font-black text-emerald-700 font-mono flex items-center gap-0.5">
                    <CheckCircle2 className="h-4 w-4" /> {individualResults?.correct_count ?? 0}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center pl-1">
                  <span className="text-[10px] font-semibold text-rose-800 uppercase tracking-wider">Wrong</span>
                  <span className="text-2xl font-black text-rose-700 font-mono flex items-center gap-0.5">
                    <XCircle className="h-4 w-4" /> {individualResults?.wrong_count ?? 0}
                  </span>
                </div>
              </div>

              <div className="w-full flex items-center justify-between text-xs text-[#5a5146] px-1 font-medium">
                <span>Accuracy: <strong className="text-[#1f1b16] font-bold">{individualResults?.percentage ?? 0}%</strong></span>
                <span>Total Questions: <strong className="text-[#1f1b16] font-bold">{totalQuestions}</strong></span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-[#efe2cd]/90 border border-[#c3ad8b] text-xs">
              <button
                onClick={() => setResultsFilter("all")}
                className={`flex-1 py-2 px-2 rounded-lg text-center transition-all cursor-pointer font-semibold ${
                  resultsFilter === "all"
                    ? "bg-[#231f1a] text-white shadow-sm"
                    : "text-[#6d4c2d] hover:bg-white"
                }`}
              >
                All ({individualResults?.questions.length ?? totalQuestions})
              </button>
              <button
                onClick={() => setResultsFilter("correct")}
                className={`flex-1 py-2 px-2 rounded-lg text-center transition-all cursor-pointer font-semibold ${
                  resultsFilter === "correct"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-emerald-800 hover:bg-white"
                }`}
              >
                ✓ Correct ({individualResults?.correct_count ?? 0})
              </button>
              <button
                onClick={() => setResultsFilter("wrong")}
                className={`flex-1 py-2 px-2 rounded-lg text-center transition-all cursor-pointer font-semibold ${
                  resultsFilter === "wrong"
                    ? "bg-rose-700 text-white shadow-sm"
                    : "text-rose-800 hover:bg-white"
                }`}
              >
                ✗ Wrong ({individualResults?.wrong_count ?? 0})
              </button>
            </div>

            {/* Questions Detailed Review List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {isLoadingResults ? (
                <div className="p-8 text-center text-xs text-[#6d4c2d] flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 animate-spin text-[#8a5a3c]" /> Loading complete question breakdown...
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
                        className={`rounded-2xl p-4 sm:p-5 border text-left space-y-3 transition-all shadow-sm ${
                          q.is_correct
                            ? "border-emerald-300 bg-[#f0fdf4] text-[#1f1b16]"
                            : "border-rose-300 bg-[#fff1f2] text-[#1f1b16]"
                        }`}
                      >
                        {/* Header: Q# & Verdict */}
                        <div className="flex items-center justify-between border-b border-[#c3ad8b]/30 pb-2 text-xs">
                          <span className="font-extrabold text-[#1f1b16]">
                            Question {q.question_number}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                              q.is_correct
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-rose-100 text-rose-800 border border-rose-300"
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
                        <p className="text-sm font-semibold text-[#1f1b16] leading-relaxed">
                          {q.question_text}
                        </p>

                        {/* 4 Options breakdown */}
                        <div className="space-y-1.5 pt-1">
                          {options.map((opt) => {
                            const isUserChoice = q.selected_option === opt.key;
                            const isOfficialAnswer = q.correct_option === opt.key;

                            let optStyle = "border-[#c3ad8b]/60 bg-white/70 text-[#5a5146]";
                            let badge = null;

                            if (isUserChoice && q.is_correct) {
                              optStyle = "border-emerald-500 bg-emerald-100/90 text-emerald-950 font-bold shadow-sm";
                              badge = (
                                <span className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Your Answer (Correct)
                                </span>
                              );
                            } else if (isUserChoice && !q.is_correct) {
                              optStyle = "border-rose-400 bg-rose-100/90 text-rose-950 font-semibold shadow-sm";
                              badge = (
                                <span className="text-[10px] text-rose-800 font-semibold flex items-center gap-1">
                                  <X className="h-3 w-3" /> Your Answer (Wrong)
                                </span>
                              );
                            } else if (isOfficialAnswer && !q.is_correct) {
                              optStyle = "border-[#8a5a3c] bg-[#efe2cd] text-[#1f1b16] font-bold shadow-sm";
                              badge = (
                                <span className="text-[10px] text-[#6d4c2d] font-bold">
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
                                  <span className="h-5 w-5 rounded-lg font-mono text-[10px] font-bold flex items-center justify-center border border-[#c3ad8b] bg-[#efe2cd] text-[#6d4c2d]">
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
                          <div className="mt-2 p-3 rounded-xl bg-[#efe2cd]/70 border border-[#c3ad8b] text-xs text-[#3f3021] leading-relaxed">
                            <span className="font-bold text-[#6d4c2d] uppercase text-[10px] block mb-1">
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
                className="w-full py-3.5 px-4 rounded-xl bg-[#231f1a] hover:bg-[#4a3225] font-semibold text-white text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <RotateCcw className="h-4 w-4" /> Ready for Next Round / Session
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer System Status Bar */}
      <footer className="relative z-10 border-t border-[#c3ad8b]/70 pt-3 flex items-center justify-between text-[10px] font-semibold text-[#6d4c2d]">
        <span>CRAB SHACK • MODEL EXAMINATION</span>
        <span>COASTAL SKILLS PROGRAM</span>
      </footer>
    </div>
  );
}
