"use client";

import Link from "next/link";
import { Trophy, Smartphone, Tv, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#060e15] text-slate-100 flex flex-col justify-between p-6 select-none overflow-hidden">
      {/* Background Animated Scanlines */}
      <div className="scanline-effect" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-cyan-900/40 pb-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-400">
              AQUACULTURE CHAMPIONSHIP
            </div>
            <h1 className="text-lg font-black text-white tracking-wide">
              MUD CRAB FARMING QUIZ
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-300">SYSTEM ONLINE</span>
        </div>
      </header>

      {/* Center Portal Cards */}
      <main className="relative z-10 max-w-5xl mx-auto w-full my-auto py-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-950 border border-cyan-600/50 text-cyan-300 text-xs font-mono tracking-widest uppercase mb-3">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> LIVE TOURNAMENT PLATFORM
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            SELECT YOUR INTERFACE
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-2">
            Real-time, QR-based competition portal for mud crab aquaculture knowledge championships.
          </p>
        </div>

        {/* 3 Main Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Participant Mobile */}
          <Link
            href="/join"
            className="group cyber-card rounded-2xl p-6 border-cyan-900/80 hover:border-cyan-400 transition-all hover:scale-[1.02] flex flex-col justify-between shadow-xl cursor-pointer"
          >
            <div>
              <div className="h-14 w-14 rounded-2xl bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400 mb-5 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] group-hover:border-cyan-400 transition-all">
                <Smartphone className="h-7 w-7" />
              </div>
              <div className="text-xs font-mono uppercase text-cyan-400 tracking-wider mb-1">
                FOR PLAYERS (SMARTPHONES)
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-cyan-300 transition-colors">
                Participant Screen
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Scan QR code, enter full name & mobile number, wait in the lobby, and answer the 20 competition questions.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>ENTER ARENA (/join)</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* Card 2: Main Display Screen (TV) */}
          <Link
            href="/display"
            className="group cyber-card rounded-2xl p-6 border-cyan-900/80 hover:border-amber-400 transition-all hover:scale-[1.02] flex flex-col justify-between shadow-xl cursor-pointer"
          >
            <div>
              <div className="h-14 w-14 rounded-2xl bg-amber-950/50 border border-amber-700/60 flex items-center justify-center text-amber-400 mb-5 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] group-hover:border-amber-400 transition-all">
                <Tv className="h-7 w-7" />
              </div>
              <div className="text-xs font-mono uppercase text-amber-400 tracking-wider mb-1">
                FOR PROJECTOR / TV (16:9)
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors">
                Main Display Stadium
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Big-screen waiting lobby with high-contrast QR code, live joined roster, 3-2-1 countdown, and Olympic winner ceremony.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>OPEN STADIUM (/display)</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* Card 3: Admin Command Center */}
          <Link
            href="/admin"
            className="group cyber-card rounded-2xl p-6 border-cyan-900/80 hover:border-emerald-400 transition-all hover:scale-[1.02] flex flex-col justify-between shadow-xl cursor-pointer"
          >
            <div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-950/50 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mb-5 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:border-emerald-400 transition-all">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="text-xs font-mono uppercase text-emerald-400 tracking-wider mb-1">
                FOR EVENT ORGANIZER
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
                Admin Mission Control
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Start the quiz, monitor live scores, remove test players, review leaderboard with tie-breakers, and manage question bank.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>CONTROL PANEL (/admin)</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs font-mono text-slate-500 border-t border-cyan-900/40 pt-4 max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Mud Crab Aquaculture Competition • Powered by Next.js & Supabase</span>
        <span className="text-slate-400">Ready for Vercel Deployment</span>
      </footer>
    </div>
  );
}
