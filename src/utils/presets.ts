import { CustomerPreset, Quotation } from '../types';

export const DEFAULT_CUSTOMERS: CustomerPreset[] = [
  {
    id: 'c1',
    companyName: '台積科系統股份有限公司',
    contactName: '陳雅婷 處長',
    phone: '02-2712-3456 #801',
    email: 'yating.chen@tsmc-sys.com.tw',
    taxId: '23456789',
    address: '新竹科學園區力行六路 88 號',
  },
  {
    id: 'c2',
    companyName: '聯發資通科技有限公司',
    contactName: '林偉強 採購經理',
    phone: '03-567-8910 #234',
    email: 'purchasing.wk@mediatek-comm.com',
    taxId: '87654321',
    address: '新竹科學園區篤行一路 1 號',
  },
  {
    id: 'c3',
    companyName: '宏碁數位科技股份有限公司',
    contactName: '周逸軒 專案經理',
    phone: '02-8692-5588',
    email: 'sam_chou@acer-digital.com',
    taxId: '54321678',
    address: '新北市汐止區新台五路一段 88 號',
  },
  {
    id: 'c4',
    companyName: '大億資訊工業股份有限公司',
    contactName: '王美玲 資深主任',
    phone: '06-258-2121',
    email: 'm.wang@dayi-info.com.tw',
    taxId: '98761234',
    address: '台南市安南科工區科技一路 12 號',
  }
];

export function generateQuotationNo(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 900) + 100); // 3-digit random
  return `QT-${year}${month}${day}-${rand}`;
}

export const DEFAULT_QUOTATION_TEMPLATE = (salesName: string = '王小明'): Quotation => {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: 'draft-template',
    quotationNo: generateQuotationNo(),
    date: today,
    validDays: 30,
    paymentTerms: '簽約預付 30%, 驗收合格後支付 70% 匯款月結 30 天',
    salesName: salesName,
    salesPhone: '0912-345-678',
    salesEmail: 'xiaoming.wang@yourcompany.com',
    customerName: '',
    customerContact: '',
    customerPhone: '',
    customerTaxId: '',
    customerEmail: '',
    customerAddress: '',
    items: [
      {
        id: 'item-1',
        name: 'ERP 系統客製化會計報表模組',
        spec: '含財務傳票、進銷存報價功能及自訂版面輸出，高安全權限控管',
        qty: 1,
        unit: '套',
        price: 75000,
        subtotal: 75000,
      },
      {
        id: 'item-2',
        name: '雲端伺服器託管費 (標準型 Enterprise Cloud)',
        spec: '單 CPU, 8G RAM, 100GB SSD, 10Mbps 頻寬 (按月記費)',
        qty: 12,
        unit: '月',
        price: 3600,
        subtotal: 43200,
      }
    ],
    currency: 'TWD',
    discount: 5000,
    taxType: 'TAXABLE',
    remark: '1. 本報價單自發行之日起算有效期 30 天。\n2. 各專案項目交期於收到簽核報價單後 14 個工作天內啟動。\n3. 所有款項需加收 5% 營業稅。',
    status: 'DRAFT'
  };
};
