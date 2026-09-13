"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import {
  Trophy,
  Users,
  Radio,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  Crown,
  Medal,
  CheckCircle2,
  Timer,
  ChevronRight,
} from "lucide-react";
import { getApiBaseUrl, getWsUrl } from "@/lib/api";
import { sounds } from "@/lib/sound";

interface ParticipantItem {
  id: string;
  name: string;
  mobile: string;
}

interface LeaderboardItem {
  rank: number;
  id: string;
  name: string;
  mobile: string;
  score: number;
  questions_answered: number;
  total_questions: number;
  completed: boolean;
  total_time_seconds: number;
  formatted_time: string;
}

interface ActivityItem {
  name: string;
  question: number;
  score: number;
  completed: boolean;
  timestamp: string;
}

export default function MainDisplayPage() {
  const [status, setStatus] = useState<"WAITING" | "LIVE" | "COMPLETED">("WAITING");
  const [totalQuestions, setTotalQuestions] = useState<number>(59);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [newJoiner, setNewJoiner] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [joinUrl, setJoinUrl] = useState<string>("");
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [podiumStep, setPodiumStep] = useState<number>(0); // 0 = hidden, 1 = 3rd, 2 = 2nd, 3 = 1st
  const wsRef = useRef<WebSocket | null>(null);

  // Set join URL dynamically based on host
  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.host;
      const protocol = window.location.protocol;
      setJoinUrl(`${protocol}//${host}/join`);
      setSoundActive(sounds.isSoundEnabled());
    }
  }, []);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      colors: ["#fbbf24", "#f59e0b", "#d97706", "#fef3c7"],
    });
  }, []);

  // Fetch state via REST
  const refreshState = useCallback(async () => {
    try {
      const api = getApiBaseUrl();
      const resSession = await fetch(`${api}/api/quiz/session`);
      if (resSession.ok) {
        const sess = await resSession.json();
        setStatus(sess.status);
        if (sess.total_questions) {
          setTotalQuestions(sess.total_questions);
        }
      }

      if (status === "WAITING") {
        const resPart = await fetch(`${api}/api/participants`);
        if (resPart.ok) {
          const data = await resPart.json();
          setParticipants(data.participants || []);
        }
      } else {
        const resLb = await fetch(`${api}/api/quiz/leaderboard`);
        if (resLb.ok) {
          const data = await resLb.json();
          setLeaderboard(data.leaderboard || []);
          if (data.total_questions) {
            setTotalQuestions(data.total_questions);
          }
        }
      }
    } catch {
      // Background retry
    }
  }, [status]);

  // WebSocket lifecycle
  useEffect(() => {
    let active = true;

    const connectWs = () => {
      try {
        const url = getWsUrl("display");
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
              if (msg.data.total_questions) {
                setTotalQuestions(msg.data.total_questions);
              }
              if (msg.data.participants) {
                setParticipants(msg.data.participants);
              }
              if (msg.data.leaderboard) {
                setLeaderboard(msg.data.leaderboard);
              }
            } else if (msg.event === "participant_joined") {
              setParticipants(msg.data.participants || []);
              setNewJoiner(msg.data.name);
              sounds.playJoin();
              setTimeout(() => setNewJoiner(null), 4000);
            } else if (msg.event === "participant_removed") {
              setParticipants(msg.data.participants || []);
            } else if (msg.event === "quiz_started") {
              // Trigger 3-2-1 Countdown
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
                setStatus("LIVE");
                setTimeout(() => setCountdown(null), 1000);
              }, 3000);
            } else if (msg.event === "leaderboard_updated") {
              setLeaderboard(msg.data.leaderboard || []);
              if (msg.data.last_activity) {
                const act = {
                  ...msg.data.last_activity,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                };
                setRecentActivity((prev) => [act, ...prev.slice(0, 7)]);
              }
            } else if (msg.event === "participant_completed") {
              refreshState();
            } else if (msg.event === "quiz_completed") {
              setStatus("COMPLETED");
              setLeaderboard(msg.data.leaderboard || []);
              triggerConfetti();
              sounds.playVictory();
              // Step through podium reveal
              setPodiumStep(1);
              setTimeout(() => setPodiumStep(2), 1500);
              setTimeout(() => {
                setPodiumStep(3);
                triggerConfetti();
              }, 3000);
            } else if (msg.event === "quiz_reset") {
              setStatus("WAITING");
              setParticipants([]);
              setLeaderboard([]);
              setRecentActivity([]);
              setPodiumStep(0);
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
    refreshState();

    // Fast 1200ms polling for smooth stadium leaderboard updates
    const interval = setInterval(refreshState, 1200);

    return () => {
      active = false;
      if (wsRef.current) wsRef.current.close();
      clearInterval(interval);
    };
  }, [refreshState, triggerConfetti]);

  const toggleAudio = () => {
    const next = sounds.toggleSound();
    setSoundActive(next);
  };

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  return (
    <div className="relative min-h-screen bg-[#120c06] text-amber-100 flex flex-col justify-between p-6 lg:p-10 select-none overflow-hidden font-sans">
      {/* Background Animated Scanlines & Grid */}
      <div className="scanline-effect" />

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-[#120c06]/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="text-amber-400 text-sm tracking-[0.3em] font-mono uppercase mb-4 animate-pulse">
            🦀 TOURNAMENT ARENA ENGAGING
          </div>
          <div className="text-[12rem] md:text-[18rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 scale-105 transition-transform duration-300">
            {countdown === 0 ? "GO!" : countdown}
          </div>
          <p className="text-xl text-amber-200/80 tracking-wider font-medium mt-2">
            {countdown === 0 ? "MATCH HAS COMMENCED!" : "PREPARE FOR QUESTION 01"}
          </p>
        </div>
      )}

      {/* Header Banner */}
      <header className="relative z-10 flex items-center justify-between border-b border-amber-900/50 pb-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            🦀
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-700 font-bold">
                MIDDLE ANDAMAN AQUACULTURE
              </span>
              <div className="flex items-center gap-1.5 text-xs text-amber-400/80 font-mono">
                <span className={`inline-block h-2 w-2 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-emerald-400"}`} />
                <span>ARENA SYNC</span>
              </div>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white mt-1">
              MUD CRAB FARMING QUIZ COMPETITION
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div
            className={`px-4 py-1.5 rounded-xl border font-mono text-sm tracking-wider uppercase font-bold flex items-center gap-2 ${
              status === "LIVE"
                ? "bg-red-950/80 border-red-500/80 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                : status === "COMPLETED"
                ? "bg-amber-950/90 border-yellow-400 text-yellow-300 shadow-[0_0_25px_rgba(251,191,36,0.4)]"
                : "bg-amber-950/80 border-amber-600/60 text-amber-300"
            }`}
          >
            <Radio className={`h-4 w-4 ${status === "LIVE" ? "animate-spin text-red-400" : ""}`} />
            {status === "WAITING" ? "LOBBY OPEN" : status === "LIVE" ? "ARENA LIVE" : "FINISHED"}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleAudio}
            className="p-2.5 rounded-xl border border-amber-900/60 bg-[#1c1209] hover:bg-[#291b0e] text-amber-300 hover:text-white transition-colors"
            title={soundActive ? "Mute Audio" : "Unmute Audio"}
          >
            {soundActive ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-amber-600" />}
          </button>
        </div>
      </header>

      {/* Main Content Areas */}
      <main className="relative z-10 flex-1 my-6 flex flex-col justify-center">
        {/* ================= STAGE 1: WAITING LOBBY ================= */}
        {status === "WAITING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-7xl mx-auto w-full">
            {/* Left QR Center (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center text-center">
              <div className="relative p-6 rounded-3xl bg-[#1c1209] border-2 border-amber-500/60 shadow-[0_0_35px_rgba(245,158,11,0.3)]">
                {/* QR Code */}
                <div className="p-4 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-4 border-amber-500">
                  {joinUrl ? (
                    <QRCodeSVG
                      value={joinUrl}
                      size={260}
                      level="H"
                      includeMargin={false}
                      fgColor="#120c06"
                    />
                  ) : (
                    <div className="w-[260px] h-[260px] bg-amber-200 animate-pulse rounded" />
                  )}
                </div>

                <div className="mt-5 space-y-1">
                  <div className="inline-block px-3 py-1 rounded-full bg-amber-950 border border-amber-500 text-yellow-300 text-xs font-mono tracking-widest uppercase font-bold">
                    SCAN TO JOIN COMPETITION
                  </div>
                  <p className="text-xs text-amber-200/80 font-mono tracking-wider pt-1">
                    POINT PHONE CAMERA • ENTER NAME • ENTER LOBBY
                  </p>
                </div>
              </div>

              {/* URL fallback */}
              <div className="mt-4 text-xs font-mono text-amber-400 bg-[#1c1209] px-4 py-2 rounded-xl border border-amber-900/60">
                Direct URL: <span className="text-white font-bold">{joinUrl}</span>
              </div>
            </div>

            {/* Right Participant Grid (7 cols) */}
            <div className="lg:col-span-7 flex flex-col h-[520px] rounded-2xl bg-[#1c1209]/90 border border-amber-800/60 p-6 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between border-b border-amber-900/50 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <Users className="h-5 w-5 text-amber-400" />
                  <span className="text-lg font-bold text-white tracking-wide">
                    CHAMPIONSHIP LOBBY ROSTER
                  </span>
                </div>
                <div className="px-3.5 py-1 rounded-full bg-amber-950 border border-amber-600/60 text-amber-300 font-mono text-sm font-semibold">
                  Competitors: <span className="text-yellow-300 text-base font-black">{participants.length}</span>
                </div>
              </div>

              {/* Toast for New Player */}
              {newJoiner && (
                <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-950 to-yellow-950 border border-amber-500 text-amber-200 flex items-center justify-between animate-in slide-in-from-top-3 duration-300">
                  <div className="flex items-center gap-2 text-sm font-bold font-mono">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>{newJoiner} just joined the match!</span>
                  </div>
                  <span className="text-xs font-mono text-amber-400">READY</span>
                </div>
              )}

              {/* Joined Players Grid */}
              <div className="flex-1 overflow-y-auto pr-2">
                {participants.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-amber-400/50 font-mono">
                    <Users className="h-12 w-12 text-amber-600/40 mb-3 animate-pulse" />
                    <div className="text-base font-bold text-amber-300">AWAITING FIRST PARTICIPANT</div>
                    <div className="text-xs text-amber-400/60 mt-1 max-w-xs">
                      Scan the QR code on the left with any mobile device to enter the tournament.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {participants.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-xl bg-[#25170d] border border-amber-800/60 hover:border-amber-500 transition-all flex items-center gap-3 animate-in zoom-in-95 duration-200 shadow-md"
                      >
                        <div className="h-9 w-9 rounded-xl bg-amber-950 border border-amber-600/60 flex items-center justify-center font-mono font-black text-amber-400 text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-white text-sm truncate">{p.name}</div>
                          <div className="text-[10px] font-mono text-amber-400/70 truncate">{p.mobile}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-amber-900/50 text-xs font-mono text-amber-400/70 flex items-center justify-between">
                <span>Auto-refreshes in real-time</span>
                <span>Ready for match kickoff</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STAGE 2: LIVE COMPETITION MATCH ================= */}
        {status === "LIVE" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full h-[600px]">
            {/* Left: Live Leaderboard (8 cols) */}
            <div className="lg:col-span-8 flex flex-col h-full rounded-2xl bg-[#1c1209]/90 border border-amber-800/60 p-6 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between border-b border-amber-900/50 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-amber-400 animate-pulse" />
                  <h2 className="text-xl font-black text-white tracking-wide">
                    REAL-TIME LEADERBOARD
                  </h2>
                </div>
                <div className="text-xs font-mono text-amber-400/80">
                  Ranking: Score (High) • Response Time (Fast)
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                <table className="w-full text-left text-sm font-mono">
                  <thead>
                    <tr className="border-b border-amber-900/50 text-[11px] uppercase text-amber-400/70">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Competitor</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-center">Progress</th>
                      <th className="py-2.5 px-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-950/70">
                    {leaderboard.map((p) => {
                      const isPodium = p.rank <= 3;
                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            p.rank === 1
                              ? "bg-amber-950/40 text-yellow-300 font-bold"
                              : p.rank === 2
                              ? "bg-slate-900/40 text-slate-200"
                              : p.rank === 3
                              ? "bg-amber-950/20 text-amber-400"
                              : "hover:bg-[#25170d]"
                          }`}
                        >
                          <td className="py-3.5 px-3 font-black text-base flex items-center gap-2">
                            {p.rank === 1 ? "🥇 #1" : p.rank === 2 ? "🥈 #2" : p.rank === 3 ? "🥉 #3" : `#${p.rank}`}
                          </td>
                          <td className="py-3.5 px-3 font-sans font-bold text-white text-base">
                            {p.name}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-yellow-400 text-lg">
                            {p.score}
                          </td>
                          <td className="py-3.5 px-3 text-center text-xs">
                            <span
                              className={`px-2 py-0.5 rounded-full ${
                                p.completed || p.questions_answered >= totalQuestions
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-600"
                                  : "bg-amber-950 text-amber-400 border border-amber-800"
                              }`}
                            >
                              {p.completed || p.questions_answered >= totalQuestions ? `DONE (${totalQuestions}/${totalQuestions})` : `${p.questions_answered}/${totalQuestions}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-400 text-xs">
                            {p.formatted_time}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Live Activity Ticker & Info (4 cols) */}
            <div className="lg:col-span-4 flex flex-col h-full rounded-2xl bg-[#1c1209]/90 border border-amber-800/60 p-6 backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-2.5 border-b border-amber-900/50 pb-4 mb-4">
                <Radio className="h-5 w-5 text-amber-400 animate-pulse" />
                <h3 className="text-base font-bold text-white">LIVE ACTIVITY FEED</h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {recentActivity.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-amber-400/50 text-xs font-mono">
                    <Timer className="h-8 w-8 text-amber-600/40 mb-2 animate-spin" />
                    Waiting for answers to stream in...
                  </div>
                ) : (
                  recentActivity.map((act, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#24170d] border border-amber-900/60 flex items-center justify-between text-xs font-mono animate-in slide-in-from-top-2"
                    >
                      <div>
                        <div className="font-bold text-white">{act.name}</div>
                        <div className="text-[11px] text-amber-400/80">Question {act.question} submitted</div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold">{act.score} pts</div>
                        <div className="text-[10px] text-slate-500">{act.timestamp}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= STAGE 3: OLYMPIC PODIUM RESULTS ================= */}
        {status === "COMPLETED" && (
          <div className="max-w-6xl mx-auto w-full space-y-8 animate-in zoom-in duration-500">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-950 border border-yellow-400 text-yellow-300 font-mono text-xs uppercase font-bold tracking-widest mb-3">
                <Sparkles className="h-4 w-4" /> CHAMPIONSHIP CEREMONY
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                MUD CRAB FARMING CHAMPIONS
              </h2>
              <p className="text-sm text-amber-200/80 mt-1">
                Middle Andaman Aquaculture Knowledge Competition Winners
              </p>
            </div>

            {/* Olympic 3D Podium Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8">
              {/* 2nd Place Silver */}
              <div
                className={`order-2 md:order-1 crab-card rounded-2xl p-6 border-slate-400/60 text-center flex flex-col items-center justify-between shadow-2xl transition-all duration-700 ${
                  podiumStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="h-16 w-16 rounded-full bg-slate-800 border-2 border-slate-300 flex items-center justify-center text-slate-200 mb-4 shadow-xl">
                  <Medal className="h-8 w-8 text-slate-200" />
                </div>
                <div className="text-xs font-mono uppercase text-slate-300 font-bold">2ND PLACE • SILVER</div>
                <div className="text-2xl font-black text-white mt-1">{top2 ? top2.name : "—"}</div>
                <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Score: <strong className="text-white text-sm">{top2 ? top2.score : 0}/{totalQuestions}</strong></span>
                  <span className="text-slate-400">Time: <strong className="text-white text-sm">{top2 ? top2.formatted_time : "—"}</strong></span>
                </div>
              </div>

              {/* 1st Place Gold Champion */}
              <div
                className={`order-1 md:order-2 crab-card-active rounded-3xl p-8 border-yellow-400 text-center flex flex-col items-center justify-between shadow-[0_0_50px_rgba(245,158,11,0.5)] scale-105 transition-all duration-700 ${
                  podiumStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border-2 border-yellow-200 flex items-center justify-center text-slate-950 mb-4 shadow-2xl animate-bounce">
                  <Crown className="h-10 w-10 text-slate-950 fill-current" />
                </div>
                <div className="text-xs font-mono uppercase text-yellow-300 font-black tracking-widest">
                  👑 1ST PLACE CHAMPION • GOLD
                </div>
                <div className="text-3xl md:text-4xl font-black text-white mt-1">{top1 ? top1.name : "—"}</div>
                <div className="mt-5 pt-4 border-t border-amber-800 w-full flex items-center justify-between text-sm font-mono">
                  <span className="text-amber-200">Score: <strong className="text-yellow-300 text-lg">{top1 ? top1.score : 0}/{totalQuestions}</strong></span>
                  <span className="text-amber-200">Time: <strong className="text-white text-lg">{top1 ? top1.formatted_time : "—"}</strong></span>
                </div>
              </div>

              {/* 3rd Place Bronze */}
              <div
                className={`order-3 md:order-3 crab-card rounded-2xl p-6 border-amber-700/60 text-center flex flex-col items-center justify-between shadow-2xl transition-all duration-700 ${
                  podiumStep >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="h-16 w-16 rounded-full bg-amber-950 border-2 border-amber-600 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
                  <Award className="h-8 w-8 text-amber-400" />
                </div>
                <div className="text-xs font-mono uppercase text-amber-500 font-bold">3RD PLACE • BRONZE</div>
                <div className="text-2xl font-black text-white mt-1">{top3 ? top3.name : "—"}</div>
                <div className="mt-4 pt-3 border-t border-amber-900/60 w-full flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-400/80">Score: <strong className="text-white text-sm">{top3 ? top3.score : 0}/{totalQuestions}</strong></span>
                  <span className="text-amber-400/80">Time: <strong className="text-white text-sm">{top3 ? top3.formatted_time : "—"}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer System Status Bar */}
      <footer className="border-t border-amber-900/40 pt-3 flex items-center justify-between text-[11px] font-mono text-amber-400/60">
        <span>🦀 MUD CRAB AQUACULTURE COMPETITION • MIDDLE ANDAMAN</span>
        <span>TOURNAMENT ENGINE VERCEL READY</span>
      </footer>
    </div>
  );
}
