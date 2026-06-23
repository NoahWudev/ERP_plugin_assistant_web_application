import type { CustomerPreset, Quotation } from '../types';
import { apiFetch } from './api';

type ApiQuotation = {
  id: string;
  team_id?: string;
  owner_user_id?: string;
  quotation_no: string;
  date: string;
  valid_days: number;
  payment_terms: string;
  sales_name: string;
  sales_phone?: string;
  sales_email?: string;
  customer_name: string;
  customer_contact: string;
  customer_phone: string;
  customer_tax_id: string;
  customer_email?: string;
  customer_address?: string;
  items: Quotation['items'];
  currency: Quotation['currency'];
  discount: number;
  tax_type: Quotation['taxType'];
  remark: string;
  status: Quotation['status'];
};

type ApiCustomerPreset = {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email?: string;
  tax_id: string;
  address?: string;
};

export function quotationToApi(quote: Quotation) {
  return {
    quotation_no: quote.quotationNo,
    date: quote.date,
    valid_days: quote.validDays,
    payment_terms: quote.paymentTerms,
    sales_name: quote.salesName,
    sales_phone: quote.salesPhone,
    sales_email: quote.salesEmail,
    customer_name: quote.customerName,
    customer_contact: quote.customerContact,
    customer_phone: quote.customerPhone,
    customer_tax_id: quote.customerTaxId,
    customer_email: quote.customerEmail,
    customer_address: quote.customerAddress,
    items: quote.items,
    currency: quote.currency,
    discount: quote.discount,
    tax_type: quote.taxType,
    remark: quote.remark,
    status: quote.status,
  };
}

export function quotationFromApi(row: ApiQuotation): Quotation {
  return {
    id: row.id,
    teamId: row.team_id,
    ownerUserId: row.owner_user_id,
    quotationNo: row.quotation_no,
    date: row.date,
    validDays: row.valid_days,
    paymentTerms: row.payment_terms,
    salesName: row.sales_name,
    salesPhone: row.sales_phone,
    salesEmail: row.sales_email,
    customerName: row.customer_name,
    customerContact: row.customer_contact,
    customerPhone: row.customer_phone,
    customerTaxId: row.customer_tax_id,
    customerEmail: row.customer_email,
    customerAddress: row.customer_address,
    items: row.items,
    currency: row.currency,
    discount: Number(row.discount),
    taxType: row.tax_type,
    remark: row.remark,
    status: row.status,
  };
}

function customerFromApi(row: ApiCustomerPreset): CustomerPreset {
  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    taxId: row.tax_id,
    address: row.address,
  };
}

export async function fetchQuotations(): Promise<Quotation[]> {
  const rows = await apiFetch<ApiQuotation[]>('/api/quotations');
  return rows.map(quotationFromApi);
}

export async function createQuotation(quote: Quotation): Promise<Quotation> {
  const row = await apiFetch<ApiQuotation>('/api/quotations', {
    method: 'POST',
    body: JSON.stringify(quotationToApi(quote)),
  });
  return quotationFromApi(row);
}

export async function updateQuotation(quote: Quotation): Promise<Quotation> {
  const row = await apiFetch<ApiQuotation>(`/api/quotations/${quote.id}`, {
    method: 'PUT',
    body: JSON.stringify(quotationToApi(quote)),
  });
  return quotationFromApi(row);
}

export async function deleteQuotation(id: string): Promise<void> {
  await apiFetch(`/api/quotations/${id}`, { method: 'DELETE' });
}

export async function fetchCustomerPresets(): Promise<CustomerPreset[]> {
  const rows = await apiFetch<ApiCustomerPreset[]>('/api/presets/customers');
  return rows.map(customerFromApi);
}

export async function createCustomerPreset(
  preset: Omit<CustomerPreset, 'id'>
): Promise<CustomerPreset> {
  const row = await apiFetch<ApiCustomerPreset>('/api/presets/customers', {
    method: 'POST',
    body: JSON.stringify({
      company_name: preset.companyName,
      contact_name: preset.contactName,
      phone: preset.phone,
      email: preset.email,
      tax_id: preset.taxId,
      address: preset.address,
    }),
  });
  return customerFromApi(row);
}

export async function deleteCustomerPreset(id: string): Promise<void> {
  await apiFetch(`/api/presets/customers/${id}`, { method: 'DELETE' });
}

export async function migrateLocalStorage(payload: {
  currentQuotation?: Quotation | null;
  customerPresets: CustomerPreset[];
  draftsHistory: Quotation[];
}) {
  return apiFetch<{ quotations: number; customer_presets: number }>(
    '/api/migrate/local',
    {
      method: 'POST',
      body: JSON.stringify({
        current_quotation: payload.currentQuotation
          ? quotationToApi(payload.currentQuotation)
          : null,
        customer_presets: payload.customerPresets.map((c) => ({
          companyName: c.companyName,
          contactName: c.contactName,
          phone: c.phone,
          email: c.email,
          taxId: c.taxId,
          address: c.address,
        })),
        drafts_history: payload.draftsHistory.map(quotationToApi),
      }),
    }
  );
}

const LEGACY_KEYS = [
  'erp_current_quotation',
  'erp_customer_presets',
  'erp_product_presets',
  'erp_drafts_history',
] as const;

export function hasLegacyLocalStorage(): boolean {
  return LEGACY_KEYS.some((key) => localStorage.getItem(key));
}

export function readLegacyLocalStorage() {
  const readJson = <T,>(key: string, fallback: T): T => {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  return {
    currentQuotation: readJson<Quotation | null>('erp_current_quotation', null),
    customerPresets: readJson<CustomerPreset[]>('erp_customer_presets', []),
    draftsHistory: readJson<Quotation[]>('erp_drafts_history', []),
  };
}

export function clearLegacyLocalStorage() {
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}
