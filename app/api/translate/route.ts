import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { rateLimiter } from '@/lib/rate-limiter';
import { reconcileInvoiceData } from '@/lib/reconcile';
import { sanitizeInvoiceHtml } from '@/lib/sanitize';
import { StructuredInvoiceData, TranslateApiResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60s maximum execution time for serverless

const SYSTEM_INSTRUCTION = `You are an expert financial and tax invoice translator. Translate this invoice PDF from English into Modern Standard Arabic (الفصحى).

STRICT PRODUCTION RULES:
1. RTL & HTML Structure:
   - Wrap the entire output in a clean, self-contained, printable HTML document starting with <!DOCTYPE html><html dir="rtl" lang="ar"> and <meta charset="UTF-8">.
   - Include a comprehensive modern CSS stylesheet inside <style> supporting both screen preview and print.
   - Include the Arabic typography font stack:
     @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
     body { font-family: 'Cairo', 'Noto Naskh Arabic', Tahoma, Arial, sans-serif; direction: rtl; }
     @media print {
       @page { margin: 10mm; size: auto; }
       body { background: #ffffff !important; color: #000000 !important; }
       .no-print { display: none !important; }
     }
   - Design the invoice with professional, clean table layout, borders, subtle alternating row colors, header summary boxes, and payment details footer.

2. BIDI PROTECTION & WESTERN ARABIC NUMERALS (CRITICAL):
   - Keep ALL numeric digits strictly in Western Arabic numerals (0, 1, 2, 3, 4, 5, 6, 7, 8, 9). NEVER use Eastern Arabic numerals (٠, ١, ٢, ٣, ٤, ٥, ٦, ٧, ٨, ٩).
   - Because the document is RTL, Latin tokens and numbers WILL scramble unless isolated. Therefore, you MUST WRAP EVERY SINGLE numeric figure, price, invoice number, SKU code, serial number, bank IBAN, SWIFT/BIC code, date (e.g. DD/MM/YYYY or YYYY-MM-DD), phone number, email address, and brand name in <span dir="ltr">...</span> or <bdi>...</bdi>.
   - Few-shot examples:
     * Invoice #: <span dir="ltr">INV-2024-9081</span>
     * Date: <span dir="ltr">2026-08-31</span>
     * Amount: <span dir="ltr">1,450.00 USD</span>
     * IBAN: <span dir="ltr">SA0380000000608010167519</span>
     * Email: <span dir="ltr">billing@company.com</span>
     * SKU: <span dir="ltr">PROD-X-99</span>

3. Accurate Financial & Tax Terminology:
   - Invoice -> فاتورة ضريبية / فاتورة
   - Invoice Number -> رقم الفاتورة
   - Invoice Date -> تاريخ الفاتورة
   - Due Date -> تاريخ الاستحقاق
   - Bill To / Customer -> فاتورة إلى / العميل
   - Ship To -> عنوان الشحن
   - Description / Item -> البيان / الوصف
   - Qty / Quantity -> الكمية
   - Unit Price -> سعر الوحدة
   - Total / Amount -> الإجمالي / المبلغ
   - Subtotal -> المجموع الفرعي
   - Tax / VAT (Value Added Tax) -> ضريبة القيمة المضافة
   - Discount -> الخصم
   - Balance Due -> الرصيد المستحق
   - Payment Terms -> شروط الدفع
   - Bank Details -> تفاصيل الحساب البنكي

4. Output Format:
   - Return a valid, parseable JSON object with the following schema:
   {
     "invoiceNumber": "string or empty",
     "invoiceDate": "string or empty",
     "dueDate": "string or empty",
     "vendorName": "string or empty",
     "customerName": "string or empty",
     "currency": "USD/EUR/SAR/etc",
     "subtotal": 0.00,
     "tax": 0.00,
     "total": 0.00,
     "lineItems": [
       {
         "description": "Arabic description",
         "quantity": 1,
         "unitPrice": 100.00,
         "total": 100.00
       }
     ],
     "html": "<!DOCTYPE html><html dir=\\"rtl\\" lang=\\"ar\\">...</html>"
   }
   - Return ONLY the JSON string. Do not wrap with markdown code blocks if possible.`;

// Candidate models in preference order
const MODEL_CANDIDATES = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
];

function extractCleanErrorMessage(err: unknown): string {
  if (!err) return 'فشل التسخيت: لم يتم استلام رد من النموذج';
  const raw = err instanceof Error ? err.message : String(err);

  try {
    const parsed = JSON.parse(raw);
    if (parsed.error?.message) {
      const msg = parsed.error.message;
      if (parsed.error.status === 'UNAVAILABLE' || msg.includes('overloaded')) {
        return 'نموذج الذكاء الاصطناعي مشغول حالياً لدى خوادم Google (503 Overloaded). اضغط إعادة المحاولة 🔄';
      }
      if (parsed.error.status === 'RESOURCE_EXHAUSTED' || msg.includes('quota') || msg.includes('rate')) {
        return 'تم بلوغ حد الاستخدام المجاني (15 RPM). يرجى الانتظار بضع ثوانٍ قبل المتابعة.';
      }
      return msg;
    }
  } catch {
    // Not json
  }

  if (raw.includes('UNAVAILABLE') || raw.includes('overloaded') || raw.includes('503')) {
    return 'نموذج الذكاء الاصطناعي مشغول حالياً لدى خوادم Google (503 Overloaded). اضغط إعادة المحاولة 🔄';
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return 'تم بلوغ حد الاستخدام المجاني (15 RPM). يرجى الانتظار بضع ثوانٍ ثم إعادة المحاولة.';
  }

  return raw;
}

export async function POST(request: NextRequest): Promise<NextResponse<TranslateApiResponse>> {
  const startTime = Date.now();
  let fileName = 'invoice.pdf';

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
      return NextResponse.json(
        {
          success: false,
          originalName: fileName,
          html: '',
          error: 'GEMINI_API_KEY is not configured or is using default placeholder in .env.local',
          code: 'AUTH_MISSING_KEY',
        },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          originalName: fileName,
          html: '',
          error: 'No PDF file was provided in the request payload.',
          code: 'FILE_MISSING',
        },
        { status: 400 }
      );
    }

    fileName = file.name || 'invoice.pdf';

    // Validate MIME type & file extension
    const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json(
        {
          success: false,
          originalName: fileName,
          html: '',
          error: `Invalid file type "${file.type}". Only PDF files (.pdf) are accepted.`,
          code: 'INVALID_FILE_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate size limit (20MB maximum for inline multimodal transfer)
    const MAX_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          originalName: fileName,
          html: '',
          error: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed 20 MB inline transfer limit.`,
          code: 'FILE_TOO_LARGE',
        },
        { status: 413 }
      );
    }

    // Acquire rate limit slot
    await rateLimiter.acquire();

    // Convert PDF ArrayBuffer to Base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const ai = new GoogleGenAI({ apiKey });

    let responseText: string | null = null;
    let modelUsed: string = '';
    let lastError: unknown = null;

    // Try candidate models with fallback
    for (const modelName of MODEL_CANDIDATES) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.0,
            responseMimeType: 'application/json',
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: base64Data,
                  },
                },
                {
                  text: 'Translate this invoice PDF to Modern Standard Arabic RTL HTML and extract structured financial figures as JSON according to the system instructions.',
                },
              ],
            },
          ],
        });

        if (response && response.text) {
          responseText = response.text;
          modelUsed = modelName;
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        const errString = String(err);

        // If 503 UNAVAILABLE or overloaded, pause briefly and fallback to next model
        if (errString.includes('503') || errString.includes('UNAVAILABLE') || errString.includes('overloaded')) {
          console.warn(`Model ${modelName} is temporarily overloaded, trying fallback...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        // If 429 rate limit error, report to rate limiter and try fallback
        if (errString.includes('429') || errString.includes('RESOURCE_EXHAUSTED')) {
          rateLimiter.reportRateLimited(1);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        // If model not found (404), try next model candidate
        if (errString.includes('404') || errString.includes('NOT_FOUND') || errString.includes('not found')) {
          console.warn(`Model ${modelName} not found, attempting fallback...`);
          continue;
        }

        // For other server errors (500), try fallback candidate
        if (errString.includes('500') || errString.includes('INTERNAL')) {
          console.warn(`Model ${modelName} internal error, trying fallback...`);
          continue;
        }

        break;
      }
    }

    if (!responseText) {
      const cleanError = extractCleanErrorMessage(lastError);
      return NextResponse.json(
        {
          success: false,
          originalName: fileName,
          html: '',
          error: cleanError,
          code: 'GENERATION_FAILED',
        },
        { status: 500 }
      );
    }

    // Parse JSON response
    let parsedData: Partial<StructuredInvoiceData> = {};
    let htmlContent = '';

    try {
      // Strip markdown code fences if present
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.substring(7);
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.substring(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      parsedData = JSON.parse(cleanJson);
      htmlContent = parsedData.html || '';
    } catch {
      // Fallback: If model returned raw HTML instead of JSON
      htmlContent = responseText;
      parsedData = {
        html: responseText,
        lineItems: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: '',
      };
    }

    // Sanitize HTML with DOMPurify
    const sanitizedHtml = sanitizeInvoiceHtml(htmlContent);

    // Reconcile financial figures
    const reconciliation = reconcileInvoiceData(parsedData);

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      originalName: fileName,
      html: sanitizedHtml,
      structuredData: {
        lineItems: parsedData.lineItems || [],
        subtotal: parsedData.subtotal ?? 0,
        tax: parsedData.tax ?? 0,
        total: parsedData.total ?? 0,
        currency: parsedData.currency || '',
        invoiceNumber: parsedData.invoiceNumber,
        invoiceDate: parsedData.invoiceDate,
        dueDate: parsedData.dueDate,
        vendorName: parsedData.vendorName,
        customerName: parsedData.customerName,
        html: sanitizedHtml,
      },
      reconciliation,
      modelUsed,
      durationMs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred during invoice translation.';
    return NextResponse.json(
      {
        success: false,
        originalName: fileName,
        html: '',
        error: message,
        code: 'INTERNAL_SERVER_ERROR',
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
