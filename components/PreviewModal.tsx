'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { QueueItem } from '@/lib/types';
import { downloadSingleHtml } from '@/lib/zip-export';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Code,
  Eye,
  Sun,
  Moon,
  ExternalLink,
  Pencil,
} from 'lucide-react';

interface PreviewModalProps {
  item: QueueItem | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ item, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [paperTheme, setPaperTheme] = useState<'white' | 'dark'>('white');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item || !item.resultHtml) return null;

  const handleCopyHtml = async () => {
    if (item.resultHtml) {
      await navigator.clipboard.writeText(item.resultHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  const openInNewTab = () => {
    if (item.resultHtml) {
      const blob = new Blob([item.resultHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const reconciliation = item.reconciliation;
  const struct = item.structuredData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[92vh] flex flex-col rounded-3xl bg-[#080d1a] border-2 border-slate-700 shadow-[8px_8px_0px_0px_#10b981] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Small Cat Avatar in Preview */}
            <div className="w-10 h-10 rounded-xl border-2 border-emerald-400 bg-slate-950 p-0.5 overflow-hidden shrink-0 shadow-[2px_2px_0px_0px_#10b981]">
              <Image
                src="/logo.png"
                alt="محمود تسخيت"
                width={40}
                height={40}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-sm sm:max-w-md">
                  {item.fileName}
                </h3>
                {reconciliation?.isReconciled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-sketch font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>معتمد من محمود ✓</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/50 font-sketch font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    <span>راجع الحسابات ⚠️</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate font-sketch">
                {struct?.invoiceNumber ? `فاتورة رقم #${struct.invoiceNumber} • ` : ''}
                {struct?.total ? `الإجمالي: ${struct.total.toLocaleString()} ${struct.currency || ''}` : ''}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 font-sketch">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center rounded-xl bg-slate-950 p-1 border-2 border-slate-800">
              <button
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'visual'
                    ? 'bg-emerald-500 text-slate-950 shadow-[1px_1px_0px_0px_#000]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة بصرية</span>
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'code'
                    ? 'bg-emerald-500 text-slate-950 shadow-[1px_1px_0px_0px_#000]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>كود HTML</span>
              </button>
            </div>

            {/* Paper Theme Toggle */}
            {viewMode === 'visual' && (
              <button
                onClick={() => setPaperTheme(paperTheme === 'white' ? 'dark' : 'white')}
                title={`التبديل إلى خلفية ${paperTheme === 'white' ? 'داكنة' : 'بيضاء'}`}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-slate-300 transition-colors shadow-[2px_2px_0px_0px_#1e293b]"
              >
                {paperTheme === 'white' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-300" />}
              </button>
            )}

            {/* Print Button */}
            <button
              onClick={handlePrint}
              title="طباعة الفاتورة"
              className="sketch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-xs font-bold text-slate-100 transition-all shadow-[2px_2px_0px_0px_#000]"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">طباعة 🖨️</span>
            </button>

            {/* Copy HTML */}
            <button
              onClick={handleCopyHtml}
              title="نسخ كود HTML"
              className="sketch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-xs font-bold text-slate-100 transition-all shadow-[2px_2px_0px_0px_#000]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copied ? 'تم النسخ!' : 'نسخ'}</span>
            </button>

            {/* Download Single HTML */}
            <button
              onClick={() => downloadSingleHtml(item)}
              title="تنزيل ملف HTML"
              className="sketch-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-[2px_2px_0px_0px_#000]"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تنزيل</span>
            </button>

            {/* Open in new tab */}
            <button
              onClick={openInNewTab}
              title="فتح في تبويب مستقل"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-slate-300 transition-colors shadow-[2px_2px_0px_0px_#1e293b]"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 hover:text-red-400 border-2 border-slate-800 text-slate-400 transition-colors shadow-[2px_2px_0px_0px_#1e293b] ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reconciliation Alert Banner */}
        {reconciliation && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-b-2 shrink-0 font-sketch ${
              reconciliation.isReconciled
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {reconciliation.isReconciled ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="truncate font-bold">{reconciliation.details}</span>
            </div>
            <span className="text-[11px] font-mono shrink-0 mr-2 opacity-80" dir="ltr">
              Diff: {reconciliation.discrepancy.toFixed(2)}
            </span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 min-h-0 relative overflow-auto wireframe-grid">
          {viewMode === 'visual' ? (
            <div
              className={`w-full h-full p-4 sm:p-8 flex justify-center transition-colors duration-200 ${
                paperTheme === 'white' ? 'bg-[#0b1329]' : 'bg-[#050811]'
              }`}
            >
              <div className="w-full max-w-4xl h-full shadow-[6px_6px_0px_0px_#10b981] rounded-2xl overflow-hidden border-3 border-slate-700 bg-white">
                <iframe
                  ref={iframeRef}
                  srcDoc={item.resultHtml}
                  title="Arabic Translated Invoice Preview"
                  sandbox="allow-same-origin"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-auto">
              <pre className="whitespace-pre-wrap select-all">{item.resultHtml}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
