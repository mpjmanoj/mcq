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
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#00f0ff", "#10b981", "#f59e0b", "#ffffff"],
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
      }

      if (status === "WAITING") {
        const resPart = await fetch(`${api}/api/participants`);
        if (resPart.ok) {
          const data = await resPart.json();
          setParticipants(data.participants);
        }
      } else {
        const resLb = await fetch(`${api}/api/quiz/leaderboard`);
        if (resLb.ok) {
          const data = await resLb.json();
          setLeaderboard(data.leaderboard);
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
              if (msg.data.participants) {
                setParticipants(msg.data.participants);
              }
              if (msg.data.leaderboard) {
                setLeaderboard(msg.data.leaderboard);
              }
            } else if (msg.event === "participant_joined") {
              setParticipants(msg.data.participants);
              setNewJoiner(msg.data.name);
              sounds.playJoin();
              setTimeout(() => setNewJoiner(null), 4000);
            } else if (msg.event === "participant_removed") {
              setParticipants(msg.data.participants);
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
              setLeaderboard(msg.data.leaderboard);
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
              setLeaderboard(msg.data.leaderboard);
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

    // Fallback polling interval
    const interval = setInterval(refreshState, 3500);

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
    <div className="relative min-h-screen bg-[#060e15] text-slate-100 flex flex-col justify-between p-6 lg:p-10 select-none overflow-hidden">
      {/* Background Animated Scanlines & Grid */}
      <div className="scanline-effect" />

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-[#060e15]/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="text-cyan-400 text-sm tracking-[0.3em] font-mono uppercase mb-4 animate-pulse">
            BATTLE ARENA ENGAGING
          </div>
          <div className="text-[12rem] md:text-[18rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-teal-400 to-emerald-500 scale-105 transition-transform duration-300">
            {countdown === 0 ? "GO!" : countdown}
          </div>
          <p className="text-xl text-slate-400 tracking-wider font-medium mt-2">
            {countdown === 0 ? "CHAMPIONSHIP HAS BEGUN!" : "PREPARE YOUR TERMINALS"}
          </p>
        </div>
      )}

      {/* Header Banner */}
      <header className="relative z-10 flex items-center justify-between border-b border-cyan-900/50 pb-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-900/40 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)]">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                AQUACULTURE CHAMPIONSHIP
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <span className={`inline-block h-2 w-2 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {wsConnected ? "LIVE FEED" : "SYNCING"}
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
            className={`px-4 py-1.5 rounded-lg border font-mono text-sm tracking-wider uppercase font-bold flex items-center gap-2 ${
              status === "LIVE"
                ? "bg-red-950/60 border-red-500/50 text-red-400 glow-cyan-sm"
                : status === "COMPLETED"
                ? "bg-amber-950/60 border-amber-500/50 text-amber-300 glow-gold"
                : "bg-cyan-950/60 border-cyan-500/50 text-cyan-400"
            }`}
          >
            <Radio className={`h-4 w-4 ${status === "LIVE" ? "animate-spin text-red-400" : ""}`} />
            {status === "WAITING" ? "LOBBY OPEN" : status === "LIVE" ? "ARENA LIVE" : "FINISHED"}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleAudio}
            className="p-2.5 rounded-lg border border-cyan-900/60 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            title={soundActive ? "Mute Audio" : "Unmute Audio"}
          >
            {soundActive ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-slate-500" />}
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
              <div className="relative p-6 rounded-3xl bg-gradient-to-b from-[#0c2233] to-[#081722] border-2 border-cyan-500/40 glow-cyan">
                {/* QR Code */}
                <div className="p-4 bg-white rounded-2xl shadow-2xl flex items-center justify-center">
                  {joinUrl ? (
                    <QRCodeSVG
                      value={joinUrl}
                      size={260}
                      level="H"
                      includeMargin={false}
                      fgColor="#05101a"
                    />
                  ) : (
                    <div className="w-[260px] h-[260px] bg-slate-200 animate-pulse rounded" />
                  )}
                </div>

                <div className="mt-5 space-y-1">
                  <div className="inline-block px-3 py-1 rounded-full bg-cyan-900/50 border border-cyan-500/40 text-cyan-300 text-xs font-mono tracking-widest uppercase">
                    SCAN TO JOIN
                  </div>
                  <p className="text-xs text-slate-400 font-mono tracking-wider pt-1">
                    SCAN • ENTER YOUR DETAILS • JOIN THE ARENA
                  </p>
                </div>
              </div>

              {/* URL fallback */}
              <div className="mt-4 text-xs font-mono text-cyan-400/80 bg-slate-900/80 px-4 py-1.5 rounded-lg border border-cyan-900/40">
                Direct URL: <span className="text-white font-semibold">{joinUrl}</span>
              </div>
            </div>

            {/* Right Participant Grid (7 cols) */}
            <div className="lg:col-span-7 flex flex-col h-[520px] rounded-2xl bg-[#091a26]/90 border border-cyan-900/60 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-cyan-900/40 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <Users className="h-5 w-5 text-cyan-400" />
                  <span className="text-lg font-bold text-white tracking-wide">
                    CHAMPIONSHIP LOBBY
                  </span>
                </div>
                <div className="px-3.5 py-1 rounded-full bg-cyan-950 border border-cyan-600/50 text-cyan-300 font-mono text-sm font-semibold">
                  Participants Joined: <span className="text-white text-base font-black">{participants.length}</span>
                </div>
              </div>

              {/* Toast for New Player */}
              {newJoiner && (
                <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-cyan-950 to-teal-950 border border-cyan-400/60 text-cyan-200 flex items-center justify-between animate-in slide-in-from-top-3 duration-300">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400 animate-spin" />
                    <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">NEW FIGHTER JOINED:</span>
                    <strong className="text-white text-sm">{newJoiner}</strong>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300/80">Ready to play</span>
                </div>
              )}

              {/* Roster Badges */}
              {participants.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="h-16 w-16 rounded-full bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center text-cyan-500 mb-3 animate-pulse">
                    <Users className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-300">Awaiting Competitors...</h3>
                  <p className="text-sm text-slate-500 max-w-sm mt-1">
                    Scan the QR code with your smartphone camera to register and enter the waiting arena.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 md:grid-cols-3 gap-2.5 content-start">
                  {participants.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition-all hover:bg-slate-800/80 group"
                    >
                      <span className="h-6 w-6 rounded-md bg-cyan-950 text-cyan-400 text-xs font-mono font-bold flex items-center justify-center border border-cyan-800/50">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="text-sm font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {p.mobile}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-cyan-900/40 pt-3 mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  Synchronous Real-Time WebSocket Channel
                </span>
                <span>Admin will start the quiz shortly</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STAGE 2: LIVE QUIZ LEADERBOARD ================= */}
        {status === "LIVE" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
            {/* Live Standings Table (8 cols) */}
            <div className="lg:col-span-8 rounded-2xl bg-[#091a26]/90 border border-cyan-900/60 p-6 flex flex-col h-[560px] backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-cyan-900/40 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <Trophy className="h-6 w-6 text-amber-400 animate-pulse" />
                  <span className="text-xl font-black text-white tracking-wide">
                    LIVE LEADERBOARD
                  </span>
                </div>
                <span className="text-xs font-mono text-cyan-300 bg-cyan-950 px-3 py-1 rounded-md border border-cyan-700/50">
                  REAL-TIME TIE-BREAKER ACTIVE
                </span>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto pr-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-cyan-900/50 text-[11px] font-mono uppercase text-slate-400">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Competitor</th>
                      <th className="py-2.5 px-3 text-center">Progress</th>
                      <th className="py-2.5 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {leaderboard.map((item) => {
                      const isTop1 = item.rank === 1;
                      const isTop2 = item.rank === 2;
                      const isTop3 = item.rank === 3;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-cyan-950/30 transition-colors ${
                            isTop1
                              ? "bg-amber-500/10"
                              : isTop2
                              ? "bg-slate-300/5"
                              : isTop3
                              ? "bg-amber-800/10"
                              : ""
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center justify-center h-7 w-7 rounded-lg text-xs font-mono font-bold ${
                                isTop1
                                  ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                                  : isTop2
                                  ? "bg-slate-300 text-black shadow-[0_0_12px_rgba(226,232,240,0.5)]"
                                  : isTop3
                                  ? "bg-amber-700 text-white shadow-[0_0_12px_rgba(180,83,9,0.5)]"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {item.rank}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white text-base flex items-center gap-2">
                              {item.name}
                              {item.completed && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50">
                                  <CheckCircle2 className="h-3 w-3" /> Done ({item.formatted_time})
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-500">{item.mobile}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="w-36 mx-auto">
                              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                                <span>{item.questions_answered}/20</span>
                                <span>{Math.round((item.questions_answered / 20) * 100)}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                                  style={{ width: `${(item.questions_answered / 20) * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-xl font-black text-cyan-300 font-mono">
                              {item.score}
                            </span>
                            <span className="text-xs text-slate-500 font-mono"> / 20</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Activity Feed & Stats (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Competition Stats Box */}
              <div className="p-5 rounded-2xl bg-[#091a26]/90 border border-cyan-900/60 backdrop-blur-md">
                <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                  <Timer className="h-4 w-4" /> BATTLE TELEMETRY
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <div className="text-2xl font-black text-white font-mono">{leaderboard.length}</div>
                    <div className="text-[11px] text-slate-400 uppercase font-mono">Competitors</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      {leaderboard.filter((i) => i.completed).length}
                    </div>
                    <div className="text-[11px] text-slate-400 uppercase font-mono">Finished</div>
                  </div>
                </div>
              </div>

              {/* Live Ticker */}
              <div className="flex-1 p-5 rounded-2xl bg-[#091a26]/90 border border-cyan-900/60 flex flex-col backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400 mb-3">
                  <Radio className="h-4 w-4 text-cyan-400 animate-pulse" /> LIVE SUBMISSION FEED
                </div>

                <div className="flex-1 overflow-hidden space-y-2">
                  {recentActivity.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono text-center">
                      Answers will stream here live as players submit...
                    </div>
                  ) : (
                    recentActivity.map((act, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div className="truncate">
                          <span className="font-bold text-slate-200">{act.name}</span>
                          <span className="text-slate-500 ml-1.5 font-mono">
                            {act.completed ? "completed all 20!" : `answered Q${act.question}`}
                          </span>
                        </div>
                        <span className="text-cyan-400 font-mono font-bold ml-2">
                          {act.score} pts
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STAGE 3: GRAND WINNER CEREMONY ================= */}
        {status === "COMPLETED" && (
          <div className="max-w-6xl mx-auto w-full flex flex-col items-center">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono text-xs uppercase tracking-widest mb-3">
                <Crown className="h-4 w-4 text-amber-400" /> CEREMONY COMPLETE
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 tracking-tight">
                QUIZ CHAMPIONS
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Mud Crab Aquaculture Knowledge Championship — Final Honors
              </p>
            </div>

            {/* Esports Olympic Podium */}
            <div className="grid grid-cols-3 gap-4 lg:gap-8 items-end w-full max-w-4xl mb-12">
              {/* 2nd Place (Silver) */}
              <div
                className={`flex flex-col items-center transition-all duration-700 ${
                  podiumStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-200 text-black font-black text-xl flex items-center justify-center shadow-[0_0_25px_rgba(226,232,240,0.5)] mb-3 border-2 border-white">
                  <Medal className="h-8 w-8 text-slate-800" />
                </div>
                <div className="text-center mb-3">
                  <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">2ND PLACE</div>
                  <div className="text-xl font-black text-white">{top2 ? top2.name : "—"}</div>
                  <div className="text-sm font-mono text-slate-300">
                    {top2 ? `${top2.score} / 20 pts` : "—"}
                  </div>
                  {top2 && <div className="text-[11px] font-mono text-slate-400">Time: {top2.formatted_time}</div>}
                </div>
                <div className="w-full h-44 rounded-t-2xl bg-gradient-to-t from-slate-900 to-slate-700/80 border-t-2 border-x-2 border-slate-400 flex items-center justify-center text-4xl font-black text-slate-300 font-mono shadow-xl">
                  2
                </div>
              </div>

              {/* 1st Place (Gold Champion) */}
              <div
                className={`flex flex-col items-center transition-all duration-700 ${
                  podiumStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="relative">
                  <Crown className="h-10 w-10 text-amber-400 absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 text-black font-black text-2xl flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.8)] mb-3 border-2 border-yellow-200">
                    <Trophy className="h-10 w-10 text-amber-950" />
                  </div>
                </div>
                <div className="text-center mb-3">
                  <div className="text-xs font-mono uppercase text-amber-400 font-bold tracking-widest">
                    GRAND CHAMPION
                  </div>
                  <div className="text-2xl font-black text-white">{top1 ? top1.name : "—"}</div>
                  <div className="text-base font-mono text-amber-300 font-bold">
                    {top1 ? `${top1.score} / 20 pts` : "—"}
                  </div>
                  {top1 && (
                    <div className="text-xs font-mono text-emerald-400 font-semibold">
                      Time: {top1.formatted_time}
                    </div>
                  )}
                </div>
                <div className="w-full h-60 rounded-t-2xl bg-gradient-to-t from-amber-950 to-amber-600/80 border-t-4 border-x-2 border-amber-300 flex items-center justify-center text-6xl font-black text-amber-200 font-mono shadow-[0_0_40px_rgba(245,158,11,0.3)]">
                  1
                </div>
              </div>

              {/* 3rd Place (Bronze) */}
              <div
                className={`flex flex-col items-center transition-all duration-700 ${
                  podiumStep >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-800 to-amber-600 text-black font-black text-lg flex items-center justify-center shadow-[0_0_20px_rgba(180,83,9,0.5)] mb-3 border-2 border-amber-500">
                  <Award className="h-7 w-7 text-amber-950" />
                </div>
                <div className="text-center mb-3">
                  <div className="text-xs font-mono uppercase text-amber-500 tracking-wider">3RD PLACE</div>
                  <div className="text-lg font-black text-white">{top3 ? top3.name : "—"}</div>
                  <div className="text-sm font-mono text-slate-300">
                    {top3 ? `${top3.score} / 20 pts` : "—"}
                  </div>
                  {top3 && <div className="text-[11px] font-mono text-slate-400">Time: {top3.formatted_time}</div>}
                </div>
                <div className="w-full h-32 rounded-t-2xl bg-gradient-to-t from-slate-900 to-amber-900/60 border-t-2 border-x-2 border-amber-700 flex items-center justify-center text-3xl font-black text-amber-400 font-mono shadow-xl">
                  3
                </div>
              </div>
            </div>

            {/* Complete Final Standings Accordion/Table */}
            <div className="w-full max-w-4xl p-5 rounded-2xl bg-[#091a26]/90 border border-cyan-900/60">
              <h3 className="text-sm font-mono uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                <ChevronRight className="h-4 w-4" /> COMPLETE TOURNAMENT STANDINGS
              </h3>
              <div className="max-h-56 overflow-y-auto pr-1">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cyan-900/40 text-[11px] font-mono uppercase text-slate-400">
                      <th className="py-2 px-3">Rank</th>
                      <th className="py-2 px-3">Competitor</th>
                      <th className="py-2 px-3 text-center">Score</th>
                      <th className="py-2 px-3 text-right">Completion Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {leaderboard.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">#{p.rank}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{p.name}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400">
                          {p.score} / 20
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {p.formatted_time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer System Status Bar */}
      <footer className="relative z-10 border-t border-cyan-900/40 pt-4 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            STADIUM ENGINE v1.0
          </span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline text-slate-500">
            20 Mud Crab Aquaculture Standards
          </span>
        </div>
        <div className="text-right text-slate-500">
          Organizer controls available at <span className="text-cyan-400">/admin</span>
        </div>
      </footer>
    </div>
  );
}
