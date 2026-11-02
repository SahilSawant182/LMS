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
  Clock,
  FileText,
  Printer,
  X,
  Loader2,
  ExternalLink
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

interface SelectedInvoice {
  url: string;
  title: string;
  invoiceNo?: string;
  date?: string;
  amount?: number;
  currency?: string;
}

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

  // PDF Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<SelectedInvoice | null>(null);
  const [invoiceBlobUrl, setInvoiceBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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

      const currentUser =
        typeof window !== "undefined"
          ? localStorage.getItem("userEmail") ||
            localStorage.getItem("user") ||
            localStorage.getItem("email") ||
            ""
          : "";
      const userParam = currentUser ? `&user=${encodeURIComponent(currentUser)}` : "";

      let res = await fetch(
        `${API_BASE_URL}/api/method/lms.lms.stride_lms.get_user_payment_history?category=${category}&page=${page}&page_length=15${userParam}`,
        { headers, credentials: "include" }
      );

      // Fallback to devlms.stridenex.ai if needed
      if (!res.ok && API_BASE_URL.includes("devstridenex.quantcloud.in")) {
        try {
          const fallbackRes = await fetch(
            `https://devlms.stridenex.ai/api/method/lms.lms.stride_lms.get_user_payment_history?category=${category}&page=${page}&page_length=15${userParam}`,
            { headers, credentials: "include" }
          );
          if (fallbackRes.ok) {
            res = fallbackRes;
          }
        } catch (_) {}
      }

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
      router.push("/");
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
    let cleanUrl = url;
    // Route Sales Invoices / download_pdf and course payment slips to devlms.stridenex.ai where ERPNext & LMS reside
    if (
      cleanUrl.includes("devstridenex.quantcloud.in") &&
      (cleanUrl.includes("download_pdf") || cleanUrl.includes("download_payment_slip"))
    ) {
      cleanUrl = cleanUrl.replace("https://devstridenex.quantcloud.in", "https://devlms.stridenex.ai");
    }

    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      return cleanUrl;
    }
    const path = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;
    if (path.includes("download_payment_slip") || path.includes("download_pdf")) {
      return `https://devlms.stridenex.ai${path}`;
    }
    return `${API_BASE_URL}${path}`;
  };

  // Fetch PDF as authenticated blob to avoid redirects to backend login
  const fetchInvoicePdf = useCallback(async (url: string) => {
    setPdfLoading(true);
    setPdfError(null);
    if (invoiceBlobUrl) {
      URL.revokeObjectURL(invoiceBlobUrl);
      setInvoiceBlobUrl(null);
    }
    try {
      const apiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("apiKey") || localStorage.getItem("api_key")
          : null;
      const apiSecret =
        typeof window !== "undefined"
          ? localStorage.getItem("apiSecret") || localStorage.getItem("api_secret")
          : null;

      const headers: Record<string, string> = {};
      if (apiKey && apiSecret) {
        headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
      }

      const fullUrl = buildDownloadUrl(url);
      let res = await fetch(fullUrl, { headers, credentials: "include" });

      // Fallback 1: If devstridenex failed with 500, retry on devlms.stridenex.ai where ERPNext is working
      if (!res.ok && fullUrl.includes("devstridenex.quantcloud.in")) {
        const fallbackUrl = fullUrl.replace("https://devstridenex.quantcloud.in", "https://devlms.stridenex.ai");
        try {
          const fallbackRes = await fetch(fallbackUrl, { headers, credentials: "include" });
          if (fallbackRes.ok) {
            res = fallbackRes;
          }
        } catch (_) {}
      }

      // Fallback 2: Retry without format=Standard if print format issue
      if (!res.ok && fullUrl.includes("&format=Standard")) {
        const noFormatUrl = fullUrl.replace("&format=Standard", "");
        try {
          const altRes = await fetch(noFormatUrl, { headers, credentials: "include" });
          if (altRes.ok) {
            res = altRes;
          }
        } catch (_) {}
      }

      if (!res.ok) {
        throw new Error(`Server returned error status ${res.status}`);
      }

      const blob = await res.blob();

      // Check if response is HTML
      if (blob.type.includes("html") || blob.type.includes("text")) {
        const text = await blob.text();
        if (text.startsWith("{") && text.includes("exc_type")) {
          try {
            const parsed = JSON.parse(text);
            throw new Error(parsed.message || parsed.exc_type || "Invoice preview not available from server.");
          } catch (e: any) {
            throw new Error(e.message || "Server error while generating invoice");
          }
        }
        const htmlBlobUrl = URL.createObjectURL(new Blob([text], { type: "text/html" }));
        setInvoiceBlobUrl(htmlBlobUrl);
        return;
      }

      if (blob.type.includes("json")) {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text);
          throw new Error(parsed.message || parsed.exc_type || "Failed to load invoice PDF");
        } catch (e: any) {
          throw new Error(e.message || "Failed to load invoice PDF");
        }
      }

      const blobUrl = URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );
      setInvoiceBlobUrl(blobUrl);
    } catch (err: any) {
      console.error("Failed to fetch invoice PDF:", err);
      setPdfError(err?.message || "Failed to load invoice preview.");
    } finally {
      setPdfLoading(false);
    }
  }, [invoiceBlobUrl]);

  const handleOpenInvoiceModal = (invoice: SelectedInvoice) => {
    setSelectedInvoice(invoice);
    fetchInvoicePdf(invoice.url);
  };

  const handleCloseInvoiceModal = () => {
    if (invoiceBlobUrl) {
      URL.revokeObjectURL(invoiceBlobUrl);
    }
    setInvoiceBlobUrl(null);
    setSelectedInvoice(null);
    setPdfError(null);
  };

  const handleDownloadPdf = () => {
    if (!invoiceBlobUrl) return;
    const link = document.createElement("a");
    link.href = invoiceBlobUrl;
    link.download = `Invoice-${selectedInvoice?.invoiceNo || selectedInvoice?.title || "receipt"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdf = () => {
    const iframe = document.getElementById("invoice-pdf-frame") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else if (invoiceBlobUrl) {
      const printWindow = window.open(invoiceBlobUrl);
      printWindow?.print();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseInvoiceModal();
    };
    if (selectedInvoice) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedInvoice]);

  const userInfo = data?.user_info;
  const summary = data?.summary;
  const activePlan = summary?.active_plan;
  const earningsSummary = data?.mentor_earnings_summary;
  const payments = data?.payments || [];
  const pagination = data?.pagination;

  // Ensure "Courses & Batches" tab is always visible for students / learners or when course transactions exist
  const categories: CategoryTab[] = React.useMemo(() => {
    if (!data) return [];
    const list: CategoryTab[] = [...(data.categories || [])];

    const hasCourseTab = list.some((c) => c.key === "course");
    const courseCount =
      summary?.courses_count ??
      payments.filter((p) => p.category === "course").length ??
      0;

    // If user is a student/learner or if course transactions exist, guarantee the "course" tab
    if (!hasCourseTab && (!userInfo?.is_organization || courseCount > 0)) {
      list.push({
        key: "course",
        label: "Courses & Batches",
        count: courseCount,
      });
    }

    return list.map((tab) => {
      if (tab.key === "course" && tab.count === 0 && courseCount > 0) {
        return { ...tab, count: courseCount };
      }
      return tab;
    });
  }, [data, summary, userInfo, payments]);

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 flex flex-col py-8 px-4 sm:px-6 lg:px-8">
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
                <button
                  type="button"
                  onClick={() =>
                    handleOpenInvoiceModal({
                      url: activePlan.invoice_url!,
                      title: activePlan.name,
                      invoiceNo: activePlan.invoice_no,
                      date: activePlan.purchase_date || undefined,
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition shadow cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  View Current Invoice PDF
                </button>
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
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenInvoiceModal({
                                  url: downloadUrl,
                                  title: p.title,
                                  invoiceNo: p.invoice_no,
                                  date: p.date,
                                  amount: p.amount,
                                  currency: p.currency,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
                              title="View Invoice"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              PDF
                            </button>
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

        {/* PDF Invoice Preview Modal / Popup */}
        {selectedInvoice && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCloseInvoiceModal}
          >
            <div
              className="relative w-full max-w-4xl h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/90 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {selectedInvoice.title || "Invoice Preview"}
                      </h3>
                      {selectedInvoice.invoiceNo && (
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-200/80 text-slate-700">
                          {selectedInvoice.invoiceNo}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {selectedInvoice.date && <span>Date: {selectedInvoice.date} • </span>}
                      {selectedInvoice.amount !== undefined && (
                        <span>
                          Amount: {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {invoiceBlobUrl && (
                    <>
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition shadow-sm cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintPdf}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition shadow-sm cursor-pointer"
                        title="Print Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Print</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseInvoiceModal}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                {pdfLoading ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                    <p className="text-sm font-semibold text-slate-700">Loading invoice document...</p>
                    <p className="text-xs text-slate-400 mt-1">Authenticating and generating secure preview</p>
                  </div>
                ) : pdfError ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                    <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mb-1">Failed to load invoice</p>
                    <p className="text-xs text-slate-500 mb-4">{pdfError}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectedInvoice && fetchInvoicePdf(selectedInvoice.url)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer"
                      >
                        Try Again
                      </button>
                      {selectedInvoice && (
                        <a
                          href={buildDownloadUrl(selectedInvoice.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Link Directly
                        </a>
                      )}
                    </div>
                  </div>
                ) : invoiceBlobUrl ? (
                  <iframe
                    id="invoice-pdf-frame"
                    src={`${invoiceBlobUrl}#toolbar=1`}
                    className="w-full h-full border-0 bg-white"
                    title="Invoice PDF Document"
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
