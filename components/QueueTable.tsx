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
} from 'lucide-react';

interface QueueTableProps {
  items: QueueItem[];
  onPreview: (item: QueueItem) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onErrorLog?: (item: QueueItem) => void;
  isProcessing: boolean;
}

function formatDisplayError(error?: string): string {
  if (!error) return '';
  try {
    const parsed = JSON.parse(error);
    if (parsed.error?.message) {
      if (parsed.error.status === 'UNAVAILABLE' || parsed.error.message.includes('overloaded')) {
        return 'النموذج مشغول حالياً (503) - اضغط 🔄 لإعادة المحاولة';
      }
      return parsed.error.message;
    }
  } catch {
    // not JSON
  }
  if (error.includes('UNAVAILABLE') || error.includes('overloaded')) {
    return 'النموذج مشغول حالياً (503) - اضغط 🔄 لإعادة المحاولة';
  }
  if (error.includes('RESOURCE_EXHAUSTED') || error.includes('429')) {
    return 'تم بلوغ الحد (15 RPM) - يرجى الانتظار';
  }
  return error;
}

export const QueueTable: React.FC<QueueTableProps> = ({
  items,
  onPreview,
  onRetry,
  onDelete,
  onErrorLog,
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>مطابق</span>
          </span>
        );
      case 'needs_review':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 cursor-help"
            title={item.reconciliation?.details || 'الحسابات تحتاج مراجعة'}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>مراجعة</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>جاري...</span>
          </span>
        );
      case 'error':
        return (
          <button
            onClick={() => onErrorLog?.(item)}
            title="انقر لعرض ونسخ سجل الخطأ"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
          >
            <XCircle className="w-3 h-3" />
            <span>فشل (عرض السجل)</span>
          </button>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-slate-400 bg-slate-900 border border-slate-800">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>بالانتظار</span>
          </span>
        );
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/60">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filterStatus === 'all'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل ({items.length})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filterStatus === 'completed'
                ? 'bg-slate-800 text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المكتملة ({items.filter((i) => i.status === 'completed' || i.status === 'needs_review').length})
          </button>
          {items.some((i) => i.status === 'needs_review') && (
            <button
              onClick={() => setFilterStatus('needs_review')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterStatus === 'needs_review'
                  ? 'bg-slate-800 text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              مراجعة ({items.filter((i) => i.status === 'needs_review').length})
            </button>
          )}
          {items.some((i) => i.status === 'error') && (
            <button
              onClick={() => setFilterStatus('error')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterStatus === 'error'
                  ? 'bg-slate-800 text-red-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              فشل ({items.filter((i) => i.status === 'error').length})
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-8 pl-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs text-slate-300">
          <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 text-[11px]">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center text-slate-500">#</th>
              <th className="py-2.5 px-3">الملف</th>
              <th className="py-2.5 px-3">الحالة</th>
              <th className="py-2.5 px-3">المبلغ</th>
              <th className="py-2.5 px-3">الوقت</th>
              <th className="py-2.5 px-3 text-left">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredItems.map((item, idx) => {
              const struct = item.structuredData;
              const rec = item.reconciliation;
              const hasHtml = Boolean(item.resultHtml);

              return (
                <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>

                  {/* File name & size */}
                  <td className="py-2.5 px-3 max-w-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-200 truncate" title={item.fileName}>
                          {item.fileName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatBytes(item.fileSize)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3 whitespace-nowrap">{getStatusBadge(item.status, item)}</td>

                  {/* Financial Total */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {struct?.total !== undefined && struct.total > 0 ? (
                      <div className="font-mono text-slate-200" dir="ltr">
                        {struct.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-emerald-400 text-[10px]">{struct.currency || 'USD'}</span>
                      </div>
                    ) : item.error ? (
                      <div className="text-[11px] text-red-400 truncate max-w-[160px]" title={formatDisplayError(item.error)}>
                        {formatDisplayError(item.error)}
                      </div>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>

                  {/* Duration */}
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                    {item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : '-'}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-left whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {hasHtml && (
                        <button
                          onClick={() => onPreview(item)}
                          title="معاينة"
                          className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>معاينة</span>
                        </button>
                      )}

                      {hasHtml && (
                        <button
                          onClick={() => downloadSingleHtml(item)}
                          title="تنزيل HTML"
                          className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      )}

                      {(item.status === 'error' || item.status === 'needs_review') && (
                        <button
                          onClick={() => onRetry(item.id)}
                          disabled={isProcessing}
                          title="إعادة المحاولة"
                          className="p-1 rounded-md bg-slate-800/80 hover:bg-amber-500/20 text-amber-300 transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}

                      {item.status === 'error' && (
                        <button
                          onClick={() => onErrorLog?.(item)}
                          title="عرض ونسخ سجل الخطأ"
                          className="p-1 rounded-md bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => onDelete(item.id)}
                        disabled={item.status === 'processing'}
                        title="حذف"
                        className="p-1 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-3 h-3" />
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
