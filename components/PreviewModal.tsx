'use client';

import React, { useState, useRef, useEffect } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-2xl bg-[#080d1a] border border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                  {item.fileName}
                </h3>
                {reconciliation?.isReconciled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>مطابق</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    <span>مراجعة</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 text-xs">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'visual'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>معاينة</span>
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'code'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>HTML</span>
              </button>
            </div>

            {/* Paper Theme Toggle */}
            {viewMode === 'visual' && (
              <button
                onClick={() => setPaperTheme((prev) => (prev === 'white' ? 'dark' : 'white'))}
                title={paperTheme === 'white' ? 'الوضع المظلم' : 'الوضع الفاتح'}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                {paperTheme === 'white' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopyHtml}
              title="نسخ HTML"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'تم النسخ' : 'نسخ'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              title="طباعة"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            {/* Download HTML Button */}
            <button
              onClick={() => downloadSingleHtml(item)}
              title="تنزيل ملف HTML"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تنزيل</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="إغلاق (Esc)"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden relative">
          {viewMode === 'visual' ? (
            <div
              className={`w-full h-full p-3 sm:p-6 overflow-auto flex justify-center transition-colors ${
                paperTheme === 'white' ? 'bg-slate-900/60' : 'bg-slate-950'
              }`}
            >
              <div
                className={`w-full max-w-3xl min-h-full rounded-xl overflow-hidden transition-all border ${
                  paperTheme === 'white'
                    ? 'bg-white shadow-xl border-slate-300'
                    : 'bg-[#0b1329] border-slate-700 shadow-xl'
                }`}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={item.resultHtml}
                  title="معاينة الفاتورة"
                  className="w-full h-full min-h-[700px] border-0"
                  sandbox="allow-same-origin allow-scripts allow-modals allow-popups"
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-[#050811] p-4 overflow-auto font-mono text-xs text-emerald-300 select-all">
              <pre className="whitespace-pre-wrap">{item.resultHtml}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
