"use client";

import React, { useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import {
  createCertificateEvaluation,
  getCertificateEvaluation,
  getCertificateEvaluations,
  deleteCertificateEvaluation,
  updateCertificateEvaluation
} from '@/services/lms.services';
import { getCurrentUserEmail } from '@/services/api.services';
import {
  CheckCircle, Trash2, PlusCircle,
  User, BookOpen, Star, Calendar, Clock, FileText, XCircle, RefreshCw, Edit2,
  LayoutGrid, LayoutList, X, Search, RotateCcw, Filter, Layers
} from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import { useRouter } from 'next/navigation';

const EMPTY_FORM = {
  name: '',
  member: '',
  course: '',
  batch_name: '',
  evaluator: '',
  date: new Date().toISOString().split('T')[0],
  start_time: '10:00:00',
  end_time: '11:00:00',
  rating: 4,
  status: 'Pass',
  summary: ''
};

export default function CertificateEvaluationsPage() {
  const router = useRouter();

  // List State
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter States: Name, Status, Course, Batch
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('');
  const [selectedCourseLabel, setSelectedCourseLabel] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [selectedBatchLabel, setSelectedBatchLabel] = useState('');

  // User
  const [currentUser, setCurrentUser] = useState<string>('');

  // Status Options
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach((e) => {
      if (e.status && typeof e.status === 'string') {
        set.add(e.status.trim());
      }
    });
    ['Pass', 'Fail', 'Pending'].forEach((s) => set.add(s));
    return Array.from(set);
  }, [evaluations]);

  // Filtered Evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((item) => {
      // 1. Name / Member filter
      if (nameFilter.trim()) {
        const q = nameFilter.toLowerCase().trim();
        const memberName = (item.member_name || '').toLowerCase();
        const memberEmail = (item.member || '').toLowerCase();
        const evalName = (item.name || '').toLowerCase();
        const matchesName = memberName.includes(q) || memberEmail.includes(q) || evalName.includes(q);
        if (!matchesName) return false;
      }

      // 2. Status filter
      if (statusFilter && statusFilter !== 'all') {
        const itemStatus = (item.status || '').toLowerCase().trim();
        if (itemStatus !== statusFilter.toLowerCase().trim()) return false;
      }

      // 3. Course filter (via Dropdown master API)
      if (courseFilter && courseFilter !== 'all') {
        const itemCourse = (item.course || item.course_name || item.course_title || '').toLowerCase().trim();
        const selectedCourse = courseFilter.toLowerCase().trim();
        const selectedLabel = selectedCourseLabel.toLowerCase().trim();
        const matchesCourse =
          itemCourse === selectedCourse ||
          (selectedLabel && itemCourse === selectedLabel) ||
          itemCourse.includes(selectedCourse) ||
          (selectedLabel && selectedLabel.includes(itemCourse));
        if (!matchesCourse) return false;
      }

      // 4. Batch filter (via Dropdown master API)
      if (batchFilter && batchFilter !== 'all') {
        const itemBatch = (item.batch_name || item.batch || item.batch_title || '').toLowerCase().trim();
        const selectedBatch = batchFilter.toLowerCase().trim();
        const selectedLabel = selectedBatchLabel.toLowerCase().trim();
        const matchesBatch =
          itemBatch === selectedBatch ||
          (selectedLabel && itemBatch === selectedLabel) ||
          itemBatch.includes(selectedBatch) ||
          (selectedLabel && selectedLabel.includes(itemBatch));
        if (!matchesBatch) return false;
      }

      return true;
    });
  }, [evaluations, nameFilter, statusFilter, courseFilter, selectedCourseLabel, batchFilter, selectedBatchLabel]);

  const hasActiveFilters = Boolean(
    nameFilter.trim() ||
    (statusFilter && statusFilter !== 'all') ||
    (courseFilter && courseFilter !== 'all') ||
    (batchFilter && batchFilter !== 'all')
  );

  const handleResetFilters = () => {
    setNameFilter('');
    setStatusFilter('all');
    setCourseFilter('');
    setSelectedCourseLabel('');
    setBatchFilter('');
    setSelectedBatchLabel('');
  };

  // Form / Modal State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState('');
  const [createError, setCreateError] = useState('');

  React.useEffect(() => {
    const email = getCurrentUserEmail();
    if (email) setCurrentUser(email);
    fetchEvaluationsList();
  }, []);

  const fetchEvaluationsList = async () => {
    setListLoading(true);
    setListError('');
    try {
      const res = await getCertificateEvaluations();
      let fetchedData: any[] = [];
      if (Array.isArray(res)) fetchedData = res;
      else if (res && Array.isArray(res.data)) fetchedData = res.data;
      else if (res && res.message && Array.isArray(res.message)) fetchedData = res.message;
      else if (res && typeof res === 'object' && (res as any).name) fetchedData = [res];
      setEvaluations(fetchedData);
    } catch (err: any) {
      setListError(err?.message || 'Failed to fetch evaluations.');
    } finally {
      setListLoading(false);
    }
  };

  const openCreateForm = () => {
    setFormData({ ...EMPTY_FORM });
    setCreateSuccess('');
    setCreateError('');
    setShowForm(true);
  };

  const openEditForm = async (evalData: any) => {
    setCreateSuccess('');
    setCreateError('');
    setFormData({
      name: evalData.name || '',
      member: evalData.member || '',
      course: evalData.course || '',
      batch_name: evalData.batch_name || '',
      evaluator: evalData.evaluator || '',
      date: evalData.date || EMPTY_FORM.date,
      start_time: evalData.start_time || '10:00:00',
      end_time: evalData.end_time || '11:00:00',
      rating: evalData.rating || 4,
      status: evalData.status || 'Pass',
      summary: evalData.summary || ''
    });
    setShowForm(true);
    try {
      const res = await getCertificateEvaluation(evalData.name);
      let fullData: any = null;
      if (Array.isArray(res)) fullData = res[0];
      else if (res && Array.isArray(res.data)) fullData = res.data[0];
      else if (res && res.message && Array.isArray(res.message)) fullData = res.message[0];
      else if (res && typeof res === 'object' && (res as any).name) fullData = res;
      else if (res && res.data && typeof res.data === 'object' && res.data.name) fullData = res.data;
      if (fullData) {
        setFormData({
          name: fullData.name || '',
          member: fullData.member || '',
          course: fullData.course || '',
          batch_name: fullData.batch_name || '',
          evaluator: fullData.evaluator || '',
          date: fullData.date || EMPTY_FORM.date,
          start_time: fullData.start_time || '10:00:00',
          end_time: fullData.end_time || '11:00:00',
          rating: fullData.rating || 4,
          status: fullData.status || 'Pass',
          summary: fullData.summary || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch full evaluation details:', err);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({ ...EMPTY_FORM });
    setCreateSuccess('');
    setCreateError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateSuccess('');
    setCreateError('');
    try {
      if (formData.name) {
        await updateCertificateEvaluation(formData as any);
        setCreateSuccess('Certificate evaluation updated successfully!');
      } else {
        await createCertificateEvaluation(formData);
        setCreateSuccess('Certificate evaluation created successfully!');
      }
      setFormData({ ...EMPTY_FORM });
      fetchEvaluationsList();
      setTimeout(() => {
        setShowForm(false);
        setCreateSuccess('');
      }, 1500);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to save evaluation. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (evalName: string) => {
    if (!evalName) return;
    if (!confirm('Are you sure you want to delete this evaluation?')) return;
    setDeleteLoading(evalName);
    try {
      await deleteCertificateEvaluation(evalName);
      setEvaluations(prev => prev.filter(e => e.name !== evalName));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete evaluation.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleCardClick = (evaluationName: string) => {
    router.push(`/certificate-evaluations/${encodeURIComponent(evaluationName)}`);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Pass') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (status === 'Fail') return 'bg-red-100 text-red-700 border border-red-100';
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-slate-900 text-white pt-6 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute top-10 -left-20 w-60 h-60 rounded-full bg-violet-500/15 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">Certificate Evaluations</h1>
            <p className="text-indigo-200 text-xs sm:text-sm">Create, manage, and track student evaluations seamlessly.</p>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            New Evaluation
          </button>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20 space-y-6">

        {/* Filters & Search Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Search by student name / email */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Search by student name, email, or evaluation ID..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {nameFilter && (
                <button
                  type="button"
                  onClick={() => setNameFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Dropdowns: Status, Course, Batch */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Filter */}
              <div className="w-[130px] sm:w-[140px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition-colors"
                >
                  <option value="all">All Statuses</option>
                  {statusOptions.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course Filter (Dropdown master API with doctype LMS Course) */}
              <div className="w-[180px] sm:w-[200px]">
                <Dropdown
                  id="filter-course"
                  value={courseFilter}
                  onChange={(val) => {
                    setCourseFilter(val || '');
                    if (!val) setSelectedCourseLabel('');
                  }}
                  onSelectOption={(opt) => setSelectedCourseLabel(opt?.label || '')}
                  endpoint="https://devlms.stridenex.ai/api/method/lms.lms.master.get_dropdown_options"
                  params={{ doctype: "LMS Course", user: currentUser }}
                  placeholder="All Courses"
                  modalTitle="SELECT COURSE"
                  clearable
                  searchable
                  triggerClassName="!h-10 !min-h-[40px] !bg-slate-50 !border-slate-200 !rounded-xl !text-xs !font-semibold !text-slate-700 hover:!border-slate-300 !px-3 !py-0 flex items-center shadow-none cursor-pointer"
                />
              </div>

              {/* Batch Filter (Dropdown master API with doctype LMS Batch) */}
              <div className="w-[160px] sm:w-[180px]">
                <Dropdown
                  id="filter-batch"
                  value={batchFilter}
                  onChange={(val) => {
                    setBatchFilter(val || '');
                    if (!val) setSelectedBatchLabel('');
                  }}
                  onSelectOption={(opt) => setSelectedBatchLabel(opt?.label || '')}
                  endpoint="https://devlms.stridenex.ai/api/method/lms.lms.master.get_dropdown_options"
                  params={{ doctype: "LMS Batch", user: currentUser }}
                  placeholder="All Batches"
                  modalTitle="SELECT BATCH"
                  clearable
                  searchable
                  triggerClassName="!h-10 !min-h-[40px] !bg-slate-50 !border-slate-200 !rounded-xl !text-xs !font-semibold !text-slate-700 hover:!border-slate-300 !px-3 !py-0 flex items-center shadow-none cursor-pointer"
                />
              </div>

              {/* Reset Filters button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="h-10 inline-flex items-center gap-1.5 px-3.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200/60 transition-colors cursor-pointer"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Active filter pills row */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
                <Filter className="w-3 h-3 text-indigo-500" /> Active filters:
              </span>
              {nameFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-xs border border-indigo-100">
                  Name: {nameFilter}
                  <button type="button" onClick={() => setNameFilter('')} className="hover:text-indigo-900 ml-0.5 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {statusFilter && statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-xs border border-indigo-100">
                  Status: {statusFilter}
                  <button type="button" onClick={() => setStatusFilter('all')} className="hover:text-indigo-900 ml-0.5 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {courseFilter && courseFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-xs border border-indigo-100">
                  Course: {selectedCourseLabel || courseFilter}
                  <button
                    type="button"
                    onClick={() => {
                      setCourseFilter('');
                      setSelectedCourseLabel('');
                    }}
                    className="hover:text-indigo-900 ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {batchFilter && batchFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-xs border border-indigo-100">
                  Batch: {selectedBatchLabel || batchFilter}
                  <button
                    type="button"
                    onClick={() => {
                      setBatchFilter('');
                      setSelectedBatchLabel('');
                    }}
                    className="hover:text-indigo-900 ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            All Evaluations
            {evaluations.length > 0 && (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {hasActiveFilters ? `${filteredEvaluations.length} of ${evaluations.length}` : evaluations.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="hidden sm:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Refresh */}
            <button
              onClick={fetchEvaluationsList}
              disabled={listLoading}
              title="Refresh"
              className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error */}
        {listError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm font-medium">
            {listError}
          </div>
        )}

        {/* Loading Skeleton */}
        {listLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!listLoading && evaluations.length === 0 && !listError && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No evaluations found</h3>
            <p className="text-slate-500 text-sm mb-6">There are currently no certificate evaluations in the system.</p>
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Create First Evaluation
            </button>
          </div>
        )}

        {/* Filtered Empty State */}
        {!listLoading && evaluations.length > 0 && filteredEvaluations.length === 0 && !listError && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No matching evaluations found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              No evaluations match your search criteria. Try adjusting or resetting your status, course, batch, or name filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters
            </button>
          </div>
        )}

        {/* Grid View */}
        {!listLoading && filteredEvaluations.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvaluations.map((evaluation, idx) => (
              <div
                key={evaluation.name || idx}
                onClick={() => handleCardClick(evaluation.name)}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col overflow-hidden cursor-pointer group"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {(evaluation.member_name || evaluation.member || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                        {evaluation.member_name || evaluation.member || 'Student'}
                      </h3>
                      {evaluation.member_name && (
                        <p className="text-[11px] text-slate-400 truncate">{evaluation.member}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full flex-shrink-0 ${getStatusBadge(evaluation.status)}`}>
                    {evaluation.status || 'Unknown'}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5 flex-grow space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Course</p>
                      <p className="text-xs font-semibold text-slate-800 truncate">{evaluation.course || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                      <p className="text-xs font-semibold text-slate-800">{evaluation.date || '—'}</p>
                    </div>
                    {evaluation.batch_name && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Batch</p>
                        <p className="text-xs font-semibold text-slate-800 truncate">{evaluation.batch_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rating</p>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < (evaluation.rating || 0) ? 'fill-current' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {evaluation.start_time && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{evaluation.start_time} – {evaluation.end_time}</span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div
                  className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => openEditForm(evaluation)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {!listLoading && filteredEvaluations.length > 0 && viewMode === 'list' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvaluations.map((evaluation, idx) => (
                    <tr
                      key={evaluation.name || idx}
                      onClick={() => handleCardClick(evaluation.name)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {(evaluation.member_name || evaluation.member || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{evaluation.member_name || evaluation.member || 'Student'}</p>
                            {evaluation.member_name && <p className="text-[10px] text-slate-400">{evaluation.member}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        <p className="truncate max-w-[160px]">{evaluation.course || '—'}</p>
                        {evaluation.batch_name && <p className="text-[10px] text-slate-400 truncate">{evaluation.batch_name}</p>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <p>{evaluation.date || '—'}</p>
                        {evaluation.start_time && <p className="text-[10px] text-slate-400">{evaluation.start_time} – {evaluation.end_time}</p>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < (evaluation.rating || 0) ? 'fill-current' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(evaluation.status)}`}>
                          {evaluation.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => openEditForm(evaluation)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── Form Modal (Create / Edit) ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeForm}
          />
          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                {formData.name ? `Edit Evaluation` : 'New Evaluation Record'}
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {createSuccess && (
                <div className="mb-5 p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-3 border border-emerald-100">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-medium text-sm">{createSuccess}</p>
                </div>
              )}
              {createError && (
                <div className="mb-5 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 border border-red-100">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-medium text-sm">{createError}</p>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" /> Member Email
                    </label>
                    <input
                      type="email" name="member" required value={formData.member}
                      onChange={handleInputChange} placeholder="student@example.com"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 z-[90]">
                    <Dropdown
                      id="course" label="Course" value={formData.course}
                      onChange={(value) => setFormData(prev => ({ ...prev, course: value }))}
                      endpoint="https://devlms.stridenex.ai/api/method/lms.lms.master.get_dropdown_options"
                      params={{ doctype: "LMS Course", user: currentUser }}
                      placeholder="Select Course" required searchable
                    />
                  </div>

                  <div className="space-y-1.5 z-[80]">
                    <Dropdown
                      id="batch_name" label="Batch Name" value={formData.batch_name}
                      onChange={(value) => setFormData(prev => ({ ...prev, batch_name: value }))}
                      endpoint="https://devlms.stridenex.ai/api/method/lms.lms.master.get_dropdown_options"
                      params={{ doctype: "LMS Batch", user: currentUser }}
                      placeholder="Select Batch" searchable
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Evaluator Email</label>
                    <input
                      type="email" name="evaluator" value={formData.evaluator}
                      onChange={handleInputChange} placeholder="evaluator@example.com"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" /> Date
                    </label>
                    <input
                      type="date" name="date" value={formData.date} onChange={handleInputChange}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" /> Time (Start – End)
                    </label>
                    <div className="flex gap-2">
                      <input type="time" name="start_time" step="1" value={formData.start_time} onChange={handleInputChange} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm" />
                      <input type="time" name="end_time" step="1" value={formData.end_time} onChange={handleInputChange} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400" /> Rating (1-5)
                    </label>
                    <input
                      type="number" name="rating" min="1" max="5" value={formData.rating}
                      onChange={handleInputChange}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Status</label>
                    <select
                      name="status" value={formData.status} onChange={handleInputChange}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm"
                    >
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Evaluation Summary</label>
                  <textarea
                    name="summary" rows={3} value={formData.summary} onChange={handleInputChange}
                    placeholder="Student successfully completed the evaluation."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button" onClick={closeForm}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={createLoading}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-7 py-2.5 rounded-lg font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {createLoading ? 'Saving...' : formData.name ? 'Update Evaluation' : 'Create Evaluation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
