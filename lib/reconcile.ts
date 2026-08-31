import { LineItem, ReconciliationResult, StructuredInvoiceData } from './types';

/**
 * Validates financial totals from the structured invoice extraction.
 * Verifies that the sum of line items + tax aligns with subtotal and total within reasonable rounding tolerance.
 */
export function reconcileInvoiceData(data: Partial<StructuredInvoiceData>): ReconciliationResult {
  const lineItems: LineItem[] = Array.isArray(data.lineItems) ? data.lineItems : [];
  const reportedSubtotal = typeof data.subtotal === 'number' && !isNaN(data.subtotal) ? data.subtotal : 0;
  const reportedTax = typeof data.tax === 'number' && !isNaN(data.tax) ? data.tax : 0;
  const reportedTotal = typeof data.total === 'number' && !isNaN(data.total) ? data.total : 0;

  // Calculate sum of line items
  const lineItemsSum = lineItems.reduce((acc, item) => {
    const itemTotal = typeof item.total === 'number' && !isNaN(item.total) ? item.total : 0;
    return acc + itemTotal;
  }, 0);

  // Rounding tolerance: 0.05 units for minor float/cents rounding differences
  const TOLERANCE = 0.05;

  // Case 1: Line items exist
  if (lineItems.length > 0) {
    const lineItemSubtotalDiff = Math.abs(lineItemsSum - reportedSubtotal);
    const calculatedTotal = (reportedSubtotal > 0 ? reportedSubtotal : lineItemsSum) + reportedTax;
    const totalDiff = Math.abs(calculatedTotal - reportedTotal);

    // If line items match subtotal and total matches calculated
    if (lineItemSubtotalDiff <= TOLERANCE && totalDiff <= TOLERANCE) {
      return {
        isReconciled: true,
        calculatedTotal: Number(calculatedTotal.toFixed(2)),
        reportedTotal: Number(reportedTotal.toFixed(2)),
        discrepancy: 0,
        confidence: 'high',
        details: `Totals fully verified (${lineItems.length} line items sum to ${reportedSubtotal.toFixed(2)} + Tax ${reportedTax.toFixed(2)} = Total ${reportedTotal.toFixed(2)}).`,
      };
    }

    // Minor discrepancy within tolerance or percentage (< 1%)
    const maxVal = Math.max(reportedTotal, calculatedTotal, 1);
    const relDiff = totalDiff / maxVal;

    if (totalDiff <= 1.0 || relDiff < 0.01) {
      return {
        isReconciled: true,
        calculatedTotal: Number(calculatedTotal.toFixed(2)),
        reportedTotal: Number(reportedTotal.toFixed(2)),
        discrepancy: Number(totalDiff.toFixed(2)),
        confidence: 'medium',
        details: `Minor rounding/discount difference of ${totalDiff.toFixed(2)} (Calc: ${calculatedTotal.toFixed(2)}, Reported: ${reportedTotal.toFixed(2)}).`,
      };
    }

    // Significant discrepancy -> Needs Review
    return {
      isReconciled: false,
      calculatedTotal: Number(calculatedTotal.toFixed(2)),
      reportedTotal: Number(reportedTotal.toFixed(2)),
      discrepancy: Number(totalDiff.toFixed(2)),
      confidence: 'low',
      details: `Discrepancy detected: Line items sum (${lineItemsSum.toFixed(2)}) + Tax (${reportedTax.toFixed(2)}) = ${calculatedTotal.toFixed(2)}, but invoice Total is ${reportedTotal.toFixed(2)} (Diff: ${totalDiff.toFixed(2)}).`,
    };
  }

  // Case 2: No individual line items extracted, check subtotal + tax = total
  if (reportedTotal > 0) {
    const calculatedTotal = reportedSubtotal + reportedTax;
    const totalDiff = Math.abs(calculatedTotal - reportedTotal);

    if (reportedSubtotal === 0 || totalDiff <= TOLERANCE) {
      return {
        isReconciled: true,
        calculatedTotal: Number(reportedTotal.toFixed(2)),
        reportedTotal: Number(reportedTotal.toFixed(2)),
        discrepancy: 0,
        confidence: reportedSubtotal > 0 ? 'high' : 'medium',
        details: `Reported total: ${reportedTotal.toFixed(2)} ${data.currency || ''}.`,
      };
    }

    return {
      isReconciled: false,
      calculatedTotal: Number(calculatedTotal.toFixed(2)),
      reportedTotal: Number(reportedTotal.toFixed(2)),
      discrepancy: Number(totalDiff.toFixed(2)),
      confidence: 'low',
      details: `Subtotal (${reportedSubtotal.toFixed(2)}) + Tax (${reportedTax.toFixed(2)}) = ${calculatedTotal.toFixed(2)}, but Total is ${reportedTotal.toFixed(2)}.`,
    };
  }

  // Case 3: Empty or non-numeric invoice totals
  return {
    isReconciled: true,
    calculatedTotal: 0,
    reportedTotal: 0,
    discrepancy: 0,
    confidence: 'low',
    details: 'Invoice totals could not be strictly parsed as numbers; visual verification recommended.',
  };
}
