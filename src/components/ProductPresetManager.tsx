import React, { useEffect, useState } from 'react';
import { ErpProduct } from '../types';
import { searchErpProducts } from '../utils/erpProducts';
import { Plus, Search, ArrowRight, Package, Loader2, AlertCircle } from 'lucide-react';

interface ProductPresetManagerProps {
  onAddProductToQuote: (product: ErpProduct, customQty: number) => void;
  /** 嵌入外層卡片時省略獨立外框與標題 */
  embedded?: boolean;
}

export default function ProductPresetManager({
  onAddProductToQuote,
  embedded = false,
}: ProductPresetManagerProps) {
  const [search, setSearch] = useState('');
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [results, setResults] = useState<ErpProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const keyword = search.trim();
    if (!keyword) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      void searchErpProducts(keyword, 20)
        .then((items) => {
          setResults(items);
          setError(null);
        })
        .catch((err: unknown) => {
          setResults([]);
          setError(err instanceof Error ? err.message : '搜尋凌越貨品失敗');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleQtyChange = (skuNo: string, value: number) => {
    setQtys((prev) => ({
      ...prev,
      [skuNo]: Math.max(1, value),
    }));
  };

  const getQty = (skuNo: string) => qtys[skuNo] || 1;

  return (
    <div
      className={
        embedded
          ? 'flex flex-col flex-1 min-h-0 h-full'
          : 'bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden p-5 flex flex-col h-full min-h-[400px]'
      }
      id="product-preset-manager"
    >
      {!embedded && (
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">凌越貨品搜尋</h3>
              <p className="text-xs text-slate-400">輸入品號或品名，加入報價清單（單價請於左側自行填寫）</p>
            </div>
          </div>
        </div>
      )}

      <div className={`shrink-0 mb-3 ${embedded ? '' : ''}`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="搜尋凌越品號、品名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
            id="inp-search-erp-products"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          資料來源：凌越 ERP 貨品主檔（000000），不含歷史報價單價
        </p>
      </div>

      {error && (
        <div className="shrink-0 mb-3 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            正在查詢凌越貨品...
          </div>
        ) : !search.trim() ? (
          <div className="text-center py-8 text-xs text-slate-400">
            請輸入品號或品名關鍵字，從凌越 ERP 搜尋貨品
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            找不到相符的凌越貨品，請換個關鍵字試試
          </div>
        ) : (
          results.map((product) => {
            const qty = getQty(product.skuNo);
            return (
              <div
                key={product.skuNo}
                className="p-3 bg-white hover:bg-slate-50/50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-slate-800 truncate">
                    {product.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                    品號：{product.skuNo}
                  </div>
                  {product.spec && (
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                      {product.spec}
                    </div>
                  )}
                  <div className="flex items-center mt-1 gap-2">
                    <span className="text-[10px] bg-slate-100 text-slate-500 scale-95 px-1.5 py-0.2 rounded shrink-0">
                      單位: {product.unit}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(product.skuNo, qty - 1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-500 hover:bg-slate-200 rounded transition-colors text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => handleQtyChange(product.skuNo, parseInt(e.target.value, 10) || 1)}
                      className="w-8 text-center text-xs bg-transparent focus:outline-none focus:border-0 font-medium font-mono p-0"
                    />
                    <button
                      type="button"
                      onClick={() => handleQtyChange(product.skuNo, qty + 1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-500 hover:bg-slate-200 rounded transition-colors text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    title="新增品項至報價單"
                    onClick={() => {
                      onAddProductToQuote(product, qty);
                      setQtys((prev) => ({ ...prev, [product.skuNo]: 1 }));
                    }}
                    className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 text-[11px] font-medium shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                  >
                    加入
                    <ArrowRight className="w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!embedded && (
        <div className="shrink-0 pt-3 mt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1">
          <Plus className="w-3 h-3" />
          加入後請於報價清單自行輸入單價
        </div>
      )}
    </div>
  );
}
