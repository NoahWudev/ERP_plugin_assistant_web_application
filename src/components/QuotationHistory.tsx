import React, { useState } from 'react';
import { Quotation, TaxType, QuotationItem } from '../types';
import { 
  Search, Edit3, Trash2, FileSpreadsheet, Printer, Calendar, User, 
  Building, CheckCircle2, AlertTriangle, FileText, ChevronRight, TrendingUp, Info
} from 'lucide-react';
import { calculateQuotationTotals } from '../utils/excel';

interface QuotationHistoryProps {
  history: Quotation[];
  onLoadForEdit: (quote: Quotation) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: Quotation['status']) => void;
  onExportExcel: (quote: Quotation) => void;
}

export default function QuotationHistory({
  history,
  onLoadForEdit,
  onDelete,
  onUpdateStatus,
  onExportExcel,
}: QuotationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter logic
  const filteredList = history.filter((quote) => {
    const matchesSearch = 
      quote.quotationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quote.salesName && quote.salesName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || quote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalCount = history.length;
  const grandSum = history.reduce((sum, item) => {
    const totals = calculateQuotationTotals(item);
    return sum + (item.status === 'REJECTED' ? 0 : totals.grandTotal);
  }, 0);

  const pendingCount = history.filter(q => q.status === 'SENT').length;
  const acceptedCount = history.filter(q => q.status === 'ACCEPTED').length;

  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            暫存草稿
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded-md text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            已發送
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-md text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            客戶接受
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-2 py-1 rounded-md text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            已作廢
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="quotation-history-page">
      
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">總累計報價數</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono block mt-0.5">{totalCount} 筆</span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">合計報價總金額</span>
            <span className="text-xl font-extrabold text-emerald-600 font-mono block mt-0.5">
              ${grandSum.toLocaleString()} 元
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">交涉中 / 待確認</span>
            <span className="text-xl font-extrabold text-amber-600 font-mono block mt-0.5">{pendingCount} 筆</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">已結案成立</span>
            <span className="text-xl font-extrabold text-indigo-600 font-mono block mt-0.5">{acceptedCount} 筆</span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Structure & Search Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden">
        
        {/* Banner with filters */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">歷史報價存檔總覽</h3>
            <p className="text-xs text-slate-400">當客戶回報需求需要調整時，點擊「載入調整」即可直接拉回主編輯頁重算並產生新報價單。</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋單號 / 客戶名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs w-48 focus:w-60 focus:border-indigo-500 focus:outline-none transition-all"
                id="search-history-input"
              />
            </div>

            {/* Status Select filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:border-indigo-500 focus:outline-none cursor-pointer text-slate-600 font-semibold"
            >
              <option value="ALL">所有狀態 (All)</option>
              <option value="DRAFT">暫存草稿 (Draft)</option>
              <option value="SENT">已發送客戶 (Sent)</option>
              <option value="ACCEPTED">客戶接受成立 (Accepted)</option>
              <option value="REJECTED">已作廢 (Rejected)</option>
            </select>
          </div>
        </div>

        {/* History Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100">
                <th className="p-4 w-32">報價單號</th>
                <th className="p-4 w-28">報價日期</th>
                <th className="p-4">採購客戶名稱</th>
                <th className="p-4 text-right w-32">報價總計 (含稅)</th>
                <th className="p-4 text-center w-28">當前階段</th>
                <th className="p-4 text-center w-36">變更狀態</th>
                <th className="p-4 text-center w-40">調閱動作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">無任何相符的報價單紀錄</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      您可以切換到「新增暨編輯報價單」，填好內容後按下「儲存本單」以建檔。
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((quote) => {
                  const totals = calculateQuotationTotals(quote);
                  return (
                    <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                      
                      {/* Quotation Number */}
                      <td className="p-4 font-mono font-bold text-slate-700">
                        {quote.quotationNo}
                      </td>

                      {/* Date */}
                      <td className="p-4 font-mono text-slate-500 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          {quote.date}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm leading-tight">
                          {quote.customerName || '(未填寫客戶公司)'}
                        </div>
                        <div className="flex gap-2 text-[10px] text-slate-400 mt-1">
                          <span>窗口: {quote.customerContact || '未填'}</span>
                          <span>|</span>
                          <span>業務: {quote.salesName}</span>
                        </div>
                      </td>

                      {/* Total value */}
                      <td className="p-4 text-right font-mono font-extrabold text-sm text-indigo-600">
                        ${totals.grandTotal.toLocaleString()} TWD
                      </td>

                      {/* Status Tag */}
                      <td className="p-4 text-center">
                        {getStatusBadge(quote.status)}
                      </td>

                      {/* Status Selector */}
                      <td className="p-4 text-center border-l border-slate-50">
                        <select
                          value={quote.status}
                          onChange={(e) => onUpdateStatus(quote.id, e.target.value as Quotation['status'])}
                          className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-700 font-semibold w-28"
                        >
                          <option value="DRAFT">變更為 暫存草稿</option>
                          <option value="SENT">變更為 已發送</option>
                          <option value="ACCEPTED">變更為 客戶接受</option>
                          <option value="REJECTED">變更為 已作廢</option>
                        </select>
                      </td>

                      {/* Quick Action buttons */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          <button
                            type="button"
                            onClick={() => onLoadForEdit(quote)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-[11px] font-bold transition-all shadow-3xs cursor-pointer"
                            title="將此單載入左側編輯面板，可重新微調與儲存"
                          >
                            <Edit3 className="w-3 h-3" />
                            載入調整
                          </button>

                          <button
                            type="button"
                            onClick={() => onExportExcel(quote)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="匯出此單為 Excel 表格"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('核對：確定要徹底從系統歷史保留中移此單據嗎？（此動作不可逆）')) {
                                onDelete(quote.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg hover:text-rose-700 transition-colors cursor-pointer"
                            title="刪除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Guidance */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <span><b>小撇步：</b>歷史報價單內建 local 原生同步，即便在沒有資料庫的離線狀態或瀏覽器被無意關閉，您的登打清單也會保存在此。</span>
        </div>

      </div>

    </div>
  );
}
