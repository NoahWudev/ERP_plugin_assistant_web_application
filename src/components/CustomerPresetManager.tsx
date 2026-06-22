import React, { useState } from 'react';
import { CustomerPreset } from '../types';
import { Plus, Trash, Search, ArrowRight, BookOpen, Check, X } from 'lucide-react';

interface CustomerPresetManagerProps {
  presets: CustomerPreset[];
  onSelect: (customer: CustomerPreset) => void;
  onAdd: (newCustomer: Omit<CustomerPreset, 'id'>) => void;
  onDelete: (id: string) => void;
  selectedCustomerId?: string;
  /** 嵌入外層卡片時省略獨立外框與標題 */
  embedded?: boolean;
}

export default function CustomerPresetManager({
  presets,
  onSelect,
  onAdd,
  onDelete,
  selectedCustomerId,
  embedded = false,
}: CustomerPresetManagerProps) {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // New Customer Form State
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');

  const filteredPresets = presets.filter(
    (p) =>
      p.companyName.toLowerCase().includes(search.toLowerCase()) ||
      p.contactName.toLowerCase().includes(search.toLowerCase()) ||
      p.taxId.includes(search)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    onAdd({
      companyName,
      contactName,
      phone,
      email,
      taxId,
      address,
    });

    // Reset Form
    setCompanyName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setTaxId('');
    setAddress('');
    setIsAdding(false);
  };

  return (
    <div
      className={
        embedded
          ? 'flex flex-col flex-1 min-h-0 h-full'
          : 'bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden p-5 flex flex-col h-full min-h-[400px]'
      }
      id="customer-preset-manager"
    >
      {!embedded && (
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-base">常用客戶名單</h3>
            <p className="text-xs text-slate-400">點擊即自動代入報價單欄位</p>
          </div>
        </div>

        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            id="btn-add-customer-form"
          >
            <Plus className="w-3.5 h-3.5" />
            新增客戶
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            id="btn-close-customer-form"
          >
            <X className="w-3.5 h-3.5" />
            取消
          </button>
        )}
      </div>
      )}

      {isAdding ? (
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100 animate-fadeIn flex-1 min-h-0 overflow-y-auto" id="add-customer-form">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">客戶公司全稱 *</label>
              <input
                type="text"
                required
                placeholder="例如：台積科系統股份有限公司"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">統一編號</label>
              <input
                type="text"
                placeholder="8位數字"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">聯絡窗口 *</label>
              <input
                type="text"
                required
                placeholder="姓名、職稱"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">聯絡電話 *</label>
              <input
                type="text"
                required
                placeholder="市話、分機或手機"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">電子信箱</label>
              <input
                type="email"
                placeholder="client@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">客戶地址</label>
              <input
                type="text"
                placeholder="發票或營業地址"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              儲存客戶
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className={`shrink-0 mb-3 ${embedded ? 'flex items-center gap-2' : ''}`}>
            <div className={`relative ${embedded ? 'flex-1 min-w-0' : ''}`}>
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋公司名 / 統一編號 / 聯絡窗口..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                id="inp-search-customers"
              />
            </div>
            {embedded && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
                id="btn-add-customer-form"
              >
                <Plus className="w-3.5 h-3.5" />
                新增客戶
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-2 pr-1">
            {filteredPresets.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                無相符的客戶名單。您可以點按上方「新增客戶」自行建立！
              </div>
            ) : (
              filteredPresets.map((customer) => {
                const isSelected = selectedCustomerId === customer.id;
                const isProtectedPreset = ['c1', 'c2', 'c3', 'c4'].includes(customer.id);
                return (
                  <div
                    key={customer.id}
                    className={`p-3 rounded-xl border transition-all text-left group ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-slate-100 hover:border-indigo-100 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-slate-800 truncate block">
                            {customer.companyName}
                          </span>
                          {customer.taxId && (
                            <span className="shrink-0 bg-slate-100 text-slate-500 scale-90 px-1.5 py-0.5 rounded text-[10px] font-mono">
                              統編 {customer.taxId}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1 text-[11px] text-slate-400">
                          <div>
                            窗口: <strong className="text-slate-600 font-medium">{customer.contactName}</strong> 
                            <span className="mx-1">|</span> {customer.phone}
                          </div>
                          {customer.address && (
                            <div className="truncate">地址: {customer.address}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title="套用客戶至報價單"
                          onClick={() => onSelect(customer)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
                          }`}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          title="刪除"
                          onClick={() => onDelete(customer.id)}
                          disabled={isProtectedPreset}
                          tabIndex={isProtectedPreset ? -1 : 0}
                          className={`p-1.5 rounded-lg transition-all duration-200 ${
                            isProtectedPreset
                              ? 'invisible pointer-events-none'
                              : 'text-rose-500 hover:bg-rose-50 hover:text-rose-700 opacity-0 group-hover:opacity-100 cursor-pointer'
                          }`}
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
