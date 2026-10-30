"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  CreditCard,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock3,
  GraduationCap,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  ArrowLeft,
  RefreshCw,
  Clock
} from "lucide-react";
import {
  UserInfo,
  PaymentSummary,
  ActivePlan,
  MentorEarningsSummary,
  CategoryTab,
  PaymentItem,
  UnifiedPaymentHistoryData,
} from "@/types/payment.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_FRAPPE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://devstridenex.quantcloud.in";

export default function PaymentsPage() {
  const router = useRouter();
  const [data, setData] = useState<UnifiedPaymentHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async (category = "all", page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const apiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("apiKey") || localStorage.getItem("api_key")
          : null;
      const apiSecret =
        typeof window !== "undefined"
          ? localStorage.getItem("apiSecret") || localStorage.getItem("api_secret")
          : null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey && apiSecret) {
        headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/method/lms.lms.stride_lms.get_user_payment_history?category=${category}&page=${page}&page_length=15`,
        { headers, credentials: "include" }
      );
      const json = await res.json();
      if (json.message?.success && json.message?.data) {
        setData(json.message.data);
      } else if (json.message?.data) {
        setData(json.message.data);
      } else if (json.data) {
        setData(json.data);
      } else if (json.message?.payments) {
        setData(json.message);
      } else {
        setError(
          json.message?.message ||
            (typeof json.message === "string"
              ? json.message
              : "Failed to load payment history.")
        );
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to payment service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments(activeCategory, currentPage);
  }, [fetchPayments, activeCategory, currentPage]);

  const handleCategoryChange = (key: string) => {
    setActiveCategory(key);
    setCurrentPage(1);
  };

  const handleBackToDashboard = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid" || s === "completed" || s === "active" || s === "confirmed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {status || "Paid"}
        </span>
      );
    }
    if (s === "pending" || s === "processing") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock3 className="w-3.5 h-3.5 text-amber-500" />
          {status || "Pending"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
        {status || "Failed"}
      </span>
    );
  };

  const formatCurrency = (val?: number, currency = "INR") => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: 2,
      }).format(val || 0);
    } catch {
      return `₹${(val || 0).toLocaleString("en-IN")}`;
    }
  };

  const buildDownloadUrl = (url: string) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${API_BASE_URL}${cleanUrl}`;
  };

  const userInfo = data?.user_info;
  const summary = data?.summary;
  const activePlan = summary?.active_plan;
  const earningsSummary = data?.mentor_earnings_summary;
  const categories = data?.categories || [];
  const payments = data?.payments || [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          
          {/* Header Title & Role */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Payments & Billing
                </h1>
                {userInfo?.role_label && (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {userInfo.role_label}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                View your transaction history, invoices, and active subscriptions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToDashboard}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 shadow-sm transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => fetchPayments(activeCategory, currentPage)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 shadow-sm transition cursor-pointer disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* View 1: Organization Active Plan Banner */}
          {userInfo?.is_organization && activePlan && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    <Building2 className="w-3.5 h-3.5" />
                    Institutional Membership
                  </div>
                  <h2 className="text-xl font-bold text-white">{activePlan.name}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span>
                      Cycle: <strong>{activePlan.duration || "Annual"}</strong>
                    </span>
                    {activePlan.expiry_date && (
                      <span>
                        Valid until: <strong>{activePlan.expiry_date}</strong>
                      </span>
                    )}
                    {activePlan.invoice_no && (
                      <span>
                        Invoice Ref: <strong>{activePlan.invoice_no}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {activePlan.invoice_url && (
                  <a
                    href={buildDownloadUrl(activePlan.invoice_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition shadow"
                  >
                    <Download className="w-4 h-4" />
                    Download Current Invoice PDF
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Dynamic KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Base Card: Total Paid / Total Investment */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {userInfo?.is_organization ? "Total Investment" : "Total Paid"}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(summary?.total_spent, summary?.currency)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {summary?.plans_count || 0} subscription payments
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>

            {/* Mentor Specific KPIs */}
            {userInfo?.is_mentor && earningsSummary && (
              <>
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Session Earnings
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {formatCurrency(earningsSummary.total_earnings, earningsSummary.currency)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {earningsSummary.completed_sessions} completed sessions
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Conducted Sessions
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {earningsSummary.total_sessions_conducted}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">1-on-1 mentorship</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Pending Payouts
                    </p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      {earningsSummary.pending_payout_count}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Awaiting bank settlement</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
              </>
            )}

            {/* Student Specific KPIs */}
            {userInfo?.is_student && !userInfo?.is_mentor && !userInfo?.is_organization && (
              <>
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Mentorship Sessions
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(summary?.sessions_spent, summary?.currency)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {summary?.sessions_count || 0} sessions booked
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Courses & Batches
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(summary?.courses_spent, summary?.currency)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {summary?.courses_count || 0} enrollments
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Transactions
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {summary?.total_transactions || 0}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Lifetime invoices</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                    <Receipt className="w-6 h-6" />
                  </div>
                </div>
              </>
            )}

            {/* Organization Secondary KPI Card */}
            {userInfo?.is_organization && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total Invoices
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {summary?.plans_count || 0}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Institutional renewals</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Category Tabs */}
          {categories.length > 1 && (
            <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
              {categories.map((tab: CategoryTab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleCategoryChange(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl whitespace-nowrap transition cursor-pointer ${
                    activeCategory === tab.key
                      ? "bg-slate-900 text-white shadow"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeCategory === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-slate-200/70 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Table / Content Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 animate-pulse">
                Loading payment history...
              </div>
            ) : error ? (
              <div className="p-10 text-center text-rose-500 text-sm">
                <AlertCircle className="w-8 h-8 mx-auto text-rose-400 mb-2" />
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchPayments(activeCategory, currentPage)}
                  className="mt-3 px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600">No payment records found.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Transactions will appear here once confirmed.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 sm:px-6">Description / Item</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Invoice / Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {payments.map((p: PaymentItem) => {
                      const downloadUrl = p.download_url || p.invoice_url;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-4 px-4 sm:px-6">
                            <p className="font-semibold text-slate-900">{p.title}</p>
                            {p.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                            )}
                            {p.invoice_no && (
                              <p className="text-xs text-slate-400 font-mono mt-0.5">
                                ID: {p.invoice_no}
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap text-slate-600 text-xs">
                            {p.date}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-700 font-medium">
                              {p.category_label || p.category}
                            </span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap font-semibold text-slate-900">
                            {formatCurrency(p.amount, p.currency)}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            {getStatusBadge(p.payout_status || p.status)}
                          </td>
                          <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
                            {downloadUrl ? (
                              <a
                                href={buildDownloadUrl(downloadUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                              >
                                <Download className="w-3.5 h-3.5" />
                                PDF
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/40">
                <p className="text-xs text-slate-500">
                  Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.total_pages}</strong> (
                  {pagination.total_items} items)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.total_pages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
