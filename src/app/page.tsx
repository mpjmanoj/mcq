"use client";

import Link from "next/link";
import { Trophy, Smartphone, Tv, ShieldCheck, ArrowRight, Sparkles, QrCode } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#120c06] text-amber-100 flex flex-col justify-between p-6 select-none overflow-hidden font-sans">
      {/* Background Animated Scanlines */}
      <div className="scanline-effect" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-amber-900/50 pb-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber-950 border border-amber-600/60 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            🦀
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-400 font-bold">
              MIDDLE ANDAMAN AQUACULTURE CHAMPIONSHIP
            </div>
            <h1 className="text-lg font-black text-white tracking-wide">
              MUD CRAB FARMING QUIZ COMPETITION
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-300">TOURNAMENT ONLINE</span>
        </div>
      </header>

      {/* Center Portal Cards */}
      <main className="relative z-10 max-w-5xl mx-auto w-full my-auto py-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-950/80 border border-amber-600/50 text-amber-300 text-xs font-mono tracking-widest uppercase mb-3">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> LIVE AQUACULTURE TOURNAMENT
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            SELECT YOUR INTERFACE
          </h2>
          <p className="text-sm text-amber-200/70 max-w-md mx-auto mt-2">
            Real-time, QR-based competition portal for mud crab aquaculture knowledge championships.
          </p>
        </div>

        {/* 3 Main Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Admin Command Center (Unified with QR Code) */}
          <Link
            href="/admin"
            className="group crab-card rounded-2xl p-6 border-amber-700/70 hover:border-amber-400 transition-all hover:scale-[1.02] flex flex-col justify-between shadow-xl cursor-pointer"
          >
            <div>
              <div className="h-14 w-14 rounded-2xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-amber-400 mb-5 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] group-hover:border-yellow-400 transition-all">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="text-xs font-mono uppercase text-amber-400 tracking-wider mb-1 font-bold">
                FOR EVENT ORGANIZER (UNIFIED)
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-yellow-300 transition-colors flex items-center gap-2">
                Organizer HUD + QR
              </h3>
              <p className="text-xs text-amber-200/70 mt-2 leading-relaxed">
                Complete all-in-one organizer landing page with scannable QR code, real-time joined roster, Start/End controls, and winner podium.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-900/60 flex items-center justify-between text-xs font-mono font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span className="flex items-center gap-1.5"><QrCode className="h-3.5 w-3.5" /> HOST PANEL (/admin)</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* Card 2: Participant Mobile */}
          <Link
            href="/join"
            className="group crab-card rounded-2xl p-6 border-amber-700/70 hover:border-yellow-400 transition-all hover:scale-[1.02] flex flex-col justify-between shadow-xl cursor-pointer"
          >
            <div>
              <div className="h-14 w-14 rounded-2xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-yellow-400 mb-5 group-hover:shadow-[0_0_25px_rgba(251,191,36,0.5)] group-hover:border-yellow-300 transition-all">
                <Smartphone className="h-7 w-7" />
              </div>
              <div className="text-xs font-mono uppercase text-yellow-400 tracking-wider mb-1 font-bold">
                FOR PLAYERS (SMARTPHONES)
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-yellow-300 transition-colors">
                Participant Screen
              </h3>
              <p className="text-xs text-amber-200/70 mt-2 leading-relaxed">
                Scan QR code, enter full name & mobile number, wait in the lobby, and answer the 20 mud crab competition questions.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-900/60 flex items-center justify-between text-xs font-mono font-bold text-yellow-400 group-hover:translate-x-1 transition-transform">
              <span>ENTER ARENA (/join)</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* Card 3: Main Display Screen (Stadium TV) */}
          <Link
            href="/display"
            className="group crab-card rounded-2xl p-6 border-amber-700/70 hover:border-amber-400 transition-all hover:scale-[1.02] flex flex-col justify-between shadow-xl cursor-pointer"
          >
            <div>
              <div className="h-14 w-14 rounded-2xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-amber-400 mb-5 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] group-hover:border-amber-400 transition-all">
                <Tv className="h-7 w-7" />
              </div>
              <div className="text-xs font-mono uppercase text-amber-400 tracking-wider mb-1 font-bold">
                FOR BIG SCREEN / PROJECTOR
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors">
                Stadium TV Display
              </h3>
              <p className="text-xs text-amber-200/70 mt-2 leading-relaxed">
                16:9 spectator stadium view with giant QR code, joined player badges, 3-2-1 countdown, and Olympic podium ceremony.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-900/60 flex items-center justify-between text-xs font-mono font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>OPEN STADIUM (/display)</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs font-mono text-amber-500/70 border-t border-amber-900/40 pt-4 max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>🦀 Mud Crab Aquaculture Competition • Middle Andaman</span>
        <span className="text-amber-400 font-bold">Powered by Supabase & Next.js</span>
      </footer>
    </div>
  );
}
