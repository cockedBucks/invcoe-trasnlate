import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { QueueItem } from './types';

/**
 * Sanitizes a filename to prevent path traversal, control characters, or invalid filename characters.
 */
export function sanitizeFileName(name: string): string {
  if (!name) return 'invoice_translated.html';

  // Strip path separators and invalid OS characters
  const cleanName = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\.\./g, '_')
    .trim();

  // Remove .pdf extension if present
  const baseName = cleanName.replace(/\.pdf$/i, '');
  return `${baseName || 'invoice'}.html`;
}

/**
 * Downloads a single translated HTML file
 */
export function downloadSingleHtml(item: QueueItem) {
  if (!item.resultHtml) return;

  const fileName = `ar_${sanitizeFileName(item.fileName)}`;
  const blob = new Blob([item.resultHtml], { type: 'text/html;charset=utf-8' });
  saveAs(blob, fileName);
}

/**
 * Bundles all completed translated HTML files into a ZIP archive and triggers download.
 */
export async function exportBatchAsZip(
  items: QueueItem[],
  zipName: string = 'arabic_translated_invoices.zip'
): Promise<boolean> {
  const completedItems = items.filter((item) => item.resultHtml && item.resultHtml.length > 0);

  if (completedItems.length === 0) {
    return false;
  }

  const zip = new JSZip();
  const nameCounts = new Map<string, number>();

  for (const item of completedItems) {
    const rawBaseName = sanitizeFileName(item.fileName);
    let finalName = `ar_${rawBaseName}`;

    // Handle duplicates
    if (nameCounts.has(finalName)) {
      const count = (nameCounts.get(finalName) || 0) + 1;
      nameCounts.set(finalName, count);
      const dotIndex = finalName.lastIndexOf('.');
      if (dotIndex !== -1) {
        finalName = `${finalName.substring(0, dotIndex)}_${count}${finalName.substring(dotIndex)}`;
      } else {
        finalName = `${finalName}_${count}`;
      }
    } else {
      nameCounts.set(finalName, 1);
    }

    zip.file(finalName, item.resultHtml!);
  }

  // Also include a summary metadata report
  const summaryJson = {
    generatedAt: new Date().toISOString(),
    totalInvoices: completedItems.length,
    invoices: completedItems.map((item) => ({
      originalFile: item.fileName,
      status: item.status,
      invoiceNumber: item.structuredData?.invoiceNumber || 'N/A',
      subtotal: item.structuredData?.subtotal,
      tax: item.structuredData?.tax,
      total: item.structuredData?.total,
      currency: item.structuredData?.currency,
      reconciliation: item.reconciliation?.details,
      isReconciled: item.reconciliation?.isReconciled,
    })),
  };

  zip.file('batch_summary.json', JSON.stringify(summaryJson, null, 2));

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  saveAs(zipBlob, zipName);
  return true;
}
