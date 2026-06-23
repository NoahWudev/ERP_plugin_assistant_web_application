/** 報價品項列（plugin_only；單價為外掛報價，非凌越主檔價） */
export interface QuotationItem {
  id: string;
  name: string;       // plugin_only（或來自 erp_live 品名快照）
  spec: string;       // plugin_only
  qty: number;        // plugin_only
  unit: string;       // plugin_only
  price: number;      // plugin_only — 報價單價，使用者填寫
  subtotal: number;   // plugin_only
  remark?: string;    // plugin_only
}

export type TaxType = 'TAXABLE' | 'TAX_FREE' | 'ZERO_TAX'; // plugin_only

/** 報價幣別（plugin_only） */
export type QuotationCurrency = 'TWD' | 'USD';

/** 客戶快選（plugin_only；業務小組自建，非凌越 00000D 同步） */
export interface CustomerPreset {
  id: string;
  companyName: string;  // plugin_only
  contactName: string;  // plugin_only
  phone: string;        // plugin_only
  email?: string;       // plugin_only
  taxId: string;        // plugin_only
  address?: string;     // plugin_only
}

/** 凌越 ERP 貨品主檔（erp_live；000000 搜尋結果，不含單價） */
export interface ErpProduct {
  skuNo: string;  // erp_live
  name: string;   // erp_live
  spec: string;   // erp_live
  unit: string;   // erp_live
}

export interface Quotation {
  id: string;              // plugin_only
  teamId?: string;         // plugin_only — 資料切分
  ownerUserId?: string;    // plugin_only — 建立者
  quotationNo: string;     // plugin_only — 外掛暫用單號
  date: string;            // plugin_only
  validDays: number;       // plugin_only
  paymentTerms: string;    // plugin_only
  salesName: string;       // plugin_only — 列印用業務聯絡人
  salesPhone?: string;     // plugin_only
  salesEmail?: string;     // plugin_only

  // 客戶資訊（plugin_only；報價當下快照，非凌越客戶主檔）
  customerName: string;
  customerContact: string;
  customerPhone: string;
  customerTaxId: string;
  customerEmail?: string;
  customerAddress?: string;

  // 品項與金額
  items: QuotationItem[];
  currency: QuotationCurrency; // plugin_only
  discount: number;            // plugin_only
  taxType: TaxType;            // plugin_only
  remark: string;              // plugin_only
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'; // plugin_only
}
