'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { DropZone } from '@/components/DropZone';
import { StatsCards } from '@/components/StatsCards';
import { QueueTable } from '@/components/QueueTable';
import { PreviewModal } from '@/components/PreviewModal';
import { BatchStats, QueueItem, TranslateApiResponse } from '@/lib/types';
import { exportBatchAsZip } from '@/lib/zip-export';
import {
  saveQueueItemToDb,
  saveAllQueueItemsToDb,
  loadQueueItemsFromDb,
  removeQueueItemFromDb,
  clearAllDbItems,
} from '@/lib/db';
import {
  Play,
  Pause,
  RotateCcw,
  Archive,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function Home() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [activeFileName, setActiveFileName] = useState<string>('');
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
  const [hasSavedHistory, setHasSavedHistory] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [batchStartTime, setBatchStartTime] = useState<number | null>(null);
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);

  const isProcessingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const queueRef = useRef<QueueItem[]>([]);
  const currentAbortController = useRef<AbortController | null>(null);

  queueRef.current = queue;
  isProcessingRef.current = isProcessing;
  isPausedRef.current = isPaused;

  useEffect(() => {
    async function loadPersistedState() {
      try {
        const savedItems = await loadQueueItemsFromDb();
        if (savedItems && savedItems.length > 0) {
          setQueue(savedItems);
          setHasSavedHistory(true);
        }
      } catch (err) {
        console.error('Failed to rehydrate from IndexedDB:', err);
      }
    }
    loadPersistedState();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isProcessing && batchStartTime) {
      timer = setInterval(() => {
        setElapsedTimeMs(Date.now() - batchStartTime);
      }, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isProcessing, batchStartTime]);

  const stats: BatchStats = React.useMemo(() => {
    let completed = 0;
    let needsReview = 0;
    let processing = 0;
    let pending = 0;
    let error = 0;
    let cancelled = 0;
    let totalBytes = 0;
    let totalDurationOfCompleted = 0;

    for (const item of queue) {
      totalBytes += item.fileSize || 0;
      if (item.status === 'completed') {
        completed++;
        if (item.durationMs) totalDurationOfCompleted += item.durationMs;
      } else if (item.status === 'needs_review') {
        needsReview++;
        if (item.durationMs) totalDurationOfCompleted += item.durationMs;
      } else if (item.status === 'processing') {
        processing++;
      } else if (item.status === 'pending') {
        pending++;
      } else if (item.status === 'error') {
        error++;
      } else if (item.status === 'cancelled') {
        cancelled++;
      }
    }

    const processedCount = completed + needsReview;
    const avgDuration = processedCount > 0 ? totalDurationOfCompleted / processedCount : 7000;
    const remainingCount = pending + processing;
    const estimatedRemainingMs = remainingCount > 0 ? remainingCount * (avgDuration + 4000) : 0;

    return {
      total: queue.length,
      completed,
      needsReview,
      processing,
      pending,
      error,
      cancelled,
      totalBytes,
      elapsedTimeMs,
      estimatedRemainingMs,
    };
  }, [queue, elapsedTimeMs]);

  const handleFilesSelected = (files: File[]) => {
    const newItems: QueueItem[] = files.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      status: 'pending',
      progress: 0,
      retryCount: 0,
    }));

    setQueue((prev) => {
      const updated = [...prev, ...newItems];
      saveAllQueueItemsToDb(updated);
      return updated;
    });
  };

  const translateFile = async (item: QueueItem): Promise<QueueItem> => {
    if (!item.file) {
      return {
        ...item,
        status: 'error',
        error: 'ملف الفاتورة غير موجود في الذاكرة. يرجى إعادة رفع الملف.',
      };
    }

    const abortCtrl = new AbortController();
    currentAbortController.current = abortCtrl;
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('file', item.file);

      const timeoutId = setTimeout(() => abortCtrl.abort('انتهت مهلة الطلب (60 ثانية)'), 60000);

      const res = await fetch('/api/translate', {
        method: 'POST',
        body: formData,
        signal: abortCtrl.signal,
      });

      clearTimeout(timeoutId);

      const data: TranslateApiResponse = await res.json();
      const durationMs = Date.now() - startTime;

      if (!res.ok || !data.success) {
        return {
          ...item,
          status: 'error',
          error: data.error || `خطأ في الخادم: ${res.statusText} (${res.status})`,
          durationMs,
        };
      }

      const finalStatus = data.reconciliation?.isReconciled ? 'completed' : 'needs_review';

      return {
        ...item,
        status: finalStatus,
        resultHtml: data.html,
        structuredData: data.structuredData,
        reconciliation: data.reconciliation,
        durationMs: data.durationMs || durationMs,
        completedTime: Date.now(),
        error: undefined,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          ...item,
          status: 'cancelled',
          error: 'تم إلغاء التسخيت.',
          durationMs,
        };
      }
      return {
        ...item,
        status: 'error',
        error: err instanceof Error ? err.message : 'حدث خطأ في الشبكة أثناء الترجمة.',
        durationMs,
      };
    } finally {
      currentAbortController.current = null;
    }
  };

  const runQueueLoop = useCallback(async () => {
    if (isProcessingRef.current) return;
    setIsProcessing(true);
    setIsPaused(false);
    if (!batchStartTime) {
      setBatchStartTime(Date.now());
    }

    while (true) {
      if (isPausedRef.current) {
        setIsProcessing(false);
        break;
      }

      const currentQueue = queueRef.current;
      const nextPendingIndex = currentQueue.findIndex((i) => i.status === 'pending');

      if (nextPendingIndex === -1) {
        setIsProcessing(false);
        setActiveFileName('');
        break;
      }

      const itemToProcess = currentQueue[nextPendingIndex];
      setCurrentIndex(nextPendingIndex + 1);
      setActiveFileName(itemToProcess.fileName);

      setQueue((prev) => {
        const updated = [...prev];
        updated[nextPendingIndex] = {
          ...updated[nextPendingIndex],
          status: 'processing',
          startTime: Date.now(),
        };
        return updated;
      });

      const processedItem = await translateFile(itemToProcess);

      if (isPausedRef.current && processedItem.status !== 'completed' && processedItem.status !== 'needs_review') {
        setQueue((prev) => {
          const updated = [...prev];
          updated[nextPendingIndex] = {
            ...updated[nextPendingIndex],
            status: 'pending',
          };
          return updated;
        });
        setIsProcessing(false);
        break;
      }

      setQueue((prev) => {
        const updated = [...prev];
        updated[nextPendingIndex] = processedItem;
        return updated;
      });
      await saveQueueItemToDb(processedItem);

      const hasMore = queueRef.current.some((i, idx) => idx !== nextPendingIndex && i.status === 'pending');
      if (hasMore && !isPausedRef.current) {
        // Safe 4000ms rate limit delay
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    }

    setIsProcessing(false);
    setActiveFileName('');
  }, [batchStartTime]);

  const handleStartBatch = () => {
    if (isPaused) {
      setIsPaused(false);
    }
    runQueueLoop();
  };

  const handlePauseBatch = () => {
    setIsPaused(true);
  };

  const handleCancelBatch = () => {
    if (currentAbortController.current) {
      currentAbortController.current.abort();
    }
    setIsPaused(false);
    setIsProcessing(false);

    setQueue((prev) => {
      const updated = prev.map((item) =>
        item.status === 'pending' || item.status === 'processing'
          ? { ...item, status: 'cancelled' as const }
          : item
      );
      saveAllQueueItemsToDb(updated);
      return updated;
    });
  };

  const handleRetryItem = (id: string) => {
    setQueue((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, status: 'pending' as const, error: undefined, retryCount: item.retryCount + 1 } : item
      );
      saveAllQueueItemsToDb(updated);
      return updated;
    });
  };

  const handleRetryAllFailed = () => {
    setQueue((prev) => {
      const updated = prev.map((item) =>
        item.status === 'error'
          ? { ...item, status: 'pending' as const, error: undefined, retryCount: item.retryCount + 1 }
          : item
      );
      saveAllQueueItemsToDb(updated);
      return updated;
    });
  };

  const handleDeleteItem = async (id: string) => {
    setQueue((prev) => prev.filter((i) => i.id !== id));
    await removeQueueItemFromDb(id);
  };

  const handleClearCompleted = async () => {
    setQueue((prev) => {
      const remaining = prev.filter((i) => i.status !== 'completed' && i.status !== 'needs_review');
      saveAllQueueItemsToDb(remaining);
      return remaining;
    });
  };

  const handleClearAllHistory = async () => {
    if (window.confirm('هل أنت متأكد من مسح جميع الفواتير المسخّتة وسجل الطابور؟')) {
      setQueue([]);
      setBatchStartTime(null);
      setElapsedTimeMs(0);
      setHasSavedHistory(false);
      await clearAllDbItems();
    }
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      await exportBatchAsZip(queue, `mahmoud_taskheet_invoices_${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (err) {
      console.error('ZIP export error:', err);
      alert('فشل في تصدير ملف الـ ZIP.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const hasPendingItems = queue.some((i) => i.status === 'pending');
  const hasCompletedItems = queue.some((i) => i.status === 'completed' || i.status === 'needs_review');
  const hasFailedItems = queue.some((i) => i.status === 'error');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Header with Mahmoud Cat Logo */}
      <Header onClearDb={handleClearAllHistory} hasSavedItems={queue.length > 0} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Mastermind Cat Compact Header Banner */}
        <div className="sketch-card p-3 sm:p-4 relative overflow-hidden max-w-xl mx-auto wireframe-grid">
          <div className="tape-strip" style={{ width: '60px', height: '14px', top: '-7px' }} />

          <div className="flex items-center justify-center gap-3.5 relative z-10 text-right">
            {/* Small Cat Avatar */}
            <div className="relative group shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-emerald-400 bg-slate-900 p-0.5 shadow-[2px_2px_0px_0px_#10b981] overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="محمود تسخيت"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover rounded-xl"
                  priority
                />
              </div>
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-emerald-400 text-slate-950 text-[9px] font-black font-sketch border border-slate-950">
                تسخيت 🐾
              </div>
            </div>

            {/* Compact Title & Short Description */}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight font-cairo leading-tight">
                تسخيت فواتير الـ PDF إلى{' '}
                <span className="text-emerald-400 underline decoration-wavy decoration-emerald-500/80 decoration-2">
                  العربية الفصحى
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-sketch mt-0.5">
                دفعات حتى 300 فاتورة • أرقام (0-9) • عزل Bidi • مخرجات HTML جاهزة للطباعة 🖨️
              </p>
            </div>
          </div>
        </div>

        {/* History Rehydration Alert if loaded from IndexedDB */}
        {hasSavedHistory && !isProcessing && queue.length > 0 && (
          <div className="sketch-card-emerald p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3 text-xs text-emerald-200 font-sketch font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                محمود استرجع <strong>{queue.length} فاتورة</strong> من جلسة العمل السابقة المخزنة على جهازك. كل النتائج محفوظة وجاهزة!
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-sketch">
              {hasCompletedItems && (
                <button
                  onClick={handleExportZip}
                  className="sketch-btn px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black shadow-[2px_2px_0px_0px_#000]"
                >
                  تنزيل الكل ZIP 📦
                </button>
              )}
            </div>
          </div>
        )}

        {/* Upload Drop Zone with Wireframe Sketch Styling */}
        <DropZone
          onFilesSelected={handleFilesSelected}
          isProcessing={isProcessing}
          maxFiles={300}
          totalFiles={queue.length}
        />

        {/* Statistics & Metric Counters */}
        {queue.length > 0 && (
          <StatsCards
            stats={stats}
            isProcessing={isProcessing}
            activeFileName={activeFileName}
            currentIndex={currentIndex}
          />
        )}

        {/* Batch Controls Bar with Hand-drawn Sketch Buttons */}
        {queue.length > 0 && (
          <div className="sketch-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            {/* Primary Action Buttons (Start, Pause, Cancel) */}
            <div className="flex flex-wrap items-center gap-2.5 font-sketch">
              {!isProcessing ? (
                <button
                  onClick={handleStartBatch}
                  disabled={!hasPendingItems}
                  className={`sketch-btn flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${
                    hasPendingItems
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[3px_3px_0px_0px_#000]'
                      : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>ابدأ تسخيت الدفعة ({stats.pending} بالانتظار) 🐾</span>
                </button>
              ) : isPaused ? (
                <button
                  onClick={handleStartBatch}
                  className="sketch-btn flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-[3px_3px_0px_0px_#000]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>استئناف التسخيت</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseBatch}
                  className="sketch-btn flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-[3px_3px_0px_0px_#000]"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>إيقاف مؤقت ⏸️</span>
                </button>
              )}

              {isProcessing && (
                <button
                  onClick={handleCancelBatch}
                  className="sketch-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-950 hover:bg-red-900 border-2 border-red-500 text-red-200 font-bold text-xs shadow-[2px_2px_0px_0px_#000]"
                >
                  <span>إلغاء</span>
                </button>
              )}

              {hasFailedItems && !isProcessing && (
                <button
                  onClick={handleRetryAllFailed}
                  className="sketch-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-amber-500/20 border-2 border-amber-500 text-amber-300 font-bold text-xs shadow-[2px_2px_0px_0px_#000]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة الفاشلة ({stats.error})</span>
                </button>
              )}
            </div>

            {/* Secondary Export & Cleanup Actions */}
            <div className="flex flex-wrap items-center gap-2 font-sketch">
              {hasCompletedItems && (
                <button
                  onClick={handleExportZip}
                  disabled={isExportingZip}
                  className="sketch-btn flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-[3px_3px_0px_0px_#000] disabled:opacity-50"
                >
                  <Archive className="w-4 h-4" />
                  <span>
                    {isExportingZip ? 'جاري بناء الأرشيف...' : `تنزيل الكل ZIP (${stats.completed + stats.needsReview}) 📦`}
                  </span>
                </button>
              )}

              {hasCompletedItems && !isProcessing && (
                <button
                  onClick={handleClearCompleted}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold shadow-[2px_2px_0px_0px_#1e293b] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تنظيف المكتمل</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Real-time Interactive Queue Table */}
        <QueueTable
          items={queue}
          onPreview={(item) => setPreviewItem(item)}
          onRetry={handleRetryItem}
          onDelete={handleDeleteItem}
          isProcessing={isProcessing}
        />

      </main>

      {/* Footer */}
      <footer className="w-full border-t-2 border-slate-800 bg-[#080d1a] py-6 text-center text-xs text-slate-400 font-sketch">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 justify-center">
            <span>مـحـمـود تسخيت • مترجم الفواتير السلكي اليدوي</span>
            <span className="text-emerald-400">🐾</span>
          </span>
          <span className="text-slate-500 font-mono">Modern Standard Arabic • 100% Free Gemini Flash</span>
        </div>
      </footer>

      {/* Interactive Modal Preview Dialog */}
      {previewItem && (
        <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}
