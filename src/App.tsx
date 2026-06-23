/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Quotation, QuotationItem, CustomerPreset, ErpProduct, TaxType, QuotationCurrency } from './types';
import { 
  Plus, Trash, ArrowUp, ArrowDown, Save, FileSpreadsheet, Printer, 
  RotateCcw, Building, FileText, Check, PlusCircle, 
  AlertCircle, Phone, Mail, User, MapPin, Hash, Calendar, 
  HelpCircle, Info, ChevronRight, Contact, DollarSign, Edit3, FolderOpen, LogOut, Shield
} from 'lucide-react';
import { exportQuotationToExcel } from './utils/excel';
import { calculateQuotationTotals } from './utils/quotationTotals';
import { currencyLabel, formatMoney, normalizeQuotation } from './utils/currency';
import { 
  DEFAULT_QUOTATION_TEMPLATE, generateQuotationNo 
} from './utils/presets';
import {
  clearLegacyLocalStorage,
  createCustomerPreset,
  createQuotation,
  deleteCustomerPreset,
  deleteQuotation,
  fetchCustomerPresets,
  fetchQuotations,
  hasLegacyLocalStorage,
  migrateLocalStorage,
  readLegacyLocalStorage,
  updateQuotation,
} from './utils/quotationApi';
import { useAuth } from './contexts/AuthContext';
import CustomerPresetManager from './components/CustomerPresetManager';
import ErpProductSearch from './components/ErpProductSearch';
import ProductAutocomplete from './components/ProductAutocomplete';
import DraftList from './components/DraftList';
import QuotationPrint from './components/QuotationPrint';
import QuotationHistory from './components/QuotationHistory';

/** 品項表格預設可視高度（約先前一半） */
const ITEMS_TABLE_DEFAULT_HEIGHT = 200;
const ITEMS_TABLE_ROW_HEIGHT = 46;
const ITEMS_TABLE_HEAD_HEIGHT = 42;
const ITEMS_TABLE_MAX_HEIGHT = 460;
const ITEMS_TABLE_DEFAULT_VISIBLE_ROWS = 3;

function getItemsTableScrollHeight(itemCount: number): number {
  if (itemCount === 0) return ITEMS_TABLE_DEFAULT_HEIGHT;
  const contentHeight = ITEMS_TABLE_HEAD_HEIGHT + itemCount * ITEMS_TABLE_ROW_HEIGHT;
  const defaultCapacity =
    ITEMS_TABLE_HEAD_HEIGHT + ITEMS_TABLE_DEFAULT_VISIBLE_ROWS * ITEMS_TABLE_ROW_HEIGHT;
  if (contentHeight <= defaultCapacity) return ITEMS_TABLE_DEFAULT_HEIGHT;
  return Math.min(contentHeight, ITEMS_TABLE_MAX_HEIGHT);
}

export default function App({ onOpenAdmin }: { onOpenAdmin?: () => void }) {
  const { user, logout } = useAuth();

  // --- Persistent States (API-backed) ---
  const [quotation, setQuotation] = useState<Quotation>(() => DEFAULT_QUOTATION_TEMPLATE(user?.displayName));
  const [customerPresets, setCustomerPresets] = useState<CustomerPreset[]>([]);
  const [drafts, setDrafts] = useState<Quotation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // --- UI States ---
  const [activeMainTab, setActiveMainTab] = useState<'editor' | 'history'>('editor');
  const [activeMetaRightTab, setActiveMetaRightTab] = useState<'customers' | 'drafts'>('customers');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const itemsEditorCardRef = useRef<HTMLDivElement>(null);
  const basicInfoCardRef = useRef<HTMLDivElement>(null);
  const [itemsEditorCardHeight, setItemsEditorCardHeight] = useState<number | null>(null);
  const [basicInfoCardHeight, setBasicInfoCardHeight] = useState<number | null>(null);

  const itemsTableScrollHeight = useMemo(
    () => getItemsTableScrollHeight(quotation.items.length),
    [quotation.items.length]
  );

  // 凌越貨品搜尋側欄高度跟隨報價品項編輯清單卡片（桌面版）
  useEffect(() => {
    const el = itemsEditorCardRef.current;
    if (!el || activeMainTab !== 'editor') return;

    const syncHeight = () => {
      if (window.innerWidth >= 1024) {
        setItemsEditorCardHeight(el.offsetHeight);
      } else {
        setItemsEditorCardHeight(null);
      }
    };

    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    window.addEventListener('resize', syncHeight);
    syncHeight();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [activeMainTab, quotation.items.length, quotation.remark, itemsTableScrollHeight]);

  // 客戶儲藏側欄高度跟隨基本報價資訊卡片（桌面版）
  useEffect(() => {
    const el = basicInfoCardRef.current;
    if (!el || activeMainTab !== 'editor') return;

    const syncHeight = () => {
      if (window.innerWidth >= 1024) {
        setBasicInfoCardHeight(el.offsetHeight);
      } else {
        setBasicInfoCardHeight(null);
      }
    };

    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    window.addEventListener('resize', syncHeight);
    syncHeight();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [activeMainTab]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadRemoteData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [quotes, customers] = await Promise.all([
        fetchQuotations(),
        fetchCustomerPresets(),
      ]);
      setDrafts(quotes.map(normalizeQuotation));
      setCustomerPresets(customers);
      setQuotation((prev) => {
        if (prev.id && prev.id !== 'draft-template') return prev;
        return DEFAULT_QUOTATION_TEMPLATE(user?.displayName);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入資料失敗';
      showToast(message, 'error');
    } finally {
      setDataLoading(false);
    }
  }, [user?.displayName, showToast]);

  useEffect(() => {
    void loadRemoteData();
  }, [loadRemoteData]);

  useEffect(() => {
    if (!hasLegacyLocalStorage()) return;
    const legacy = readLegacyLocalStorage();
    const shouldImport = confirm(
      '偵測到瀏覽器本機舊版報價資料，是否匯入至您目前所屬的業務小組？'
    );
    if (!shouldImport) return;

    void (async () => {
      try {
        const result = await migrateLocalStorage({
          currentQuotation: legacy.currentQuotation,
          customerPresets: legacy.customerPresets,
          draftsHistory: legacy.draftsHistory,
        });
        clearLegacyLocalStorage();
        await loadRemoteData();
        showToast(
          `已匯入 ${result.quotations} 筆報價、${result.customer_presets} 筆客戶快選`,
          'success'
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : '匯入失敗';
        showToast(message, 'error');
      }
    })();
  }, [loadRemoteData, showToast]);

  // --- Core Handlers ---
  
  // 1. Quotation fields modifier
  const updateField = (key: keyof Quotation, value: any) => {
    setQuotation(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 2. Select pre-loaded customer details
  const handleSelectCustomer = (customer: CustomerPreset) => {
    setQuotation(prev => ({
      ...prev,
      customerName: customer.companyName,
      customerContact: customer.contactName,
      customerPhone: customer.phone,
      customerTaxId: customer.taxId,
      customerEmail: customer.email || '',
      customerAddress: customer.address || '',
    }));
    showToast(`已代入客戶「${customer.companyName}」資訊！`);
  };

  // 3. Select pre-loaded catalog product and push to item stack
  const handleAddProductToQuote = (product: ErpProduct, qty: number) => {
    const newItem: QuotationItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: product.name,
      spec: product.spec,
      qty: qty,
      unit: product.unit,
      price: 0,
      subtotal: 0,
      remark: product.skuNo ? `品號：${product.skuNo}` : undefined,
    };

    setQuotation(prev => {
      const updatedItems = [...prev.items, newItem];
      return {
        ...prev,
        items: updatedItems
      };
    });
    showToast(`已新增品項：${product.name}（單價請自行填寫）`);
  };

  // 4. Item Row manipulation
  const handleItemCellChange = (itemId: string, field: keyof QuotationItem, value: any) => {
    setQuotation(prev => {
      const updated = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          // Calculate automatic subtotal immediately
          if (field === 'qty' || field === 'price') {
            const q = field === 'qty' ? Number(value) : updatedItem.qty;
            const p = field === 'price' ? Number(value) : updatedItem.price;
            updatedItem.subtotal = q * p;
          }
          return updatedItem;
        }
        return item;
      });
      return { ...prev, items: updated };
    });
  };

  const handleSelectAutocompleteProduct = (itemId: string, product: ErpProduct) => {
    setQuotation(prev => {
      const updated = prev.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            name: product.name,
            spec: product.spec,
            unit: product.unit,
            price: 0,
            subtotal: 0,
            remark: product.skuNo ? `品號：${product.skuNo}` : item.remark,
          };
        }
        return item;
      });
      return { ...prev, items: updated };
    });
    showToast(`已代入凌越貨品「${product.name}」（單價請自行填寫）`, 'success');
  };

  const handleAddNewBlankItem = () => {
    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
      name: '',
      spec: '',
      qty: 1,
      unit: '件',
      price: 0,
      subtotal: 0,
    };
    setQuotation(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setQuotation(prev => {
      const filtered = prev.items.filter(item => item.id !== itemId);
      return { ...prev, items: filtered };
    });
    showToast('已移除非必要品項', 'info');
  };

  // Move item indices Up or Down to reorganize quote sequence
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const items = [...quotation.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Swap
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    setQuotation(prev => ({ ...prev, items }));
  };

  // 5. Presets management
  const handleAddCustomerPreset = async (newCustomer: Omit<CustomerPreset, 'id'>) => {
    try {
      const entry = await createCustomerPreset(newCustomer);
      setCustomerPresets((prev) => [entry, ...prev]);
      showToast(`新增常用客戶「${newCustomer.companyName}」成功！`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '新增失敗', 'error');
    }
  };

  const handleDeleteCustomerPreset = async (id: string) => {
    try {
      await deleteCustomerPreset(id);
      setCustomerPresets((prev) => prev.filter((c) => c.id !== id));
      showToast('已移除常用客戶資訊', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '刪除失敗', 'error');
    }
  };

  const handleSaveDraft = async () => {
    if (!quotation.customerName.trim()) {
      showToast('建議輸入客戶名稱，以利於歷史列表中搜尋識別。', 'info');
    }

    try {
      const isNew = !quotation.id || quotation.id === 'draft-template';
      const savedRecord = isNew
        ? await createQuotation(quotation)
        : await updateQuotation(quotation);

      setDrafts((prev) => {
        const filtered = prev.filter((d) => d.id !== savedRecord.id);
        return [savedRecord, ...filtered];
      });
      setQuotation(normalizeQuotation(savedRecord));
      showToast(`已儲存報價單至歷史存檔 (單號: ${savedRecord.quotationNo})！`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '儲存失敗', 'error');
    }
  };

  const handleLoadDraft = (draft: Quotation) => {
    setQuotation(normalizeQuotation(draft));
    showToast(`已成功載入草稿單：${draft.quotationNo}`);
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteQuotation(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      showToast('該草稿已被移除', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '刪除失敗', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, status: Quotation['status']) => {
    const target = drafts.find((q) => q.id === id);
    if (!target) return;
    try {
      const updated = await updateQuotation({ ...target, status });
      setDrafts((prev) => prev.map((q) => (q.id === id ? updated : q)));
      if (quotation.id === id) {
        setQuotation(normalizeQuotation(updated));
      }
      showToast('報價狀態已更新！', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新失敗', 'error');
    }
  };

  const handleLoadForEdit = (quote: Quotation) => {
    setQuotation(normalizeQuotation(quote));
    setActiveMainTab('editor');
    showToast(`已載入單號 [${quote.quotationNo}]。修改完畢後可點選上方「儲存存檔」覆蓋或新增。`, 'success');
  };

  const handleExportExcelHistory = async (quote: Quotation) => {
    try {
      await exportQuotationToExcel(quote);
      showToast(`歷史單號 ${quote.quotationNo} 匯出 Excel 成功！`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '匯出失敗，請再試一次。';
      showToast(message, 'error');
    }
  };

  const handleClearForm = () => {
    if (confirm('確定要清空當前欄位，重啟一張新的報價單嗎？（原草稿不會受影響）')) {
      const defaultQuote = DEFAULT_QUOTATION_TEMPLATE(quotation.salesName || user?.displayName);
      setQuotation({
        ...defaultQuote,
        quotationNo: generateQuotationNo(),
      });
      showToast('已重設並開啟新報價單！', 'info');
    }
  };

  // 7. Actions Bar
  const handleExportExcel = async () => {
    if (quotation.items.length === 0) {
      showToast('報價單品項不能為空，請先加入至少一項產品！', 'error');
      return;
    }
    if (!quotation.customerName.trim()) {
      showToast('請務必填寫客戶公司名稱，再進行匯出！', 'error');
      return;
    }
    try {
      await exportQuotationToExcel(quotation);
      showToast('Excel 報價單匯出成功且下載已觸發！', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Excel 匯出失敗，請重試。';
      showToast(message, 'error');
    }
  };

  const handlePrintTrigger = () => {
    if (!quotation.customerName.trim()) {
      showToast('提示：未指定客戶公司名稱，列印仍將繼續！', 'info');
    }
    // Launch print layout
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Run Calculations for Screen UI
  const totals = calculateQuotationTotals(quotation);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" id="erp-web-app-root">
      
      {/* Toast Alert */}
      {toast && (
        <div 
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}
          id="toast-notification"
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
          {toast.message}
        </div>
      )}

      {/* --- Top Steel Bar Header --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 no-print" id="erp-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-950 tracking-tight">ERP 報價快速打單助手</h1>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                  業務加值外掛
                </span>
              </div>
              <p className="text-xs text-slate-500">免去難登入、卡頓的傳統 ERP，快速輸入、自動運算並一鍵匯出</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 mr-1">
                <User className="w-3.5 h-3.5" />
                <span className="font-semibold text-slate-700">{user.displayName}</span>
                <span className="text-slate-400">({user.username})</span>
              </div>
            )}
            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 rounded-xl transition-all cursor-pointer"
                title="系統管理（僅管理員）"
              >
                <Shield className="w-3.5 h-3.5" />
                管理
              </button>
            )}
            <button
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              title="登出"
            >
              <LogOut className="w-3.5 h-3.5" />
              登出
            </button>
            <button
              onClick={handleClearForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold font-sans text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              title="清除當前內容，開立新單"
              id="header-btn-reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              開新報價單
            </button>

            <button
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer"
              title="儲存此報價單至歷史紀錄中以供未來管理與修改"
              id="header-btn-save"
            >
              <Save className="w-3.5 h-3.5" />
              儲存本單/存檔
            </button>

            <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

            <button
              onClick={handlePrintTrigger}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="列印報價單或是儲存為 PDF 格式"
              id="header-btn-print"
            >
              <Printer className="w-3.5 h-3.5" />
              PDF / 列印
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              title="一鍵匯出符合公司規格的專業 EXCEL 表格"
              id="header-btn-export"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              匯出 Excel
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Tab Navigation 分頁選項 --- */}
      <div className="bg-slate-100/95 border-b border-slate-200 no-print" id="main-tab-nav">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center">
          <button
            type="button"
            onClick={() => setActiveMainTab('editor')}
            className={`py-3 px-6 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'editor'
                ? 'border-indigo-600 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            ✍️ 新增暨編輯報價單
          </button>
          
          <button
            type="button"
            onClick={() => setActiveMainTab('history')}
            className={`py-3 px-6 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer relative ${
              activeMainTab === 'history'
                ? 'border-indigo-600 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            📁 歷史報價單分頁與管理檔
            {drafts.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-extrabold rounded-full">
                {drafts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* --- Main Dashboard Container --- */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 no-print" id="erp-main-content">
        {dataLoading ? (
          <div className="text-center text-sm text-slate-500 py-16">資料載入中…</div>
        ) : activeMainTab === 'editor' ? (
          <div className="space-y-6" id="editor-layout">

          {/* Row 1: 基本報價資訊 ↔ 客戶儲藏 / 暫存草稿 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8" id="basic-info-panel">
            <div
              ref={basicInfoCardRef}
              className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-6"
            >
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-wide">基本報價資訊</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium font-mono bg-slate-50 px-2 py-1 rounded">
                    單號: {quotation.quotationNo}
                  </span>
                  <button 
                    type="button"
                    onClick={() => updateField('quotationNo', generateQuotationNo())}
                    className="text-xs text-indigo-600 hover:underline font-bold"
                  >
                    重構單號
                  </button>
                </div>
              </div>

              {/* Quotation Identity Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    報價日期
                  </label>
                  <input
                    type="date"
                    value={quotation.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-2 py-2.5 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    有效期限 (天)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="常規 30 天"
                    value={quotation.validDays}
                    onChange={(e) => updateField('validDays', Number(e.target.value) || 30)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-2 py-2.5 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Contact className="w-3.5 h-3.5 text-slate-400" />
                    負責業務人員
                  </label>
                  <input
                    type="text"
                    placeholder="業務姓名"
                    value={quotation.salesName}
                    onChange={(e) => updateField('salesName', e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-2 py-2.5 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-slate-400" />
                    單據執行狀態
                  </label>
                  <select
                    value={quotation.status || 'DRAFT'}
                    onChange={(e) => updateField('status', e.target.value as Quotation['status'])}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-2.5 py-2.5 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="DRAFT">暫存草稿 (Draft)</option>
                    <option value="SENT">已送至客戶 (Sent)</option>
                    <option value="ACCEPTED">客戶簽回結案 (Accepted)</option>
                    <option value="REJECTED">作廢不成立 (Rejected)</option>
                  </select>
                </div>
              </div>

              {/* Sales contact fields (hidden or expandable for custom options) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">業務聯絡電話 (選填)</label>
                  <input
                    type="text"
                    placeholder="如：0912-345-678"
                    value={quotation.salesPhone || ''}
                    onChange={(e) => updateField('salesPhone', e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2.5 focus:outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">業務聯絡信箱 (選填)</label>
                  <input
                    type="email"
                    placeholder="sales.rep@company.com"
                    value={quotation.salesEmail || ''}
                    onChange={(e) => updateField('salesEmail', e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2.5 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Patient Client Fields */}
              <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Building className="w-4 h-4 text-indigo-500" />
                    採購客戶細節
                  </div>
                  <span className="text-[10px] text-slate-400">可以點右側面板「客戶名單」快速載入設定</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">客戶公司全名 *</label>
                    <input
                      type="text"
                      placeholder="填入客戶公司名稱"
                      value={quotation.customerName}
                      onChange={(e) => updateField('customerName', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 focus:outline-none transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">統一編號 (8位數)</label>
                    <input
                      type="text"
                      placeholder="如: 12345678"
                      value={quotation.customerTaxId}
                      onChange={(e) => updateField('customerTaxId', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 focus:outline-none transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">聯絡窗口人員 *</label>
                    <input
                      type="text"
                      placeholder="例如: 林經理、陳小姐"
                      value={quotation.customerContact}
                      onChange={(e) => updateField('customerContact', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">聯絡人行動/市話 *</label>
                    <input
                      type="text"
                      placeholder="例如: 0912-345678 或分機"
                      value={quotation.customerPhone}
                      onChange={(e) => updateField('customerPhone', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 focus:outline-none transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">聯絡信箱 (Email)</label>
                    <input
                      type="email"
                      placeholder="client@company.com"
                      value={quotation.customerEmail || ''}
                      onChange={(e) => updateField('customerEmail', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 focus:outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">客戶發票或營業地址</label>
                    <input
                      type="text"
                      placeholder="台北市大安區忠孝東路三段..."
                      value={quotation.customerAddress || ''}
                      onChange={(e) => updateField('customerAddress', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Payment conditions row */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">付款條件 (結算方式說明)</label>
                <input
                  type="text"
                  placeholder="例如：簽約預付 30%, 驗收合格後支付 70% 匯款月結 30 天"
                  value={quotation.paymentTerms}
                  onChange={(e) => updateField('paymentTerms', e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2.5 focus:outline-none transition-all"
                />
              </div>

            </div>
            </div>

            <div
              className="lg:col-span-4 min-h-0"
              id="meta-presets-sidebar"
              style={basicInfoCardHeight ? { height: basicInfoCardHeight } : undefined}
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 h-full flex flex-col min-h-0 overflow-hidden">
                <div className="shrink-0 border-b border-slate-100 pb-4 mb-4">
                  <div className="flex w-full bg-slate-200/60 p-1.5 rounded-xl border border-slate-200/80 items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveMetaRightTab('customers')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold text-center transition-all cursor-pointer ${
                        activeMetaRightTab === 'customers'
                          ? 'bg-white text-slate-900 shadow-3xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      客戶儲藏
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMetaRightTab('drafts')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold text-center transition-all cursor-pointer relative ${
                        activeMetaRightTab === 'drafts'
                          ? 'bg-white text-slate-900 shadow-3xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      暫存草稿
                      {drafts.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white scale-90">
                          {drafts.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden" id="meta-presets-content">
                  {activeMetaRightTab === 'customers' && (
                    <CustomerPresetManager
                      embedded
                      presets={customerPresets}
                      onSelect={handleSelectCustomer}
                      onAdd={handleAddCustomerPreset}
                      onDelete={handleDeleteCustomerPreset}
                      selectedCustomerId={
                        customerPresets.find(c => c.companyName === quotation.customerName)?.id
                      }
                    />
                  )}

                  {activeMetaRightTab === 'drafts' && (
                    <DraftList
                      embedded
                      drafts={drafts}
                      onLoadDraft={handleLoadDraft}
                      onDeleteDraft={handleDeleteDraft}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: 報價品項編輯清單 ↔ 凌越貨品搜尋 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8" id="items-editor-panel">
            {/* Form Sheet 2: Items Table Editor */}
            <div
              ref={itemsEditorCardRef}
              className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 flex flex-col space-y-4"
            >
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-wide">報價品項編輯清單</h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">
                    共 {quotation.items.length} 筆項目
                  </span>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleAddNewBlankItem}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs"
                    id="btn-add-blank-item"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    插入一筆空列
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('是否確認要移除當前報價單內的所有項目？')) {
                        updateField('items', []);
                        showToast('已移除所有項目', 'info');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                    id="btn-clear-all-items"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    排空項目
                  </button>
                </div>
              </div>

              {/* Items Table Grid Wrapper for Scrolling */}
              <div
                className="overflow-x-auto overflow-y-auto -mx-6 sm:mx-0 shrink-0 transition-[height] duration-200"
                style={{ height: itemsTableScrollHeight }}
                id="table-scroll-container"
              >
                <table className="w-full text-left min-w-[700px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3 text-center w-12">排序</th>
                      <th className="py-2.5 px-3">品名或服務項目 *</th>
                      <th className="py-2.5 px-3">規格或功能描述</th>
                      <th className="py-2.5 px-3 text-center w-16">數量 *</th>
                      <th className="py-2.5 px-3 text-center w-16">單位</th>
                      <th className="py-2.5 px-3 text-right w-24">單價 ({currencyLabel(quotation.currency)}) *</th>
                      <th className="py-2.5 px-3 text-right w-24">小計金額</th>
                      <th className="py-2.5 px-2 text-center w-12">動作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {quotation.items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 bg-slate-50/20 rounded-b-xl">
                          <AlertCircle className="w-5 h-5 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">無任何報價品項</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            請在右方「凌越貨品搜尋」加入品項，或點按上方「插入一筆空列」手動輸入。
                          </p>
                        </td>
                      </tr>
                    ) : (
                      quotation.items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* Order & Reordering Keys */}
                          <td className="py-2 px-1 text-center font-mono text-[10px] text-slate-400">
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-slate-600 block mb-0.5">{index + 1}</span>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleMoveItem(index, 'up')}
                                  disabled={index === 0}
                                  className={`p-0.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20 cursor-pointer`}
                                  title="往上移"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveItem(index, 'down')}
                                  disabled={index === quotation.items.length - 1}
                                  className={`p-0.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20 cursor-pointer`}
                                  title="往下移"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Item Name */}
                          <td className="py-2 px-1">
                            <ProductAutocomplete
                              value={item.name}
                              onChange={(val) => handleItemCellChange(item.id, 'name', val)}
                              onSelectProduct={(product) => handleSelectAutocompleteProduct(item.id, product)}
                              placeholder="請輸入品項名稱"
                            />
                          </td>

                          {/* Spec */}
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              placeholder="功能/尺寸/規格描述"
                              value={item.spec}
                              onChange={(e) => handleItemCellChange(item.id, 'spec', e.target.value)}
                              className="w-full bg-transparent px-2 py-1.5 focus:bg-white border-b border-transparent focus:border-indigo-500 hover:border-slate-300 rounded focus:outline-none text-slate-500 text-[11px]"
                            />
                          </td>

                          {/* Qty */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="1"
                              value={item.qty === 0 ? '' : item.qty}
                              onChange={(e) => handleItemCellChange(item.id, 'qty', e.target.value !== '' ? Number(e.target.value) : '')}
                              className="w-14 text-center font-mono font-semibold bg-transparent py-1 border-b border-transparent focus:border-indigo-500 hover:border-slate-200 focus:bg-white rounded focus:outline-none"
                            />
                          </td>

                          {/* Unit */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text"
                              placeholder="個"
                              value={item.unit}
                              onChange={(e) => handleItemCellChange(item.id, 'unit', e.target.value)}
                              className="w-12 text-center bg-transparent py-1 border-b border-transparent focus:border-indigo-500 hover:border-slate-200 focus:bg-white rounded focus:outline-none text-slate-600"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="py-2 px-1">
                            <div className="flex items-center gap-0.5 justify-end">
                              <span className="text-slate-400 font-mono scale-90">$</span>
                              <input
                                type="number"
                                required
                                min="0"
                                placeholder="0"
                                value={item.price === 0 ? '' : item.price}
                                onChange={(e) => handleItemCellChange(item.id, 'price', e.target.value !== '' ? Number(e.target.value) : '')}
                                className="w-20 text-right font-mono font-bold bg-transparent py-1 border-b border-transparent focus:border-indigo-500 hover:border-slate-200 focus:bg-white rounded focus:outline-none text-slate-800"
                              />
                            </div>
                          </td>

                          {/* Subtotal */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 justify-end items-center">
                            ${item.subtotal.toLocaleString()}
                          </td>

                          {/* Row Actions */}
                          <td className="py-2 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                              title="移除此列"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* General Remarks / Footnotes for quotation */}
              <div className="pt-4 border-t border-slate-100 shrink-0">
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>報價條款暨備註欄位 (將列印於單據底部)</span>
                  <span className="text-[10px] text-slate-400">支援換行</span>
                </label>
                <textarea
                  rows={3}
                  value={quotation.remark}
                  onChange={(e) => updateField('remark', e.target.value)}
                  placeholder="請填入備註項目，例如付款時效、物流包裝、匯款銀行虛擬帳號...等資訊"
                  className="w-full text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl p-3 focus:outline-none transition-all resize-y"
                />
              </div>

            </div>
            </div>

            <div
              className="lg:col-span-4 min-h-0"
              id="erp-product-sidebar"
              style={itemsEditorCardHeight ? { height: itemsEditorCardHeight } : undefined}
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 h-full flex flex-col min-h-0 overflow-hidden">
                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
                    <h3 className="font-bold text-slate-900 text-sm tracking-wide">凌越貨品搜尋</h3>
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <ErpProductSearch
                    embedded
                    onAddProductToQuote={handleAddProductToQuote}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: 自動結算與折讓 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
            {/* Form Sheet 3: Calculation Summary Block */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6" id="calc-summary-section">
              <div className="w-full md:w-auto space-y-4">
                
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold tracking-wider">
                  <DollarSign className="w-4 h-4" />
                  自動結算與折讓
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">報價幣別</span>
                    <select
                      value={quotation.currency}
                      onChange={(e) => updateField('currency', e.target.value as QuotationCurrency)}
                      className="text-xs font-semibold bg-slate-800 text-white border border-slate-700 focus:border-indigo-500 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer w-full"
                    >
                      <option value="TWD">新台幣 (TWD)</option>
                      <option value="USD">美金 (USD)</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1">稅別設定</span>
                    <select
                      value={quotation.taxType}
                      onChange={(e) => updateField('taxType', e.target.value as TaxType)}
                      className="text-xs font-semibold bg-slate-800 text-white border border-slate-700 focus:border-indigo-500 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                    >
                      <option value="TAXABLE">應稅 5% (外加)</option>
                      <option value="ZERO_TAX">零稅率 (0%)</option>
                      <option value="TAX_FREE">免稅</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1">
                      手動折扣金額 ({currencyLabel(quotation.currency)})
                    </span>
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 border border-slate-700">
                      <span className="text-slate-400 font-mono text-xs font-semibold">-</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="不折讓"
                        value={quotation.discount === 0 ? '' : quotation.discount}
                        onChange={(e) => updateField('discount', Number(e.target.value) || 0)}
                        className="w-20 bg-transparent py-1 border-0 focus:outline-none text-xs text-white font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Totals Counter */}
              <div className="w-full md:w-auto bg-slate-800/80 p-5 rounded-xl border border-slate-800 self-stretch flex flex-col justify-center gap-2">
                <div className="flex justify-between md:justify-end gap-x-8 items-center text-xs text-slate-300">
                  <span>分計小計 (Subtotal):</span>
                  <span className="font-mono font-medium">{formatMoney(totals.subtotal, quotation.currency)}</span>
                </div>
                <div className="flex justify-between md:justify-end gap-x-8 items-center text-xs text-rose-300">
                  <span>折扣減免 (Discount):</span>
                  <span className="font-mono font-medium">-{formatMoney(totals.discount, quotation.currency)}</span>
                </div>
                <div className="flex justify-between md:justify-end gap-x-8 items-center text-xs text-slate-300">
                  <span>加計營業稅額 (VAT):</span>
                  <span className="font-mono font-medium">{formatMoney(totals.tax, quotation.currency)}</span>
                </div>
                <div className="h-[1px] bg-slate-700 my-1"></div>
                <div className="flex justify-between md:justify-end gap-x-8 items-center">
                  <span className="text-sm font-bold text-slate-100">報價總金額 (Total):</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
                    {formatMoney(totals.grandTotal, quotation.currency)}
                  </span>
                </div>
              </div>

            </div>
            </div>
          </div>

        </div>
        ) : (
          <QuotationHistory
            history={drafts}
            onLoadForEdit={handleLoadForEdit}
            onDelete={handleDeleteDraft}
            onUpdateStatus={handleUpdateStatus}
            onExportExcel={handleExportExcelHistory}
          />
        )}
      </main>

      {/* ================= PRINT PREVIEW (Hidden on Screen, Visible on Print) ================= */}
      <QuotationPrint quotation={quotation} />

    </div>
  );
}
