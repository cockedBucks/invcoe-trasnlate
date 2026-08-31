'use client';

import React, { useState, useEffect } from 'react';
import { QueueItem } from '@/lib/types';
import { X, Copy, Check, AlertOctagon, Terminal, HelpCircle, FileText } from 'lucide-react';

interface ErrorLogModalProps {
  item: QueueItem | null;
  allItems?: QueueItem[];
  onClose: () => void;
}

export const ErrorLogModal: React.FC<ErrorLogModalProps> = ({ item, allItems, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item && (!allItems || allItems.length === 0)) return null;

  const targetItems = item ? [item] : allItems?.filter((i) => i.status === 'error') || [];
  if (targetItems.length === 0) return null;

  const generateDiagnosticReport = (): string => {
    const lines: string[] = [
      '====================================================',
      '🐾 محمود تسخيت (Mahmoud Taskheet) - تقرير تشخيص الأخطاء',
      `التاريخ والوقت: ${new Date().toISOString()}`,
      `عدد الملفات المتعثرة: ${targetItems.length}`,
      '====================================================\n',
    ];

    targetItems.forEach((it, index) => {
      lines.push(`--- [ملف #${index + 1}]: ${it.fileName} ---`);
      lines.push(`حجم الملف: ${(it.fileSize / 1024).toFixed(1)} KB`);
      lines.push(`المدة المستغرقة: ${it.durationMs ? (it.durationMs / 1000).toFixed(1) + 's' : 'N/A'}`);
      lines.push(`كود الخطأ: ${it.errorCode || 'UNKNOWN'}`);
      lines.push(`رسالة الخطأ: ${it.error || 'N/A'}`);
      if (it.rawError) {
        lines.push(`السجل التقني (Raw Trace):\n${it.rawError}`);
      }
      lines.push('----------------------------------------------------\n');
    });

    lines.push('معلومات البيئة (Client Info):');
    if (typeof window !== 'undefined') {
      lines.push(`User Agent: ${window.navigator.userAgent}`);
      lines.push(`URL: ${window.location.href}`);
    }
    lines.push('====================================================');

    return lines.join('\n');
  };

  const reportText = generateDiagnosticReport();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl flex flex-col rounded-2xl bg-[#080d1a] border border-red-500/30 shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-red-950/20 shrink-0">
          <div className="flex items-center gap-2 text-red-400">
            <AlertOctagon className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-white">
              سجل تشخيص الخطأ ({targetItems.length} ملف)
            </h3>
          </div>
          <button
            onClick={onClose}
            title="إغلاق"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Quick Explanation */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>كيف ترسل هذا التقرير لحل المشكلة؟</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              اضغط على زر <strong>&ldquo;نسخ سجل الخطأ&rdquo;</strong> بالأسفل، ثم أرسل النص المنسوخ إلى المطور أو صديقك على WhatsApp / Telegram / GitHub لتحديد سبب الخطأ وإصلاحه فوراً.
            </p>
          </div>

          {/* List of failed items */}
          <div className="space-y-2">
            {targetItems.map((it) => (
              <div
                key={it.id}
                className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 space-y-1"
              >
                <div className="flex items-center justify-between font-medium">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <FileText className="w-3.5 h-3.5 text-red-400" />
                    <span className="truncate max-w-xs sm:max-w-md">{it.fileName}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/40">
                    {it.errorCode || 'ERROR'}
                  </span>
                </div>
                <div className="text-red-300 text-[11px] leading-snug">
                  {it.error || 'حدث خطأ غير متوقع أثناء معالجة الفاتورة.'}
                </div>
              </div>
            ))}
          </div>

          {/* Raw Diagnostic Log Terminal Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3 text-slate-500" />
                <span>البيانات التقنية الكاملة (Raw Diagnostic Log):</span>
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#04060d] border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-56 select-all whitespace-pre-wrap leading-relaxed">
              {reportText}
            </div>
          </div>
        </div>

        {/* Footer with Copy Action */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 truncate">
            {copied ? '✅ تم النسخ بنجاح للحافظة!' : 'انسخ السجل وشاركه مباشرة'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ سجل الخطأ (Copy Log)'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
