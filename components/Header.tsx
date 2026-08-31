'use client';

import React from 'react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';

interface HeaderProps {
  onClearDb?: () => void;
  hasSavedItems?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onClearDb, hasSavedItems }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#080d1a]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Cat Logo & Minimal Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-emerald-500/50 bg-slate-900 overflow-hidden shrink-0">
            <Image
              src="/logo.png"
              alt="محمود تسخيت"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              محمود تسخيت
            </h1>
          </div>
        </div>

        {/* Minimal Actions */}
        {hasSavedItems && onClearDb && (
          <button
            onClick={onClearDb}
            title="مسح السجل"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/40 text-xs text-slate-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>مسح السجل</span>
          </button>
        )}
      </div>
    </header>
  );
};
