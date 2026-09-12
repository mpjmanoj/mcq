"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ShieldAlert,
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
  const wsRef = useRef<WebSocket | null>(null);

  const fetchSessionData = useCallback(async () => {
    try {
      const api = getApiBaseUrl();
      const resSession = await fetch(`${api}/api/quiz/session`);
      if (resSession.ok) {
        const sess = await resSession.json();
        setStatus(sess.status);
      }

      const resPart = await fetch(`${api}/api/participants`);
      if (resPart.ok) {
        const data = await resPart.json();
        setParticipants(data.participants);
      }

      const resLb = await fetch(`${api}/api/quiz/leaderboard?admin=true`);
      if (resLb.ok) {
        const data = await resLb.json();
        setLeaderboard(data.leaderboard);
      }
    } catch {}
  }, []);

  const fetchQuestions = useCallback(async () => {
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/admin/questions`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSoundActive(sounds.isSoundEnabled());
    }

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
              sounds.playCountdown(true);
              fetchSessionData();
            } else if (msg.event === "leaderboard_updated") {
              setLeaderboard(msg.data.leaderboard);
            } else if (msg.event === "quiz_completed") {
              setStatus("COMPLETED");
              setLeaderboard(msg.data.leaderboard);
              sounds.playVictory();
            } else if (msg.event === "quiz_reset") {
              setStatus("WAITING");
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

    const interval = setInterval(fetchSessionData, 3000);

    return () => {
      active = false;
      if (wsRef.current) wsRef.current.close();
      clearInterval(interval);
    };
  }, [fetchSessionData, fetchQuestions]);

  // Actions
  const handleStartQuiz = async () => {
    setShowStartModal(false);
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
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/quiz/end`, { method: "POST" });
      if (res.ok) {
        setStatus("COMPLETED");
        fetchSessionData();
      }
    } catch {}
  };

  const handleResetQuiz = async () => {
    setShowResetModal(false);
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

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    try {
      const api = getApiBaseUrl();
      const res = await fetch(`${api}/api/admin/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingQuestion),
      });
      if (res.ok) {
        setEditingQuestion(null);
        fetchQuestions();
      }
    } catch {}
  };

  const toggleSound = () => {
    const next = sounds.toggleSound();
    setSoundActive(next);
  };

  const filteredParticipants = participants.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.raw_mobile && p.raw_mobile.includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-[#060e15] text-slate-100 p-5 lg:p-8 font-sans select-none">
      {/* Background scanline effect */}
      <div className="scanline-effect" />

      {/* Header Mission Control Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-cyan-900/50 pb-5 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-600/30 to-slate-900 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                ADMIN COMMAND CENTER
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <span className={`inline-block h-2 w-2 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {wsConnected ? "SOCKET ACTIVE" : "CONNECTING"}
              </div>
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white mt-1">
              MUD CRAB QUIZ — ADMIN
            </h1>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Status Badge */}
          <div
            className={`px-3.5 py-1.5 rounded-lg border font-mono text-xs tracking-wider uppercase font-bold flex items-center gap-2 ${
              status === "LIVE"
                ? "bg-red-950/70 border-red-500 text-red-400 glow-cyan-sm"
                : status === "COMPLETED"
                ? "bg-amber-950/70 border-amber-500 text-amber-300"
                : "bg-cyan-950/70 border-cyan-500 text-cyan-400"
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${status === "LIVE" ? "animate-spin text-red-400" : ""}`} />
            STATUS: {status}
          </div>

          {/* Primary Action Button based on Status */}
          {status === "WAITING" && (
            <button
              onClick={() => setShowStartModal(true)}
              className="py-2 px-5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] font-bold text-slate-950 text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" /> START QUIZ
            </button>
          )}

          {status === "LIVE" && (
            <button
              onClick={() => setShowEndModal(true)}
              className="py-2 px-5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] font-bold text-white text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.35)] cursor-pointer"
            >
              <Square className="h-4 w-4 fill-current" /> END QUIZ
            </button>
          )}

          {status === "COMPLETED" && (
            <button
              onClick={() => setShowResetModal(true)}
              className="py-2 px-5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98] font-bold text-white text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" /> RESET QUIZ
            </button>
          )}

          {/* Always available Reset Button */}
          {status !== "COMPLETED" && (
            <button
              onClick={() => setShowResetModal(true)}
              className="py-2 px-3 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              title="Reset Competition Session"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg border border-cyan-900/60 bg-slate-900 text-slate-300 hover:text-cyan-400"
            title={soundActive ? "Mute Sound" : "Unmute Sound"}
          >
            {soundActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-cyan-900/40 pb-3 mb-6">
        <button
          onClick={() => setActiveTab("control")}
          className={`py-2 px-4 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-colors ${
            activeTab === "control"
              ? "bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Trophy className="h-4 w-4" /> Live Leaderboard & Ops
        </button>
        <button
          onClick={() => setActiveTab("roster")}
          className={`py-2 px-4 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-colors ${
            activeTab === "roster"
              ? "bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" /> Participant Management ({participants.length})
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`py-2 px-4 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-colors ${
            activeTab === "questions"
              ? "bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <BookOpen className="h-4 w-4" /> Question Bank (20)
        </button>
      </div>

      {/* Telemetry Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-[#091a26]/90 border border-cyan-900/60">
          <div className="text-xs font-mono text-slate-400 uppercase">Total Registered</div>
          <div className="text-3xl font-black text-white font-mono mt-1">{participants.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#091a26]/90 border border-cyan-900/60">
          <div className="text-xs font-mono text-slate-400 uppercase">Currently Playing</div>
          <div className="text-3xl font-black text-cyan-400 font-mono mt-1">
            {participants.filter((p) => p.status === "PLAYING").length}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#091a26]/90 border border-cyan-900/60">
          <div className="text-xs font-mono text-slate-400 uppercase">Completed Quiz</div>
          <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
            {participants.filter((p) => p.status === "COMPLETED").length}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#091a26]/90 border border-cyan-900/60">
          <div className="text-xs font-mono text-slate-400 uppercase">Total Questions</div>
          <div className="text-3xl font-black text-amber-400 font-mono mt-1">20 MCQ</div>
        </div>
      </div>

      {/* ================= TAB 1: LIVE LEADERBOARD ================= */}
      {activeTab === "control" && (
        <div className="space-y-6">
          <div className="cyber-card rounded-2xl p-6 border-cyan-900/60">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white tracking-wide">
                  REAL-TIME COMPETITION RANKINGS
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Priority 1: Score | Priority 2: Completion Timestamp
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-mono text-sm">
                No active leaderboard entries yet. Waiting for participants to join and submit answers.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cyan-900/50 text-[11px] font-mono uppercase text-slate-400">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Participant</th>
                      <th className="py-2.5 px-3">Mobile (Admin View)</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Progress</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-right">Time Elapsed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {leaderboard.map((item) => (
                      <tr key={item.id} className="hover:bg-cyan-950/30">
                        <td className="py-3 px-3 font-mono font-bold">
                          <span
                            className={`inline-flex items-center justify-center h-6 w-6 rounded text-xs ${
                              item.rank === 1
                                ? "bg-amber-500 text-black font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                : item.rank === 2
                                ? "bg-slate-300 text-black font-black"
                                : item.rank === 3
                                ? "bg-amber-700 text-white font-black"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            #{item.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-white">{item.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-xs">
                          {item.raw_mobile || item.mobile}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase ${
                              item.completed
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                                : item.status === "PLAYING"
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-700/50"
                                : "bg-slate-900 text-slate-400 border border-slate-700/50"
                            }`}
                          >
                            {item.completed ? "Completed" : item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          {item.questions_answered} / {item.total_questions}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-cyan-300 text-base">
                          {item.score}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-400 text-xs">
                          {item.formatted_time}
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

      {/* ================= TAB 2: PARTICIPANT MANAGEMENT ================= */}
      {activeTab === "roster" && (
        <div className="cyber-card rounded-2xl p-6 border-cyan-900/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-cyan-900/40 pb-4 mb-4 gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                REGISTERED PARTICIPANTS ROSTER
              </h2>
              <p className="text-xs text-slate-400">
                View participant status, raw mobile numbers, scores, and remove test accounts.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-900/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {filteredParticipants.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-sm">
              No participants match search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cyan-900/50 text-[11px] font-mono uppercase text-slate-400">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Mobile Number</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3 text-center">Questions</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredParticipants.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-3 font-mono text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-white">{p.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-300 text-xs">{p.raw_mobile || p.mobile}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                            p.status === "COMPLETED"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                              : p.status === "PLAYING"
                              ? "bg-cyan-950 text-cyan-300 border border-cyan-700/50"
                              : "bg-slate-900 text-slate-400 border border-slate-700/50"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-cyan-300">
                        {p.score}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300 text-xs">
                        {p.questions_answered} / 20
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleKickParticipant(p.id, p.name)}
                          className="py-1 px-2.5 rounded bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-300 text-xs font-mono inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <UserX className="h-3 w-3" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: QUESTION BANK ================= */}
      {activeTab === "questions" && (
        <div className="cyber-card rounded-2xl p-6 border-cyan-900/60">
          <div className="border-b border-cyan-900/40 pb-4 mb-4">
            <h2 className="text-lg font-bold text-white tracking-wide">
              MUD CRAB AQUACULTURE QUESTION BANK (20 MCQ)
            </h2>
            <p className="text-xs text-slate-400">
              Validated scientific questions regarding species, water salinity, fattening, shelters, and broodstock.
            </p>
          </div>

          <div className="space-y-4">
            {questions.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-cyan-800/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono text-xs font-bold border border-cyan-800/50">
                      Q{String(q.question_number).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-semibold">
                      Correct: Option {q.correct_option}
                    </span>
                  </div>
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="text-xs text-cyan-400 hover:underline font-mono"
                  >
                    Edit Question
                  </button>
                </div>

                <p className="text-sm font-semibold text-white mb-3">{q.question_text}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  <div className={`p-2 rounded border ${q.correct_option === "A" ? "border-emerald-500 bg-emerald-950/40 text-emerald-200" : "border-slate-800 text-slate-400"}`}>
                    <strong>A:</strong> {q.option_a}
                  </div>
                  <div className={`p-2 rounded border ${q.correct_option === "B" ? "border-emerald-500 bg-emerald-950/40 text-emerald-200" : "border-slate-800 text-slate-400"}`}>
                    <strong>B:</strong> {q.option_b}
                  </div>
                  <div className={`p-2 rounded border ${q.correct_option === "C" ? "border-emerald-500 bg-emerald-950/40 text-emerald-200" : "border-slate-800 text-slate-400"}`}>
                    <strong>C:</strong> {q.option_c}
                  </div>
                  <div className={`p-2 rounded border ${q.correct_option === "D" ? "border-emerald-500 bg-emerald-950/40 text-emerald-200" : "border-slate-800 text-slate-400"}`}>
                    <strong>D:</strong> {q.option_d}
                  </div>
                </div>

                {q.explanation && (
                  <div className="mt-2.5 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <span className="text-cyan-400 font-mono">Reasoning:</span> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Start Quiz Confirmation Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="cyber-card rounded-2xl max-w-md w-full p-6 border-emerald-500/50 glow-emerald">
            <div className="h-12 w-12 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-4">
              <Play className="h-6 w-6 fill-current" />
            </div>
            <h3 className="text-xl font-black text-white">START QUIZ?</h3>
            <p className="text-sm text-slate-300 mt-2">
              <strong className="text-emerald-400">{participants.length} participants</strong> are currently registered in the lobby.
            </p>
            <div className="p-3 my-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-300 font-mono">
              Notice: Once started, registration will be locked and new participants cannot join.
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStartModal(false)}
                className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleStartQuiz}
                className="py-2 px-5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-bold text-slate-950 text-xs font-mono uppercase cursor-pointer"
              >
                START QUIZ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Quiz Confirmation Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="cyber-card rounded-2xl max-w-md w-full p-6 border-red-500/50">
            <div className="h-12 w-12 rounded-xl bg-red-950 border border-red-500/50 flex items-center justify-center text-red-400 mb-4">
              <Square className="h-6 w-6 fill-current" />
            </div>
            <h3 className="text-xl font-black text-white">CONCLUDE COMPETITION?</h3>
            <p className="text-sm text-slate-300 mt-2">
              This will transition the competition to COMPLETED status and trigger the Olympic podium ceremony on the main display.
            </p>
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setShowEndModal(false)}
                className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleEndQuiz}
                className="py-2 px-5 rounded-lg bg-red-600 hover:bg-red-500 font-bold text-white text-xs font-mono uppercase cursor-pointer"
              >
                CONCLUDE AND AWARD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Quiz Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="cyber-card rounded-2xl max-w-md w-full p-6 border-cyan-500/50 glow-cyan">
            <div className="h-12 w-12 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-4">
              <RotateCcw className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-white">RESET QUIZ?</h3>
            <p className="text-sm text-slate-300 mt-2">
              This will clear the current competition session and participant results, preparing a fresh lobby for another tournament round.
            </p>
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setShowResetModal(false)}
                className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleResetQuiz}
                className="py-2 px-5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 font-bold text-slate-950 text-xs font-mono uppercase cursor-pointer"
              >
                RESET SESSION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveQuestion}
            className="cyber-card rounded-2xl max-w-lg w-full p-6 border-cyan-500/50 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold text-white mb-4">
              Edit Question #{editingQuestion.question_number}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Question Text</label>
                <textarea
                  required
                  rows={3}
                  value={editingQuestion.question_text}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, question_text: e.target.value })
                  }
                  className="w-full p-2.5 rounded bg-slate-900 border border-cyan-900 text-white focus:outline-none focus:border-cyan-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Option A</label>
                <input
                  required
                  value={editingQuestion.option_a}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, option_a: e.target.value })
                  }
                  className="w-full p-2 rounded bg-slate-900 border border-cyan-900 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Option B</label>
                <input
                  required
                  value={editingQuestion.option_b}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, option_b: e.target.value })
                  }
                  className="w-full p-2 rounded bg-slate-900 border border-cyan-900 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Option C</label>
                <input
                  required
                  value={editingQuestion.option_c}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, option_c: e.target.value })
                  }
                  className="w-full p-2 rounded bg-slate-900 border border-cyan-900 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Option D</label>
                <input
                  required
                  value={editingQuestion.option_d}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, option_d: e.target.value })
                  }
                  className="w-full p-2 rounded bg-slate-900 border border-cyan-900 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Correct Option (A, B, C, D)</label>
                <select
                  value={editingQuestion.correct_option}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, correct_option: e.target.value })
                  }
                  className="w-full p-2 rounded bg-slate-900 border border-cyan-900 text-white text-xs font-mono"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Scientific Explanation</label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                  }
                  className="w-full p-2 rounded bg-slate-900 border border-cyan-900 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="py-2 px-4 rounded bg-slate-800 text-slate-300 text-xs font-mono"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="py-2 px-5 rounded bg-cyan-500 hover:bg-cyan-400 font-bold text-slate-950 text-xs font-mono uppercase"
              >
                SAVE CHANGES
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
