import { Quotation, QuotationItem } from '../types';
import type XlsxPopulateType from 'xlsx-populate';
import { calculateQuotationTotals } from './quotationTotals';
import {
  COLUMN_D_NUMBER,
  COLUMN_D_WIDTH,
  patchColumnWidthInXlsx,
} from './xlsxColumnWidth.mjs';

const TEMPLATE_URL = '/templates/quotation-template.xlsx';
const ITEM_START_ROW = 11;
const ITEM_END_ROW = 27;
const MAX_ITEMS = ITEM_END_ROW - ITEM_START_ROW + 1;
const DEFAULT_ROW_HEIGHT = 15;
const ROW_HEIGHT_PER_LINE = 15;

const HEADER_CELLS = {
  customerName: 'B4',
  customerTaxId: 'B5',
  customerContact: 'B6',
  customerAddress: 'B7',
  customerPhone: 'B8',
  customerFax: 'B9',
  date: 'E4',
  quotationNo: 'E5',
  currency: 'E6',
  paymentTerms: 'E7',
  salesName: 'E8',
  remark: 'B28',
} as const;

const FOOTER_CELLS = {
  subtotal: 'F28',
  tax: 'F29',
  grandTotal: 'F30',
} as const;

type TemplateSheet = ReturnType<Awaited<ReturnType<typeof XlsxPopulateType.fromDataAsync>>['sheet']>;

async function loadXlsxPopulate() {
  const { Buffer } = await import('buffer');
  // Minimal Node.js shims for browser-only usage.
  const globalScope = globalThis as typeof globalThis & {
    Buffer?: typeof Buffer;
    process?: any;
  };

  if (!globalScope.Buffer) {
    globalScope.Buffer = Buffer;
  }

  if (!globalScope.process) {
    globalScope.process = {
      env: {},
      nextTick: (cb: (...args: unknown[]) => void, ...args: unknown[]) => {
        Promise.resolve().then(() => cb(...args));
      },
    };
  }

  const mod = await import('xlsx-populate');
  return mod.default;
}

function formatItemDescription(item: QuotationItem): string {
  const lines = [item.name];
  if (item.spec?.trim()) lines.push(item.spec.trim());
  if (item.unit?.trim() && item.unit !== '個') lines.push(`單位：${item.unit}`);
  if (item.remark?.trim()) lines.push(item.remark.trim());
  return lines.join('\n');
}

function applyColumnWidths(sheet: TemplateSheet) {
  sheet.column(COLUMN_D_NUMBER).width(COLUMN_D_WIDTH);
}

function getColumnWidth(sheet: TemplateSheet, column: string): number {
  const width = sheet.column(column).width();
  return typeof width === 'number' && width > 0 ? width : 8.43;
}

function getMergedColumnWidth(sheet: TemplateSheet, columns: string[]): number {
  return columns.reduce((sum, column) => sum + getColumnWidth(sheet, column), 0);
}

function estimateVisualUnits(text: string): number {
  return [...text].reduce((sum, char) => {
    const code = char.codePointAt(0) ?? 0;
    return sum + (code > 255 ? 2 : 1);
  }, 0);
}

function estimateLineCount(text: string, columnWidth: number): number {
  if (!text.trim()) return 1;

  const usableWidth = Math.max(columnWidth - 1, 1);
  return text.split('\n').reduce((lineCount, paragraph) => {
    const units = estimateVisualUnits(paragraph);
    return lineCount + Math.max(1, Math.ceil(units / usableWidth));
  }, 0);
}

function lineCountToRowHeight(lineCount: number): number {
  return Math.max(DEFAULT_ROW_HEIGHT, lineCount * ROW_HEIGHT_PER_LINE);
}

function setRowHeight(sheet: TemplateSheet, row: number, height: number) {
  sheet.row(row).height(height);
}

function clearRowHeight(sheet: TemplateSheet, row: number) {
  sheet.row(row).height(null);
}

function ensureWrapText(sheet: TemplateSheet, address: string) {
  const cell = sheet.cell(address);
  if (!cell.style('wrapText')) {
    cell.style('wrapText', true);
  }
}

function applyAutoRowHeights(sheet: TemplateSheet, quotation: Quotation) {
  const itemTextWidth = getMergedColumnWidth(sheet, ['B', 'C']);
  const remarkTextWidth = getMergedColumnWidth(sheet, ['B', 'C', 'D']);

  quotation.items.forEach((item, index) => {
    const row = ITEM_START_ROW + index;
    const description = formatItemDescription(item);
    ensureWrapText(sheet, `B${row}`);
    setRowHeight(sheet, row, lineCountToRowHeight(estimateLineCount(description, itemTextWidth)));
  });

  for (let row = ITEM_START_ROW + quotation.items.length; row <= ITEM_END_ROW; row++) {
    clearRowHeight(sheet, row);
  }

  const remarkText = sheet.cell(HEADER_CELLS.remark).value();
  if (typeof remarkText === 'string' && remarkText.trim()) {
    ensureWrapText(sheet, HEADER_CELLS.remark);
    const totalRemarkHeight = lineCountToRowHeight(estimateLineCount(remarkText, remarkTextWidth));
    const remarkRows = [28, 29, 30];
    const baseHeight = DEFAULT_ROW_HEIGHT;
    const extraHeight = Math.max(0, totalRemarkHeight - baseHeight * remarkRows.length);
    setRowHeight(sheet, remarkRows[0], baseHeight + extraHeight);
    for (const row of remarkRows.slice(1)) {
      setRowHeight(sheet, row, baseHeight);
    }
  }
}

function clearItemArea(sheet: TemplateSheet) {
  for (let row = ITEM_START_ROW; row <= ITEM_END_ROW; row++) {
    sheet.cell(`A${row}`).clear();
    sheet.cell(`B${row}`).clear();
    sheet.cell(`D${row}`).clear();
    sheet.cell(`E${row}`).clear();
    sheet.cell(`F${row}`).clear();
  }
}

function fillHeaderCells(sheet: TemplateSheet, quotation: Quotation) {
  sheet.cell(HEADER_CELLS.customerName).value(quotation.customerName);
  sheet.cell(HEADER_CELLS.customerTaxId).value(quotation.customerTaxId || '');
  sheet.cell(HEADER_CELLS.customerContact).value(quotation.customerContact || '');
  sheet.cell(HEADER_CELLS.customerAddress).value(quotation.customerAddress || '');
  sheet.cell(HEADER_CELLS.customerPhone).value(quotation.customerPhone || '');
  sheet.cell(HEADER_CELLS.customerFax).value('');
  sheet.cell(HEADER_CELLS.date).value(new Date(`${quotation.date}T00:00:00`));
  sheet.cell(HEADER_CELLS.quotationNo).value(quotation.quotationNo);
  sheet.cell(HEADER_CELLS.currency).value('NT');
  sheet.cell(HEADER_CELLS.paymentTerms).value(quotation.paymentTerms || '');
  sheet.cell(HEADER_CELLS.salesName).value(quotation.salesName || '');
}

function fillItemRows(sheet: TemplateSheet, quotation: Quotation) {
  quotation.items.forEach((item, index) => {
    const row = ITEM_START_ROW + index;
    sheet.cell(`A${row}`).value(index + 1);
    sheet.cell(`B${row}`).value(formatItemDescription(item));
    sheet.cell(`D${row}`).value(item.qty);
    sheet.cell(`E${row}`).value(item.price);
    sheet.cell(`F${row}`).value(item.qty * item.price);
  });
}

function fillFooterCells(sheet: TemplateSheet, quotation: Quotation) {
  const totals = calculateQuotationTotals(quotation);
  const remarkLines = [quotation.remark?.trim() || ''];
  if (totals.discount > 0) {
    remarkLines.push(`折扣金額：${totals.discount}`);
  }
  if (quotation.taxType === 'ZERO_TAX') {
    remarkLines.push('營業稅別：零稅率');
  } else if (quotation.taxType === 'TAX_FREE') {
    remarkLines.push('營業稅別：免稅');
  }

  sheet.cell(HEADER_CELLS.remark).value(remarkLines.filter(Boolean).join('\n'));
  sheet.cell(FOOTER_CELLS.subtotal).value(totals.taxableAmount);
  sheet.cell(FOOTER_CELLS.tax).value(totals.tax);
  sheet.cell(FOOTER_CELLS.grandTotal).value(totals.grandTotal);
}

function buildFileName(quotation: Quotation) {
  const safeCustomer = quotation.customerName.replace(/[/\\?%*:|"<>\s]/g, '_');
  return `${quotation.date}_${safeCustomer}_報價單_${quotation.quotationNo}.xlsx`;
}

function triggerDownload(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportQuotationToExcel(quotation: Quotation) {
  if (quotation.items.length > MAX_ITEMS) {
    throw new Error(`品項最多 ${MAX_ITEMS} 筆，請精簡後再匯出。`);
  }

  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error('無法載入報價單公版，請確認模板檔案是否存在。');
  }

  const XlsxPopulate = await loadXlsxPopulate();
  const workbook = await XlsxPopulate.fromDataAsync(await response.arrayBuffer());
  const sheet = workbook.sheet(0);

  clearItemArea(sheet);
  fillHeaderCells(sheet, quotation);
  fillItemRows(sheet, quotation);
  fillFooterCells(sheet, quotation);
  applyAutoRowHeights(sheet, quotation);
  applyColumnWidths(sheet);

  let buffer = await workbook.outputAsync();
  buffer = await patchColumnWidthInXlsx(buffer, COLUMN_D_NUMBER, COLUMN_D_WIDTH);
  triggerDownload(buffer, buildFileName(quotation));
}
