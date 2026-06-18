import React, { useState, useEffect, useRef } from 'react';
import { ProductPreset } from '../types';
import { Database, Loader2, Sparkles } from 'lucide-react';

interface ProductAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelectProduct: (product: ProductPreset) => void;
  productPresets: ProductPreset[];
  placeholder?: string;
}

export default function ProductAutocomplete({
  value,
  onChange,
  onSelectProduct,
  productPresets,
  placeholder = '請輸入品項名稱或關鍵字'
}: ProductAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductPreset[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simulate SQL Database query on input change
  const triggerSearch = (searchTerm: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsLoading(true);
    setHighlightedIndex(-1);

    // Simulate network delay of 250ms for querying a backend SQL database
    searchTimeoutRef.current = setTimeout(() => {
      const query = searchTerm.trim().toLowerCase();
      let matches: ProductPreset[] = [];

      if (!query) {
        // Show first 5 presets when empty query as quick recommendations
        matches = productPresets.slice(0, 5);
      } else {
        matches = productPresets.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.spec && p.spec.toLowerCase().includes(query))
        );
      }

      setSuggestions(matches);
      setIsLoading(false);
    }, 250);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    setIsOpen(true);
    triggerSearch(newVal);
  };

  const handleFocus = () => {
    setIsOpen(true);
    triggerSearch(value);
  };

  const handleSelect = (product: ProductPreset) => {
    onSelectProduct(product);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        triggerSearch(value);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          suggestions.length > 0 ? (prev + 1) % suggestions.length : -1
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          suggestions.length > 0 ? (prev - 1 + suggestions.length) % suggestions.length : -1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        } else if (suggestions.length > 0) {
          // If none highlighted but suggestions exist, default to first suggestion
          handleSelect(suggestions[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-transparent px-2 py-1.5 focus:bg-white border-b border-transparent focus:border-indigo-500 hover:border-slate-300 rounded focus:outline-none font-semibold text-slate-800 transition-all placeholder-slate-400"
      />

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-64 flex flex-col animate-fadeIn">
          {/* Header indicator simulating SQL DB source */}
          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold shrink-0">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-indigo-500 animate-pulse" />
              SQL 資料庫搜尋模擬 (連接已就緒)
            </span>
            {isLoading ? (
              <span className="flex items-center gap-1 text-indigo-600 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                正在查詢...
              </span>
            ) : (
              <span>共 {suggestions.length} 筆符合</span>
            )}
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
            {isLoading && suggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5">
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                <span>正在從遠端 SQL 資料庫進行模糊查詢...</span>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                無相符的產品。您可以繼續輸入以新增自訂品項。
              </div>
            ) : (
              suggestions.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3.5 py-2.5 flex flex-col transition-all text-xs cursor-pointer ${
                    highlightedIndex === index
                      ? 'bg-indigo-50/70 border-l-2 border-indigo-600 pl-[12px]'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-slate-800">
                      {product.name}
                    </span>
                    <span className="font-bold text-emerald-600 font-mono shrink-0">
                      ${product.price.toLocaleString()} 元
                    </span>
                  </div>
                  
                  {product.spec && (
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                      {product.spec}
                    </div>
                  )}

                  <div className="flex gap-2 mt-1">
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-mono">
                      單位: {product.unit}
                    </span>
                    {!value && index < 5 && (
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 py-0.2 rounded font-semibold flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        常用推薦
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
