"use client";

import Link from "next/link";
import Image from "next/image";
import { Trophy, Smartphone, Tv, ShieldCheck, ArrowRight, Sparkles, QrCode } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#f3eee3] text-[#1f1b16] flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden font-sans">
      {/* Background radial coastal glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(232,220,200,0.6)_0%,_transparent_70%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-[#c3ad8b]/70 pb-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-[#c3ad8b] bg-white shadow-sm sm:h-12 sm:w-12">
            <Image src="/logo.png" alt="Crab Shack logo" width={48} height={48} className="object-contain p-1.5" priority />
          </div>
          <div>
            <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6d4c2d]">
              Crab Shack • Coastal Skills Program
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[#1f1b16] tracking-tight">
              Mud Crab Fattening & RAS Examination Arena
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold text-[#3f3021] bg-[#efe2cd] px-2.5 py-1 rounded-xl border border-[#c3ad8b]">TOURNAMENT LIVE</span>
        </div>
      </header>

      {/* Center Portal Cards */}
      <main className="relative z-10 max-w-5xl mx-auto w-full my-auto py-6 sm:py-10">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#efe2cd] border border-[#c3ad8b] text-[#6d4c2d] text-xs font-semibold uppercase tracking-[0.2em] mb-3 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#8a5a3c]" /> Interactive Quiz Platform
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#1f1b16]">
            Select Your Arena View
          </h2>
          <p className="text-sm text-[#5a5146] max-w-lg mx-auto mt-2 leading-relaxed">
            Real-time, scannable QR competition portal for Crab Shack mud crab aquaculture examination.
          </p>
        </div>

        {/* 3 Main Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Admin Command Center */}
          <Link
            href="/admin"
            className="group crab-card rounded-2xl sm:rounded-3xl p-6 hover:border-[#8a5a3c] transition-all hover:scale-[1.02] flex flex-col justify-between shadow-xl cursor-pointer"
          >
            <div>
              <div className="h-13 w-13 rounded-2xl bg-[#efe2cd] border border-[#c3ad8b] flex items-center justify-center text-[#6d4c2d] mb-5 group-hover:bg-[#231f1a] group-hover:text-white group-hover:border-[#231f1a] transition-all shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="text-[10px] font-semibold uppercase text-[#6d4c2d] tracking-[0.2em] mb-1">
                For Event Organizer
              </div>
              <h3 className="text-xl font-bold text-[#1f1b16] group-hover:text-[#8a5a3c] transition-colors flex items-center gap-2">
                Organizer Dashboard
              </h3>
              <p className="text-xs text-[#5a5146] mt-2 leading-relaxed">
                Complete control center with scannable QR code, real-time joined roster, 1-second live polling, retro audio, and instant scoreboard.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#c3ad8b]/60 flex items-center justify-between text-xs font-semibold text-[#6d4c2d] group-hover:translate-x-1 transition-transform">
              <span className="flex items-center gap-1.5"><QrCode className="h-3.5 w-3.5" /> HOST PANEL (/admin)</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* Card 2: Participant Mobile */}
          <Link
            href="/join"
            className="group crab-card rounded-2xl sm:rounded-3xl p-6 border-2 border-[#8a5a3c]/70 hover:border-[#231f1a] transition-all hover:scale-[1.02] flex flex-col justify-between shadow-xl cursor-pointer bg-white"
          >
            <div>
              <div className="h-13 w-13 rounded-2xl bg-[#231f1a] text-white flex items-center justify-center mb-5 group-hover:bg-[#4a3225] transition-all shadow-md">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="text-[10px] font-semibold uppercase text-[#6d4c2d] tracking-[0.2em] mb-1">
                For Competitors
              </div>
              <h3 className="text-xl font-bold text-[#1f1b16] group-hover:text-[#8a5a3c] transition-colors">
                Participant Portal
              </h3>
              <p className="text-xs text-[#5a5146] mt-2 leading-relaxed">
                Scan QR code, enter full name & phone number, navigate backward/forward between all 59 MCQs, and review full answers with scientific explanations.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#c3ad8b]/60 flex items-center justify-between text-xs font-bold text-[#231f1a] group-hover:translate-x-1 transition-transform">
              <span>JOIN EXAM (/join)</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* Card 3: Main Display Screen */}
          <Link
            href="/display"
            className="group crab-card rounded-2xl sm:rounded-3xl p-6 hover:border-[#8a5a3c] transition-all hover:scale-[1.02] flex flex-col justify-between shadow-xl cursor-pointer"
          >
            <div>
              <div className="h-13 w-13 rounded-2xl bg-[#efe2cd] border border-[#c3ad8b] flex items-center justify-center text-[#6d4c2d] mb-5 group-hover:bg-[#231f1a] group-hover:text-white group-hover:border-[#231f1a] transition-all shadow-sm">
                <Tv className="h-6 w-6" />
              </div>
              <div className="text-[10px] font-semibold uppercase text-[#6d4c2d] tracking-[0.2em] mb-1">
                For Big Screen / TV
              </div>
              <h3 className="text-xl font-bold text-[#1f1b16] group-hover:text-[#8a5a3c] transition-colors">
                Stadium Display
              </h3>
              <p className="text-xs text-[#5a5146] mt-2 leading-relaxed">
                Spectator view with high-contrast QR code, live connected player badges, 3-2-1 countdown, and Olympic podium ceremony.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#c3ad8b]/60 flex items-center justify-between text-xs font-semibold text-[#6d4c2d] group-hover:translate-x-1 transition-transform">
              <span>OPEN DISPLAY (/display)</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-xs text-[#6d4c2d] border-t border-[#c3ad8b]/60 pt-4 max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Crab Shack • Coastal Skills Training Program</span>
        <span className="font-semibold text-[#1f1b16]">Official Model Examination Portal</span>
      </footer>
    </div>
  );
}
