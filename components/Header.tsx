'use client';

import React from 'react';
import Image from 'next/image';
import { Sparkles, ShieldCheck, Cpu, Trash2, Pencil, Check } from 'lucide-react';

interface HeaderProps {
  onClearDb?: () => void;
  hasSavedItems?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onClearDb, hasSavedItems }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-slate-800 bg-[#080d1a]/95 backdrop-blur-xl">
      {/* Top Wireframe Ruler line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 opacity-80" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Cat Logo & App Branding */}
        <div className="flex items-center gap-3.5">
          {/* Hand-drawn sketchy container for Cat Logo */}
          <div className="relative group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-emerald-400 bg-slate-900 p-1 shadow-[3px_3px_0px_0px_#10b981] transition-transform duration-200 group-hover:rotate-[-3deg] group-hover:scale-105 overflow-hidden flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="محمود تسخيت - شعار التطبيق"
                width={56}
                height={56}
                className="w-full h-full object-cover rounded-xl"
                priority
              />
            </div>
            {/* Hand-drawn pin / badge tag */}
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black tracking-tighter border border-slate-950 font-sketch shadow-sm">
              مـحـمـود
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="text-emerald-400 underline decoration-wavy decoration-emerald-500/60 decoration-2">
                  محمود تسخيت
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-emerald-300 font-sketch hidden sm:inline">
                  [Mahmoud Taskheet]
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Pencil className="w-3 h-3 text-emerald-400 inline" />
              <span>مترجم الفواتير السلكي اليدوي • إنجليزي إلى عربي فصحى</span>
            </p>
          </div>
        </div>

        {/* Feature Sketchy Badges & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border-2 border-slate-800 text-slate-300 shadow-[2px_2px_0px_0px_#1e293b]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-sketch">أرقام غربية (0-9)</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border-2 border-slate-800 text-slate-300 shadow-[2px_2px_0px_0px_#1e293b]">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-sketch">15 RPM سلكي</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border-2 border-slate-800 text-emerald-400 shadow-[2px_2px_0px_0px_#10b981]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-sketch font-bold">جاهز للطباعة 🖨️</span>
            </div>
          </div>

          {hasSavedItems && onClearDb && (
            <button
              onClick={onClearDb}
              title="مسح سجل الفواتير من التخزين"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-red-500/10 border-2 border-slate-800 hover:border-red-500/50 text-xs text-slate-400 hover:text-red-400 font-bold shadow-[2px_2px_0px_0px_#1e293b] hover:shadow-[2px_2px_0px_0px_#ef4444] transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="font-sketch">مسح السجل</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
