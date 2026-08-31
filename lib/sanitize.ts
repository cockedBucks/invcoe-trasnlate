import DOMPurify from 'isomorphic-dompurify';

/**
 * Server-side & Client-side HTML sanitizer for Gemini-generated invoice HTML documents.
 * Ensures strict security against prompt-injection and XSS while preserving invoice CSS, RTL attributes, and table structures.
 */
export function sanitizeInvoiceHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  // Remove potential markdown code fences if model output contained any
  let cleaned = rawHtml.trim();
  if (cleaned.startsWith('```html')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  // Configure DOMPurify to preserve safe document styling & RTL formatting
  const sanitized = DOMPurify.sanitize(cleaned, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['style', 'bdi', 'bdo', 'meta', 'link', 'html', 'head', 'body', 'title'],
    ADD_ATTR: [
      'dir',
      'lang',
      'charset',
      'content',
      'http-equiv',
      'name',
      'style',
      'class',
      'id',
      'colspan',
      'rowspan',
      'align',
      'valign',
      'border',
      'cellpadding',
      'cellspacing',
      'width',
      'height',
    ],
    FORCE_BODY: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'base'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'formaction'],
    ALLOW_DATA_ATTR: false,
  });

  return sanitized;
}
