'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { DropZone } from '@/components/DropZone';
import { StatsCards } from '@/components/StatsCards';
import { QueueTable } from '@/components/QueueTable';
import { PreviewModal } from '@/components/PreviewModal';
import { ErrorLogModal } from '@/components/ErrorLogModal';
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
  FileText,
} from 'lucide-react';

export default function Home() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [activeFileName, setActiveFileName] = useState<string>('');
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
  const [errorLogItem, setErrorLogItem] = useState<QueueItem | null>(null);
  const [showAllErrorsLog, setShowAllErrorsLog] = useState<boolean>(false);
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
          rawError: data.rawError || JSON.stringify(data, null, 2),
          errorCode: data.code || `HTTP_${res.status}`,
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
        rawError: undefined,
        errorCode: undefined,
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
        rawError: err instanceof Error ? `${err.name}: ${err.message}${err.stack ? `\nStack: ${err.stack}` : ''}` : String(err),
        errorCode: 'CLIENT_NETWORK_ERROR',
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
      {/* Minimal Header */}
      <Header onClearDb={handleClearAllHistory} hasSavedItems={queue.length > 0} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-5">
        {/* Upload Drop Zone */}
        <DropZone
          onFilesSelected={handleFilesSelected}
          isProcessing={isProcessing}
          maxFiles={300}
          totalFiles={queue.length}
        />

        {/* Minimal Statistics / Progress */}
        {queue.length > 0 && (
          <StatsCards
            stats={stats}
            isProcessing={isProcessing}
            activeFileName={activeFileName}
            currentIndex={currentIndex}
          />
        )}

        {/* Minimal Action Bar */}
        {queue.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/40">
            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {!isProcessing ? (
                <button
                  onClick={handleStartBatch}
                  disabled={!hasPendingItems}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-colors ${
                    hasPendingItems
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>بدء الترجمة ({stats.pending})</span>
                </button>
              ) : isPaused ? (
                <button
                  onClick={handleStartBatch}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>استئناف</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseBatch}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>إيقاف مؤقت</span>
                </button>
              )}

              {isProcessing && (
                <button
                  onClick={handleCancelBatch}
                  className="px-3 py-2 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-medium"
                >
                  <span>إلغاء</span>
                </button>
              )}

              {hasFailedItems && !isProcessing && (
                <button
                  onClick={handleRetryAllFailed}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-amber-300 text-xs font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة الفاشلة ({stats.error})</span>
                </button>
              )}

              {hasFailedItems && (
                <button
                  onClick={() => setShowAllErrorsLog(true)}
                  title="عرض ونسخ سجل الأخطاء التقني لجميع الملفات الفاشلة"
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-medium transition-colors"
                >
                  <FileText className="w-3 h-3 text-red-400" />
                  <span>سجل الخطأ ({stats.error})</span>
                </button>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {hasCompletedItems && (
                <button
                  onClick={handleExportZip}
                  disabled={isExportingZip}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-colors disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{isExportingZip ? 'جاري التحميل...' : `تنزيل الكل ZIP (${stats.completed + stats.needsReview})`}</span>
                </button>
              )}

              {hasCompletedItems && !isProcessing && (
                <button
                  onClick={handleClearCompleted}
                  className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                >
                  <span>مسح المكتمل</span>
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
          onErrorLog={(item) => setErrorLogItem(item)}
          isProcessing={isProcessing}
        />
      </main>

      {/* Interactive Modal Preview Dialog */}
      {previewItem && (
        <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}

      {/* Error Diagnostic Log Modal */}
      {(errorLogItem || showAllErrorsLog) && (
        <ErrorLogModal
          item={errorLogItem}
          allItems={showAllErrorsLog ? queue : undefined}
          onClose={() => {
            setErrorLogItem(null);
            setShowAllErrorsLog(false);
          }}
        />
      )}
    </div>
  );
}
