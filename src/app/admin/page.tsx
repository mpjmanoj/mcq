"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import {
  Play,
  Square,
  RotateCcw,
  UserX,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Radio,
  BookOpen,
  Volume2,
  VolumeX,
  Search,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  Crown,
  Medal,
  Award,
  Zap,
  Gamepad2,
} from "lucide-react";
import { getApiBaseUrl, getWsUrl } from "@/lib/api";
import { sounds } from "@/lib/sound";

interface ParticipantItem {
  id: string;
  name: string;
  mobile: string;
  raw_mobile?: string;
  status: string;
  score: number;
  questions_answered: number;
  joined_at: string;
}

interface LeaderboardItem {
  rank: number;
  id: string;
  name: string;
  mobile: string;
  raw_mobile?: string;
  status: string;
  score: number;
  questions_answered: number;
  total_questions: number;
  completed: boolean;
  total_time_seconds: number;
  formatted_time: string;
}

interface QuestionAdmin {
  id: number;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
}

export default function AdminPage() {
  const [status, setStatus] = useState<"WAITING" | "LIVE" | "COMPLETED">("WAITING");
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [questions, setQuestions] = useState<QuestionAdmin[]>([]);
  const [activeTab, setActiveTab] = useState<"control" | "roster" | "questions">("control");

  // QR Code & Join Link state
  const [joinUrl, setJoinUrl] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Modals
  const [showStartModal, setShowStartModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionAdmin | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Connection & Audio
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [retroActive, setRetroActive] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Set Join URL dynamically based on browser origin
  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setJoinUrl(`${origin}/join`);
      setSoundActive(sounds.isSoundEnabled());
    }
  }, []);

  // Retro Audio auto-trigger when quiz transitions to LIVE
  useEffect(() => {
    if (status === "LIVE" && soundActive) {
      if (!sounds.isRetroThemePlaying()) {
        sounds.startRetroTheme();
        setRetroActive(true);
      }
    } else if (status === "COMPLETED" || status === "WAITING") {
      if (sounds.isRetroThemePlaying()) {
        sounds.stopRetroTheme();
        setRetroActive(false);
      }
    }
  }, [status, soundActive]);

  // Sync retro active status
  useEffect(() => {
    const timer = setInterval(() => {
      setRetroActive(sounds.isRetroThemePlaying());
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      colors: ["#fbbf24", "#f59e0b", "#d97706", "#fef3c7"],
    });
  }, []);

  const fetchSessionData = useCallback(async () => {
    try {
      const api = getApiBaseUrl();
      const [resSession, resPart, resLb] = await Promise.all([
        fetch(`${api}/api/quiz/session`),
        fetch(`${api}/api/participants`),
        fetch(`${api}/api/quiz/leaderboard?admin=true`),
      ]);

      if (resSession.ok) {
        const sess = await resSession.json();
        setStatus(sess.status);
      }

      if (resPart.ok) {
        const data = await resPart.json();
        setParticipants(data.participants || []);
      }

      if (resLb.ok) {
        const data = await resLb.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch {}
  }, []);

  const fetchQuestions = useCallback(async () => {
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/admin/questions`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;

    const connectWs = () => {
      try {
        const url = getWsUrl("admin");
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!active) return;
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!active) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === "initial_state") {
              setStatus(msg.data.status);
              if (msg.data.leaderboard) setLeaderboard(msg.data.leaderboard);
              fetchSessionData();
            } else if (msg.event === "participant_joined" || msg.event === "participant_removed") {
              fetchSessionData();
              sounds.playJoin();
            } else if (msg.event === "quiz_started") {
              setStatus("LIVE");
              sounds.startRetroTheme();
              setRetroActive(true);
              fetchSessionData();
            } else if (msg.event === "leaderboard_updated") {
              setLeaderboard(msg.data.leaderboard || []);
              fetchSessionData();
            } else if (msg.event === "quiz_completed") {
              setStatus("COMPLETED");
              sounds.stopRetroTheme();
              setRetroActive(false);
              setLeaderboard(msg.data.leaderboard || []);
              triggerConfetti();
              sounds.playVictory();
            } else if (msg.event === "quiz_reset") {
              setStatus("WAITING");
              sounds.stopRetroTheme();
              setRetroActive(false);
              fetchSessionData();
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
    fetchSessionData();
    fetchQuestions();

    // 1000ms polling ensures live tournament standings update smoothly and fast
    const interval = setInterval(fetchSessionData, 1000);

    return () => {
      active = false;
      if (wsRef.current) wsRef.current.close();
      clearInterval(interval);
      sounds.stopRetroTheme();
    };
  }, [fetchSessionData, fetchQuestions, triggerConfetti]);

  // Actions
  const handleStartQuiz = async () => {
    setShowStartModal(false);
    if (soundActive) {
      sounds.startRetroTheme();
      setRetroActive(true);
    }
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/quiz/start`, { method: "POST" });
      if (res.ok) {
        setStatus("LIVE");
        fetchSessionData();
      }
    } catch {}
  };

  const handleEndQuiz = async () => {
    setShowEndModal(false);
    sounds.stopRetroTheme();
    setRetroActive(false);
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/quiz/end`, { method: "POST" });
      if (res.ok) {
        setStatus("COMPLETED");
        triggerConfetti();
        sounds.playVictory();
        fetchSessionData();
      }
    } catch {}
  };

  const handleResetQuiz = async () => {
    setShowResetModal(false);
    sounds.stopRetroTheme();
    setRetroActive(false);
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/quiz/reset`, { method: "POST" });
      if (res.ok) {
        setStatus("WAITING");
        fetchSessionData();
      }
    } catch {}
  };

  const handleKickParticipant = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from competition session?`)) return;
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/participants/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSessionData();
      }
    } catch {}
  };

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const toggleSound = () => {
    const next = sounds.toggleSound();
    setSoundActive(next);
    setRetroActive(sounds.isRetroThemePlaying());
  };

  const toggleRetroAudio = () => {
    const next = sounds.toggleRetroTheme();
    setRetroActive(next);
  };

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  const filteredParticipants = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.raw_mobile && p.raw_mobile.includes(searchTerm)) ||
      (p.mobile && p.mobile.includes(searchTerm))
  );

  return (
    <div className="relative min-h-screen bg-[#120c06] text-amber-100 flex flex-col justify-between p-4 md:p-8 select-none font-sans">
      {/* Background Animated Scanlines & Glow */}
      <div className="scanline-effect" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-amber-900/50 pb-4 gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-amber-400 text-2xl shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            🦀
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-400 font-bold">
                MIDDLE ANDAMAN AQUACULTURE TOURNAMENT
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/90 text-amber-300 border border-amber-700/60">
                HOST COMMAND CENTER
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              Mud Crab Quiz Organizer HUD
            </h1>
          </div>
        </div>

        {/* Global Controls & Status Indicator */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Badge */}
          <div
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 shadow-sm ${
              status === "WAITING"
                ? "bg-amber-950/80 text-amber-300 border-amber-600/60"
                : status === "LIVE"
                ? "bg-red-950/80 text-red-300 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                : "bg-emerald-950/80 text-emerald-300 border-emerald-500/70"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "WAITING"
                  ? "bg-amber-400 animate-pulse"
                  : status === "LIVE"
                  ? "bg-red-500 animate-ping"
                  : "bg-emerald-400"
              }`}
            />
            STATUS: {status}
          </div>

          {/* Quick QR toggle in header if LIVE or COMPLETED */}
          {status !== "WAITING" && (
            <button
              onClick={() => setShowQrModal(true)}
              className="py-2 px-3.5 rounded-xl border border-amber-700/60 bg-[#24170d] hover:bg-[#342213] text-amber-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Show QR Code for Late Joiners"
            >
              <QrCode className="h-4 w-4 text-amber-400" />
              <span>Show QR</span>
            </button>
          )}

          {/* Primary Action Button based on Status */}
          {status === "WAITING" && (
            <button
              onClick={() => setShowStartModal(true)}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.98] font-black text-slate-950 text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.5)] cursor-pointer transition-all"
            >
              <Play className="h-4 w-4 fill-current" /> START QUIZ COMPETITION
            </button>
          )}

          {status === "LIVE" && (
            <button
              onClick={() => setShowEndModal(true)}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] font-black text-white text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(239,68,68,0.5)] cursor-pointer transition-all animate-pulse"
            >
              <Square className="h-4 w-4 fill-current" /> END QUIZ MANUALLY
            </button>
          )}

          {status === "COMPLETED" && (
            <button
              onClick={() => setShowResetModal(true)}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 active:scale-[0.98] font-black text-slate-950 text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.5)] cursor-pointer transition-all"
            >
              <RotateCcw className="h-4 w-4" /> START NEW SESSION
            </button>
          )}

          {/* Always available Reset Button */}
          {status !== "COMPLETED" && (
            <button
              onClick={() => setShowResetModal(true)}
              className="py-2 px-3 rounded-xl border border-amber-900/60 bg-[#1e140a] hover:bg-[#2e1d0f] text-amber-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              title="Reset Competition Session / New Round"
            >
              <RotateCcw className="h-3.5 w-3.5" /> New Session
            </button>
          )}

          {/* Retro Audio Toggle */}
          <button
            onClick={toggleRetroAudio}
            className={`py-1.5 px-3 rounded-xl border text-xs font-mono flex items-center gap-2 cursor-pointer transition-all ${
              retroActive
                ? "bg-amber-950 border-amber-500 text-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse font-bold"
                : "border-amber-900/60 bg-[#1e140a] text-amber-400/70 hover:text-amber-200"
            }`}
            title={retroActive ? "Mute Retro Audio" : "Play Retro Audio"}
          >
            <Gamepad2 className="h-4 w-4 text-amber-400" />
            <span>RETRO AUDIO: {retroActive ? "ON ♫" : "OFF"}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl border border-amber-900/60 bg-[#1e140a] text-amber-300 hover:text-amber-100 cursor-pointer"
            title={soundActive ? "Mute Sound" : "Unmute Sound"}
          >
            {soundActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-amber-600" />}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="relative z-10 flex items-center gap-2 border-b border-amber-900/40 pb-3 mb-6">
        <button
          onClick={() => setActiveTab("control")}
          className={`py-2 px-4 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "control"
              ? "bg-amber-950/90 text-amber-300 border border-amber-600/80 font-bold shadow-sm"
              : "text-amber-200/60 hover:text-white"
          }`}
        >
          <Trophy className="h-4 w-4 text-amber-400" />
          <span>Tournament Control & Live Roster</span>
        </button>
        <button
          onClick={() => setActiveTab("roster")}
          className={`py-2 px-4 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "roster"
              ? "bg-amber-950/90 text-amber-300 border border-amber-600/80 font-bold shadow-sm"
              : "text-amber-200/60 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4 text-amber-400" />
          <span>Participant Manager ({participants.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`py-2 px-4 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "questions"
              ? "bg-amber-950/90 text-amber-300 border border-amber-600/80 font-bold shadow-sm"
              : "text-amber-200/60 hover:text-white"
          }`}
        >
          <BookOpen className="h-4 w-4 text-amber-400" />
          <span>Mud Crab Questions ({questions.length || 59} MCQ)</span>
        </button>
      </div>

      {/* Main Container */}
      <main className="relative z-10 flex-1">
        {/* ================= TAB 1: UNIFIED TOURNAMENT CONTROL ================= */}
        {activeTab === "control" && (
          <div className="space-y-6">
            {/* 1. WAITING STATE: UNIFIED QR CODE + WAITING ROOM ROSTER ON ONE SCREEN */}
            {status === "WAITING" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Card: Large Scannable QR Code */}
                <div className="lg:col-span-5 crab-card rounded-2xl p-6 border-amber-700/60 flex flex-col items-center justify-between text-center shadow-xl">
                  <div className="w-full">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-600/60 text-amber-300 text-xs font-mono uppercase tracking-wider mb-3">
                      <QrCode className="h-3.5 w-3.5 text-amber-400" /> SCAN WITH PHONE CAMERA
                    </div>
                    <h2 className="text-xl font-black text-white tracking-wide">
                      Scan QR to Join Tournament
                    </h2>
                    <p className="text-xs text-amber-200/70 mt-1">
                      Participants enter their name & mobile number to join Middle Andaman competition.
                    </p>
                  </div>

                  {/* QR Code Container with High-Contrast White Background & Golden Border */}
                  <div className="my-5 p-4 bg-white rounded-2xl border-4 border-amber-500 shadow-[0_0_35px_rgba(251,191,36,0.35)] relative group">
                    <QRCodeSVG
                      value={joinUrl || "https://mcq-phi-five.vercel.app/join"}
                      size={210}
                      level="H"
                      includeMargin={false}
                    />
                    <div className="mt-2 text-center text-[10px] font-mono text-slate-900 font-bold uppercase tracking-widest">
                      🦀 MUD CRAB QUIZ
                    </div>
                  </div>

                  {/* Direct Link & Copy Helper */}
                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1108] border border-amber-900/60 text-xs font-mono text-amber-300 justify-between">
                      <span className="truncate max-w-[220px]">{joinUrl || "/join"}</span>
                      <button
                        onClick={handleCopyLink}
                        className="py-1 px-2.5 rounded-lg bg-amber-900/50 hover:bg-amber-800 text-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                      >
                        {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedUrl ? "Copied!" : "Copy Link"}
                      </button>
                    </div>

                    <a
                      href="/join"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 pt-1 underline underline-offset-4"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open Player Screen in New Tab
                    </a>
                  </div>
                </div>

                {/* Right Card: Live Joined Participants Roster & Start Button */}
                <div className="lg:col-span-7 crab-card rounded-2xl p-6 border-amber-700/60 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between border-b border-amber-900/50 pb-4 mb-4">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-amber-400 tracking-wider">
                          LIVE LOBBY
                        </div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                          Registered Competitors ({participants.length})
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Ready for Kickoff</span>
                      </div>
                    </div>

                    {/* Participant List */}
                    {participants.length === 0 ? (
                      <div className="py-16 text-center text-amber-400/50 font-mono text-sm border border-dashed border-amber-900/50 rounded-xl p-8">
                        <Users className="h-10 w-10 text-amber-500/40 mx-auto mb-3 animate-pulse" />
                        <div className="font-bold text-amber-300">Waiting for participants to scan...</div>
                        <p className="text-xs text-amber-400/60 mt-1 max-w-sm mx-auto">
                          Have players point their phone cameras at the QR code on the left to enter the tournament lobby.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {participants.map((p, idx) => (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-xl bg-[#22160c] border border-amber-800/50 hover:border-amber-500 flex items-center justify-between gap-3 shadow-md transition-all animate-in fade-in zoom-in duration-200"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="h-9 w-9 rounded-xl bg-amber-950 border border-amber-600/70 flex items-center justify-center text-amber-400 font-mono font-bold text-xs shrink-0">
                                #{idx + 1}
                              </div>
                              <div className="truncate">
                                <div className="font-bold text-white text-sm truncate">{p.name}</div>
                                <div className="text-[11px] font-mono text-amber-300/70">{p.raw_mobile || p.mobile}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleKickParticipant(p.id, p.name)}
                              className="p-1.5 rounded-lg text-amber-500 hover:text-red-400 hover:bg-red-950/40 transition-colors shrink-0"
                              title="Remove test participant"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Kickoff CTA Bar */}
                  <div className="mt-6 pt-5 border-t border-amber-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs font-mono text-amber-300/80">
                      ⚡ When everyone is joined, press Start Quiz to begin the {questions.length || 59} MCQ examination.
                    </div>
                    <button
                      onClick={() => setShowStartModal(true)}
                      disabled={participants.length === 0}
                      className={`w-full sm:w-auto py-3 px-8 rounded-xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        participants.length > 0
                          ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] active:scale-[0.98]"
                          : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                      }`}
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>START QUIZ ({participants.length} PLAYERS)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. LIVE STATE: REAL-TIME MATCH PROGRESS & LEADERBOARD */}
            {status === "LIVE" && (
              <div className="space-y-6">
                {/* Live Match Notification Header */}
                <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Radio className="h-5 w-5 text-amber-400 animate-pulse shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">
                        ⚡ COMPETITION IS CURRENTLY LIVE
                      </div>
                      <div className="text-xs text-amber-100/80 mt-0.5">
                        Participants are answering the {questions.length || 59} questions on their phones.
                        <strong> The quiz will automatically conclude when all participants finish</strong>, or you can click <strong>END QUIZ MANUALLY</strong> at any time.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEndModal(true)}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shrink-0 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  >
                    <Square className="h-4 w-4 fill-current" /> END QUIZ MANUALLY
                  </button>
                </div>

                {/* Participant Question Progress Tracker Grid */}
                <div className="crab-card rounded-2xl p-6 border-amber-800/60 shadow-xl">
                  <div className="flex items-center justify-between border-b border-amber-900/50 pb-3 mb-4">
                    <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-400" /> Competitor Live Question Progress
                    </h3>
                    <span className="text-xs font-mono text-amber-400">
                      Total: {participants.length} Players • {questions.length || 59} Questions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leaderboard.map((p) => {
                      const totalQ = p.total_questions || questions.length || 59;
                      const pct = Math.min(100, Math.round(((p.questions_answered || 0) / totalQ) * 100));
                      const isDone = p.completed || p.questions_answered >= totalQ;

                      return (
                        <div
                          key={p.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isDone
                              ? "bg-emerald-950/50 border-emerald-600/70"
                              : "bg-[#22160c] border-amber-800/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-white text-sm truncate">{p.name}</div>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                isDone
                                  ? "bg-emerald-900 text-emerald-300 border border-emerald-500"
                                  : "bg-amber-950 text-amber-300 border border-amber-700"
                              }`}
                            >
                              {isDone ? `✓ FINISHED ${totalQ}/${totalQ}` : `Q ${p.questions_answered} / ${totalQ}`}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden mb-2">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isDone
                                  ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                                  : "bg-gradient-to-r from-amber-500 to-yellow-400"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono text-amber-300/80">
                            <span>Score: <strong className="text-white">{p.score}</strong></span>
                            <span>Time: {p.formatted_time || "00:00"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Real-time Rankings Table */}
                <div className="crab-card rounded-2xl p-6 border-amber-800/60 shadow-xl">
                  <div className="flex items-center justify-between border-b border-amber-900/50 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-400" />
                      <h2 className="text-lg font-bold text-white tracking-wide">
                        LIVE STANDINGS (TIEBREAKER BY FASTEST TIME)
                      </h2>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-amber-900/50 text-[11px] font-mono uppercase text-amber-400/80">
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">Competitor</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3 text-center">Score</th>
                          <th className="py-2.5 px-3 text-center">Answered</th>
                          <th className="py-2.5 px-3 text-right">Time</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-950/60 font-mono">
                        {leaderboard.map((p) => {
                          const totalQ = p.total_questions || questions.length || 59;
                          const isDone = p.completed || p.questions_answered >= totalQ;
                          return (
                            <tr key={p.id} className="hover:bg-amber-950/30">
                              <td className="py-3 px-3 font-bold text-amber-400">#{p.rank}</td>
                              <td className="py-3 px-3 font-sans font-bold text-white">{p.name}</td>
                              <td className="py-3 px-3 text-amber-300/70 text-xs">{p.raw_mobile || p.mobile}</td>
                              <td className="py-3 px-3 text-center font-bold text-amber-300">{p.score}</td>
                              <td className="py-3 px-3 text-center text-amber-200/80">{p.questions_answered}/{totalQ}</td>
                              <td className="py-3 px-3 text-right text-slate-400 text-xs">{p.formatted_time}</td>
                              <td className="py-3 px-3 text-right">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    isDone
                                      ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                                      : "bg-amber-950 text-amber-400 border border-amber-800"
                                  }`}
                                >
                                  {isDone ? "FINISHED" : "ANSWERING"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. COMPLETED STATE: OLYMPIC PODIUM + NEXT SESSION BUTTON */}
            {status === "COMPLETED" && (
              <div className="space-y-8">
                {/* Celebration Header & Start New Session CTA */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/90 via-[#2a1a0d] to-amber-950/90 border border-amber-500 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider mb-1">
                      <Sparkles className="h-4 w-4" /> CHAMPIONSHIP CEREMONY
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">
                      Mud Crab Farming Champions!
                    </h2>
                    <p className="text-xs text-amber-200/80 mt-1">
                      All questions concluded. Review final standings below or launch the next tournament session.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowResetModal(true)}
                    className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(251,191,36,0.6)] shrink-0 active:scale-[0.98] transition-all"
                  >
                    <RotateCcw className="h-5 w-5" /> START NEW SESSION / NEXT ROUND
                  </button>
                </div>

                {/* Olympic Podium Display (Top 3) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  {/* 2nd Place Silver */}
                  <div className="order-2 md:order-1 crab-card rounded-2xl p-6 border-slate-400/50 text-center flex flex-col items-center justify-between shadow-xl">
                    <div className="h-14 w-14 rounded-full bg-slate-800 border-2 border-slate-300 flex items-center justify-center text-slate-200 mb-3 shadow-lg">
                      <Medal className="h-7 w-7 text-slate-200" />
                    </div>
                    <div className="text-xs font-mono uppercase text-slate-300 font-bold">2ND PLACE • SILVER</div>
                    <div className="text-xl font-black text-white mt-1">{top2 ? top2.name : "—"}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{top2 ? top2.raw_mobile || top2.mobile : ""}</div>
                    <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Score: <strong className="text-white">{top2 ? top2.score : 0}/{questions.length || 59}</strong></span>
                      <span className="text-slate-400">Time: <strong className="text-white">{top2 ? top2.formatted_time : "—"}</strong></span>
                    </div>
                  </div>

                  {/* 1st Place Gold Champion */}
                  <div className="order-1 md:order-2 crab-card-active rounded-2xl p-8 border-amber-400 text-center flex flex-col items-center justify-between shadow-[0_0_40px_rgba(245,158,11,0.35)] scale-105">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border-2 border-yellow-200 flex items-center justify-center text-slate-950 mb-3 shadow-xl animate-bounce">
                      <Crown className="h-8 w-8 text-slate-950 fill-current" />
                    </div>
                    <div className="text-xs font-mono uppercase text-amber-300 font-black tracking-widest">
                      👑 1ST PLACE CHAMPION • GOLD
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-white mt-1">{top1 ? top1.name : "—"}</div>
                    <div className="text-xs font-mono text-amber-300/80 mt-0.5">{top1 ? top1.raw_mobile || top1.mobile : ""}</div>
                    <div className="mt-5 pt-4 border-t border-amber-800 w-full flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-200">Score: <strong className="text-white text-base">{top1 ? top1.score : 0}/{questions.length || 59}</strong></span>
                      <span className="text-amber-200">Time: <strong className="text-white text-base">{top1 ? top1.formatted_time : "—"}</strong></span>
                    </div>
                  </div>

                  {/* 3rd Place Bronze */}
                  <div className="order-3 md:order-3 crab-card rounded-2xl p-6 border-amber-700/50 text-center flex flex-col items-center justify-between shadow-xl">
                    <div className="h-14 w-14 rounded-full bg-amber-950 border-2 border-amber-600 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                      <Award className="h-7 w-7 text-amber-400" />
                    </div>
                    <div className="text-xs font-mono uppercase text-amber-500 font-bold">3RD PLACE • BRONZE</div>
                    <div className="text-xl font-black text-white mt-1">{top3 ? top3.name : "—"}</div>
                    <div className="text-xs font-mono text-amber-400/60 mt-0.5">{top3 ? top3.raw_mobile || top3.mobile : ""}</div>
                    <div className="mt-4 pt-3 border-t border-amber-900/60 w-full flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-400/80">Score: <strong className="text-white">{top3 ? top3.score : 0}/{questions.length || 59}</strong></span>
                      <span className="text-amber-400/80">Time: <strong className="text-white">{top3 ? top3.formatted_time : "—"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Final Full Standings Table */}
                <div className="crab-card rounded-2xl p-6 border-amber-800/60 shadow-xl">
                  <div className="flex items-center justify-between border-b border-amber-900/50 pb-4 mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-400" />
                      FULL OFFICIAL FINAL SCOREBOARD
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-amber-900/50 text-[11px] font-mono uppercase text-amber-400/80">
                          <th className="py-2.5 px-3">Official Rank</th>
                          <th className="py-2.5 px-3">Competitor Name</th>
                          <th className="py-2.5 px-3">Contact Phone</th>
                          <th className="py-2.5 px-3 text-center">Correct Answers</th>
                          <th className="py-2.5 px-3 text-right">Finish Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-950/60 font-mono">
                        {leaderboard.map((p) => (
                          <tr key={p.id} className="hover:bg-amber-950/30">
                            <td className="py-3 px-3 font-bold text-amber-400">#{p.rank}</td>
                            <td className="py-3 px-3 font-sans font-bold text-white">{p.name}</td>
                            <td className="py-3 px-3 text-amber-300/70 text-xs">{p.raw_mobile || p.mobile}</td>
                            <td className="py-3 px-3 text-center font-bold text-amber-300">{p.score} / {p.total_questions || questions.length || 59}</td>
                            <td className="py-3 px-3 text-right text-slate-400 text-xs">{p.formatted_time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: PARTICIPANT MANAGEMENT ================= */}
        {activeTab === "roster" && (
          <div className="space-y-6">
            <div className="crab-card rounded-2xl p-6 border-amber-800/60 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/50 pb-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide">
                    ROSTER & PARTICIPANT ACTIONS
                  </h2>
                  <p className="text-xs text-amber-200/70">
                    Search and manage connected participants. Remove test users with one click.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/60" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name or mobile..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1a1108] border border-amber-800/60 text-xs text-white placeholder-amber-400/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {filteredParticipants.length === 0 ? (
                <div className="py-12 text-center text-amber-400/50 font-mono text-sm">
                  No participants matching current search query.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-amber-900/50 text-[11px] font-mono uppercase text-amber-400/80">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Mobile Number</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-center">Score</th>
                        <th className="py-2.5 px-3 text-center">Answered</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-950/60 font-mono">
                      {filteredParticipants.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-amber-950/30">
                          <td className="py-3 px-3 text-amber-400/60">{idx + 1}</td>
                          <td className="py-3 px-3 font-sans font-bold text-white">{p.name}</td>
                          <td className="py-3 px-3 text-amber-300/80 text-xs">{p.raw_mobile || p.mobile}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-amber-300">{p.score}</td>
                          <td className="py-3 px-3 text-center text-slate-300">{p.questions_answered}/{questions.length || 59}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleKickParticipant(p.id, p.name)}
                              className="py-1 px-2.5 rounded-lg border border-red-900/60 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-mono flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <UserX className="h-3.5 w-3.5" /> Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: QUESTION BANK ================= */}
        {activeTab === "questions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-amber-900/50 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white uppercase">CRAB SHACK AQUACULTURE TRAINING INSTITUTE</h2>
                <p className="text-xs text-amber-200/70">
                  Model Examination: Mud Crab Fattening & RAS Machinery ({questions.length || 59} Questions with Official Answer Key)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id || q.question_number} className="crab-card rounded-2xl p-5 border-amber-800/60 shadow-lg">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-amber-950 border border-amber-600/70 flex items-center justify-center font-mono font-bold text-xs text-amber-400">
                        {q.question_number}
                      </span>
                      <h4 className="font-bold text-white text-sm">{q.question_text}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 shrink-0">
                      Correct: {q.correct_option}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono mb-3">
                    <div className={`p-2.5 rounded-xl border ${q.correct_option === "A" ? "bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold" : "bg-[#1c1209] border-amber-900/60 text-amber-200/80"}`}>
                      A: {q.option_a}
                    </div>
                    <div className={`p-2.5 rounded-xl border ${q.correct_option === "B" ? "bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold" : "bg-[#1c1209] border-amber-900/60 text-amber-200/80"}`}>
                      B: {q.option_b}
                    </div>
                    <div className={`p-2.5 rounded-xl border ${q.correct_option === "C" ? "bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold" : "bg-[#1c1209] border-amber-900/60 text-amber-200/80"}`}>
                      C: {q.option_c}
                    </div>
                    <div className={`p-2.5 rounded-xl border ${q.correct_option === "D" ? "bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold" : "bg-[#1c1209] border-amber-900/60 text-amber-200/80"}`}>
                      D: {q.option_d}
                    </div>
                  </div>

                  {q.explanation && (
                    <div className="p-3 rounded-xl bg-[#180f07] border border-amber-900/50 text-[11px] text-amber-200/80">
                      <strong className="text-amber-400 font-mono">Expert Note:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODALS ================= */}

      {/* 1. Latecomer QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="crab-card max-w-sm w-full rounded-2xl p-6 border-amber-500 shadow-2xl text-center">
            <h3 className="text-lg font-bold text-white mb-1">Scan to Join Quiz</h3>
            <p className="text-xs text-amber-200/70 mb-4">Point phone camera to join the ongoing match</p>
            <div className="p-4 bg-white rounded-2xl border-4 border-amber-500 inline-block mb-4 shadow-xl">
              <QRCodeSVG value={joinUrl || "/join"} size={200} level="H" />
            </div>
            <div className="text-xs font-mono text-amber-300 break-all mb-4 bg-[#1a1108] p-2 rounded-xl border border-amber-900/60">
              {joinUrl}
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* 2. Start Quiz Confirmation Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="crab-card max-w-md w-full rounded-2xl p-6 border-amber-500 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <Play className="h-6 w-6 fill-current" />
              <h3 className="text-lg font-bold text-white">Start Competition Match?</h3>
            </div>
            <p className="text-xs text-amber-100/80 leading-relaxed mb-4">
              This will transition the competition to <strong>LIVE</strong> state and prompt all {participants.length} connected players to start question 1.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStartModal(false)}
                className="py-2 px-4 rounded-xl border border-amber-900 text-amber-300 text-xs font-mono hover:bg-amber-950"
              >
                Cancel
              </button>
              <button
                onClick={handleStartQuiz}
                className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Yes, Start Quiz Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. End Quiz Confirmation Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="crab-card max-w-md w-full rounded-2xl p-6 border-red-500 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <Square className="h-6 w-6 fill-current" />
              <h3 className="text-lg font-bold text-white">End Quiz Competition?</h3>
            </div>
            <p className="text-xs text-amber-100/80 leading-relaxed mb-4">
              This will conclude the live match immediately, freeze the leaderboard, and reveal the final Olympic victory podium and rankings.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="py-2 px-4 rounded-xl border border-amber-900 text-amber-300 text-xs font-mono hover:bg-amber-950"
              >
                Continue Match
              </button>
              <button
                onClick={handleEndQuiz}
                className="py-2 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Yes, End Competition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Reset Quiz / Start New Session Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="crab-card max-w-md w-full rounded-2xl p-6 border-amber-500 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <RotateCcw className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">Start Brand New Session?</h3>
            </div>
            <p className="text-xs text-amber-100/80 leading-relaxed mb-4">
              This will archive the current tournament round and open a fresh <strong>WAITING</strong> session with a clean participant lobby and new QR code.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="py-2 px-4 rounded-xl border border-amber-900 text-amber-300 text-xs font-mono hover:bg-amber-950"
              >
                Cancel
              </button>
              <button
                onClick={handleResetQuiz}
                className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Yes, Start New Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
