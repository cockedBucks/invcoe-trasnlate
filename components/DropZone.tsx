'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import { UploadCloud, Sparkles, AlertCircle } from 'lucide-react';

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
      setErrorMessage(`يرجى رفع ملفات PDF فقط.`);
    } else if (oversizedCount > 0) {
      setErrorMessage(`تم تخطي ملفات تتجاوز 20 ميغابايت.`);
    }

    if (totalFiles + validPdfs.length > maxFiles) {
      const allowedCount = Math.max(0, maxFiles - totalFiles);
      setErrorMessage(`الحد الأقصى ${maxFiles} فاتورة.`);
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

    const sampleFile = new File([samplePdfRaw], 'sample_invoice_english.pdf', {
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

      {/* Main Minimal Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`group relative p-6 sm:p-8 text-center transition-all cursor-pointer rounded-2xl border ${
          isDragOver
            ? 'border-emerald-400 bg-emerald-950/30'
            : isProcessing
            ? 'border-slate-800 bg-slate-950/40 opacity-50 cursor-not-allowed'
            : 'border-slate-800/80 bg-slate-900/40 hover:border-emerald-500/50 hover:bg-slate-900/60'
        }`}
      >
        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          {/* Cat Speech Bubble */}
          <div className="mb-4 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl border border-emerald-500/50 bg-slate-900 p-0.5 overflow-hidden shrink-0">
              <Image
                src="/logo.png"
                alt="محمود تسخيت"
                width={40}
                height={40}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs text-emerald-300 font-sketch text-right">
              &ldquo;عيني محمود حطلنا فواتيرك نتجرمها ماعدنا شغل وعمل&rdquo; 🐾
            </div>
          </div>

          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-slate-900/80 border border-slate-800 text-emerald-400 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-6 h-6" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-1">
            اسحب وأفلت فواتير PDF هنا
          </h3>

          <p className="text-xs text-slate-400 mb-4">
            أو <span className="text-emerald-400 underline underline-offset-2">اختر من جهازك</span> (حتى {maxFiles} فاتورة)
          </p>

          {/* Quick Demo Sample Action */}
          <div onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleLoadSampleInvoice}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>تجربة فاتورة نموذجية</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error message alert */}
      {errorMessage && (
        <div className="mt-2 p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
