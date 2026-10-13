"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Receipt,
  Search,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Tag,
  ArrowRight,
  BookOpen,
  Users,
  Award,
  Loader2,
  Filter,
  DollarSign
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getMyPayments } from "@/services/payment.services";
import { PaymentHistoryItem } from "@/types/payment.types";
import Pagination from "@/components/ui/Pagination";

export default function MyPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAYMENTS_PER_PAGE = 8;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("apiKey");
      if (!apiKey) {
        router.push("/login?redirect=/my-payments");
        return;
      }
    }

    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMyPayments({ limit: 50, offset: 0 });
        let list: PaymentHistoryItem[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && typeof res === "object") {
          if (Array.isArray(res.payments)) {
            list = res.payments;
          } else if (Array.isArray((res as any)?.data?.payments)) {
            list = (res as any).data.payments;
          } else if (Array.isArray((res as any)?.message?.data?.payments)) {
            list = (res as any).message.data.payments;
          } else if (Array.isArray((res as any)?.message?.payments)) {
            list = (res as any).message.payments;
          } else if (Array.isArray((res as any)?.data)) {
            list = (res as any).data;
          }
        }
        setPayments(list);
      } catch (err: any) {
        console.error("Failed to load payment history:", err);
        setError(err.message || "Could not retrieve your payment records.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [router]);

  // Filtered payments by search query
  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const doc = (p.payment_for_document || "").toLowerCase();
    const name = (p.name || "").toLowerCase();
    const payId = (p.payment_id || "").toLowerCase();
    const coupon = (p.coupon_code || "").toLowerCase();
    return doc.includes(q) || name.includes(q) || payId.includes(q) || coupon.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAYMENTS_PER_PAGE));
  const paginatedPayments = filtered.slice(
    (currentPage - 1) * PAYMENTS_PER_PAGE,
    currentPage * PAYMENTS_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Calculate summary metrics
  const totalSpent = payments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalTransactions = payments.length;
  const totalSavings = payments.reduce((acc, curr) => acc + (Number(curr.discount_amount) || 0), 0);

  const getItemTypeBadge = (docType: string) => {
    const dt = (docType || "").toLowerCase();
    if (dt.includes("batch")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
          <Users className="w-3 h-3" /> Batch
        </span>
      );
    }
    if (dt.includes("certificate")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
          <Award className="w-3 h-3" /> Certificate
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
        <BookOpen className="w-3 h-3" /> Course
      </span>
    );
  };

  const getItemHref = (item: PaymentHistoryItem) => {
    const dt = (item.payment_for_document_type || "").toLowerCase();
    if (dt.includes("batch")) {
      return `/batch/${item.payment_for_document}`;
    }
    return `/course/${item.payment_for_document}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Billing & Payment History</h1>
            <p className="text-sm text-slate-500 mt-1">
              View all your course purchases, receipts, applied discounts, and invoice details.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors border border-indigo-100"
          >
            Explore Courses
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invested</p>
                <p className="text-2xl font-black text-slate-900 mt-1">₹ {totalSpent.toLocaleString("en-IN")}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Across all programs & batches</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invoices</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalTransactions}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Receipt className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Active verified enrollments</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Coupons & Savings</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">₹ {totalSavings.toLocaleString("en-IN")}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Tag className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Total discount rewards claimed</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by course name or transaction ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            />
          </div>
          <span className="text-xs font-bold text-slate-400">
            Showing {filtered.length} of {payments.length} transactions
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center shadow-sm">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-700">Loading your payment records...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-2xl border border-rose-200 p-10 text-center shadow-sm">
            <p className="text-rose-600 font-semibold mb-3">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No payments found</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
              You haven&apos;t completed any paid course enrollments yet. Discover our hands-on programs to start learning!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-md text-sm transition-all"
            >
              Browse Course Catalog
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Transactions Table for Desktop / Cards for Mobile */}
        {!loading && !error && filtered.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Transaction Details</th>
                    <th className="py-4 px-6">Item</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Pricing & Discount</th>
                    <th className="py-4 px-6">Total Paid</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPayments.map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-mono font-bold text-slate-900 text-xs">{item.name}</p>
                        {item.payment_id && (
                          <p className="font-mono text-[11px] text-slate-400 mt-0.5">{item.payment_id}</p>
                        )}
                        {item.billing_name && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.billing_name}</p>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1 items-start">
                          {getItemTypeBadge(item.payment_for_document_type)}
                          <Link
                            href={getItemHref(item)}
                            className="font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1 max-w-xs"
                          >
                            {item.title || item.payment_for_document}
                          </Link>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.creation ? item.creation.split(" ")[0] : "N/A"}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-xs">
                        <div className="space-y-0.5">
                          {item.original_amount && item.original_amount > item.amount ? (
                            <>
                              <p className="text-slate-400 line-through">
                                ₹ {item.original_amount.toLocaleString("en-IN")}
                              </p>
                              {item.discount_amount && item.discount_amount > 0 && (
                                <p className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  - ₹ {item.discount_amount.toLocaleString("en-IN")} ({item.coupon_code || "Coupon"})
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-slate-500">Standard Pricing</p>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-black text-slate-900 text-base">
                          ₹ {item.amount !== undefined ? item.amount.toLocaleString("en-IN") : "0"}
                        </span>
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Paid
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <Link
                          href={getItemHref(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
                        >
                          View Item
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {paginatedPayments.map((item) => (
                <div key={item.name} className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      {getItemTypeBadge(item.payment_for_document_type)}
                      <h4 className="font-bold text-slate-900 text-sm mt-1">
                        {item.title || item.payment_for_document}
                      </h4>
                      <p className="font-mono text-xs text-slate-400 mt-0.5">{item.name}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Paid
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-50">
                    <div>
                      <p className="text-slate-400 font-semibold uppercase text-[10px]">Date</p>
                      <p className="text-slate-700 font-medium">{item.creation || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold uppercase text-[10px]">Total Paid</p>
                      <p className="text-slate-900 font-extrabold text-sm">
                        ₹ {item.amount !== undefined ? item.amount.toLocaleString("en-IN") : "0"}
                      </p>
                    </div>
                  </div>

                  {item.discount_amount && item.discount_amount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                      <Tag className="w-3 h-3" />
                      Discount: - ₹ {item.discount_amount} ({item.coupon_code || "Applied"})
                    </div>
                  )}

                  <div className="pt-1">
                    <Link
                      href={getItemHref(item)}
                      className="w-full inline-flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-lg transition-colors border border-indigo-100"
                    >
                      Go to Course / Batch
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/40">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filtered.length}
                pageSize={PAYMENTS_PER_PAGE}
                itemName="payments"
                hideOnSinglePage={true}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
