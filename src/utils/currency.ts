import { Quotation, QuotationCurrency } from '../types';
import { calculateQuotationTotals } from './quotationTotals';

export function normalizeCurrency(raw?: string): QuotationCurrency {
  return raw === 'USD' ? 'USD' : 'TWD';
}

export function normalizeQuotation(quotation: Quotation): Quotation {
  return {
    ...quotation,
    currency: normalizeCurrency(quotation.currency),
  };
}

export function currencyLabel(currency: QuotationCurrency): string {
  return currency === 'USD' ? 'USD' : '元';
}

export function currencyDisplayCode(currency: QuotationCurrency): string {
  return currency === 'USD' ? 'USD' : 'TWD';
}

/** Excel 公版 E6 幣別代碼 */
export function currencyExcelCode(currency: QuotationCurrency): string {
  return currency === 'USD' ? 'US' : 'NT';
}

export function formatMoney(amount: number, currency: QuotationCurrency): string {
  return `${formatAmount(amount, currency)} ${currencyLabel(currency)}`;
}

export function formatAmount(amount: number, currency: QuotationCurrency): string {
  return currency === 'USD'
    ? amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : amount.toLocaleString();
}

export function sumGrandTotalsByCurrency(
  quotations: Quotation[],
  options?: { excludeRejected?: boolean },
): Record<QuotationCurrency, number> {
  const excludeRejected = options?.excludeRejected ?? true;
  const totals: Record<QuotationCurrency, number> = { TWD: 0, USD: 0 };

  for (const quotation of quotations) {
    if (excludeRejected && quotation.status === 'REJECTED') {
      continue;
    }
    const currency = normalizeCurrency(quotation.currency);
    totals[currency] += calculateQuotationTotals(quotation).grandTotal;
  }

  return totals;
}

export function formatGrandSumKpi(totals: Record<QuotationCurrency, number>): string {
  const parts: string[] = [];
  if (totals.TWD > 0) {
    parts.push(formatMoney(totals.TWD, 'TWD'));
  }
  if (totals.USD > 0) {
    parts.push(formatMoney(totals.USD, 'USD'));
  }
  if (parts.length === 0) {
    return formatMoney(0, 'TWD');
  }
  if (parts.length === 2) {
    return parts.join(' + ');
  }
  return parts[0];
}
