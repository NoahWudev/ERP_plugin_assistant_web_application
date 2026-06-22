import { Quotation } from '../types';

export function calculateQuotationTotals(quotation: Quotation) {
  const subtotal = quotation.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const discount = Number(quotation.discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discount);

  let tax = 0;
  if (quotation.taxType === 'TAXABLE') {
    tax = Math.round(taxableAmount * 0.05);
  }

  const grandTotal = taxableAmount + tax;

  return {
    subtotal,
    discount,
    taxableAmount,
    tax,
    grandTotal,
  };
}
