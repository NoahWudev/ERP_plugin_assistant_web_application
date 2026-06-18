export interface QuotationItem {
  id: string;
  name: string;
  spec: string;       // 規格
  qty: number;        // 數量
  unit: string;       // 單位
  price: number;      // 單價
  subtotal: number;   // 小計 (qty * price)
  remark?: string;     // 備註/說明
}

export type TaxType = 'TAXABLE' | 'TAX_FREE' | 'ZERO_TAX'; // 5% 應稅, 免稅, 零稅率

export interface CustomerPreset {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  taxId: string;      // 統一編號
  address?: string;   // 地址
}

export interface ProductPreset {
  id: string;
  name: string;
  spec: string;
  unit: string;
  price: number;
}

export interface Quotation {
  id: string;
  quotationNo: string;   // 報價單號
  date: string;          // 報價日期 (YYYY-MM-DD)
  validDays: number;     // 報價有效期 (天)
  paymentTerms: string;  // 付款條件
  salesName: string;     // 業務人員
  salesPhone?: string;   // 業務電話
  salesEmail?: string;   // 業務 Email

  // 客戶資訊
  customerName: string;
  customerContact: string;
  customerPhone: string;
  customerTaxId: string;
  customerEmail?: string;
  customerAddress?: string;

  // 品項與金額
  items: QuotationItem[];
  discount: number;       // 折扣金額
  taxType: TaxType;      // 稅別
  remark: string;        // 備註
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
}
