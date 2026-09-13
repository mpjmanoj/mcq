"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
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
    <div className="relative min-h-screen bg-[#f3eee3] text-[#1f1b16] flex flex-col justify-between p-4 md:p-8 select-none font-sans">
      {/* Background coastal glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(232,220,200,0.6)_0%,_transparent_70%)] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#c3ad8b]/70 pb-4 gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[#c3ad8b] bg-white shadow-sm flex items-center justify-center">
            <Image src="/logo.png" alt="Crab Shack" width={42} height={42} className="object-contain p-1" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6d4c2d]">
                CRAB SHACK • AQUACULTURE TOURNAMENT
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#efe2cd] text-[#3f3021] border border-[#c3ad8b]">
                HOST COMMAND CENTER
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#1f1b16] tracking-tight flex items-center gap-2">
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
                ? "bg-[#efe2cd] text-[#3f3021] border-[#c3ad8b]"
                : status === "LIVE"
                ? "bg-red-50 text-red-700 border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                : "bg-emerald-50 text-emerald-800 border-emerald-300"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "WAITING"
                  ? "bg-[#b45309] animate-pulse"
                  : status === "LIVE"
                  ? "bg-red-500 animate-ping"
                  : "bg-emerald-500"
              }`}
            />
            STATUS: {status}
          </div>

          {/* Quick QR toggle in header if LIVE or COMPLETED */}
          {status !== "WAITING" && (
            <button
              onClick={() => setShowQrModal(true)}
              className="py-2 px-3.5 rounded-xl border border-[#c3ad8b] bg-[#efe2cd] hover:bg-[#e4d3bc] text-[#3f3021] text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Show QR Code for Late Joiners"
            >
              <QrCode className="h-4 w-4 text-[#6d4c2d]" />
              <span>Show QR</span>
            </button>
          )}

          {/* Primary Action Button based on Status */}
          {status === "WAITING" && (
            <button
              onClick={() => setShowStartModal(true)}
              className="py-2.5 px-6 rounded-xl bg-[#231f1a] hover:bg-[#4a3225] active:scale-[0.98] font-bold text-white text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg cursor-pointer transition-all"
            >
              <Play className="h-4 w-4 fill-current" /> START QUIZ COMPETITION
            </button>
          )}

          {status === "LIVE" && (
            <button
              onClick={() => setShowEndModal(true)}
              className="py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] font-bold text-white text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg cursor-pointer transition-all animate-pulse"
            >
              <Square className="h-4 w-4 fill-current" /> END QUIZ MANUALLY
            </button>
          )}

          {status === "COMPLETED" && (
            <button
              onClick={() => setShowResetModal(true)}
              className="py-2.5 px-6 rounded-xl bg-[#231f1a] hover:bg-[#4a3225] active:scale-[0.98] font-bold text-white text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg cursor-pointer transition-all"
            >
              <RotateCcw className="h-4 w-4" /> START NEW SESSION
            </button>
          )}

          {/* Always available Reset Button */}
          {status !== "COMPLETED" && (
            <button
              onClick={() => setShowResetModal(true)}
              className="py-2 px-3 rounded-xl border border-[#c3ad8b] bg-[#efe2cd] hover:bg-[#e4d3bc] text-[#3f3021] text-xs font-mono flex items-center gap-1.5 cursor-pointer"
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
                ? "bg-[#231f1a] border-[#231f1a] text-yellow-300 shadow-md font-bold"
                : "border-[#c3ad8b] bg-[#efe2cd] text-[#6d4c2d] hover:text-[#1f1b16]"
            }`}
            title={retroActive ? "Mute Retro Audio" : "Play Retro Audio"}
          >
            <Gamepad2 className="h-4 w-4 text-[#8a5a3c]" />
            <span>RETRO AUDIO: {retroActive ? "ON ♫" : "OFF"}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl border border-[#c3ad8b] bg-[#efe2cd] text-[#3f3021] hover:bg-[#e4d3bc] cursor-pointer"
            title={soundActive ? "Mute Sound" : "Unmute Sound"}
          >
            {soundActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-[#655f56]" />}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="relative z-10 flex items-center gap-2 border-b border-[#c3ad8b]/60 pb-3 mb-6">
        <button
          onClick={() => setActiveTab("control")}
          className={`py-2 px-4 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "control"
              ? "bg-[#231f1a] text-white shadow-sm font-bold"
              : "bg-[#efe2cd]/70 text-[#6d4c2d] hover:bg-[#efe2cd] hover:text-[#1f1b16] border border-[#c3ad8b]/50"
          }`}
        >
          <Trophy className="h-4 w-4 text-[#d97706]" />
          <span>Tournament Control & Live Roster</span>
        </button>
        <button
          onClick={() => setActiveTab("roster")}
          className={`py-2 px-4 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "roster"
              ? "bg-[#231f1a] text-white shadow-sm font-bold"
              : "bg-[#efe2cd]/70 text-[#6d4c2d] hover:bg-[#efe2cd] hover:text-[#1f1b16] border border-[#c3ad8b]/50"
          }`}
        >
          <Users className="h-4 w-4 text-[#d97706]" />
          <span>Participant Manager ({participants.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`py-2 px-4 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "questions"
              ? "bg-[#231f1a] text-white shadow-sm font-bold"
              : "bg-[#efe2cd]/70 text-[#6d4c2d] hover:bg-[#efe2cd] hover:text-[#1f1b16] border border-[#c3ad8b]/50"
          }`}
        >
          <BookOpen className="h-4 w-4 text-[#d97706]" />
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
                <div className="lg:col-span-5 crab-card rounded-2xl p-6 border-[#c3ad8b] flex flex-col items-center justify-between text-center shadow-xl">
                  <div className="w-full">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#efe2cd] border border-[#c3ad8b] text-[#6d4c2d] text-xs font-mono uppercase tracking-wider mb-3 font-semibold">
                      <QrCode className="h-3.5 w-3.5 text-[#8a5a3c]" /> SCAN WITH PHONE CAMERA
                    </div>
                    <h2 className="text-xl font-black text-[#1f1b16] tracking-tight">
                      Scan QR to Join Tournament
                    </h2>
                    <p className="text-xs text-[#5a5146] mt-1">
                      Participants enter their name & mobile number to join Middle Andaman competition.
                    </p>
                  </div>

                  {/* QR Code Container with High-Contrast White Background & Sandy Terracotta Border */}
                  <div className="my-5 p-4 bg-white rounded-2xl border-4 border-[#c3ad8b] shadow-md relative group">
                    <QRCodeSVG
                      value={joinUrl || "https://mcq-phi-five.vercel.app/join"}
                      size={210}
                      level="H"
                      includeMargin={false}
                    />
                    <div className="mt-2 text-center text-[10px] font-mono text-[#6d4c2d] font-bold uppercase tracking-widest">
                      🦀 CRAB SHACK • MUD CRAB QUIZ
                    </div>
                  </div>

                  {/* Direct Link & Copy Helper */}
                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#efe2cd] border border-[#c3ad8b] text-xs font-mono text-[#3f3021] justify-between">
                      <span className="truncate max-w-[220px]">{joinUrl || "/join"}</span>
                      <button
                        onClick={handleCopyLink}
                        className="py-1 px-2.5 rounded-lg bg-[#231f1a] hover:bg-[#4a3225] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                      >
                        {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedUrl ? "Copied!" : "Copy Link"}
                      </button>
                    </div>

                    <a
                      href="/join"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-mono text-[#6d4c2d] hover:text-[#1f1b16] pt-1 underline underline-offset-4"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open Player Screen in New Tab
                    </a>
                  </div>
                </div>

                {/* Right Card: Live Joined Participants Roster & Start Button */}
                <div className="lg:col-span-7 crab-card rounded-2xl p-6 border-[#c3ad8b] flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between border-b border-[#c3ad8b]/60 pb-4 mb-4">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-[#6d4c2d] tracking-wider font-semibold">
                          LIVE LOBBY
                        </div>
                        <h2 className="text-xl font-black text-[#1f1b16] flex items-center gap-2">
                          Registered Competitors ({participants.length})
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Ready for Kickoff</span>
                      </div>
                    </div>

                    {/* Participant List */}
                    {participants.length === 0 ? (
                      <div className="py-16 text-center text-[#6d4c2d] font-mono text-sm border border-dashed border-[#c3ad8b] rounded-xl p-8 bg-[#efe2cd]/40">
                        <Users className="h-10 w-10 text-[#8a5a3c]/60 mx-auto mb-3 animate-pulse" />
                        <div className="font-bold text-[#1f1b16]">Waiting for participants to scan...</div>
                        <p className="text-xs text-[#5a5146] mt-1 max-w-sm mx-auto">
                          Have players point their phone cameras at the QR code on the left to enter the tournament lobby.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {participants.map((p, idx) => (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-xl bg-white border border-[#c3ad8b] hover:border-[#8a5a3c] flex items-center justify-between gap-3 shadow-sm transition-all animate-in fade-in zoom-in duration-200"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="h-9 w-9 rounded-xl bg-[#efe2cd] border border-[#c3ad8b] flex items-center justify-center text-[#6d4c2d] font-mono font-bold text-xs shrink-0">
                                #{idx + 1}
                              </div>
                              <div className="truncate">
                                <div className="font-bold text-[#1f1b16] text-sm truncate">{p.name}</div>
                                <div className="text-[11px] font-mono text-[#6d4c2d]">{p.raw_mobile || p.mobile}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleKickParticipant(p.id, p.name)}
                              className="p-1.5 rounded-lg text-[#8a5a3c] hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
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
                  <div className="mt-6 pt-5 border-t border-[#c3ad8b]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs font-mono text-[#6d4c2d]">
                      ⚡ When everyone is joined, press Start Quiz to begin the {questions.length || 59} MCQ examination.
                    </div>
                    <button
                      onClick={() => setShowStartModal(true)}
                      disabled={participants.length === 0}
                      className={`w-full sm:w-auto py-3 px-8 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        participants.length > 0
                          ? "bg-[#231f1a] hover:bg-[#4a3225] text-white shadow-xl active:scale-[0.98]"
                          : "bg-[#e2d0b7] text-[#8a7a67] border border-[#c3ad8b] cursor-not-allowed"
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
                <div className="p-4 rounded-2xl bg-[#efe2cd] border border-[#c3ad8b] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <Radio className="h-5 w-5 text-[#8a5a3c] animate-pulse shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-[#6d4c2d] font-mono uppercase tracking-wider">
                        ⚡ COMPETITION IS CURRENTLY LIVE
                      </div>
                      <div className="text-xs text-[#5a5146] mt-0.5">
                        Participants are answering the {questions.length || 59} questions on their phones.
                        <strong className="text-[#1f1b16]"> The quiz will automatically conclude when all participants finish</strong>, or you can click <strong className="text-[#1f1b16]">END QUIZ MANUALLY</strong> at any time.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEndModal(true)}
                    className="py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shrink-0 shadow-md"
                  >
                    <Square className="h-4 w-4 fill-current" /> END QUIZ MANUALLY
                  </button>
                </div>

                {/* Participant Question Progress Tracker Grid */}
                <div className="crab-card rounded-2xl p-6 border-[#c3ad8b] shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#c3ad8b]/60 pb-3 mb-4">
                    <h3 className="text-sm font-bold font-mono text-[#1f1b16] uppercase tracking-wider flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[#8a5a3c]" /> Competitor Live Question Progress
                    </h3>
                    <span className="text-xs font-mono text-[#6d4c2d] font-semibold">
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
                              ? "bg-emerald-50 border-emerald-300 shadow-sm"
                              : "bg-white border-[#c3ad8b] shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-[#1f1b16] text-sm truncate">{p.name}</div>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-[#efe2cd] text-[#6d4c2d] border border-[#c3ad8b]"
                              }`}
                            >
                              {isDone ? `✓ FINISHED ${totalQ}/${totalQ}` : `Q ${p.questions_answered} / ${totalQ}`}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-[#efe2cd] overflow-hidden mb-2">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isDone
                                  ? "bg-emerald-600"
                                  : "bg-[#231f1a]"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono text-[#5a5146]">
                            <span>Score: <strong className="text-[#1f1b16]">{p.score}</strong></span>
                            <span>Time: {p.formatted_time || "00:00"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Real-time Rankings Table */}
                <div className="crab-card rounded-2xl p-6 border-[#c3ad8b] shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#c3ad8b]/60 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-[#8a5a3c]" />
                      <h2 className="text-lg font-bold text-[#1f1b16] tracking-tight">
                        LIVE STANDINGS (TIEBREAKER BY FASTEST TIME)
                      </h2>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#c3ad8b]/60 text-[11px] font-mono uppercase text-[#6d4c2d] font-bold">
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">Competitor</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3 text-center">Score</th>
                          <th className="py-2.5 px-3 text-center">Answered</th>
                          <th className="py-2.5 px-3 text-right">Time</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c3ad8b]/40 font-mono">
                        {leaderboard.map((p) => {
                          const totalQ = p.total_questions || questions.length || 59;
                          const isDone = p.completed || p.questions_answered >= totalQ;
                          return (
                            <tr key={p.id} className="hover:bg-[#efe2cd]/30 text-[#1f1b16]">
                              <td className="py-3 px-3 font-bold text-[#8a5a3c]">#{p.rank}</td>
                              <td className="py-3 px-3 font-sans font-bold text-[#1f1b16]">{p.name}</td>
                              <td className="py-3 px-3 text-[#5a5146] text-xs">{p.raw_mobile || p.mobile}</td>
                              <td className="py-3 px-3 text-center font-bold text-[#1f1b16]">{p.score}</td>
                              <td className="py-3 px-3 text-center text-[#5a5146]">{p.questions_answered}/{totalQ}</td>
                              <td className="py-3 px-3 text-right text-[#5a5146] text-xs">{p.formatted_time}</td>
                              <td className="py-3 px-3 text-right">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    isDone
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold"
                                      : "bg-[#efe2cd] text-[#6d4c2d] border border-[#c3ad8b]"
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
                <div className="p-6 rounded-2xl crab-card border-[#c3ad8b] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#6d4c2d] font-bold uppercase tracking-wider mb-1">
                      <Sparkles className="h-4 w-4 text-[#8a5a3c]" /> CHAMPIONSHIP CEREMONY
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-[#1f1b16] tracking-tight">
                      Mud Crab Farming Champions!
                    </h2>
                    <p className="text-xs text-[#5a5146] mt-1">
                      All questions concluded. Review final standings below or launch the next tournament session.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowResetModal(true)}
                    className="py-3.5 px-8 rounded-xl bg-[#231f1a] hover:bg-[#4a3225] text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xl shrink-0 active:scale-[0.98] transition-all"
                  >
                    <RotateCcw className="h-5 w-5" /> START NEW SESSION / NEXT ROUND
                  </button>
                </div>

                {/* Olympic Podium Display (Top 3) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  {/* 2nd Place Silver */}
                  <div className="order-2 md:order-1 crab-card rounded-2xl p-6 border-[#c3ad8b] text-center flex flex-col items-center justify-between shadow-xl">
                    <div className="h-14 w-14 rounded-full bg-[#efe2cd] border-2 border-slate-400 flex items-center justify-center text-slate-700 mb-3 shadow-md">
                      <Medal className="h-7 w-7 text-slate-700" />
                    </div>
                    <div className="text-xs font-mono uppercase text-slate-700 font-bold">2ND PLACE • SILVER</div>
                    <div className="text-xl font-black text-[#1f1b16] mt-1">{top2 ? top2.name : "—"}</div>
                    <div className="text-xs font-mono text-[#5a5146] mt-0.5">{top2 ? top2.raw_mobile || top2.mobile : ""}</div>
                    <div className="mt-4 pt-3 border-t border-[#c3ad8b]/50 w-full flex items-center justify-between text-xs font-mono">
                      <span className="text-[#5a5146]">Score: <strong className="text-[#1f1b16]">{top2 ? top2.score : 0}/{questions.length || 59}</strong></span>
                      <span className="text-[#5a5146]">Time: <strong className="text-[#1f1b16]">{top2 ? top2.formatted_time : "—"}</strong></span>
                    </div>
                  </div>

                  {/* 1st Place Gold Champion */}
                  <div className="order-1 md:order-2 crab-card rounded-2xl p-8 border-2 border-[#8a5a3c] text-center flex flex-col items-center justify-between shadow-2xl scale-105 bg-white">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-500 border-2 border-yellow-200 flex items-center justify-center text-slate-950 mb-3 shadow-xl animate-bounce">
                      <Crown className="h-8 w-8 text-slate-950 fill-current" />
                    </div>
                    <div className="text-xs font-mono uppercase text-[#6d4c2d] font-black tracking-widest">
                      👑 1ST PLACE CHAMPION • GOLD
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-[#1f1b16] mt-1">{top1 ? top1.name : "—"}</div>
                    <div className="text-xs font-mono text-[#6d4c2d] mt-0.5">{top1 ? top1.raw_mobile || top1.mobile : ""}</div>
                    <div className="mt-5 pt-4 border-t border-[#c3ad8b] w-full flex items-center justify-between text-xs font-mono">
                      <span className="text-[#3f3021]">Score: <strong className="text-[#1f1b16] text-base">{top1 ? top1.score : 0}/{questions.length || 59}</strong></span>
                      <span className="text-[#3f3021]">Time: <strong className="text-[#1f1b16] text-base">{top1 ? top1.formatted_time : "—"}</strong></span>
                    </div>
                  </div>

                  {/* 3rd Place Bronze */}
                  <div className="order-3 md:order-3 crab-card rounded-2xl p-6 border-[#c3ad8b] text-center flex flex-col items-center justify-between shadow-xl">
                    <div className="h-14 w-14 rounded-full bg-[#efe2cd] border-2 border-[#8a5a3c] flex items-center justify-center text-[#8a5a3c] mb-3 shadow-md">
                      <Award className="h-7 w-7 text-[#8a5a3c]" />
                    </div>
                    <div className="text-xs font-mono uppercase text-[#8a5a3c] font-bold">3RD PLACE • BRONZE</div>
                    <div className="text-xl font-black text-[#1f1b16] mt-1">{top3 ? top3.name : "—"}</div>
                    <div className="text-xs font-mono text-[#5a5146] mt-0.5">{top3 ? top3.raw_mobile || top3.mobile : ""}</div>
                    <div className="mt-4 pt-3 border-t border-[#c3ad8b]/50 w-full flex items-center justify-between text-xs font-mono">
                      <span className="text-[#5a5146]">Score: <strong className="text-[#1f1b16]">{top3 ? top3.score : 0}/{questions.length || 59}</strong></span>
                      <span className="text-[#5a5146]">Time: <strong className="text-[#1f1b16]">{top3 ? top3.formatted_time : "—"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Final Full Standings Table */}
                <div className="crab-card rounded-2xl p-6 border-[#c3ad8b] shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#c3ad8b]/60 pb-4 mb-4">
                    <h3 className="text-base font-bold text-[#1f1b16] flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-[#8a5a3c]" />
                      FULL OFFICIAL FINAL SCOREBOARD
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#c3ad8b]/60 text-[11px] font-mono uppercase text-[#6d4c2d] font-bold">
                          <th className="py-2.5 px-3">Official Rank</th>
                          <th className="py-2.5 px-3">Competitor Name</th>
                          <th className="py-2.5 px-3">Contact Phone</th>
                          <th className="py-2.5 px-3 text-center">Correct Answers</th>
                          <th className="py-2.5 px-3 text-right">Finish Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c3ad8b]/40 font-mono">
                        {leaderboard.map((p) => (
                          <tr key={p.id} className="hover:bg-[#efe2cd]/30 text-[#1f1b16]">
                            <td className="py-3 px-3 font-bold text-[#8a5a3c]">#{p.rank}</td>
                            <td className="py-3 px-3 font-sans font-bold text-[#1f1b16]">{p.name}</td>
                            <td className="py-3 px-3 text-[#5a5146] text-xs">{p.raw_mobile || p.mobile}</td>
                            <td className="py-3 px-3 text-center font-bold text-[#1f1b16]">{p.score} / {p.total_questions || questions.length || 59}</td>
                            <td className="py-3 px-3 text-right text-[#5a5146] text-xs">{p.formatted_time}</td>
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
            <div className="crab-card rounded-2xl p-6 border-[#c3ad8b] shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#c3ad8b]/60 pb-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#1f1b16] tracking-tight">
                    ROSTER & PARTICIPANT ACTIONS
                  </h2>
                  <p className="text-xs text-[#5a5146]">
                    Search and manage connected participants. Remove test users with one click.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a5a3c]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name or mobile..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#c3ad8b] text-xs text-[#1f1b16] placeholder-[#8a7a67] focus:outline-none focus:border-[#8a5a3c]"
                  />
                </div>
              </div>

              {filteredParticipants.length === 0 ? (
                <div className="py-12 text-center text-[#6d4c2d] font-mono text-sm">
                  No participants matching current search query.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#c3ad8b]/60 text-[11px] font-mono uppercase text-[#6d4c2d] font-bold">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Mobile Number</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-center">Score</th>
                        <th className="py-2.5 px-3 text-center">Answered</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c3ad8b]/40 font-mono">
                      {filteredParticipants.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-[#efe2cd]/30 text-[#1f1b16]">
                          <td className="py-3 px-3 text-[#8a5a3c]">#{idx + 1}</td>
                          <td className="py-3 px-3 font-sans font-bold text-[#1f1b16]">{p.name}</td>
                          <td className="py-3 px-3 text-[#5a5146] text-xs">{p.raw_mobile || p.mobile}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#efe2cd] text-[#6d4c2d] border border-[#c3ad8b]">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-[#1f1b16]">{p.score}</td>
                          <td className="py-3 px-3 text-center text-[#5a5146]">{p.questions_answered}/{questions.length || 59}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleKickParticipant(p.id, p.name)}
                              className="py-1 px-2.5 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-mono flex items-center gap-1 ml-auto cursor-pointer"
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
            <div className="flex items-center justify-between border-b border-[#c3ad8b]/60 pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#1f1b16] uppercase">CRAB SHACK AQUACULTURE TRAINING INSTITUTE</h2>
                <p className="text-xs text-[#5a5146]">
                  Model Examination: Mud Crab Fattening & RAS Machinery ({questions.length || 59} Questions with Official Answer Key)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id || q.question_number} className="crab-card rounded-2xl p-5 border-[#c3ad8b] shadow-md">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-[#efe2cd] border border-[#c3ad8b] flex items-center justify-center font-mono font-bold text-xs text-[#6d4c2d]">
                        {q.question_number}
                      </span>
                      <h4 className="font-bold text-[#1f1b16] text-sm">{q.question_text}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                      Correct: {q.correct_option}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono mb-3">
                    <div className={`p-2.5 rounded-xl border ${q.correct_option === "A" ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold" : "bg-white border-[#c3ad8b] text-[#5a5146]"}`}>
                      A: {q.option_a}
                    </div>
                    <div className={`p-2.5 rounded-xl border ${q.correct_option === "B" ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold" : "bg-white border-[#c3ad8b] text-[#5a5146]"}`}>
                      B: {q.option_b}
                    </div>
                    <div className={`p-2.5 rounded-xl border ${q.correct_option === "C" ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold" : "bg-white border-[#c3ad8b] text-[#5a5146]"}`}>
                      C: {q.option_c}
                    </div>
                    <div className={`p-2.5 rounded-xl border ${q.correct_option === "D" ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold" : "bg-white border-[#c3ad8b] text-[#5a5146]"}`}>
                      D: {q.option_d}
                    </div>
                  </div>

                  {q.explanation && (
                    <div className="p-3 rounded-xl bg-[#efe2cd] border border-[#c3ad8b] text-[11px] text-[#3f3021]">
                      <strong className="text-[#6d4c2d] font-mono">Expert Note:</strong> {q.explanation}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="crab-card max-w-sm w-full rounded-2xl p-6 border-[#c3ad8b] shadow-2xl text-center">
            <h3 className="text-lg font-bold text-[#1f1b16] mb-1">Scan to Join Quiz</h3>
            <p className="text-xs text-[#5a5146] mb-4">Point phone camera to join the ongoing match</p>
            <div className="p-4 bg-white rounded-2xl border-4 border-[#c3ad8b] inline-block mb-4 shadow-md">
              <QRCodeSVG value={joinUrl || "/join"} size={200} level="H" />
            </div>
            <div className="text-xs font-mono text-[#3f3021] break-all mb-4 bg-[#efe2cd] p-2 rounded-xl border border-[#c3ad8b]">
              {joinUrl}
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#231f1a] hover:bg-[#4a3225] text-white font-bold text-xs uppercase cursor-pointer transition-colors"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* 2. Start Quiz Confirmation Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="crab-card max-w-md w-full rounded-2xl p-6 border-[#c3ad8b] shadow-2xl">
            <div className="flex items-center gap-3 text-[#231f1a] mb-3">
              <Play className="h-6 w-6 fill-current text-[#8a5a3c]" />
              <h3 className="text-lg font-bold text-[#1f1b16]">Start Competition Match?</h3>
            </div>
            <p className="text-xs text-[#5a5146] leading-relaxed mb-4">
              This will transition the competition to <strong>LIVE</strong> state and prompt all {participants.length} connected players to start question 1.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStartModal(false)}
                className="py-2 px-4 rounded-xl border border-[#c3ad8b] text-[#3f3021] bg-[#efe2cd] text-xs font-mono hover:bg-[#e4d3bc]"
              >
                Cancel
              </button>
              <button
                onClick={handleStartQuiz}
                className="py-2 px-5 rounded-xl bg-[#231f1a] hover:bg-[#4a3225] text-white font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-colors"
              >
                Yes, Start Quiz Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. End Quiz Confirmation Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="crab-card max-w-md w-full rounded-2xl p-6 border border-red-300 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <Square className="h-6 w-6 fill-current" />
              <h3 className="text-lg font-bold text-[#1f1b16]">End Quiz Competition?</h3>
            </div>
            <p className="text-xs text-[#5a5146] leading-relaxed mb-4">
              This will conclude the live match immediately, freeze the leaderboard, and reveal the final Olympic victory podium and rankings.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="py-2 px-4 rounded-xl border border-[#c3ad8b] text-[#3f3021] bg-[#efe2cd] text-xs font-mono hover:bg-[#e4d3bc]"
              >
                Continue Match
              </button>
              <button
                onClick={handleEndQuiz}
                className="py-2 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-colors"
              >
                Yes, End Competition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Reset Quiz / Start New Session Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="crab-card max-w-md w-full rounded-2xl p-6 border-[#c3ad8b] shadow-2xl">
            <div className="flex items-center gap-3 text-[#8a5a3c] mb-3">
              <RotateCcw className="h-6 w-6" />
              <h3 className="text-lg font-bold text-[#1f1b16]">Start Brand New Session?</h3>
            </div>
            <p className="text-xs text-[#5a5146] leading-relaxed mb-4">
              This will archive the current tournament round and open a fresh <strong>WAITING</strong> session with a clean participant lobby and new QR code.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="py-2 px-4 rounded-xl border border-[#c3ad8b] text-[#3f3021] bg-[#efe2cd] text-xs font-mono hover:bg-[#e4d3bc]"
              >
                Cancel
              </button>
              <button
                onClick={handleResetQuiz}
                className="py-2 px-5 rounded-xl bg-[#231f1a] hover:bg-[#4a3225] text-white font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-colors"
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
