"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Calendar,
  Filter,
  Download,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  getInstructorSalesReport,
  getInstructorSalesReportCsvUrl,
} from "@/services/billing.services";
import {
  SalesReportResponse,
  SalesReportFilter,
} from "@/types/billing.types";
import PaymentSlipModal from "@/components/modals/PaymentSlipModal";

interface InstructorSalesReportTabProps {
  isAdmin?: boolean;
  instructorEmail?: string;
}

export default function InstructorSalesReportTab({
  isAdmin = false,
  instructorEmail,
}: InstructorSalesReportTabProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [period, setPeriod] = useState<SalesReportFilter["period"]>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [itemType, setItemType] = useState<"all" | "course" | "batch">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Active view toggle: "overview" | "courses" | "transactions"
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "courses" | "transactions">("overview");

  // Payment slip modal state
  const [selectedPaymentSlip, setSelectedPaymentSlip] = useState<string | null>(null);

  const fetchReport = async (pageToFetch = page) => {
    setLoading(true);
    setError(null);
    try {
      const filters: SalesReportFilter = {
        period,
        start_date: period === "custom" ? startDate : undefined,
        end_date: period === "custom" ? endDate : undefined,
        course: selectedCourse || undefined,
        item_type: itemType,
        search: search.trim() || undefined,
        page: pageToFetch,
        page_size: 15,
      };
      const res = await getInstructorSalesReport(filters, instructorEmail);
      setReport(res);
    } catch (err: any) {
      console.error("Failed to load sales report:", err);
      let errMsg = "Failed to load sales analytics report.";
      const rawMsg = err?.response?.data?.message;
      if (typeof rawMsg === "string") {
        errMsg = rawMsg;
      } else if (rawMsg && typeof rawMsg === "object") {
        errMsg = rawMsg.message || rawMsg.error || JSON.stringify(rawMsg);
      } else if (typeof err?.message === "string") {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(1);
  }, [period, selectedCourse, itemType, instructorEmail]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReport(1);
  };

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReport(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchReport(newPage);
  };

  const handleExportCsv = () => {
    const filters: SalesReportFilter = {
      period,
      start_date: period === "custom" ? startDate : undefined,
      end_date: period === "custom" ? endDate : undefined,
      course: selectedCourse || undefined,
      item_type: itemType,
      search: search.trim() || undefined,
    };
    const url = getInstructorSalesReportCsvUrl(filters, instructorEmail);
    window.open(url, "_blank");
  };

  const summary = report?.summary;
  const availableItems = report?.available_items || [];
  const monthlyData = report?.monthly_breakdown || [];
  const courseData = report?.course_wise_breakdown || [];
  const transactions = report?.transactions || [];
  const pagination = report?.pagination;

  return (
    <div className="space-y-8">
      {/* Header & Export Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Instructor Sales & Enrollment Report
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Detailed monthly breakdown of course sales, enrollments count, and verified student orders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchReport(page)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-indigo-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
            {[
              { id: "all", label: "All Time" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "last_30_days", label: "Last 30 Days" },
              { id: "last_90_days", label: "Last 90 Days" },
              { id: "this_year", label: "This Year" },
              { id: "custom", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id as any);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  period === p.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type:</span>
            <select
              value={itemType}
              onChange={(e) => {
                setItemType(e.target.value as any);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Items</option>
              <option value="course">Courses Only</option>
              <option value="batch">Batches Only</option>
            </select>
          </div>
        </div>

        {/* Course Filter & Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {period === "custom" && (
            <div className="md:col-span-4 flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-1/2 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-1/2 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleApplyCustomDates}
                className="px-3.5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}

          <div className={period === "custom" ? "md:col-span-4" : "md:col-span-6"}>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Courses & Batches ({availableItems.length})</option>
              {availableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.type.toUpperCase()}] {item.title}
                </option>
              ))}
            </select>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className={period === "custom" ? "md:col-span-4" : "md:col-span-6"}
          >
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, email, or order ID..."
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              ₹ {Number(summary.total_gross_sales || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Avg Order Value: ₹ {Number(summary.average_order_value || 0).toLocaleString("en-IN")}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales Count</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">
              {summary.total_orders} <span className="text-xs font-normal text-slate-500">orders</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary.total_courses_sold} courses &bull; {summary.total_batches_sold} batches
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unique Students</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-purple-600 mt-2">
              {summary.unique_students}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Active paid learners</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Selling Course</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <p className="text-base font-bold text-slate-900 mt-2 line-clamp-1">
              {summary.top_performing_course || "None"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Highest grossing product</p>
          </div>
        </div>
      )}

      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { id: "overview", label: "Monthly Breakdown & Trends" },
          { id: "courses", label: `Course Performance (${courseData.length})` },
          { id: "transactions", label: `Detailed Transactions (${pagination?.total || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-9 h-9 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading Sales Report...</p>
        </div>
      )}

      {!loading && error && (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200">
          <p className="text-sm font-semibold text-rose-600 mb-4">{error}</p>
          <button
            onClick={() => fetchReport(page)}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* View 1: Monthly Breakdown */}
      {!loading && !error && activeSubTab === "overview" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Monthly Sales & Enrollment Summary</h3>
            <span className="text-xs font-semibold text-slate-400">{monthlyData.length} active months</span>
          </div>

          {monthlyData.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No sales data found for the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Month</th>
                    <th className="py-3.5 px-6">Total Units Sold</th>
                    <th className="py-3.5 px-6">Courses / Batches</th>
                    <th className="py-3.5 px-6">Unique Learners</th>
                    <th className="py-3.5 px-6 text-right">Gross Sales (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyData.map((m) => (
                    <tr key={m.month_key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        {m.month_label}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {m.sales_count} units
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-600">
                        {m.courses_sold} courses &bull; {m.batches_sold} batches
                      </td>
                      <td className="py-4 px-6 text-xs text-purple-700 font-semibold">
                        {m.unique_students} students
                      </td>
                      <td className="py-4 px-6 text-right font-black text-slate-900 text-sm">
                        ₹ {Number(m.gross_revenue || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 2: Course Wise Breakdown */}
      {!loading && !error && activeSubTab === "courses" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Course Sales Leaderboard</h3>
            <span className="text-xs font-semibold text-slate-400">{courseData.length} items</span>
          </div>

          {courseData.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No course sales matching current filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Course / Batch Title</th>
                    <th className="py-3.5 px-6">Type</th>
                    <th className="py-3.5 px-6">Count Sold</th>
                    <th className="py-3.5 px-6">Unique Students</th>
                    <th className="py-3.5 px-6">Revenue Share</th>
                    <th className="py-3.5 px-6 text-right">Gross Revenue (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courseData.map((c) => (
                    <tr key={c.item_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900 text-sm">{c.item_title}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{c.item_id}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            c.item_type === "batch"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {c.item_type}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800">
                        {c.sales_count} units
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-600 font-semibold">
                        {c.unique_students} learners
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, c.percentage_of_total)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600">{c.percentage_of_total}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-slate-900 text-sm">
                        ₹ {Number(c.gross_revenue || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 3: Detailed Transactions */}
      {!loading && !error && activeSubTab === "transactions" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Verified Student Purchase Records</h3>
            <span className="text-xs font-semibold text-slate-400">
              Showing {transactions.length} of {pagination?.total || 0}
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No transactions match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-5">Receipt / Order ID</th>
                    <th className="py-3.5 px-5">Student</th>
                    <th className="py-3.5 px-5">Item Purchased</th>
                    <th className="py-3.5 px-5">Date & Time</th>
                    <th className="py-3.5 px-5">Amount Paid</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => (
                    <tr key={t.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-slate-900 text-xs">{t.name}</span>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{t.payment_id}</p>
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-semibold text-slate-900 text-xs">{t.student_name}</p>
                        <p className="text-[11px] text-slate-500">{t.student_email}</p>
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-800 text-xs line-clamp-1">{t.item_title}</p>
                        <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {t.item_type}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-xs text-slate-600">
                        {t.date} <span className="text-slate-400">{t.time}</span>
                      </td>
                      <td className="py-4 px-5 font-black text-slate-900 text-sm">
                        ₹ {Number(t.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentSlip(t.name)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Slip PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination && pagination.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slip Viewer Modal */}
      <PaymentSlipModal
        isOpen={!!selectedPaymentSlip}
        onClose={() => setSelectedPaymentSlip(null)}
        paymentName={selectedPaymentSlip}
        title="Student Purchase Receipt Slip"
      />
    </div>
  );
}
