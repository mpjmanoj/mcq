"use client";

import Link from "next/link";
import ParticipantPage from "./join/page";
import { Tv, ShieldCheck, Smartphone } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#060e15]">
      {/* Quick Navigation Switcher for Competition Testing */}
      <div className="bg-[#091a26]/90 border-b border-cyan-900/60 px-4 py-2 flex items-center justify-between text-xs font-mono text-slate-400 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300 font-bold uppercase tracking-wider hidden sm:inline">
            Mud Crab Championship
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span>Quick Switcher:</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold flex items-center gap-1.5 hover:bg-cyan-900 transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile Screen
          </Link>
          <Link
            href="/display"
            className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700 hover:text-white flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
          >
            <Tv className="h-3.5 w-3.5" /> Main Display (TV)
          </Link>
          <Link
            href="/admin"
            className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700 hover:text-white flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Admin Panel
          </Link>
        </div>
      </div>

      {/* Participant Experience */}
      <ParticipantPage />
    </div>
  );
}
