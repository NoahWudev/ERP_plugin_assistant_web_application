import React from 'react';
import { Quotation } from '../types';
import { FileText, Trash, RefreshCw, Calendar, FileClock } from 'lucide-react';
import { calculateQuotationTotals } from '../utils/quotationTotals';

interface DraftListProps {
  drafts: Quotation[];
  onLoadDraft: (draft: Quotation) => void;
  onDeleteDraft: (id: string) => void;
  /** 嵌入外層卡片時省略獨立外框與標題 */
  embedded?: boolean;
}

export default function DraftList({ drafts, onLoadDraft, onDeleteDraft, embedded = false }: DraftListProps) {
  return (
    <div
      className={
        embedded
          ? 'flex flex-col flex-1 min-h-0 h-full'
          : 'bg-white border border-slate-100 rounded-2xl shadow-xs p-5 flex flex-col h-full min-h-[300px]'
      }
      id="draft-list-container"
    >
      {!embedded && (
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <FileClock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-base">暫存草稿箱</h3>
          <p className="text-xs text-slate-400">登打進度自動儲存於此，點選可載入</p>
        </div>
      </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-2 pr-1">
        {drafts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">目前沒有暫存的報價單草稿</p>
            <p className="text-[10px] text-slate-300 mt-1">
              當您編輯報價單並按「儲存草稿」後，會暫存於此。
            </p>
          </div>
        ) : (
          drafts.map((draft) => {
            const totals = calculateQuotationTotals(draft);
            return (
              <div
                key={draft.id}
                className="p-3 bg-slate-50/40 border border-slate-100 hover:border-blue-200 rounded-xl flex items-center justify-between gap-3 group transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {draft.quotationNo}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {draft.date}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium truncate mt-1">
                    {draft.customerName || '未指定客戶名稱'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-medium text-slate-400">
                      品項: {draft.items.length} 筆
                    </span>
                    <span className="text-blue-600 font-mono font-bold text-xs">
                      ${totals.grandTotal.toLocaleString()} 元
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title="載入此草稿"
                    onClick={() => onLoadDraft(draft)}
                    className="p-1 px-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    載入
                  </button>

                  <button
                    type="button"
                    title="刪除"
                    onClick={() => onDeleteDraft(draft.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs hover:text-rose-700 md:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer duration-200"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
