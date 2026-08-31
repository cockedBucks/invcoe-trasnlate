'use client';

import React from 'react';
import { BatchStats } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface StatsCardsProps {
  stats: BatchStats;
  isProcessing: boolean;
  activeFileName?: string;
  currentIndex: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  isProcessing,
  activeFileName,
  currentIndex,
}) => {
  if (stats.total === 0) return null;

  const percentComplete =
    stats.total > 0
      ? Math.min(100, Math.round(((stats.completed + stats.needsReview + stats.error) / stats.total) * 100))
      : 0;

  return (
    <div className="space-y-2">
      {/* Sleek Progress Bar (Only during processing or when partially done) */}
      {isProcessing && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 text-emerald-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>معالجة {Math.min(currentIndex, stats.total)} من {stats.total}</span>
            {activeFileName && (
              <span className="text-slate-500 font-mono truncate max-w-xs">({activeFileName})</span>
            )}
          </div>
          <span className="font-mono text-emerald-400">{percentComplete}%</span>
        </div>
      )}

      {isProcessing && (
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      )}

      {/* Minimal Stat Badges Row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-1.5">
          <span className="text-slate-500">الإجمالي:</span>
          <strong className="text-white font-mono">{stats.total}</strong>
        </div>

        {stats.completed > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
            <span className="text-emerald-500/80">مطابقة:</span>
            <strong className="font-mono">{stats.completed}</strong>
          </div>
        )}

        {stats.needsReview > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
            <span className="text-amber-500/80">مراجعة:</span>
            <strong className="font-mono">{stats.needsReview}</strong>
          </div>
        )}

        {stats.error > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-500/30 text-red-300 flex items-center gap-1.5">
            <span className="text-red-500/80">فشل:</span>
            <strong className="font-mono">{stats.error}</strong>
          </div>
        )}
      </div>
    </div>
  );
};
