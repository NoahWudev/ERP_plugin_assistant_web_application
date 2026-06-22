import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ErpProduct } from '../types';
import { searchErpProducts } from '../utils/erpProducts';
import { Database, Loader2 } from 'lucide-react';

interface ProductAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelectProduct: (product: ErpProduct) => void;
  placeholder?: string;
}

interface DropdownRect {
  top: number;
  left: number;
  width: number;
}

const DROPDOWN_MIN_WIDTH = 560;
const DROPDOWN_VIEWPORT_MARGIN = 12;

function computeDropdownRect(input: HTMLInputElement): DropdownRect {
  const rect = input.getBoundingClientRect();
  const width = Math.min(
    Math.max(rect.width, DROPDOWN_MIN_WIDTH),
    window.innerWidth - DROPDOWN_VIEWPORT_MARGIN * 2,
  );
  let left = rect.left;
  if (left + width > window.innerWidth - DROPDOWN_VIEWPORT_MARGIN) {
    left = Math.max(DROPDOWN_VIEWPORT_MARGIN, window.innerWidth - width - DROPDOWN_VIEWPORT_MARGIN);
  }
  return {
    top: rect.bottom + 8,
    left,
    width,
  };
}

export default function ProductAutocomplete({
  value,
  onChange,
  onSelectProduct,
  placeholder = '請輸入品項名稱或關鍵字',
}: ProductAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ErpProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !inputRef.current) {
      setDropdownRect(null);
      return;
    }

    const updatePosition = () => {
      if (inputRef.current) {
        setDropdownRect(computeDropdownRect(inputRef.current));
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, suggestions.length, isLoading]);

  const triggerSearch = (searchTerm: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = searchTerm.trim();
    if (!query) {
      setSuggestions([]);
      setError(null);
      setIsLoading(false);
      setHighlightedIndex(-1);
      return;
    }

    setIsLoading(true);
    setHighlightedIndex(-1);
    setError(null);

    searchTimeoutRef.current = setTimeout(() => {
      void searchErpProducts(query, 15)
        .then((items) => {
          setSuggestions(items);
          setError(null);
        })
        .catch((err: unknown) => {
          setSuggestions([]);
          setError(err instanceof Error ? err.message : '搜尋凌越貨品失敗');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 300);
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

  const handleSelect = (product: ErpProduct) => {
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

  const dropdownPanel =
    isOpen && dropdownRect
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[200] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn"
            style={{
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              maxHeight: 'min(70vh, 32rem)',
            }}
          >
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold shrink-0">
              <span className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                凌越 ERP 貨品搜尋
              </span>
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在查詢...
                </span>
              ) : (
                <span>共 {suggestions.length} 筆符合</span>
              )}
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {error ? (
                <div className="p-6 text-center text-sm text-rose-500">{error}</div>
              ) : isLoading && suggestions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                  <span>正在查詢凌越貨品主檔...</span>
                </div>
              ) : !value.trim() ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  輸入品號或品名以搜尋凌越貨品
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  無相符的凌越貨品。可繼續輸入以使用自訂品項。
                </div>
              ) : (
                suggestions.map((product, index) => (
                  <button
                    key={product.skuNo}
                    type="button"
                    onClick={() => handleSelect(product)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-3.5 flex flex-col gap-1.5 transition-all text-sm cursor-pointer ${
                      highlightedIndex === index
                        ? 'bg-emerald-50 border-l-4 border-emerald-600 pl-3'
                        : 'bg-white border-l-4 border-transparent pl-3 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <span className="font-semibold text-slate-900 leading-snug">
                        {product.name}
                      </span>
                      <span className="text-xs text-slate-500 font-mono shrink-0 bg-slate-100 px-2 py-0.5 rounded">
                        {product.skuNo}
                      </span>
                    </div>

                    {product.spec && (
                      <div className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {product.spec}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-0.5">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                        單位：{product.unit}
                      </span>
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                        單價請自行填寫
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-transparent px-2 py-1.5 focus:bg-white border-b border-transparent focus:border-indigo-500 hover:border-slate-300 rounded focus:outline-none font-semibold text-slate-800 transition-all placeholder-slate-400"
      />
      {dropdownPanel}
    </div>
  );
}
