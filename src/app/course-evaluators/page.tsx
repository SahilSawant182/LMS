"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Pagination from '@/components/ui/Pagination';
import Link from 'next/link';
import {
  UserCheck,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Trash2,
  Edit3,
  Plus,
  Search,
  Mail,
  Copy,
  Check,
  CalendarOff,
  Users,
  ArrowRight,
  X,
  Sparkles,
  Loader2,
  Layers,
  CalendarDays
} from 'lucide-react';
import {
  getCourseEvaluatorList,
  createCourseEvaluator,
  updateCourseEvaluator,
  deleteCourseEvaluator,
  CourseEvaluatorItem,
  CourseEvaluatorScheduleItem
} from '@/services/lms.services';
import { getImageUrl } from '@/services/api.services';

// Format date string to DD-MM-YYYY format
const formatDateDDMMYYYY = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  const match = clean.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}-${month}-${year}`;
  }
  try {
    const d = new Date(clean.replace(' ', 'T'));
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {}
  return dateStr;
};

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const DAY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Monday: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Tuesday: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  Wednesday: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Thursday: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  Friday: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Saturday: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Sunday: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

// Format HH:MM:SS or HH:MM to 12-hour AM/PM
const formatTime12h = (timeStr?: string): string => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

// Normalize to HH:MM:SS for API submission
const normalizeTimeForApi = (timeStr?: string): string => {
  if (!timeStr) return '09:00:00';
  const parts = timeStr.trim().split(':');
  if (parts.length === 1) return `${parts[0].padStart(2, '0')}:00:00`;
  if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
};

// Format to HH:MM for HTML time inputs
const normalizeTimeForInput = (timeStr?: string): string => {
  if (!timeStr) return '09:00';
  const parts = timeStr.trim().split(':');
  if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  return '09:00';
};

// Check if today falls in leave window
const isCurrentlyOnLeave = (from?: string | null, to?: string | null): boolean => {
  if (!from || !to) return false;
  const today = new Date().toISOString().split('T')[0];
  return today >= from && today <= to;
};

// Check if upcoming leave is scheduled
const isUpcomingLeave = (from?: string | null): boolean => {
  if (!from) return false;
  const today = new Date().toISOString().split('T')[0];
  return from > today;
};

export default function CourseEvaluatorsPage() {
  const [evaluators, setEvaluators] = useState<CourseEvaluatorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Authentication & instructor verification
  const [isInstructor, setIsInstructor] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'leave'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 6;

  // Modal State (Create / Edit)
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formEvaluator, setFormEvaluator] = useState<string>('');
  const [formUnavailableFrom, setFormUnavailableFrom] = useState<string>('');
  const [formUnavailableTo, setFormUnavailableTo] = useState<string>('');
  const [formSchedule, setFormSchedule] = useState<CourseEvaluatorScheduleItem[]>([
    { day: 'Sunday', start_time: '15:00:00', end_time: '20:00:00' }
  ]);

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [evaluatorToDelete, setEvaluatorToDelete] = useState<CourseEvaluatorItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);

  // Copied Email state
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // View style
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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
        fetchEvaluators();
      } else {
        setLoading(false);
      }

      const handleAuthChange = () => {
        const updatedRoles = localStorage.getItem('roles') || '';
        const updatedKey = localStorage.getItem('apiKey');
        const isAuth = Boolean(
          updatedKey && (updatedRoles.includes('Instructor') || updatedRoles.includes('Administrator') || updatedRoles.includes('System Manager'))
        );
        setIsInstructor(isAuth);
      };

      window.addEventListener('auth-changed', handleAuthChange);
      return () => window.removeEventListener('auth-changed', handleAuthChange);
    }
  }, []);

  const fetchEvaluators = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCourseEvaluatorList();

      let list: any[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res?.data && Array.isArray(res.data)) {
        list = res.data;
      } else if (res?.message && Array.isArray(res.message)) {
        list = res.message;
      } else if (res?.data?.evaluators && Array.isArray(res.data.evaluators)) {
        list = res.data.evaluators;
      } else if (res?.message?.evaluators && Array.isArray(res.message.evaluators)) {
        list = res.message.evaluators;
      } else if (res?.message?.data && Array.isArray(res.message.data)) {
        list = res.message.data;
      } else if (res?.message?.data?.evaluators && Array.isArray(res.message.data.evaluators)) {
        list = res.message.data.evaluators;
      }

      const parsed: CourseEvaluatorItem[] = list
        .map((item: any) => {
          let scheduleArr: CourseEvaluatorScheduleItem[] = [];
          if (Array.isArray(item.schedule)) {
            scheduleArr = item.schedule;
          } else if (typeof item.schedule === 'string') {
            try {
              const p = JSON.parse(item.schedule);
              if (Array.isArray(p)) scheduleArr = p;
            } catch (e) {
              scheduleArr = [];
            }
          }

          const rawEvaluator = item.evaluator || item.name || '';
          if (!rawEvaluator) return null;

          return {
            name: item.name || rawEvaluator,
            evaluator: rawEvaluator,
            full_name: item.full_name || null,
            username: item.username || null,
            user_image: item.user_image || null,
            unavailable_from: item.unavailable_from || null,
            unavailable_to: item.unavailable_to || null,
            schedule: scheduleArr.map((s: any) => ({
              day: s.day || s.day_of_week || 'Monday',
              start_time: s.start_time || '09:00:00',
              end_time: s.end_time || '17:00:00',
            })),
            creation: item.creation,
            modified: item.modified,
          };
        })
        .filter(Boolean) as CourseEvaluatorItem[];

      // Deduplicate by name/evaluator
      const uniqueMap = new Map<string, CourseEvaluatorItem>();
      parsed.forEach(item => {
        const key = item.name.toLowerCase();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });

      setEvaluators(Array.from(uniqueMap.values()));
    } catch (err: any) {
      console.error('Failed to load course evaluators:', err);
      setError(err?.message || 'Failed to fetch course evaluators list.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormName('');
    setFormEvaluator('');
    setFormUnavailableFrom('');
    setFormUnavailableTo('');
    setFormSchedule([
      { day: 'Sunday', start_time: '15:00:00', end_time: '20:00:00' }
    ]);
    setModalError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: CourseEvaluatorItem) => {
    setModalMode('edit');
    setFormName(item.name || item.evaluator);
    setFormEvaluator(item.evaluator || item.name);
    setFormUnavailableFrom(item.unavailable_from || '');
    setFormUnavailableTo(item.unavailable_to || '');
    
    if (item.schedule && item.schedule.length > 0) {
      setFormSchedule(item.schedule.map(s => ({
        day: s.day,
        start_time: normalizeTimeForApi(s.start_time),
        end_time: normalizeTimeForApi(s.end_time)
      })));
    } else {
      setFormSchedule([
        { day: 'Sunday', start_time: '15:00:00', end_time: '20:00:00' }
      ]);
    }

    setModalError(null);
    setModalOpen(true);
  };

  const handleAddScheduleSlot = () => {
    setFormSchedule(prev => [
      ...prev,
      { day: 'Monday', start_time: '09:00:00', end_time: '17:00:00' }
    ]);
  };

  const handleRemoveScheduleSlot = (index: number) => {
    setFormSchedule(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateScheduleSlot = (index: number, field: keyof CourseEvaluatorScheduleItem, value: string) => {
    setFormSchedule(prev => {
      const updated = [...prev];
      if (field === 'start_time' || field === 'end_time') {
        updated[index] = { ...updated[index], [field]: normalizeTimeForApi(value) };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleApplyPreset = (preset: 'weekdays' | 'weekend') => {
    if (preset === 'weekdays') {
      const slots: CourseEvaluatorScheduleItem[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => ({
        day,
        start_time: '09:00:00',
        end_time: '17:00:00'
      }));
      setFormSchedule(slots);
    } else if (preset === 'weekend') {
      const slots: CourseEvaluatorScheduleItem[] = ['Saturday', 'Sunday'].map(day => ({
        day,
        start_time: '10:00:00',
        end_time: '18:00:00'
      }));
      setFormSchedule(slots);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formEvaluator.trim();

    // Validation
    if (!email) {
      setModalError('Evaluator email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setModalError('Please enter a valid email address (e.g. happy123@gmail.com).');
      return;
    }

    if (formUnavailableFrom && formUnavailableTo && formUnavailableFrom > formUnavailableTo) {
      setModalError('The "Unavailable From" date cannot be after the "Unavailable To" date.');
      return;
    }

    if (formSchedule.length === 0) {
      setModalError('Please add at least one weekly schedule slot.');
      return;
    }

    // Check slot validities
    for (let i = 0; i < formSchedule.length; i++) {
      const slot = formSchedule[i];
      if (!slot.start_time || !slot.end_time) {
        setModalError(`Slot #${i + 1} (${slot.day}) has an invalid time range.`);
        return;
      }
      if (slot.start_time >= slot.end_time) {
        setModalError(`Slot #${i + 1} (${slot.day}): start time must be earlier than end time.`);
        return;
      }
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      const payloadSchedule = formSchedule.map(s => ({
        day: s.day,
        start_time: normalizeTimeForApi(s.start_time),
        end_time: normalizeTimeForApi(s.end_time)
      }));

      if (modalMode === 'create') {
        await createCourseEvaluator({
          evaluator: email,
          unavailable_from: formUnavailableFrom || null,
          unavailable_to: formUnavailableTo || null,
          schedule: payloadSchedule,
        });
        setSuccess(`Course evaluator "${email}" created successfully.`);
      } else {
        await updateCourseEvaluator({
          name: formName || email,
          evaluator: email,
          unavailable_from: formUnavailableFrom || null,
          unavailable_to: formUnavailableTo || null,
          schedule: payloadSchedule,
        });
        setSuccess(`Course evaluator "${email}" updated successfully.`);
      }

      setModalOpen(false);
      await fetchEvaluators();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error saving course evaluator:', err);
      setModalError(err?.message || 'Failed to save course evaluator. Please try again.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (item: CourseEvaluatorItem) => {
    setEvaluatorToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!evaluatorToDelete) return;

    try {
      setDeleteSubmitting(true);
      setError(null);
      const targetIdentifier = evaluatorToDelete.name || evaluatorToDelete.evaluator;

      await deleteCourseEvaluator(targetIdentifier);

      setSuccess(`Evaluator "${evaluatorToDelete.evaluator}" deleted successfully.`);
      setDeleteModalOpen(false);
      setEvaluatorToDelete(null);

      // Optimistic update
      setEvaluators(prev => prev.filter(e => e.name !== evaluatorToDelete.name && e.evaluator !== evaluatorToDelete.evaluator));
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to delete course evaluator:', err);
      setError(err?.message || 'Failed to delete evaluator.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedEmail(text);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = evaluators.length;
    let onLeaveCount = 0;
    let totalSlots = 0;

    evaluators.forEach(e => {
      if (isCurrentlyOnLeave(e.unavailable_from, e.unavailable_to)) {
        onLeaveCount++;
      }
      totalSlots += e.schedule?.length || 0;
    });

    const activeCount = total - onLeaveCount;
    return { total, activeCount, onLeaveCount, totalSlots };
  }, [evaluators]);

  // Filtering & Pagination
  const filteredEvaluators = useMemo(() => {
    return evaluators.filter(item => {
      // Query filter
      const matchesQuery = !searchQuery.trim() || 
        item.evaluator.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());

      // Day filter
      const matchesDay = selectedDayFilter === 'all' || 
        item.schedule?.some(s => s.day.toLowerCase() === selectedDayFilter.toLowerCase());

      // Status filter
      const onLeave = isCurrentlyOnLeave(item.unavailable_from, item.unavailable_to);
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'leave' && onLeave) ||
        (statusFilter === 'available' && !onLeave);

      return matchesQuery && matchesDay && matchesStatus;
    });
  }, [evaluators, searchQuery, selectedDayFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvaluators.length / ITEMS_PER_PAGE));
  const paginatedEvaluators = useMemo(() => {
    return filteredEvaluators.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredEvaluators, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Loading spinner for auth check
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

  // Instructor Only Guard
  if (!isInstructor) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        
        <div className="bg-slate-900 text-white pt-8 pb-14 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Course Evaluator Management
            </h1>
            <p className="text-slate-300 max-w-2xl mx-auto text-xs md:text-sm mt-1.5">
              Restricted workspace for certified LMS instructors and staff.
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
              Only verified instructors and platform administrators have permissions to configure course evaluators and availability shifts.
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

      {/* Hero Header Banner */}
      <div className="bg-slate-900 text-white pt-6 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-violet-500/15 blur-3xl"></div>
          <div className="absolute top-10 -left-20 w-60 h-60 rounded-full bg-indigo-500/15 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[11px] font-semibold mb-2 border border-violet-500/30">
                <UserCheck className="w-3.5 h-3.5 text-violet-400" />
                Instructor Portal • Evaluation Staff
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Course{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300">
                  Evaluators
                </span>
              </h1>
              <p className="text-slate-300 max-w-2xl text-xs md:text-sm mt-1.5">
                Manage evaluation staff, availability schedules, shifts, and leave timeframes.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchEvaluators}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition-all disabled:opacity-50"
                title="Refresh Evaluator List"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Evaluator</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20 space-y-6">
        
        {/* Global Notifications */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 text-xs font-semibold">Dismiss</button>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold">Dismiss</button>
          </div>
        )}

        {/* Quick Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Evaluators</p>
              <h3 className="text-xl font-extrabold text-slate-800">{metrics.total}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available Now</p>
              <h3 className="text-xl font-extrabold text-emerald-700">{metrics.activeCount}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">On Leave / Away</p>
              <h3 className="text-xl font-extrabold text-amber-700">{metrics.onLeaveCount}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Scheduled Shifts</p>
              <h3 className="text-xl font-extrabold text-indigo-700">{metrics.totalSlots}</h3>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by evaluator email..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Day Filter */}
            <select
              value={selectedDayFilter}
              onChange={(e) => {
                setSelectedDayFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter evaluators by day"
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="all">All Days</option>
              {DAYS_OF_WEEK.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              aria-label="Filter evaluators by availability status"
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="leave">On Leave</option>
            </select>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${viewMode === 'grid' ? 'bg-white shadow-xs text-violet-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                title="Grid View"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${viewMode === 'table' ? 'bg-white shadow-xs text-violet-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                title="Table View"
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading evaluators...</p>
            <p className="text-xs text-slate-400 mt-1">Retrieving scheduled slots and leave data</p>
          </div>
        ) : filteredEvaluators.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200/80 shadow-xs text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 mx-auto flex items-center justify-center mb-4">
              <UserCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Evaluators Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              {searchQuery || selectedDayFilter !== 'all' || statusFilter !== 'all'
                ? 'No evaluators matched your filter criteria. Try adjusting your search query or reset filters.'
                : 'No course evaluators have been registered yet. Add your first evaluator to set up consultation availability.'}
            </p>
            {searchQuery || selectedDayFilter !== 'all' || statusFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDayFilter('all');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Evaluator</span>
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedEvaluators.map((item) => {
              const onLeave = isCurrentlyOnLeave(item.unavailable_from, item.unavailable_to);
              const upcoming = isUpcomingLeave(item.unavailable_from);
              const initial = (item.evaluator || 'E').charAt(0).toUpperCase();

              return (
                <div
                  key={item.name}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-violet-200 transition-all duration-200 flex flex-col overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.user_image ? (
                          <img
                            src={getImageUrl(item.user_image)}
                            alt={item.full_name || item.evaluator}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-xs border border-violet-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {initial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-slate-900 truncate" title={item.full_name || item.evaluator}>
                              {item.full_name || item.evaluator}
                            </h3>
                            <button
                              onClick={() => copyToClipboard(item.evaluator)}
                              className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5 rounded transition-colors"
                              title="Copy email"
                            >
                              {copiedEmail === item.evaluator ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium truncate">
                            {item.full_name ? item.evaluator : `ID: ${item.name}`}
                          </p>
                        </div>
                      </div>

                      {/* Status Chip */}
                      {onLeave ? (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          On Leave
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Available
                        </span>
                      )}
                    </div>

                    {/* Unavailability Banner if configured */}
                    {(item.unavailable_from || item.unavailable_to) && (
                      <div className={`mt-3.5 px-3 py-2 rounded-xl text-[11px] flex items-center gap-2 border ${onLeave ? 'bg-amber-50/70 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <CalendarOff className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">
                          <strong className="font-semibold">{onLeave ? 'Leave Period:' : upcoming ? 'Upcoming Leave:' : 'Scheduled Leave:'}</strong>{' '}
                          {formatDateDDMMYYYY(item.unavailable_from) || 'Any'} &rarr; {formatDateDDMMYYYY(item.unavailable_to) || 'Ongoing'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Weekly Schedule Section */}
                  <div className="p-5 flex-grow space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Weekly Schedule
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {item.schedule?.length || 0} {item.schedule?.length === 1 ? 'Slot' : 'Slots'}
                      </span>
                    </div>

                    {item.schedule && item.schedule.length > 0 ? (
                      <div className="space-y-1.5">
                        {item.schedule.map((slot, idx) => {
                          const style = DAY_COLORS[slot.day] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
                          return (
                            <div
                              key={idx}
                              className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border ${style.bg} ${style.border}`}
                            >
                              <span className={`font-bold ${style.text}`}>{slot.day}</span>
                              <span className="font-semibold text-slate-700 text-[11px] flex items-center gap-1">
                                {formatTime12h(slot.start_time)}
                                <span className="text-slate-400">&ndash;</span>
                                {formatTime12h(slot.end_time)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl text-center text-slate-400 text-xs italic">
                        No weekly shifts registered
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 hover:text-violet-700 hover:bg-violet-50 text-xs font-bold transition-colors"
                      title="Edit Evaluator"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                      title="Delete Evaluator"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Evaluator</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Leave Window</th>
                    <th className="py-3 px-4">Weekly Slots</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedEvaluators.map((item) => {
                    const onLeave = isCurrentlyOnLeave(item.unavailable_from, item.unavailable_to);
                    return (
                      <tr key={item.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            {item.user_image ? (
                              <img
                                src={getImageUrl(item.user_image)}
                                alt={item.full_name || item.evaluator}
                                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-violet-100"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 font-bold flex items-center justify-center shrink-0">
                                {(item.full_name || item.evaluator || 'E').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-800">{item.full_name || item.evaluator}</p>
                              <p className="text-[10px] text-slate-400">{item.full_name ? item.evaluator : `ID: ${item.name}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {onLeave ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                              On Leave
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {item.unavailable_from || item.unavailable_to ? (
                            <span className="text-[11px] font-medium">
                              {formatDateDDMMYYYY(item.unavailable_from) || 'Any'} &rarr; {formatDateDDMMYYYY(item.unavailable_to) || 'Ongoing'}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None set</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.schedule && item.schedule.length > 0 ? (
                              item.schedule.map((slot, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]"
                                >
                                  {slot.day}: {formatTime12h(slot.start_time)}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(item)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredEvaluators.length}
          pageSize={ITEMS_PER_PAGE}
          itemName="evaluators"
          className="pt-2"
        />
      </main>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {modalMode === 'create' ? 'Add Course Evaluator' : 'Edit Course Evaluator'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {modalMode === 'create' ? 'Register evaluator email, leave window and weekly availability' : `Updating ${formName || formEvaluator}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
              {modalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Evaluator Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Evaluator Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={formEvaluator}
                    onChange={(e) => setFormEvaluator(e.target.value)}
                    placeholder="e.g. happy123@gmail.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The primary email address associated with the evaluator account.
                </p>
              </div>

              {/* Unavailability Window */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CalendarOff className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-800">Unavailability / Leave Window</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">Optional</span>
                  </div>
                  {(formUnavailableFrom || formUnavailableTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormUnavailableFrom('');
                        setFormUnavailableTo('');
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Unavailable From
                    </label>
                    <input
                      type="date"
                      value={formUnavailableFrom}
                      placeholder="DD/MM/YYYY"
                      onChange={(e) => setFormUnavailableFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 uppercase [&::-webkit-datetime-edit]:uppercase [&::-webkit-datetime-edit-fields-wrapper]:uppercase [&::-webkit-datetime-edit-text]:uppercase [&::-webkit-datetime-edit-month-field]:uppercase [&::-webkit-datetime-edit-day-field]:uppercase [&::-webkit-datetime-edit-year-field]:uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Unavailable To
                    </label>
                    <input
                      type="date"
                      value={formUnavailableTo}
                      placeholder="DD/MM/YYYY"
                      onChange={(e) => setFormUnavailableTo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 uppercase [&::-webkit-datetime-edit]:uppercase [&::-webkit-datetime-edit-fields-wrapper]:uppercase [&::-webkit-datetime-edit-text]:uppercase [&::-webkit-datetime-edit-month-field]:uppercase [&::-webkit-datetime-edit-day-field]:uppercase [&::-webkit-datetime-edit-year-field]:uppercase"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  During this date span, the evaluator will be marked on leave and unavailable for booking assessments.
                </p>
              </div>

              {/* Weekly Availability Schedule */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Weekly Schedule Shifts <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-400">Specify days and working time windows.</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('weekdays')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors"
                      title="Set Mon-Fri 09:00 - 17:00"
                    >
                      Preset: Mon-Fri 9-5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('weekend')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors"
                      title="Set Sat-Sun 10:00 - 18:00"
                    >
                      Preset: Weekend
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {formSchedule.map((slot, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-2.5"
                    >
                      <div className="w-full sm:w-1/3">
                        <select
                          value={slot.day}
                          onChange={(e) => handleUpdateScheduleSlot(index, 'day', e.target.value)}
                          aria-label={`Shift #${index + 1} day`}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        >
                          {DAYS_OF_WEEK.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-2/3 flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="time"
                            value={normalizeTimeForInput(slot.start_time)}
                            onChange={(e) => handleUpdateScheduleSlot(index, 'start_time', e.target.value)}
                            aria-label={`Shift #${index + 1} start time`}
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                        <span className="text-slate-400 text-xs font-bold">&rarr;</span>
                        <div className="flex-1">
                          <input
                            type="time"
                            value={normalizeTimeForInput(slot.end_time)}
                            onChange={(e) => handleUpdateScheduleSlot(index, 'end_time', e.target.value)}
                            aria-label={`Shift #${index + 1} end time`}
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>

                        {formSchedule.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveScheduleSlot(index)}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                            title="Remove Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddScheduleSlot}
                  className="w-full py-2.5 border border-dashed border-violet-300 hover:border-violet-400 bg-violet-50/50 hover:bg-violet-50 text-violet-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Time Slot</span>
                </button>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={modalSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-violet-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{modalMode === 'create' ? 'Create Evaluator' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && evaluatorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Delete Evaluator</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove evaluator <strong className="text-slate-800">{evaluatorToDelete.evaluator}</strong>? All scheduled weekly evaluation shifts will be removed immediately.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleteSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
