"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, Plus, Loader2 } from 'lucide-react';
import { getMasterDropdownItems, DropdownOptionItem } from '@/services/lms.services';

export type PredefinedItemType = 'quiz' | 'assignment' | 'programming';

interface AddPredefinedItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: PredefinedItemType | null;
  onSelect: (item: { value: string; label: string }) => void;
  onCreateNew: () => void;
  selectedValue?: string;
}

const TYPE_CONFIG = {
  quiz: {
    doctype: 'LMS Quiz',
    modalTitle: 'Add a quiz to your lesson',
    fieldLabel: 'Select a quiz',
    placeholder: 'Search or select a quiz...',
    createLabel: 'Create New',
  },
  assignment: {
    doctype: 'LMS Assignment',
    modalTitle: 'Add an assignment to your lesson',
    fieldLabel: 'Select an assignment',
    placeholder: 'Search or select an assignment...',
    createLabel: 'Create New',
  },
  programming: {
    doctype: 'LMS Programming Exercise',
    modalTitle: 'Add a programming exercise to your lesson',
    fieldLabel: 'Select a programming exercise',
    placeholder: 'Search or select an exercise...',
    createLabel: 'Create New',
  },
};

export default function AddPredefinedItemModal({
  isOpen,
  onClose,
  type,
  onSelect,
  onCreateNew,
  selectedValue = '',
}: AddPredefinedItemModalProps) {
  const [items, setItems] = useState<DropdownOptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const config = type ? TYPE_CONFIG[type] : null;

  // Load options dynamically from the master dropdown API whenever modal opens or type changes
  useEffect(() => {
    if (!isOpen || !type || !config) return;

    let isMounted = true;
    setLoading(true);
    setSearchQuery('');
    setIsDropdownOpen(true);

    getMasterDropdownItems(config.doctype)
      .then((data) => {
        if (isMounted) {
          setItems(data);
          if (selectedValue) {
            const found = data.find((it) => it.value === selectedValue || it.label === selectedValue);
            if (found) {
              setSearchQuery(found.label);
            }
          }
        }
      })
      .catch((err) => {
        console.error(`Failed to fetch master dropdown options for ${config.doctype}:`, err);
        if (isMounted) setItems([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, type, config?.doctype, selectedValue]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !type || !config) return null;

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesLabel = item.label.toLowerCase().includes(q);
    const matchesValue = item.value.toLowerCase().includes(q);
    const matchesDesc = item.description ? item.description.toLowerCase().includes(q) : false;
    return matchesLabel || matchesValue || matchesDesc;
  });

  const handleClear = () => {
    setSearchQuery('');
    setIsDropdownOpen(true);
    inputRef.current?.focus();
  };

  const handleSelectItem = (item: DropdownOptionItem) => {
    onSelect({
      value: item.value,
      label: item.label,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-800 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {config.modalTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            {config.fieldLabel}
          </label>

          {/* Combobox Search Input */}
          <div
            className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all cursor-text"
            onClick={() => {
              setIsDropdownOpen(true);
              inputRef.current?.focus();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder={config.placeholder}
              className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none pr-6 font-medium"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className="absolute right-3 text-slate-400 hover:text-slate-600"
            >
              {isDropdownOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Dropdown Card */}
          {isDropdownOpen && (
            <div
              ref={dropdownRef}
              className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-100"
            >
              {/* Items List */}
              <div className="max-h-60 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100">
                {loading ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mb-2" />
                    <span>Loading options from {config.doctype}...</span>
                  </div>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const isSelected =
                      selectedValue === item.value ||
                      selectedValue === item.label ||
                      searchQuery.trim().toLowerCase() === item.label.toLowerCase();

                    return (
                      <div
                        key={item.value}
                        onClick={() => handleSelectItem(item)}
                        className={`w-full px-3.5 py-2.5 rounded-lg text-left transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-indigo-50/80 text-indigo-950 border border-indigo-100/60 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="text-sm font-medium leading-snug group-hover:text-slate-900">
                          {item.label}
                        </div>
                        {item.description && item.description !== item.label && (
                          <div className="text-xs text-slate-400 mt-0.5 font-mono">
                            {item.description}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 px-4 text-center text-xs text-slate-400">
                    No matching items found for {config.doctype}.
                  </div>
                )}
              </div>

              {/* Dropdown Footer: Clear on Left, Create New on Right */}
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCreateNew();
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1.5 transition-colors group hover:underline"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-700 transition-colors" />
                  <span>{config.createLabel}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
