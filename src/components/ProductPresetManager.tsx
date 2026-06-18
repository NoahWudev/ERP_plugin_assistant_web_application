import React, { useState } from 'react';
import { ProductPreset } from '../types';
import { Plus, Trash, Search, ArrowRight, Package, Check, X } from 'lucide-react';

interface ProductPresetManagerProps {
  presets: ProductPreset[];
  onAddProductToQuote: (product: ProductPreset, customQty: number) => void;
  onAddPreset: (newProduct: Omit<ProductPreset, 'id'>) => void;
  onDeletePreset: (id: string) => void;
}

export default function ProductPresetManager({
  presets,
  onAddProductToQuote,
  onAddPreset,
  onDeletePreset,
}: ProductPresetManagerProps) {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  
  // New Product Preset Form State
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState<number | ''>('');

  const filteredPresets = presets.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.spec.toLowerCase().includes(search.toLowerCase())
  );

  const handleQtyChange = (id: string, value: number) => {
    setQtys(prev => ({
      ...prev,
      [id]: Math.max(1, value)
    }));
  };

  const getQty = (id: string) => qtys[id] || 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === '') return;

    onAddPreset({
      name,
      spec,
      unit: unit || '個',
      price: Number(price) || 0,
    });

    // Reset Form
    setName('');
    setSpec('');
    setUnit('');
    setPrice('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden p-5 flex flex-col h-full min-h-[400px]" id="product-preset-manager">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-base">常用產品與服務</h3>
            <p className="text-xs text-slate-400">快速填入數量、新增至報價清單</p>
          </div>
        </div>

        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            id="btn-add-product-preset-form"
          >
            <Plus className="w-3.5 h-3.5" />
            新增品項
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            id="btn-close-product-preset-form"
          >
            <X className="w-3.5 h-3.5" />
            取消
          </button>
        )}
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100 animate-fadeIn" id="add-product-preset-form">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">品名 / 服務項目 *</label>
              <input
                type="text"
                required
                placeholder="例如：雲端資料庫升級方案"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">規格描述 (Specification)</label>
              <textarea
                placeholder="例如：100GB 獨立空間, 支援每日異地備份"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                rows={2}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">單位 *</label>
                <input
                  type="text"
                  required
                  placeholder="如：個、月、套、小時"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">標準單價 (TWD) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="12000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              儲存品項
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋品名、規格等關鍵字..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
              id="inp-search-products"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[350px]">
            {filteredPresets.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                無相符的產品或服務。您可以點按上方「新增品項」自行建立！
              </div>
            ) : (
              filteredPresets.map((product) => {
                const qty = getQty(product.id);
                return (
                  <div
                    key={product.id}
                    className="p-3 bg-white hover:bg-slate-50/50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-800 truncate">
                        {product.name}
                      </div>
                      {product.spec && (
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {product.spec}
                        </div>
                      )}
                      <div className="flex items-center mt-1 gap-2">
                        <span className="font-mono text-emerald-600 font-bold text-xs">
                          ${product.price.toLocaleString()} 元
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 scale-95 px-1.5 py-0.2 rounded shrink-0">
                          單位: {product.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {/* Qty field */}
                      <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(product.id, qty - 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-500 hover:bg-slate-200 rounded transition-colors text-xs font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={qty}
                          onChange={(e) => handleQtyChange(product.id, parseInt(e.target.value) || 1)}
                          className="w-8 text-center text-xs bg-transparent focus:outline-none focus:border-0 font-medium font-mono p-0"
                        />
                        <button
                          type="button"
                          onClick={() => handleQtyChange(product.id, qty + 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-500 hover:bg-slate-200 rounded transition-colors text-xs font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Add button */}
                      <button
                        type="button"
                        title="新增品項至報價單"
                        onClick={() => {
                          onAddProductToQuote(product, qty);
                          // Reset qty counter
                          setQtys(prev => ({ ...prev, [product.id]: 1 }));
                        }}
                        className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 text-[11px] font-medium shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                      >
                        加入
                        <ArrowRight className="w-3" />
                      </button>

                      {/* Delete option for custom product catalog presets (anything except initial hardcoded ones p1..p8) */}
                      {!['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'].includes(product.id) && (
                        <button
                          type="button"
                          title="刪除"
                          onClick={() => onDeletePreset(product.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer duration-200"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
