import * as XLSX from 'xlsx';
import { Quotation, QuotationItem } from '../types';

export function calculateQuotationTotals(quotation: Quotation) {
  const subtotal = quotation.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
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
    grandTotal
  };
}

export function exportQuotationToExcel(quotation: Quotation) {
  const totals = calculateQuotationTotals(quotation);
  const taxLabel = 
    quotation.taxType === 'TAXABLE' ? '應稅 (5%)' : 
    quotation.taxType === 'ZERO_TAX' ? '零稅率' : '免稅';

  // 1. Prepare raw data rows
  const headerData = [
    ['報價單 (Quotation Sheet)', '', '', '', '', '', ''],
    ['報價單號:', quotation.quotationNo, '', '', '報價日期:', quotation.date, ''],
    ['有效期限:', `報價日起 ${quotation.validDays} 天`, '', '', '業務人員:', quotation.salesName, ''],
    ['付款條件:', quotation.paymentTerms, '', '', '業務電話/Email:', `${quotation.salesPhone || ''} ${quotation.salesEmail || ''}`, ''],
    [], // Blank Row
    ['客戶資訊:', '', '', '', '', '', ''],
    ['客戶名稱:', quotation.customerName, '', '', '聯絡窗口:', quotation.customerContact, ''],
    ['統一編號:', quotation.customerTaxId, '', '', '聯絡電話:', quotation.customerPhone, ''],
    ['客戶地址:', quotation.customerAddress || '無', '', '', '客戶電郵:', quotation.customerEmail || '無', ''],
    [], // Blank Row
    ['品名 (Item Name)', '規格 (Specification)', '數量 (Qty)', '單位 (Unit)', '單價 (Unit Price)', '金額 (Amount)', '備註 (Remark)'], // Header Row (index 10)
  ];

  const itemRows = quotation.items.map((item, index) => [
    item.name,
    item.spec || '-',
    item.qty,
    item.unit || '個',
    item.price,
    item.qty * item.price,
    item.remark || ''
  ]);

  const footers = [
    [],
    ['備註欄:', quotation.remark || '無額外備註。', '', '', '合計金額 (Subtotal):', totals.subtotal, ''],
    ['', '', '', '', '折扣金額 (Discount):', totals.discount, ''],
    ['', '', '', '', `營業稅別 (${taxLabel}):`, totals.tax, ''],
    ['', '', '', '', '報價總計 (Grand Total):', totals.grandTotal, '']
  ];

  // Combine rows
  const allRows = [...headerData, ...itemRows, ...footers];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths (approximate characters)
  const colWidths = [
    { wch: 25 }, // 品名 / 客戶名稱
    { wch: 25 }, // 規格 / 單號
    { wch: 10 }, // 數量
    { wch: 8 },  // 單位
    { wch: 12 }, // 單價
    { wch: 15 }, // 金額 / 小計
    { wch: 25 }  // 備註 / 付款條件
  ];
  worksheet['!cols'] = colWidths;

  // Add some simple styling bounds (using merges for layout)
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Main title row
    { s: { r: 5, c: 0 }, e: { r: 5, c: 2 } }, // Client summary header
    { s: { r: 12 + itemRows.length, c: 1 }, e: { r: 15 + itemRows.length, c: 3 } } // Remarks block merge
  ];
  worksheet['!merges'] = merges;

  // Create workbook and write file
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '報價單');

  // Trigger download
  const fileName = `${quotation.date}_${quotation.customerName.replace(/[\/\\?%*:|"<>\s]/g, '_')}_報價單_${quotation.quotationNo}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
