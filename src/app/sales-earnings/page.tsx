"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DollarSign,
  Wallet,
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  getInstructorDashboard,
  InstructorDashboardData
} from "@/services/payment.services";
import { formatDate } from "@/utils/formatters";
import InstructorPayoutsTab from "@/components/instructor/InstructorPayoutsTab";
import InstructorSalesReportTab from "@/components/instructor/InstructorSalesReportTab";
import PaymentSlipModal from "@/components/modals/PaymentSlipModal";
import Pagination from "@/components/ui/Pagination";
import { navigateBack } from "@/utils/navigation";

type SalesEarningsTab = "sales" | "payouts" | "reports";

function SalesEarningsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<SalesEarningsTab>("sales");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [isInstructorRole, setIsInstructorRole] = useState(false);
  const [instructorData, setInstructorData] = useState<InstructorDashboardData | null>(null);

  // Recent Sales search & filter state
  const [salesSearch, setSalesSearch] = useState("");
  const [salesTypeFilter, setSalesTypeFilter] = useState<"all" | "Course" | "Batch">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSlipPayment, setSelectedSlipPayment] = useState<string | null>(null);
  const SALES_PER_PAGE = 10;

  // Sync tab with URL query params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "payouts" || tabParam === "commission" || tabParam === "payout") {
      setActiveTab("payouts");
    } else if (tabParam === "reports" || tabParam === "analytics" || tabParam === "sales-report") {
      setActiveTab("reports");
    } else if (tabParam === "sales" || tabParam === "transactions" || tabParam === "recent") {
      setActiveTab("sales");
    }
  }, [searchParams]);

  const handleTabChange = (tab: SalesEarningsTab) => {
    setActiveTab(tab);
    router.replace(`/sales-earnings?tab=${tab}`, { scroll: false });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInstructorDashboard();
      if (data) {
        setInstructorData(data);
        if (data.is_instructor) {
          setIsInstructorRole(true);
        }
      }
    } catch (err: any) {
      console.warn("Failed to load instructor dashboard data:", err);
      const isAuthErr =
        err?.status === 401 ||
        err?.response?.status === 401 ||
        err?.message?.includes("AuthenticationError");
      if (isAuthErr) {
        localStorage.removeItem("apiKey");
        localStorage.removeItem("apiSecret");
        window.dispatchEvent(new Event("auth-changed"));
        router.push("/login?redirect=/sales-earnings");
        return;
      }
      setError(err?.message || "Failed to load sales information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("apiKey");
      const apiSecret = localStorage.getItem("apiSecret");
      const email = localStorage.getItem("userEmail") || "";
      setUserEmail(email);

      if (!apiKey || !apiSecret || apiKey === "undefined" || apiKey === "null") {
        router.push("/login?redirect=/sales-earnings");
        return;
      }

      try {
        const rolesStr = localStorage.getItem("roles");
        if (rolesStr) {
          const roles = JSON.parse(rolesStr);
          const hasRole = roles.some((r: string) =>
            ["Instructor", "Course Creator", "Moderator", "Administrator", "System Manager"].includes(r)
          );
          setIsInstructorRole(hasRole);
          const isAdmin = roles.some((r: string) =>
            ["Administrator", "System Manager"].includes(r)
          );
          setIsAdminRole(isAdmin);
        }
      } catch (e) {}
    }

    fetchData();
  }, [router]);

  const iStats = instructorData?.stats || {
    total_revenue: 0,
    total_students: 0,
    total_courses: 0,
    published_courses: 0,
    draft_courses: 0,
    total_batches: 0,
  };

  const rawSales = instructorData?.recent_sales || [];

  // Filter & paginate recent sales
  const filteredSales = useMemo(() => {
    return rawSales.filter((sale) => {
      const matchesSearch =
        salesSearch === "" ||
        (sale.student_name || "").toLowerCase().includes(salesSearch.toLowerCase()) ||
        (sale.member || "").toLowerCase().includes(salesSearch.toLowerCase()) ||
        (sale.item_name || "").toLowerCase().includes(salesSearch.toLowerCase());

      const matchesType =
        salesTypeFilter === "all" || sale.item_type === salesTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [rawSales, salesSearch, salesTypeFilter]);

  const totalPages = Math.ceil(filteredSales.length / SALES_PER_PAGE);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * SALES_PER_PAGE;
    return filteredSales.slice(start, start + SALES_PER_PAGE);
  }, [filteredSales, currentPage]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* ── Modern Hero Header ── */}
      <div className="bg-slate-900 text-white pt-7 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault();
                navigateBack(router, "/dashboard");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold text-emerald-400">Sales & Earnings Studio</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Financial Center
                </span>
                {isAdminRole && (
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Admin Payout Authority
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Sales & Earnings
              </h1>
              <p className="text-slate-300/80 mt-1 text-xs sm:text-sm max-w-2xl font-light">
                Monitor real-time student purchase transactions, track monthly settlement statements, review commission deductions, and analyze comprehensive revenue reports.
              </p>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={fetchData}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/15 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                title="Refresh Financial Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Manage Courses</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-10 relative z-20">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Top Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* 1. Total Students */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paying Students</span>
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{iStats.total_students}</p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">Unique enrolled learners</p>
            </div>
          </div>

          {/* 3. Recent Transactions */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-purple-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Ledger</span>
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{rawSales.length}</p>
              <p className="text-[11px] font-semibold text-purple-600 mt-1">Recent student orders</p>
            </div>
          </div>

          {/* 4. Active Catalog */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-sky-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monetized Items</span>
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {iStats.published_courses + iStats.total_batches}
              </p>
              <p className="text-[11px] font-semibold text-sky-600 mt-1">
                {iStats.published_courses} Courses • {iStats.total_batches} Batches
              </p>
            </div>
          </div>
        </div>

        {/* ── 3 Main Navigation Tabs ── */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 p-2 mb-8 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 min-w-max md:min-w-0 md:w-full">
            {/* Tab 1: Recent Sales */}
            <button
              onClick={() => handleTabChange("sales")}
              className={`py-3.5 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 md:flex-1 ${
                activeTab === "sales"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/80"
              }`}
            >
              <DollarSign className={`w-4 h-4 shrink-0 ${activeTab === "sales" ? "text-emerald-400" : "text-emerald-600"}`} />
              <span>Recent Sales</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors ${
                  activeTab === "sales" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                {rawSales.length}
              </span>
            </button>

            {/* Tab 2: Payouts & Commission */}
            <button
              onClick={() => handleTabChange("payouts")}
              className={`py-3.5 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 md:flex-1 ${
                activeTab === "payouts"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/80"
              }`}
            >
              <Wallet className={`w-4 h-4 shrink-0 ${activeTab === "payouts" ? "text-emerald-400" : "text-emerald-600"}`} />
              <span>Payouts & Commission</span>
            </button>

            {/* Tab 3: Sales Report */}
            <button
              onClick={() => handleTabChange("reports")}
              className={`py-3.5 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 md:flex-1 ${
                activeTab === "reports"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/80"
              }`}
            >
              <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === "reports" ? "text-indigo-400" : "text-indigo-600"}`} />
              <span>Sales Report</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB 1: RECENT SALES LEDGER & FILTERABLE TRANSACTIONS
        ══════════════════════════════════════════════════════ */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
              {/* Header with Search and Type Filter */}
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Student Course & Batch Purchases</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time transaction feed of students purchasing your authored content.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search student or item..."
                      value={salesSearch}
                      onChange={(e) => {
                        setSalesSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-44 sm:w-56 font-medium"
                    />
                  </div>

                  {/* Item Type Filter */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => {
                        setSalesTypeFilter("all");
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        salesTypeFilter === "all"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All ({rawSales.length})
                    </button>
                    <button
                      onClick={() => {
                        setSalesTypeFilter("Course");
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        salesTypeFilter === "Course"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Courses
                    </button>
                    <button
                      onClick={() => {
                        setSalesTypeFilter("Batch");
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        salesTypeFilter === "Batch"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Batches
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              {paginatedSales.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-5">Student</th>
                        <th className="py-3.5 px-5">Item Purchased</th>
                        <th className="py-3.5 px-5 text-right">Amount Paid</th>
                        <th className="py-3.5 px-5">Purchase Date</th>
                        <th className="py-3.5 px-5 text-center">Status</th>
                        <th className="py-3.5 px-5 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedSales.map((sale, idx) => (
                        <tr key={sale.payment_name || idx} className="hover:bg-slate-50/60 transition-colors">
                          {/* Student */}
                          <td className="py-3.5 px-5">
                            <p className="font-bold text-slate-900">{sale.student_name || "Student Learner"}</p>
                            <p className="text-[11px] text-slate-400">{sale.member}</p>
                          </td>

                          {/* Item */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sale.item_type === "Batch"
                                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                                    : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                }`}
                              >
                                {sale.item_type}
                              </span>
                              <span className="font-medium text-slate-900 line-clamp-1 max-w-xs">
                                {sale.item_name}
                              </span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-5 text-right font-bold text-emerald-700">
                            ₹ {Number(sale.amount || 0).toLocaleString("en-IN")}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-5 text-slate-500">
                            {formatDate(sale.created_at)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Paid & Enrolled
                            </span>
                          </td>

                          {/* Receipt Action */}
                          <td className="py-3.5 px-5 text-center">
                            <button
                              onClick={() => setSelectedSlipPayment(sale.payment_name)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors border border-indigo-200/60 cursor-pointer"
                              title="View and download payment receipt slip"
                            >
                              <FileText className="w-3 h-3" />
                              <span>View Slip</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-16 text-center text-slate-500">
                  <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Transactions Found</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {salesSearch || salesTypeFilter !== "all"
                      ? "No purchases match your active search filters."
                      : "When students enroll in your paid courses or live batches, sales records will be automatically logged here."}
                  </p>
                </div>
              )}

              {/* Pagination */}
              {filteredSales.length > SALES_PER_PAGE && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredSales.length}
                    pageSize={SALES_PER_PAGE}
                    itemName="transactions"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2: PAYOUTS & COMMISSION DASHBOARD
        ══════════════════════════════════════════════════════ */}
        {activeTab === "payouts" && (
          <div className="space-y-6">
            <InstructorPayoutsTab isAdmin={isAdminRole} instructorEmail={userEmail} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 3: SALES & ANALYTICS REPORT DASHBOARD
        ══════════════════════════════════════════════════════ */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <InstructorSalesReportTab isAdmin={isAdminRole} instructorEmail={userEmail} />
          </div>
        )}
      </main>

      {/* ── Payment Slip Modal ── */}
      {selectedSlipPayment && (
        <PaymentSlipModal
          isOpen={!!selectedSlipPayment}
          paymentName={selectedSlipPayment}
          onClose={() => setSelectedSlipPayment(null)}
        />
      )}
    </div>
  );
}

export default function SalesEarningsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-600 font-semibold text-sm">Loading Sales & Earnings...</p>
          </div>
        </div>
      }
    >
      <SalesEarningsContent />
    </Suspense>
  );
}
