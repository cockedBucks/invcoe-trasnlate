'use client';

import React from 'react';
import { BatchStats } from '@/lib/types';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Layers, Loader2, Sparkles, Pencil } from 'lucide-react';

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
  const percentComplete =
    stats.total > 0
      ? Math.min(100, Math.round(((stats.completed + stats.needsReview + stats.error) / stats.total) * 100))
      : 0;

  const formatTime = (ms: number) => {
    if (ms <= 0 || !isFinite(ms)) return '00:00';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remMins = minutes % 60;
      return `${hours}س ${remMins}د`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Visual Wireframe Progress Banner */}
      {stats.total > 0 && (
        <div className="sketch-card p-4 sm:p-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm font-sketch">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>محمود يسخّت الفاتورة رقم {Math.min(currentIndex, stats.total)} من {stats.total}...</span>
                </div>
              ) : stats.completed + stats.needsReview === stats.total && stats.total > 0 ? (
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm font-sketch">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>اكتمل تسخيت الدفعة بالكامل! ({stats.completed + stats.needsReview}/{stats.total})</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-300 font-bold text-sm font-sketch">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>طابور الفواتير جاهز للتسخيت ({stats.total} ملفات جاهزة)</span>
                </div>
              )}

              {activeFileName && isProcessing && (
                <span className="hidden md:inline-block text-xs px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-mono truncate max-w-xs">
                  {activeFileName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-sketch">
              <span className="text-slate-400">
                نسبة الإنجاز: <strong className="text-emerald-400 font-bold text-sm">{percentComplete}%</strong>
              </span>
              {isProcessing && (
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  المتبقي تقريباً: <strong className="text-slate-200">{formatTime(stats.estimatedRemainingMs)}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Wireframe Progress Bar */}
          <div className="w-full h-3.5 bg-slate-950 rounded-xl overflow-hidden p-0.5 border-2 border-slate-700 relative">
            <div
              className="h-full rounded-lg bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-500 relative overflow-hidden"
              style={{ width: `${percentComplete}%` }}
            >
              {isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid of Key Sketch Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-sketch">
        {/* Total Queued */}
        <div className="sketch-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">إجمالي الفواتير</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">{stats.total}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{formatBytes(stats.totalBytes)}</div>
          </div>
        </div>

        {/* Completed & Verified */}
        <div className="sketch-card-emerald p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-bold">مطابقة 100%</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-300 tracking-tight">{stats.completed}</div>
            <div className="text-[11px] text-emerald-400/90 mt-0.5">الحسابات سليمة ✓</div>
          </div>
        </div>

        {/* Needs Review */}
        <div className="sketch-card-amber p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-bold">تحتاج مراجعة</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-300 tracking-tight">{stats.needsReview}</div>
            <div className="text-[11px] text-amber-400/90 mt-0.5">فارق في الإجمالي ⚠️</div>
          </div>
        </div>

        {/* In Flight / Processing */}
        <div className="sketch-card p-3.5 flex flex-col justify-between border-teal-500/50">
          <div className="flex items-center justify-between text-teal-400 mb-1">
            <span className="text-xs font-bold">قيد التسخيت</span>
            <Loader2 className={`w-4 h-4 text-teal-400 ${stats.processing > 0 ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="text-2xl font-black text-teal-300 tracking-tight">{stats.processing}</div>
            <div className="text-[11px] text-teal-400/90 mt-0.5">{stats.pending} بالانتظار</div>
          </div>
        </div>

        {/* Errors / Failed */}
        <div className="sketch-card-red p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-400 mb-1">
            <span className="text-xs font-bold">فشلت</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-red-300 tracking-tight">{stats.error}</div>
            <div className="text-[11px] text-red-400/90 mt-0.5">قابلة للإعادة 🔄</div>
          </div>
        </div>

        {/* Elapsed Time */}
        <div className="sketch-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">الوقت المستغرق</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-200 tracking-tight">
              {formatTime(stats.elapsedTimeMs)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">15 RPM خنق سلكي</div>
          </div>
        </div>
      </div>
    </div>
  );
};
