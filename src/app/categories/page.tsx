"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Tags, Trash2, Search, Loader2, 
  FolderPlus, AlertCircle, CheckCircle2, ShieldAlert,
  RefreshCw, Sparkles, Folder, ArrowRight, Calendar
} from 'lucide-react';
import Link from 'next/link';
import { getCategoryList, createCategory, deleteCategory } from '@/services/lms.services';
import Pagination from '@/components/ui/Pagination';

export interface CategoryItem {
  name: string;
  category: string;
  creation?: string;
  modified?: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Single field creation
  const [categoryInput, setCategoryInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Search filter & pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const CATEGORIES_PER_PAGE = 6;

  // Delete modal/state
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Role verification
  const [isInstructor, setIsInstructor] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem('apiKey');
      const roles = localStorage.getItem('roles') || '';
      const hasInstructorRole = Boolean(
        apiKey && (roles.includes('Instructor') || roles.includes('Administrator') || roles.includes('System Manager'))
      );
      setIsInstructor(hasInstructorRole);
      setCheckingAuth(false);

      if (hasInstructorRole) {
        fetchCategories();
      } else {
        setLoading(false);
      }
    }
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCategoryList();
      
      // Unpack response matching the API response:
      // { message: { status: 200, message: "...", data: { categories: [ ... ], total: 7, ... } } }
      let list: any[] = [];
      let total: number = 0;

      if (res?.data?.categories && Array.isArray(res.data.categories)) {
        list = res.data.categories;
        total = Number(res.data.total) || list.length;
      } else if (res?.message?.data?.categories && Array.isArray(res.message.data.categories)) {
        list = res.message.data.categories;
        total = Number(res.message.data.total) || list.length;
      } else if (res?.message?.categories && Array.isArray(res.message.categories)) {
        list = res.message.categories;
        total = Number(res.message.total) || list.length;
      } else if (res?.categories && Array.isArray(res.categories)) {
        list = res.categories;
        total = Number(res.total) || list.length;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
        total = list.length;
      } else if (Array.isArray(res?.message)) {
        list = res.message;
        total = list.length;
      } else if (Array.isArray(res)) {
        list = res;
        total = list.length;
      }

      const formatted: CategoryItem[] = list
        .map((item: any) => {
          if (typeof item === 'string') {
            const clean = item.trim();
            return clean ? { name: clean, category: clean } : null;
          }
          const catName = (item?.category || item?.name || item?.title || '').trim();
          if (!catName) return null;
          return {
            name: (item.name || catName).trim(),
            category: catName,
            creation: item.creation,
            modified: item.modified,
          };
        })
        .filter(Boolean) as CategoryItem[];

      // Deduplicate by category name while preserving rich metadata
      const uniqueMap = new Map<string, CategoryItem>();
      formatted.forEach(c => {
        const key = c.category.toLowerCase();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, c);
        }
      });
      const uniqueList = Array.from(uniqueMap.values());

      setCategories(uniqueList);
      setTotalCount(total || uniqueList.length);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      setError(err?.message || 'Failed to fetch categories list.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = categoryInput.trim();
    if (!trimmed) {
      setFormError('Please enter a valid category name.');
      return;
    }

    // Check duplicate locally
    if (categories.some(c => c.category.toLowerCase() === trimmed.toLowerCase() || c.name.toLowerCase() === trimmed.toLowerCase())) {
      setFormError(`Category "${trimmed}" already exists.`);
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      setSuccess(null);

      await createCategory({ category: trimmed });

      setSuccess(`Category "${trimmed}" created successfully!`);
      setCategoryInput('');
      
      // Refresh list
      await fetchCategories();
      
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      console.error('Error creating category:', err);
      setFormError(err?.message || 'Failed to create category. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    try {
      setDeletingCategory(cat.name);
      setError(null);

      await deleteCategory(cat.name || cat.category);

      setSuccess(`Category "${cat.category}" deleted successfully.`);
      setDeleteConfirm(null);
      
      // Optimistically update
      setCategories(prev => prev.filter(c => c.name !== cat.name && c.category !== cat.category));
      setTotalCount(prev => Math.max(0, prev - 1));
      
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError(err?.message || 'Failed to delete category.');
    } finally {
      setDeletingCategory(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return null;
    }
  };

  const filteredCategories = categories.filter(c => 
    c.category.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE));
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * CATEGORIES_PER_PAGE,
    currentPage * CATEGORIES_PER_PAGE
  );

  // Auto-clamp page if items shrink (e.g. deletion or filtering)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  // Instructor-only guard
  if (!isInstructor) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        
        {/* Sleek compact banner */}
        <div className="bg-slate-900 text-white pt-6 pb-12 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Course Categories
            </h1>
            <p className="text-slate-300 max-w-2xl mx-auto text-xs md:text-sm mt-1.5">
              Category management workspace for instructors.
            </p>
          </div>
        </div>

        <main className="flex-grow max-w-xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Instructor Access Required</h2>
            <p className="text-sm text-slate-500">
              Only verified instructors and platform administrators can create or manage course categories.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Sleek Compact Hero Banner */}
      <div className="bg-slate-900 text-white pt-6 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl"></div>
          <div className="absolute top-10 -left-20 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold mb-2 border border-indigo-500/30">
                <Tags className="w-3.5 h-3.5 text-indigo-400" />
                Instructor Taxonomy Workspace
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Course{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-300">
                  Categories
                </span>
              </h1>
              <p className="text-slate-300 max-w-2xl text-xs md:text-sm mt-1.5">
                Organize learning subjects and classify course topics across the student catalog.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchCategories}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition-all disabled:opacity-50"
                title="Refresh Categories List"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Workspace */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20 space-y-6">
        
        {/* Global Notifications */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 text-xs">Dismiss</button>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Card 1: Single Field Category Creator (Instructor Only) */}
          <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 sticky top-24">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FolderPlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Create Category</h2>
                <p className="text-[11px] text-slate-500">Quick single-field category setup</p>
              </div>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label htmlFor="category" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="category"
                    name="category"
                    value={categoryInput}
                    onChange={(e) => {
                      setCategoryInput(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Programming, Design, AI & ML"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                    disabled={submitting}
                  />
                </div>
                {formError && (
                  <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formError}</span>
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-2">
                  Categories allow students to filter and discover courses by specialized subject areas.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !categoryInput.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Category...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Category</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card 2: Existing Categories List with Search & Actions */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Tags className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Existing Categories</h2>
                  <p className="text-[11px] text-slate-500">
                    {totalCount || categories.length} total active {totalCount === 1 ? 'category' : 'categories'}
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter categories..."
                  className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Loading categories taxonomy...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl p-8 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Folder className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {searchQuery ? 'No matching categories' : 'No categories yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery 
                    ? `No category found matching "${searchQuery}". Clear your search or create a new one.` 
                    : 'Get started by creating your first course category in the form.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline mt-1"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paginatedCategories.map((cat) => {
                    const isPendingDelete = deleteConfirm === cat.name;
                    const isDeleting = deletingCategory === cat.name;
                    const formattedDate = formatDate(cat.creation);

                    return (
                      <div
                        key={cat.name}
                        className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate" title={cat.category}>
                              {cat.category}
                            </p>
                            {formattedDate && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{formattedDate}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Delete confirmation or action button */}
                        <div className="shrink-0">
                          {isPendingDelete ? (
                            <div className="flex items-center gap-1.5 animate-fade-in">
                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                disabled={isDeleting}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                              >
                                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={isDeleting}
                                className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(cat.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-80 group-hover:opacity-100"
                              title={`Delete category "${cat.category}"`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Categories Pagination Controls */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredCategories.length}
                  pageSize={CATEGORIES_PER_PAGE}
                  itemName="categories"
                  hideOnSinglePage={false}
                />
              </div>
            )}
          </div>

        </div>

      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 text-center mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-medium">© 2026 Stridenex Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
