export type TranslationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'needs_review'
  | 'error'
  | 'cancelled';

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total: number;
}

export interface StructuredInvoiceData {
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  html: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  vendorName?: string;
  customerName?: string;
}

export interface ReconciliationResult {
  isReconciled: boolean;
  calculatedTotal: number;
  reportedTotal: number;
  discrepancy: number;
  confidence: 'high' | 'medium' | 'low';
  details: string;
}

export interface QueueItem {
  id: string;
  file?: File;
  fileName: string;
  fileSize: number;
  status: TranslationStatus;
  progress: number;
  resultHtml?: string;
  structuredData?: StructuredInvoiceData;
  reconciliation?: ReconciliationResult;
  error?: string;
  rawError?: string;
  errorCode?: string;
  startTime?: number;
  completedTime?: number;
  durationMs?: number;
  retryCount: number;
}

export interface BatchStats {
  total: number;
  completed: number;
  needsReview: number;
  processing: number;
  pending: number;
  error: number;
  cancelled: number;
  totalBytes: number;
  elapsedTimeMs: number;
  estimatedRemainingMs: number;
}

export interface TranslateApiResponse {
  success: boolean;
  originalName: string;
  html: string;
  structuredData?: StructuredInvoiceData;
  reconciliation?: ReconciliationResult;
  modelUsed?: string;
  durationMs?: number;
  error?: string;
  rawError?: string;
  code?: string;
  retryAfterMs?: number;
}
