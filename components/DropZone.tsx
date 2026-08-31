'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import { UploadCloud, Sparkles, AlertCircle, FileText, CheckCircle, Pencil } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
  maxFiles?: number;
  totalFiles: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  isProcessing,
  maxFiles = 300,
  totalFiles,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndAddFiles = (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const filesArray = Array.from(fileList);
    const validPdfs: File[] = [];
    let oversizedCount = 0;
    let nonPdfCount = 0;

    for (const file of filesArray) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        nonPdfCount++;
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        oversizedCount++;
        continue;
      }
      validPdfs.push(file);
    }

    if (nonPdfCount > 0) {
      setErrorMessage(`تم تخطي ${nonPdfCount} ملف(ات) غير متوافقة. محمود تسخيت يقبل فقط ملفات PDF (.pdf).`);
    } else if (oversizedCount > 0) {
      setErrorMessage(`تم تخطي ${oversizedCount} ملف(ات) لتجاوزها حد الـ 20 ميغابايت.`);
    }

    if (totalFiles + validPdfs.length > maxFiles) {
      const allowedCount = Math.max(0, maxFiles - totalFiles);
      setErrorMessage(`تم الوصول للحد الأقصى (${maxFiles} ملف). تمت إضافة أول ${allowedCount} ملف فقط.`);
      onFilesSelected(validPdfs.slice(0, allowedCount));
      return;
    }

    if (validPdfs.length > 0) {
      onFilesSelected(validPdfs);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleLoadSampleInvoice = () => {
    const samplePdfRaw = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>> endobj
4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
5 0 obj <</Length 620>> stream
BT
/F1 20 Tf
50 720 Td
(TAX INVOICE / TECH CORP) Tj
/F1 10 Tf
0 -30 Td
(Invoice Number: INV-2026-8802) Tj
0 -16 Td
(Invoice Date: 2026-08-31 | Due Date: 2026-09-30) Tj
0 -16 Td
(Bill To: Gulf Financial Solutions Ltd) Tj
0 -16 Td
(IBAN: SA0380000000608010167519 | SWIFT: NCBKSA22) Tj
0 -35 Td
(--------------------------------------------------------------------------------) Tj
0 -20 Td
(Item Description                           Qty     Unit Price     Total USD) Tj
0 -16 Td
(Cloud Infrastructure Hosting (Aug)           1       1,200.00      1,200.00) Tj
0 -16 Td
(Database Optimization Service                5         150.00        750.00) Tj
0 -16 Td
(SSL Certificate & Security Audit             1         250.00        250.00) Tj
0 -25 Td
(--------------------------------------------------------------------------------) Tj
0 -20 Td
(Subtotal:                                                         2,200.00 USD) Tj
0 -16 Td
(VAT (15%):                                                         330.00 USD) Tj
0 -20 Td
(TOTAL BALANCE DUE:                                               2,530.00 USD) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000115 00000 n 
0000000216 00000 n 
0000000287 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
960
%%EOF`;

    const blob = new Blob([samplePdfRaw], { type: 'application/pdf' });
    const sampleFile = new File([blob], 'Sample_Tax_Invoice_INV-2026-8802.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    validateAndAddFiles([sampleFile]);
  };

  return (
    <div className="w-full relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={isProcessing}
      />

      {/* Main Sketchy Blueprint Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`group relative p-8 sm:p-12 text-center transition-all cursor-pointer overflow-hidden wireframe-grid-dense ${
          isDragOver
            ? 'border-2 border-emerald-400 bg-emerald-950/40 scale-[1.01] shadow-[8px_8px_0px_0px_#10b981]'
            : isProcessing
            ? 'border-2 border-dashed border-slate-800 bg-slate-950/40 opacity-60 cursor-not-allowed'
            : 'sketch-card hover:border-emerald-400/80 hover:shadow-[6px_6px_0px_0px_#10b981]'
        }`}
      >
        {/* Hand-drawn tape strip effect on top */}
        <div className="tape-strip" />

        {/* Blueprint corner measurement marks */}
        <div className="absolute top-2 left-2 font-mono text-[10px] text-slate-500 font-sketch">
          [X: 001 | Y: 300]
        </div>
        <div className="absolute top-2 right-2 font-mono text-[10px] text-slate-500 font-sketch">
          [PDF_INVOICE_SLOT]
        </div>
        <div className="absolute bottom-2 left-2 font-mono text-[10px] text-slate-600 font-sketch">
          SCALE: 1:1 • 100% FREE
        </div>
        <div className="absolute bottom-2 right-2 font-mono text-[10px] text-emerald-500/60 font-sketch">
          MAHMOUD_ENGINE_V3.6
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center max-w-lg mx-auto">
          {/* Cat Mastermind Speech Bubble */}
          <div className="mb-5 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border-2 border-emerald-400 bg-slate-900 p-0.5 shadow-[2px_2px_0px_0px_#10b981] overflow-hidden shrink-0 rotate-[-4deg]">
              <Image
                src="/logo.png"
                alt="محمود تسخيت"
                width={48}
                height={48}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="sketch-bubble px-3.5 py-1.5 text-xs text-emerald-300 font-sketch text-right">
              &ldquo;عيني محمود حطلنا فواتيرك نتجرمها ماعدنا شغل وعمل&rdquo; 🐾
            </div>
          </div>

          {/* Upload Icon Sketch Box */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3.5 transition-transform duration-300 border-2 ${
              isDragOver
                ? 'scale-110 bg-emerald-500 text-slate-950 border-slate-950 shadow-[4px_4px_0px_0px_#000]'
                : 'bg-slate-900 border-slate-700 text-emerald-400 shadow-[3px_3px_0px_0px_#10b981] group-hover:scale-105 group-hover:border-emerald-400'
            }`}
          >
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white mb-1.5 flex items-center gap-2">
            <span>اسحب وأفلت فواتير الـ PDF هنا</span>
          </h3>

          <p className="text-sm text-slate-400 mb-4 font-sketch">
            أو <span className="text-emerald-400 underline underline-offset-4 font-bold">تصفح جهازك</span> لاختيار حتى <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{maxFiles} فاتورة</strong> معاً.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-sketch text-slate-400 mb-5">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 shadow-[1px_1px_0px_0px_#334155]">
              📄 صيغة PDF فقط
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 shadow-[1px_1px_0px_0px_#334155]">
              ⚖️ حتى 20 ميغابايت لكل ملف
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 shadow-[1px_1px_0px_0px_#334155]">
              ⚡ عزل ثنائي الاتجاه (Bidi)
            </span>
          </div>

          {/* Quick Demo Sample Action */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 pt-3 border-t-2 border-dashed border-slate-800/80 w-full justify-center"
          >
            <span className="text-xs text-slate-400 font-sketch">معندكش فاتورة تجريبية؟</span>
            <button
              type="button"
              onClick={handleLoadSampleInvoice}
              disabled={isProcessing}
              className="sketch-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-[2px_2px_0px_0px_#000]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>جرّب فاتورة نموذجية بضغطة واحدة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error message alert */}
      {errorMessage && (
        <div className="mt-3 p-3.5 rounded-xl bg-red-950/60 border-2 border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-in fade-in shadow-[3px_3px_0px_0px_#7f1d1d]">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-sketch">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
