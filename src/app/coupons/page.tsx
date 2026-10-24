"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  Ticket,
  Sparkles,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  Info,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Tag,
  RefreshCw,
  Percent,
  DollarSign,
  Clock,
  Users,
  Copy,
  Check,
  BookOpen,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import { getLMSCouponList, getLMSCoupon, LMSCoupon } from '@/services/lms.services';
import { apiService, getCurrentUserEmail } from '@/services/api.services';

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

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<LMSCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [discountTypeFilter, setDiscountTypeFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Selected coupon for detailed drawer/modal inspection
  const [selectedCoupon, setSelectedCoupon] = useState<LMSCoupon | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem('apiKey');
      const roles = localStorage.getItem('roles') || '';
      if (!apiKey) {
        setIsInstructor(false);
      } else {
        setIsInstructor(roles.includes('Instructor'));
      }
    }
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);

      const rolesStr = typeof window !== 'undefined' ? (localStorage.getItem('roles') || '') : '';
      const isInst = typeof window !== 'undefined'
        ? (localStorage.getItem('isInstructor') === 'true' || rolesStr.includes('Instructor'))
        : false;
      const isAdmin = rolesStr.includes('Administrator') || rolesStr.includes('System Manager');
      const userEmail = getCurrentUserEmail();

      // Ensure get coupon API has user as query params for the role instructor only
      const filters: Record<string, any> = {};
      if (isInst && !isAdmin && userEmail) {
        filters.user = userEmail;
      }

      // For instructors, load their managed courses to verify course ownership on coupons
      let myCourseNames = new Set<string>();
      if (isInst && !isAdmin && userEmail) {
        try {
          const res = await apiService.get('method/lms.lms.stride_lms.get_courses', {
            params: {
              doctype: 'LMS Course',
              user: userEmail
            }
          });
          let rawCourses: any[] = [];
          if (res?.message?.data && Array.isArray(res.message.data)) rawCourses = res.message.data;
          else if (res?.message && Array.isArray(res.message)) rawCourses = res.message;
          else if (res?.data && Array.isArray(res.data)) rawCourses = res.data;
          else if (Array.isArray(res)) rawCourses = res;

          const targetUser = userEmail.toLowerCase().trim();
          rawCourses.forEach((c: any) => {
            const ownerField = c?.owner ? String(c.owner).toLowerCase().trim() : '';
            const createdByField = c?.created_by ? String(c.created_by).toLowerCase().trim() : '';
            const instField = c?.instructor ? String(c.instructor).toLowerCase().trim() : '';
            let matches = ownerField === targetUser || createdByField === targetUser || instField === targetUser;
            if (!matches && Array.isArray(c?.instructors)) {
              matches = c.instructors.some((inst: any) => {
                if (typeof inst === 'string') return inst.toLowerCase().trim() === targetUser;
                const instName = String(inst?.name || '').toLowerCase().trim();
                const instEmail = String(inst?.email || '').toLowerCase().trim();
                const instUsername = String(inst?.username || '').toLowerCase().trim();
                const instInstructor = String(inst?.instructor || '').toLowerCase().trim();
                return instName === targetUser || instEmail === targetUser || instUsername === targetUser || instInstructor === targetUser;
              });
            }
            if (matches) {
              if (c.name) myCourseNames.add(String(c.name).toLowerCase().trim());
              if (c.title) myCourseNames.add(String(c.title).toLowerCase().trim());
            }
          });
        } catch (e) {
          console.warn('Could not load instructor courses for coupon filtering:', e);
        }
      }

      const data = await getLMSCouponList(filters);
      let list = Array.isArray(data) ? data : [];

      // For instructors only: ensure coupons created for specific courses are only visible if the course was created or managed by this instructor
      if (isInst && !isAdmin && userEmail) {
        const targetUser = userEmail.toLowerCase().trim();
        list = list.filter((coupon) => {
          // If the instructor is the creator/owner of the coupon, visible
          const cOwner = String(coupon.owner || '').toLowerCase().trim();
          if (cOwner === targetUser) return true;

          // If coupon is assigned to specific courses, ensure at least one course belongs to this instructor
          if (Array.isArray(coupon.applicable_items) && coupon.applicable_items.length > 0) {
            return coupon.applicable_items.some((item: any) => {
              const cName = typeof item === 'string'
                ? item.toLowerCase().trim()
                : String(item?.reference_name || item?.item || item?.course || '').toLowerCase().trim();
              return myCourseNames.has(cName);
            });
          }

          // If coupon is not owned by this instructor and has no courses belonging to this instructor, do not show
          return false;
        });
      }

      setCoupons(list);
    } catch (err: any) {
      console.error('Failed to fetch coupons:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load coupons list.');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectCoupon = async (name: string) => {
    try {
      setDetailLoading(true);
      const detail = await getLMSCoupon(name);
      setSelectedCoupon(detail);
    } catch (err) {
      console.error('Error fetching coupon detail:', err);
      // Fallback to local match
      const localMatch = coupons.find((c) => c.name === name);
      if (localMatch) setSelectedCoupon(localMatch);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  // Filter logic
  const filteredCoupons = coupons.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      (c.applicable_items &&
        c.applicable_items.some((item: any) =>
          typeof item === 'string'
            ? (item as string).toLowerCase().includes(q)
            : (item?.reference_name || item?.item || item?.course || '')?.toLowerCase().includes(q)
        ));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'enabled'
        ? Number(c.enabled) === 1
        : Number(c.enabled) === 0;

    const matchesType =
      discountTypeFilter === 'all' ||
      (c.discount_type && c.discount_type.toLowerCase() === discountTypeFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesType;
  });

  const activeCount = coupons.filter((c) => Number(c.enabled) === 1).length;
  const percentageCount = coupons.filter((c) => c.discount_type === 'Percentage').length;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white pt-6 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl"></div>
          <div className="absolute top-10 -left-20 w-60 h-60 rounded-full bg-indigo-500/15 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold mb-2 border border-emerald-500/30">
                <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                Promotion & Discount Engine
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                LMS Course{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-200">
                  Coupons
                </span>
              </h1>
              <p className="text-slate-300 max-w-2xl text-xs md:text-sm mt-1.5">
                Create and manage promotional discount vouchers for your courses. Reward learners and boost enrollments.
              </p>
            </div>

            {/* Instructor Quick Action button */}
            <div className="flex items-center gap-3">
              {isInstructor && (
                <Link
                  href="/coupons/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  Create Coupon
                </Link>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Coupons</span>
              <p className="text-xl font-bold mt-0.5 text-white">{coupons.length}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Active & Live</span>
              <p className="text-xl font-bold mt-0.5 text-emerald-400">{activeCount}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Percentage Off</span>
              <p className="text-xl font-bold mt-0.5 text-teal-300">{percentageCount}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Instructor Access</span>
              <p className="text-xs font-bold mt-1 text-indigo-300">
                {isInstructor ? 'Verified Creator' : 'Read Only'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-12 w-full relative z-20">
        {/* Filters and Controls Bar */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/70 p-4 md:p-5 mb-8">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by coupon code (e.g. PYTHON20) or applicable course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-600">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="enabled">Active Only</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Discount Type Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-600">Type:</span>
                <select
                  value={discountTypeFilter}
                  onChange={(e) => setDiscountTypeFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="Percentage">Percentage</option>
                  <option value="Amount">Fixed Amount</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchCoupons}
                title="Refresh list"
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Access Warning for non-instructors */}
        {isInstructor === false && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-bold">Viewing in Learner Mode</p>
              <p className="mt-0.5 text-amber-800">
                You can browse promotional coupons and their applicable courses. Creating new coupons is reserved for instructors and system administrators.
              </p>
            </div>
          </div>
        )}

        {/* Coupons List / Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-3xl bg-white border border-slate-200/80 p-6 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-6 w-1/3 bg-slate-200 rounded-lg"></div>
                  <div className="h-4 w-2/3 bg-slate-100 rounded"></div>
                  <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
                </div>
                <div className="h-10 bg-slate-100 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-rose-100 shadow-sm">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">Unable to load coupons</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">{error}</p>
            <button
              onClick={fetchCoupons}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner">
              <Ticket className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No coupons found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
              {searchTerm || statusFilter !== 'all' || discountTypeFilter !== 'all'
                ? 'No coupons matched your current search filters. Try clearing filters to see all available vouchers.'
                : 'There are no active coupons created yet on the platform.'}
            </p>
            {isInstructor && (
              <Link
                href="/coupons/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Coupon
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoupons.map((coupon) => {
              const isEnabled = Number(coupon.enabled) === 1;
              const isPercentage = coupon.discount_type === 'Percentage';
              const discountLabel = isPercentage
                ? `${coupon.percentage_discount || 0}% OFF`
                : `$${coupon.amount || 0} OFF`;

              const applicableList = coupon.applicable_items || [];

              return (
                <div
                  key={coupon.name}
                  className={`group bg-white rounded-3xl border transition-all duration-300 relative flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 ${
                    isEnabled
                      ? 'border-slate-200 hover:border-emerald-300'
                      : 'border-slate-200/60 opacity-80 bg-slate-50/50'
                  }`}
                >
                  {/* Decorative Ticket Edge / Header */}
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white relative">
                    {/* Top status & badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                        }`}
                      >
                        {isEnabled ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" /> Disabled
                          </>
                        )}
                      </span>

                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-emerald-400" />
                        {coupon.discount_type || 'Discount'}
                      </span>
                    </div>

                    {/* Code & Discount Value */}
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black font-mono tracking-wider text-white">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            title="Copy voucher code"
                            className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                          ID: {coupon.name}
                        </p>
                      </div>

                      {/* Discount Highlight pill */}
                      <div className="shrink-0 text-right">
                        <span className="inline-block px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm shadow-md shadow-emerald-500/30">
                          {discountLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Expiry & Usage limit */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Expires</p>
                          <p className="font-semibold text-slate-700 truncate">
                            {coupon.expires_on ? formatDateDDMMYYYY(coupon.expires_on) : 'Never'}
                          </p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Usage Limit</p>
                          <p className="font-semibold text-slate-700 truncate">
                            {coupon.usage_limit ? `${coupon.usage_limit} uses` : 'Unlimited'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Applicable Courses list preview */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          Applicable Courses
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {applicableList.length === 0 ? 'All Courses' : `${applicableList.length} Selected`}
                        </span>
                      </div>

                      {applicableList.length === 0 ? (
                        <p className="text-xs text-slate-500 italic bg-slate-50 rounded-xl p-2 border border-slate-100">
                          Universal coupon (valid on any course catalog).
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {applicableList.slice(0, 3).map((item, idx) => {
                            const itemName = typeof item === 'string' ? item : item.item;
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100 truncate max-w-[220px]"
                              >
                                <Check className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="truncate">{itemName}</span>
                              </span>
                            );
                          })}
                          {applicableList.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold">
                              +{applicableList.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleInspectCoupon(coupon.name)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          View Full Details <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {isInstructor && (
                          <Link
                            href={`/coupons/create?edit=${encodeURIComponent(coupon.name)}`}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </Link>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center gap-1.5"
                      >
                        {copiedCode === coupon.code ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Details Modal / Drawer */}
      {selectedCoupon && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-fade-in-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 to-indigo-950 p-6 text-white relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5" />
                    Coupon Specification
                  </span>
                  <h3 className="text-2xl font-black mt-1 font-mono tracking-wider">
                    {selectedCoupon.code}
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Doc ID: {selectedCoupon.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCoupon(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Top Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Discount Value</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedCoupon.discount_type === 'Percentage'
                      ? `${selectedCoupon.percentage_discount || 0}% Off`
                      : `$${selectedCoupon.amount || 0} Off`}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    Number(selectedCoupon.enabled) === 1
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {Number(selectedCoupon.enabled) === 1 ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Discount Type</span>
                  <span className="font-bold text-slate-800">{selectedCoupon.discount_type || 'Percentage'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Expires On</span>
                  <span className="font-bold text-slate-800">{selectedCoupon.expires_on ? formatDateDDMMYYYY(selectedCoupon.expires_on) : 'Never'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Usage Limit</span>
                  <span className="font-bold text-slate-800">
                    {selectedCoupon.usage_limit ? `${selectedCoupon.usage_limit} redemptions` : 'Unlimited'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Redeemed Count</span>
                  <span className="font-bold text-slate-800">{selectedCoupon.used_count || 0} times</span>
                </div>
              </div>

              {/* Applicable Courses list */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  Eligible Courses ({selectedCoupon.applicable_items?.length || 0})
                </h4>
                {(!selectedCoupon.applicable_items || selectedCoupon.applicable_items.length === 0) ? (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    No specific course restrictions recorded. (Note: standard coupons require at least one course assigned by backend rules).
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedCoupon.applicable_items.map((item, idx) => {
                      const itemName = typeof item === 'string' ? item : item.reference_name || item.item || item.course || '';
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs font-medium text-slate-800"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{itemName}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(selectedCoupon.code)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {copiedCode === selectedCoupon.code ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Code Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </>
                  )}
                </button>

                {isInstructor && (
                  <Link
                    href={`/coupons/create?edit=${encodeURIComponent(selectedCoupon.name)}`}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Coupon
                  </Link>
                )}
              </div>

              <button
                onClick={() => setSelectedCoupon(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
