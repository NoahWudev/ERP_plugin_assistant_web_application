import React from 'react';
import { Quotation } from '../types';
import { calculateQuotationTotals } from '../utils/quotationTotals';
import {
  currencyDisplayCode,
  formatAmount,
  formatMoney,
  normalizeCurrency,
} from '../utils/currency';

interface QuotationPrintProps {
  quotation: Quotation;
}

export default function QuotationPrint({ quotation }: QuotationPrintProps) {
  const totals = calculateQuotationTotals(quotation);
  const currency = normalizeCurrency(quotation.currency);
  const taxLabel =
    quotation.taxType === 'TAXABLE' ? '應稅 (5%)' : 
    quotation.taxType === 'ZERO_TAX' ? '零稅率' : '免稅';

  return (
    <div className="hidden print:block w-[100%] max-w-[800px] mx-auto p-8 bg-white text-black font-sans leading-relaxed text-sm" id="quotation-print-ready">
      {/* Quotation Frame Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-widest text-[#1e293b]#">報 價 單</h1>
        <p className="text-xs text-slate-500 font-mono tracking-wider mt-1">QUOTATION SHEET</p>
      </div>

      {/* Header Info Grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-b-2 border-slate-800 pb-4 mb-4">
        {/* Left Side: Client Info */}
        <div className="space-y-1">
          <div className="text-xs text-slate-500 font-bold border-b border-dashed border-slate-200 pb-1 mb-1">
            客戶資訊 / BUYER DETAILS
          </div>
          <div className="flex">
            <span className="w-20 font-semibold text-slate-700 shrink-0">客戶名稱:</span>
            <span className="font-bold">{quotation.customerName || '(未填寫)'}</span>
          </div>
          <div className="flex">
            <span className="w-20 font-semibold text-slate-700 shrink-0">統一編號:</span>
            <span className="font-mono">{quotation.customerTaxId || '(未填寫)'}</span>
          </div>
          <div className="flex">
            <span className="w-20 font-semibold text-slate-700 shrink-0">聯絡窗口:</span>
            <span>{quotation.customerContact}</span>
          </div>
          <div className="flex">
            <span className="w-20 font-semibold text-slate-700 shrink-0">聯絡電話:</span>
            <span className="font-mono">{quotation.customerPhone}</span>
          </div>
          {quotation.customerAddress && (
            <div className="flex">
              <span className="w-20 font-semibold text-slate-700 shrink-0">客戶地址:</span>
              <span className="text-xs leading-5">{quotation.customerAddress}</span>
            </div>
          )}
        </div>

        {/* Right Side: Quote Details & Sales Info */}
        <div className="space-y-1">
          <div className="text-xs text-slate-500 font-bold border-b border-dashed border-slate-200 pb-1 mb-1">
            報價單號 / QUOTE DETAILS
          </div>
          <div className="flex">
            <span className="w-24 font-semibold text-slate-700 shrink-0">報價單號:</span>
            <span className="font-bold font-mono">{quotation.quotationNo}</span>
          </div>
          <div className="flex">
            <span className="w-24 font-semibold text-slate-700 shrink-0">報價日期:</span>
            <span className="font-mono">{quotation.date}</span>
          </div>
          <div className="flex">
            <span className="w-24 font-semibold text-slate-700 shrink-0">有效期限:</span>
            <span>自報價日起 {quotation.validDays} 天</span>
          </div>
          <div className="flex">
            <span className="w-24 font-semibold text-slate-700 shrink-0">報價幣別:</span>
            <span className="font-mono font-medium">{currencyDisplayCode(currency)}</span>
          </div>
          <div className="flex">
            <span className="w-24 font-semibold text-slate-700 shrink-0">業務人員:</span>
            <span className="font-medium">{quotation.salesName}</span>
          </div>
          {quotation.salesPhone && (
            <div className="flex">
              <span className="w-24 font-semibold text-slate-700 shrink-0">連絡電話:</span>
              <span className="font-mono">{quotation.salesPhone}</span>
            </div>
          )}
          {quotation.salesEmail && (
            <div className="flex">
              <span className="w-24 font-semibold text-slate-700 shrink-0">電子信箱:</span>
              <span className="font-mono text-xs">{quotation.salesEmail}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Terms Row */}
      <div className="bg-slate-50 p-2.5 rounded text-xs mb-4 border border-slate-100 flex items-start gap-2">
        <span className="font-bold text-slate-600 shrink-0">付款條件:</span>
        <span className="text-slate-800">{quotation.paymentTerms || '依合約辦理'}</span>
      </div>

      {/* Items Table */}
      <table className="w-full text-left border-collapse border border-slate-800 mb-6" id="print-items-table">
        <thead>
          <tr className="bg-slate-100 text-xs font-bold border-b border-slate-800 leading-normal">
            <th className="border border-slate-800 p-2 text-center w-8">項</th>
            <th className="border border-slate-800 p-2">品名 / 服務項目</th>
            <th className="border border-slate-800 p-2">規格描述</th>
            <th className="border border-slate-800 p-2 text-center w-12">數量</th>
            <th className="border border-slate-800 p-2 text-center w-10">單位</th>
            <th className="border border-slate-800 p-2 text-right w-20">單價 ({currencyDisplayCode(currency)})</th>
            <th className="border border-slate-800 p-2 text-right w-24">小計 ({currencyDisplayCode(currency)})</th>
          </tr>
        </thead>
        <tbody>
          {quotation.items.map((item, idx) => (
            <tr key={idx} className="text-xs font-serif leading-snug">
              <td className="border border-slate-800 p-2 text-center font-mono">{idx + 1}</td>
              <td className="border border-slate-800 p-2 font-bold font-sans">{item.name}</td>
              <td className="border border-slate-800 p-2 text-slate-600 text-[11px] font-sans">{item.spec || '-'}</td>
              <td className="border border-slate-800 p-2 text-center font-mono">{item.qty}</td>
              <td className="border border-slate-800 p-2 text-center">{item.unit || '個'}</td>
              <td className="border border-slate-800 p-2 text-right font-mono">{formatAmount(item.price, currency)}</td>
              <td className="border border-slate-800 p-2 text-right font-mono">{formatAmount(item.qty * item.price, currency)}</td>
            </tr>
          ))}
          {/* Fill blank lines if the table is small to keep a standard grid size */}
          {quotation.items.length < 5 && 
            Array.from({ length: 5 - quotation.items.length }).map((_, i) => (
              <tr key={`blank-${i}`} className="h-6">
                <td className="border border-slate-800 p-1"></td>
                <td className="border border-slate-800 p-1"></td>
                <td className="border border-slate-800 p-1"></td>
                <td className="border border-slate-800 p-1"></td>
                <td className="border border-slate-800 p-1"></td>
                <td className="border border-slate-800 p-1"></td>
                <td className="border border-slate-800 p-1"></td>
              </tr>
            ))
          }
        </tbody>
      </table>

      {/* Totals and Footnotes Summary */}
      <div className="grid grid-cols-12 gap-4 mb-8">
        {/* Footnotes left */}
        <div className="col-span-7 bg-slate-50 p-3 rounded border border-slate-100 text-[11px] text-slate-700">
          <div className="font-bold text-slate-800 mb-1">【說明暨約定條款】</div>
          <div className="whitespace-pre-line leading-relaxed">
            {quotation.remark || '無。'}
          </div>
        </div>

        {/* Totals table right */}
        <div className="col-span-5 text-xs text-slate-800 self-start">
          <div className="border border-slate-805 rounded overflow-hidden">
            <div className="flex justify-between border-b border-slate-200 p-2">
              <span className="font-semibold text-slate-500">合計分計 (Subtotal):</span>
              <span className="font-mono">{formatAmount(totals.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 p-2 text-rose-600">
              <span className="font-semibold">折扣折讓 (Discount):</span>
              <span className="font-mono">-{formatAmount(totals.discount, currency)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 p-2">
              <span className="font-semibold text-slate-500">營業稅別 ({taxLabel}):</span>
              <span className="font-mono">{formatAmount(totals.tax, currency)}</span>
            </div>
            <div className="flex justify-between bg-zinc-800 text-white font-bold p-2 text-sm">
              <span>報價總計 (Grand Total):</span>
              <span className="font-mono text-emerald-300 font-bold">{formatMoney(totals.grandTotal, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Grid */}
      <div className="grid grid-cols-3 gap-4 text-center mt-12 text-xs">
        <div>
          <div className="border-b border-slate-800 h-10 w-40 mx-auto"></div>
          <p className="mt-2 text-slate-500 font-medium">業務經辦</p>
        </div>
        <div>
          <div className="border-b border-slate-800 h-10 w-40 mx-auto"></div>
          <p className="mt-2 text-slate-500 font-medium">核決主管</p>
        </div>
        <div>
          <div className="border-b border-slate-800 h-10 w-40 mx-auto"></div>
          <p className="mt-2 text-slate-500 font-medium">客戶簽章 (請簽認回傳)</p>
        </div>
      </div>
    </div>
  );
}
