"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ticket,
  Sparkles,
  Check,
  AlertCircle,
  ArrowLeft,
  ShieldAlert,
  Info,
  Layers,
  FileCode,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  BookOpen,
  Calendar,
  Percent,
  DollarSign,
  Tag,
  Loader2,
  Users
} from 'lucide-react';
import { createLMSCoupon, getCourses, Course, CreateLMSCouponPayload } from '@/services/lms.services';
import { navigateBack } from '@/utils/navigation';

export default function CreateCouponPage() {
  const router = useRouter();
  const [isInstructor, setIsInstructor] = useState<boolean | null>(null);

  // Form State initialized completely blank with no static/default values (as requested)
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'Percentage' | 'Amount'>('Percentage');
  const [percentageDiscount, setPercentageDiscount] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [expiresOn, setExpiresOn] = useState('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [enabled, setEnabled] = useState<number>(1);

  // Applicable items / courses
  const [applicableCourses, setApplicableCourses] = useState<string[]>([]);
  const [customCourseInput, setCustomCourseInput] = useState('');

  // Available LMS courses from backend for easy selection
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCouponCode, setSuccessCouponCode] = useState<string | null>(null);

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
    fetchCourseCatalog();
  }, []);

  const fetchCourseCatalog = async () => {
    try {
      setCoursesLoading(true);
      const courses = await getCourses();
      setAllCourses(Array.isArray(courses) ? courses : []);
    } catch (err) {
      console.error('Failed to load courses catalog for coupon selector:', err);
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleToggleCourse = (courseTitleOrName: string) => {
    if (applicableCourses.includes(courseTitleOrName)) {
      setApplicableCourses(applicableCourses.filter((c) => c !== courseTitleOrName));
    } else {
      setApplicableCourses([...applicableCourses, courseTitleOrName]);
    }
  };

  const handleAddCustomCourse = () => {
    const trimmed = customCourseInput.trim();
    if (trimmed && !applicableCourses.includes(trimmed)) {
      setApplicableCourses([...applicableCourses, trimmed]);
      setCustomCourseInput('');
    }
  };

  const handleRemoveCourse = (courseName: string) => {
    setApplicableCourses(applicableCourses.filter((c) => c !== courseName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!code.trim()) {
      setError('Please enter a coupon code (e.g. PYTHON20).');
      return;
    }

    if (discountType === 'Percentage') {
      const num = Number(percentageDiscount);
      if (!percentageDiscount || isNaN(num) || num <= 0 || num > 100) {
        setError('Please enter a valid percentage discount between 1% and 100%.');
        return;
      }
    } else {
      const num = Number(amount);
      if (!amount || isNaN(num) || num <= 0) {
        setError('Please enter a valid discount amount greater than 0.');
        return;
      }
    }

    // Build payload matching exact Frappe create_lms_coupon structure
    const payload: CreateLMSCouponPayload = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      enabled: enabled ? 1 : 0,
      applicable_items: applicableCourses.map((item) => ({ item }))
    };

    if (discountType === 'Percentage') {
      payload.percentage_discount = Number(percentageDiscount);
    } else {
      payload.amount = Number(amount);
    }

    if (expiresOn) {
      payload.expires_on = expiresOn;
    }

    if (usageLimit && Number(usageLimit) > 0) {
      payload.usage_limit = Number(usageLimit);
    }

    try {
      setIsSubmitting(true);
      await createLMSCoupon(payload);
      setSuccessCouponCode(payload.code);
      // Auto navigate back after short toast
      setTimeout(() => {
        router.push('/coupons');
      }, 1800);
    } catch (err: any) {
      console.error('Failed to create coupon:', err);

      let cleanMsg = '';
      if (err?.response?.data?._server_messages) {
        try {
          const parsed = typeof err.response.data._server_messages === 'string'
            ? JSON.parse(err.response.data._server_messages)
            : err.response.data._server_messages;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const item = typeof parsed[0] === 'string' ? JSON.parse(parsed[0]) : parsed[0];
            if (item?.message) {
              cleanMsg = String(item.message).replace(/<[^>]*>?/gm, '').trim();
            }
          }
        } catch {}
      }

      if (!cleanMsg && err?.response?.data?.message) {
        cleanMsg = typeof err.response.data.message === 'string'
          ? err.response.data.message
          : err.response.data.message?.message || '';
      }

      if (!cleanMsg && err?.message && typeof err.message === 'string') {
        cleanMsg = err.message;
      }

      // Filter out technical server internals, traceback, or raw JSON
      if (
        !cleanMsg ||
        cleanMsg.includes('{') ||
        cleanMsg.includes('[') ||
        cleanMsg.includes('Unsupported fields') ||
        cleanMsg.includes('__frappe_exc_id') ||
        cleanMsg.includes('Traceback') ||
        cleanMsg.includes('raise_exception') ||
        cleanMsg.length > 150
      ) {
        cleanMsg = 'Please verify coupon details and ensure you have instructor permissions.';
      }

      setError(cleanMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instructor permission lock gate
  if (isInstructor === false) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Instructor Access Required
          </h2>
          <p className="text-sm text-slate-600 mt-2 mb-6">
            Only users with the <span className="font-bold text-slate-800">Instructor</span> or Admin role can generate promotional discount coupons for courses.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/coupons"
              onClick={(e) => {
                e.preventDefault();
                navigateBack(router, "/coupons");
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Back to Coupons
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white pt-10 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          <Link
            href="/coupons"
            onClick={(e) => {
              e.preventDefault();
              navigateBack(router, "/coupons");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Coupons List
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-2">
                <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                Instructor Portal
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Create Course Discount Coupon
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Configure voucher code, discount amount, expiry date, and course applicability.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 pb-20 w-full relative z-20">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-10 space-y-8"
        >
          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error creating coupon</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successCouponCode && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Coupon {successCouponCode} created successfully!</p>
                <p className="text-emerald-700 mt-0.5">Redirecting to coupons list...</p>
              </div>
            </div>
          )}

          {/* Section 1: Coupon Code & Status */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-emerald-500" /> Coupon Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Coupon Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. PYTHON20, SUMMER50, WELCOME10"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm font-mono font-bold tracking-wider uppercase text-slate-900 placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    UPPERCASE
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Unique coupon code learners will type during checkout.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={enabled}
                  onChange={(e) => setEnabled(Number(e.target.value))}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm font-bold text-slate-800 bg-white"
                >
                  <option value={1}>Enabled (Active)</option>
                  <option value={0}>Disabled</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Active coupons can be redeemed immediately.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Discount Type & Value */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Percent className="w-3.5 h-3.5 text-emerald-500" /> Discount Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Discount Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType('Percentage')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      discountType === 'Percentage'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" /> Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('Amount')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      discountType === 'Amount'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Fixed Amount
                  </button>
                </div>
              </div>

              {discountType === 'Percentage' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Percentage Discount (%) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      placeholder="e.g. 20 (for 20% off)"
                      value={percentageDiscount}
                      onChange={(e) => setPercentageDiscount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm font-bold text-slate-800"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Enter a value between 1 and 100.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Discount Amount ($) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm font-bold text-slate-800"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      $
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Fixed discount deducted from checkout.</p>
                </div>
              )}
            </div>

            {/* Expiry & Usage limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expires On (Optional)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={expiresOn}
                    placeholder="DD/MM/YYYY"
                    onChange={(e) => setExpiresOn(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm font-medium text-slate-800 uppercase"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave empty if the coupon never expires.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Usage Limit (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100 redemptions"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm font-medium text-slate-800"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Max total times this coupon can be redeemed.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Applicable Courses Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Applicable Courses
              </h3>
              <span className="text-xs text-indigo-600 font-bold">
                {applicableCourses.length === 0 ? 'Valid for All Courses' : `${applicableCourses.length} Selected`}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Select which courses this coupon applies to. If no courses are selected, the voucher is universal and valid for any course.
            </p>

            {/* Quick Chips of Selected Courses */}
            {applicableCourses.length > 0 && (
              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 block">
                  Active Coupon Applicability:
                </span>
                <div className="flex flex-wrap gap-2">
                  {applicableCourses.map((cName) => (
                    <span
                      key={cName}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-indigo-800 text-xs font-bold border border-indigo-200 shadow-2xs"
                    >
                      <Check className="w-3 h-3 text-indigo-600" />
                      <span>{cName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(cName)}
                        className="text-slate-400 hover:text-rose-600 transition-colors ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Courses Catalog Selector */}
            {allCourses.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Select from Course Catalog:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-2xl">
                  {allCourses.map((course) => {
                    const identifier = course.title || course.name;
                    const isSelected = applicableCourses.includes(identifier);
                    return (
                      <button
                        type="button"
                        key={course.name}
                        onClick={() => handleToggleCourse(identifier)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                            : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{identifier}</span>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Course Name Input fallback */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Or Add Custom Course Title:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Introduction to Python"
                  value={customCourseInput}
                  onChange={(e) => setCustomCourseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomCourse();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-xs font-medium text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCourse}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Add Course
                </button>
              </div>
            </div>
          </div>

          {/* Action Submission Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/coupons"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Coupon...
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  Publish Coupon
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
