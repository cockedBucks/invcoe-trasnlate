'use client';

import React, { useState } from 'react';
import { QueueItem, TranslationStatus } from '@/lib/types';
import { downloadSingleHtml } from '@/lib/zip-export';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  Eye,
  Download,
  RotateCcw,
  Trash2,
  FileText,
  Search,
  Ban,
  Pencil,
} from 'lucide-react';

interface QueueTableProps {
  items: QueueItem[];
  onPreview: (item: QueueItem) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  isProcessing: boolean;
}

function formatDisplayError(error?: string): string {
  if (!error) return '';
  try {
    const parsed = JSON.parse(error);
    if (parsed.error?.message) {
      if (parsed.error.status === 'UNAVAILABLE' || parsed.error.message.includes('overloaded')) {
        return 'النموذج مشغول حالياً (503 Overloaded) - اضغط 🔄 لإعادة المحاولة';
      }
      return parsed.error.message;
    }
  } catch {
    // not JSON
  }
  if (error.includes('UNAVAILABLE') || error.includes('overloaded')) {
    return 'النموذج مشغول حالياً (503 Overloaded) - اضغط 🔄 لإعادة المحاولة';
  }
  if (error.includes('RESOURCE_EXHAUSTED') || error.includes('429')) {
    return 'تم بلوغ حد الاستخدام (15 RPM) - يرجى الانتظار ثم إعادة المحاولة';
  }
  return error;
}

export const QueueTable: React.FC<QueueTableProps> = ({
  items,
  onPreview,
  onRetry,
  onDelete,
  isProcessing,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredItems = items.filter((item) => {
    if (filterStatus !== 'all') {
      if (filterStatus === 'completed' && item.status !== 'completed' && item.status !== 'needs_review') {
        return false;
      }
      if (filterStatus === 'needs_review' && item.status !== 'needs_review') {
        return false;
      }
      if (filterStatus === 'error' && item.status !== 'error') {
        return false;
      }
      if (filterStatus === 'pending' && item.status !== 'pending' && item.status !== 'processing') {
        return false;
      }
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = item.fileName.toLowerCase().includes(q);
      const invMatch = item.structuredData?.invoiceNumber?.toLowerCase().includes(q);
      const vendorMatch = item.structuredData?.vendorName?.toLowerCase().includes(q);
      return nameMatch || invMatch || vendorMatch;
    }

    return true;
  });

  const getStatusBadge = (status: TranslationStatus, item: QueueItem) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/60 shadow-[2px_2px_0px_0px_#065f46] font-sketch">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>مسخّت ومطابق ✓</span>
          </span>
        );
      case 'needs_review':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/20 text-amber-300 border-2 border-amber-500/60 shadow-[2px_2px_0px_0px_#78350f] font-sketch"
            title={item.reconciliation?.details || 'الحسابات تحتاج مراجعة'}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>يحتاج مراجعة ⚠️</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-teal-500/20 text-teal-300 border-2 border-teal-400 shadow-[2px_2px_0px_0px_#115e59] font-sketch animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>يسخّت الآن... 🐾</span>
          </span>
        );
      case 'error':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-red-500/20 text-red-300 border-2 border-red-500/60 shadow-[2px_2px_0px_0px_#7f1d1d] font-sketch cursor-help"
            title={formatDisplayError(item.error)}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>فشل ❌</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-slate-400 border-2 border-slate-700 font-sketch">
            <Ban className="w-3.5 h-3.5" />
            <span>ملغي</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-slate-400 border-2 border-slate-800 shadow-[1px_1px_0px_0px_#1e293b] font-sketch">
            <Clock className="w-3.5 h-3.5" />
            <span>في الطابور</span>
          </span>
        );
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="sketch-card overflow-hidden">
      {/* Table Toolbar / Sketch Tabs */}
      <div className="p-4 border-b-2 border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-sketch">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border-2 ${
              filterStatus === 'all'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[2px_2px_0px_0px_#000]'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            الكل ({items.length})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border-2 ${
              filterStatus === 'completed'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[2px_2px_0px_0px_#000]'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            المكتملة ({items.filter((i) => i.status === 'completed' || i.status === 'needs_review').length})
          </button>
          <button
            onClick={() => setFilterStatus('needs_review')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border-2 ${
              filterStatus === 'needs_review'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[2px_2px_0px_0px_#000]'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            تحتاج مراجعة ({items.filter((i) => i.status === 'needs_review').length})
          </button>
          <button
            onClick={() => setFilterStatus('error')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border-2 ${
              filterStatus === 'error'
                ? 'bg-red-500 text-slate-950 border-red-400 shadow-[2px_2px_0px_0px_#000]'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            الفاشلة ({items.filter((i) => i.status === 'error').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="ابحث عن اسم أو رقم فاتورة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 rounded-xl bg-slate-950 border-2 border-slate-800 text-xs text-slate-200 placeholder-slate-500 font-sketch focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
        <table className="w-full text-right text-xs text-slate-300">
          <thead className="sticky top-0 z-10 bg-slate-900 border-b-2 border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px] font-sketch">
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">مستند الفاتورة</th>
              <th className="py-3 px-4">حالة التسخيت</th>
              <th className="py-3 px-4">التدقيق المالي</th>
              <th className="py-3 px-4">المدة</th>
              <th className="py-3 px-4 text-left">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-800/60 bg-slate-950/40">
            {filteredItems.map((item, idx) => {
              const struct = item.structuredData;
              const rec = item.reconciliation;
              const hasHtml = Boolean(item.resultHtml);

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-900/70 transition-colors ${
                    item.status === 'processing' ? 'bg-emerald-950/20' : ''
                  }`}
                >
                  {/* Row Number */}
                  <td className="py-3.5 px-4 text-center font-mono text-slate-500">{idx + 1}</td>

                  {/* File Name & Extracted Metadata */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-900 border-2 border-slate-800 text-emerald-400 shrink-0 mt-0.5 shadow-[2px_2px_0px_0px_#10b981]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-200 truncate" title={item.fileName}>
                          {item.fileName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-sketch">
                          <span>{formatBytes(item.fileSize)}</span>
                          {struct?.invoiceNumber && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-slate-300" dir="ltr">#{struct.invoiceNumber}</span>
                            </>
                          )}
                          {struct?.customerName && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px]" title={struct.customerName}>
                                {struct.customerName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(item.status, item)}</td>

                  {/* Financial Reconciliation Check */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {struct?.total !== undefined && struct.total > 0 ? (
                      <div>
                        <div className="font-bold text-slate-200 font-mono" dir="ltr">
                          {struct.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                          <span className="text-emerald-400 font-bold">{struct.currency || 'USD'}</span>
                        </div>
                        {rec && (
                          <div className="text-[11px] mt-0.5 font-sketch">
                            {rec.isReconciled ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>حسابات سليمة</span>
                              </span>
                            ) : (
                              <span
                                className="text-amber-400 flex items-center gap-1 truncate max-w-[160px] font-bold"
                                title={rec.details}
                              >
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span dir="ltr">فارق: {rec.discrepancy.toFixed(2)}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : item.error ? (
                      <div className="text-[11px] text-red-400 truncate max-w-[200px] font-sketch" title={formatDisplayError(item.error)}>
                        {formatDisplayError(item.error)}
                      </div>
                    ) : (
                      <span className="text-slate-600 font-mono">-</span>
                    )}
                  </td>

                  {/* Duration */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-400">
                    {item.durationMs ? `${(item.durationMs / 1000).toFixed(1)} ثانية` : '-'}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-left whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5 font-sketch">
                      {/* Preview HTML */}
                      {hasHtml && (
                        <button
                          onClick={() => onPreview(item)}
                          title="معاينة الفاتورة المعربة"
                          className="sketch-btn flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs transition-all shadow-[2px_2px_0px_0px_#000]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </button>
                      )}

                      {/* Download HTML */}
                      {hasHtml && (
                        <button
                          onClick={() => downloadSingleHtml(item)}
                          title="تنزيل ملف HTML"
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-slate-300 hover:text-emerald-400 shadow-[2px_2px_0px_0px_#1e293b] transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Retry */}
                      {(item.status === 'error' || item.status === 'needs_review') && (
                        <button
                          onClick={() => onRetry(item.id)}
                          disabled={isProcessing}
                          title="إعادة المحاولة"
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-amber-500/20 border-2 border-slate-700 text-amber-300 shadow-[2px_2px_0px_0px_#1e293b] transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => onDelete(item.id)}
                        disabled={item.status === 'processing'}
                        title="حذف من الطابور"
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-red-500/20 border-2 border-slate-800 text-slate-500 hover:text-red-400 shadow-[2px_2px_0px_0px_#1e293b] transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
