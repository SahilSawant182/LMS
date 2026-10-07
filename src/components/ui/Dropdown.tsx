"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check, Search, Loader2 } from "lucide-react";
import axios from "axios";

interface DropdownProps {
  id: string;
  label?: string;
  value: string | string[];
  onChange: (value: any) => void;
  endpoint?: string;
  params?: Record<string, any>;
  mapOptions?: (data: any) => Array<{ value: string; label: string }>;
  options?: Array<{ value: string; label: string }> | string[];
  required?: boolean;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  multiSelect?: boolean;
  searchable?: boolean;
  modalTitle?: string;
}

export default function Dropdown({
  id,
  label,
  value,
  onChange,
  endpoint,
  params = {},
  mapOptions,
  options: optionsProp,
  required = false,
  error,
  disabled = false,
  placeholder = "Select option",
  multiSelect = false,
  searchable = true,
  modalTitle
}: DropdownProps) {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [fetched, setFetched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        (!modalRef.current || !modalRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent background scrolling when dropdown is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Sync static options
  useEffect(() => {
    if (optionsProp) {
      const mapped = Array.isArray(optionsProp)
        ? optionsProp.map((opt) =>
          typeof opt === "string" ? { value: opt, label: opt } : opt
        )
        : [];
      setOptions(mapped);
      setFetched(true);
    }
  }, [optionsProp]);

  const fetchOptions = async (pageNum = 1, searchTxt = "") => {
    if (!endpoint) return;
    setLoading(true);
    setFetchError("");
    try {
      let responseData;
      if (endpoint.includes('master.get_master_data')) {
        const body = {
          ...(params || {}),
          search: searchTxt,
          page: pageNum
        };
        const response = await axios.post(endpoint, body, {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        });
        responseData = response.data;
      } else {
        const response = await axios.get(endpoint, {
          params: {
            ...(params || {}),
            page: pageNum,
            search: searchTxt
          }
        });
        responseData = response.data;
      }

      let data = [];
      let nextFlag = false;
      let prevFlag = false;
      let totalPgs = 1;

      if (responseData) {
        if (responseData.pagination) {
          data = responseData.data || [];
          nextFlag = responseData.pagination.has_next === true;
          prevFlag = responseData.pagination.has_prev === true;
          const totalCount = responseData.pagination.total_count || 0;
          const pageSize = responseData.pagination.page_size || 20;
          totalPgs = Math.ceil(totalCount / pageSize) || 1;
        } else if (responseData.data && responseData.data.pagination) {
          data = responseData.data.data || [];
          const pag = responseData.data.pagination;
          nextFlag = pag.has_next === true;
          prevFlag = pag.has_prev === true;
          const totalCount = pag.total_count || 0;
          const pageSize = pag.page_size || 20;
          totalPgs = Math.ceil(totalCount / pageSize) || 1;
        } else if (responseData.message && responseData.message.pagination) {
          data = responseData.message.data || [];
          const pag = responseData.message.pagination;
          nextFlag = pag.has_next === true;
          prevFlag = pag.has_prev === true;
          const totalCount = pag.total_count || 0;
          const pageSize = pag.message.pagination.page_size || 20;
          totalPgs = Math.ceil(totalCount / pageSize) || 1;
        } else {
          if (Array.isArray(responseData)) {
            data = responseData;
          } else if (responseData.data && Array.isArray(responseData.data)) {
            data = responseData.data;
          } else if (responseData.message && Array.isArray(responseData.message)) {
            data = responseData.message;
          } else {
            data = responseData;
          }
        }
      }

      const mappedOptions = mapOptions
        ? mapOptions(data)
        : (Array.isArray(data)
          ? data.map((item: any) => ({
            value: item.name || item.value || String(item),
            label: item.label || item.name || item.value || String(item)
          }))
          : []);

      setOptions(mappedOptions);
      setHasNext(nextFlag || (Array.isArray(data) && data.length === 20));
      setHasPrev(prevFlag || pageNum > 1);
      setTotalPages(totalPgs);
      setPage(pageNum);
      setFetched(true);

      if (mappedOptions.length === 0) {
        setFetchError("No options available");
      }
    } catch (err: any) {
      console.error(`Error fetching ${label || id}:`, err);
      setFetchError(err?.response?.data?.message || `Failed to load ${label || id}`);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!endpoint || !isOpen) return;
    const delayDebounce = setTimeout(() => {
      fetchOptions(1, searchTerm);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, endpoint, isOpen]);

  const handleClick = () => {
    if (disabled) return;
    if (!fetched && !loading && !fetchError && endpoint) {
      fetchOptions(1, "");
    }
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm("");
    }
  };

  const handleRetry = () => {
    setFetchError("");
    setIsOpen(true);
  };

  // For single select
  const handleSingleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  // For multi select
  const handleMultiSelect = (selectedValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentValues = Array.isArray(value) ? value : [];
    let newValues: string[];

    if (currentValues.includes(selectedValue)) {
      newValues = currentValues.filter(v => v !== selectedValue);
    } else {
      newValues = [...currentValues, selectedValue];
    }

    onChange(newValues);
  };

  const removeSelectedItem = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (Array.isArray(value)) {
      const newValues = value.filter(v => v !== itemToRemove);
      onChange(newValues);
    }
  };

  // Get display labels for multi select
  const getSelectedLabels = () => {
    if (!Array.isArray(value) || value.length === 0) return null;
    return value.map(val => {
      const found = options.find(opt => opt.value === val);
      return found || { value: val, label: val };
    });
  };

  // Get selected option label for single select
  const getSelectedLabel = () => {
    if (!value || Array.isArray(value)) return placeholder;
    const selected = options.find(opt => opt.value === value);
    return selected ? selected.label : value;
  };

  // Check if an option is selected
  const isSelected = (optionValue: string) => {
    if (multiSelect) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  // Filter options based on search query
  const filteredOptions = options.filter(opt =>
    (opt.label || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative space-y-1 w-full" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Dropdown trigger button */}
      <div
        onClick={handleClick}
        className={`w-full min-h-10 px-3 py-2 rounded-md border ${error ? "border-red-500" : fetchError ? "border-red-500" : "border-slate-200"
          } bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-indigo-600 cursor-pointer flex flex-wrap items-center gap-1 relative hover:border-slate-300 transition-colors ${disabled ? "bg-slate-50 cursor-not-allowed opacity-60" : ""
          }`}
      >
        {multiSelect && Array.isArray(value) && value.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1 flex-1 pr-6">
            {getSelectedLabels()?.map((selected) => (
              <span
                key={selected.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-600/10 text-indigo-600 rounded-md text-xs font-medium"
              >
                {selected.label}
                <button
                  onClick={(e) => removeSelectedItem(selected.value, e)}
                  className="hover:text-indigo-600-foreground focus:outline-none"
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className={`flex-1 truncate pr-6 ${!value || (Array.isArray(value) && value.length === 0) ? "text-slate-400" : ""}`}>
            {loading ? "Loading..." : fetchError ? "Failed to load" : getSelectedLabel()}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {/* Dropdown menu */}
      {isOpen && mounted && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setIsOpen(false); setSearchTerm(""); }}>
          <div
            ref={modalRef}
            className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in-0 zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{modalTitle || label || placeholder || "Select option"}</span>
              <button
                onClick={() => { setIsOpen(false); setSearchTerm(""); }}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            {searchable && (
              <div className="p-3 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-indigo-600 font-medium bg-slate-50/50"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1 max-h-[50vh] relative min-h-[200px]">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              )}
              {fetchError ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-red-500 font-semibold mb-2">{fetchError}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-indigo-600/90"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredOptions.length === 0 && !loading ? (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No options available</p>
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={(e) => multiSelect ? handleMultiSelect(option.value, e) : handleSingleSelect(option.value)}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition-all mb-0.5 ${isSelected(option.value)
                      ? 'bg-indigo-600/5 text-indigo-600 font-semibold'
                      : 'hover:bg-slate-50 text-slate-600'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {multiSelect ? (
                        <div className={`w-4.5 h-4.5 rounded-lg border flex items-center justify-center ${isSelected(option.value)
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-300"
                          }`}>
                          {isSelected(option.value) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      ) : (
                        <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${isSelected(option.value)
                          ? "border-indigo-600"
                          : "border-slate-300"
                          }`}>
                          {isSelected(option.value) && (
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                          )}
                        </div>
                      )}
                      <span className="text-sm font-bold leading-tight">{option.label}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {endpoint && !fetchError && (hasNext || hasPrev || totalPages > 1) && (
              <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={!hasPrev || loading}
                  onClick={() => fetchOptions(page - 1, searchTerm)}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${hasPrev
                    ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 font-bold"
                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  Previous
                </button>

                <span className="font-bold text-slate-700">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={!hasNext || loading}
                  onClick={() => fetchOptions(page + 1, searchTerm)}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${hasNext
                    ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 font-bold"
                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  Next
                </button>
              </div>
            )}

            {/* Modal Footer */}
            {multiSelect && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                <button
                  onClick={() => { setIsOpen(false); setSearchTerm(""); }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:bg-indigo-600-foreground transition-all"
                >
                  Apply Filters
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Loading and error states */}
      {loading && (
        <p className="text-xs text-slate-400 mt-1">Fetching options...</p>
      )}

      {fetchError && !loading && (
        <div className="mt-1">
          <p className="text-xs text-red-500 inline">{fetchError}. </p>
          <button
            type="button"
            onClick={handleRetry}
            className="text-xs text-indigo-600 underline font-medium hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {error && !fetchError && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}