"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  Clock,
  CheckCircle2,
  TrendingUp,
  Percent,
  ShieldCheck,
  DollarSign,
  Copy,
  Check,
  Printer,
  X,
  RefreshCw,
  Calendar,
  Sparkles,
  Building2,
  FileText,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Plus,
  Send,
  CreditCard,
  Layers,
  ArrowUpRight,
  Award,
  Receipt
} from "lucide-react";
import {
  InstructorBillingDashboardData,
  InstructorBillingRecord,
  PayoutPreviewData,
  RecentTransaction,
  BillingSettings,
  CommissionTier
} from "@/types/billing.types";
import {
  getInstructorBillingDashboard,
  previewInstructorBilling,
  generateInstructorPayoutSheet,
  approveInstructorPayout,
  markPayoutPaid
} from "@/services/billing.services";
import { formatDate } from "@/utils/formatters";
import PaymentSlipModal from "@/components/modals/PaymentSlipModal";

interface InstructorPayoutsTabProps {
  isAdmin?: boolean;
  instructorEmail?: string;
}

export default function InstructorPayoutsTab({
  isAdmin = false,
  instructorEmail
}: InstructorPayoutsTabProps) {
  // Data States
  const [dashboardData, setDashboardData] = useState<InstructorBillingDashboardData | null>(null);
  const [previewData, setPreviewData] = useState<PayoutPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Table Filters & Interaction States
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Approved" | "Draft">("All");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<InstructorBillingRecord | null>(null);
  const [selectedSlipBilling, setSelectedSlipBilling] = useState<string | null>(null);

  // Custom Date Estimator States
  const [calcStart, setCalcStart] = useState("");
  const [calcEnd, setCalcEnd] = useState("");
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResult, setCalcResult] = useState<PayoutPreviewData | null>(null);

  // Admin Modal States
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    start_date: "",
    end_date: "",
    billing_cycle: "Monthly",
    instructor: ""
  });
  const [generatingSheet, setGeneratingSheet] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [markPaidForm, setMarkPaidForm] = useState({
    billing_name: "",
    payment_reference: "",
    payment_mode: "NEFT",
    paid_on: ""
  });
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);

  // Calculate default dates for the current billing cycle
  const currentCycleDates = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    return {
      start_date: `${year}-${month}-01`,
      end_date: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
      monthName: now.toLocaleString("default", { month: "long", year: "numeric" })
    };
  }, []);

  // Set default form dates on load
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setGenerateForm((prev) => ({
      ...prev,
      start_date: currentCycleDates.start_date,
      end_date: currentCycleDates.end_date,
      instructor: instructorEmail || ""
    }));
    setMarkPaidForm((prev) => ({
      ...prev,
      paid_on: today
    }));
  }, [currentCycleDates, instructorEmail]);

  // Fetch dashboard & preview data
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getInstructorBillingDashboard(instructorEmail);
      setDashboardData(data);

      // Load preview for current cycle
      try {
        setPreviewLoading(true);
        const preview = await previewInstructorBilling({
          instructor: instructorEmail || data?.instructor,
          start_date: currentCycleDates.start_date,
          end_date: currentCycleDates.end_date
        });
        setPreviewData(preview);
      } catch (pErr) {
        console.warn("Could not load preview estimator:", pErr);
      } finally {
        setPreviewLoading(false);
      }
    } catch (err: any) {
      console.error("Error fetching instructor billing:", err);
      if (
        err?.status === 401 ||
        err?.response?.status === 401 ||
        err?.message?.includes("AuthenticationError") ||
        err?.message?.includes("Authentication required") ||
        err?.response?.data?.message?.status === 401
      ) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("apiKey");
          localStorage.removeItem("apiSecret");
          window.dispatchEvent(new Event("auth-changed"));
          window.location.href = "/login";
          return;
        }
      }
      setError(err?.message || "Failed to load instructor payouts data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [instructorEmail]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Currency Formatter
  const formatINR = (val?: number | null) => {
    return Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Filtered Billing History
  const filteredBillingHistory = useMemo(() => {
    if (!dashboardData?.billing_history) return [];
    if (statusFilter === "All") return dashboardData.billing_history;
    return dashboardData.billing_history.filter((rec) => rec.status === statusFilter);
  }, [dashboardData?.billing_history, statusFilter]);

  // Commission Tiers with Active Tier Detection
  const tiers = useMemo(() => {
    if (dashboardData?.settings?.commission_tiers && dashboardData.settings.commission_tiers.length > 0) {
      return [...dashboardData.settings.commission_tiers]
        .map((t) => ({
          ...t,
          threshold: t.threshold ?? t.gross_threshold ?? 0,
          rate: t.rate ?? t.commission_rate ?? 0,
        }))
        .sort((a, b) => a.threshold - b.threshold);
    }
    return [
      { threshold: 50000, rate: 20, label: "Starter Tier" },
      { threshold: 100000, rate: 15, label: "Growth Tier" },
      { threshold: 999999999, rate: 10, label: "Elite Tier" }
    ];
  }, [dashboardData?.settings?.commission_tiers]);

  const lifetimeGross = dashboardData?.lifetime_stats?.lifetime_gross_sales || 0;

  const currentTier = useMemo(() => {
    for (let i = 0; i < tiers.length; i++) {
      const tierItem = tiers[i];
      if (tierItem && lifetimeGross < tierItem.threshold) {
        return { index: i, tier: tierItem };
      }
    }
    const fallbackIdx = Math.max(0, tiers.length - 1);
    const fallbackTier = tiers[fallbackIdx] || { threshold: 999999999, rate: 10, label: "Elite Tier" };
    return { index: fallbackIdx, tier: fallbackTier };
  }, [tiers, lifetimeGross]);

  // Custom Date-Range Earnings Estimator Handler
  const handleCalculateEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcStart || !calcEnd) return;
    setCalcLoading(true);
    try {
      const res = await previewInstructorBilling({
        instructor: instructorEmail || dashboardData?.instructor,
        start_date: calcStart,
        end_date: calcEnd
      });
      setCalcResult(res);
    } catch (err: any) {
      console.error("Failed to estimate earnings:", err);
    } finally {
      setCalcLoading(false);
    }
  };

  // Admin Handler: Generate Payout Sheet
  const handleGenerateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingSheet(true);
    setGenerateError(null);
    setGenerateSuccess(null);

    try {
      const res = await generateInstructorPayoutSheet({
        start_date: generateForm.start_date,
        end_date: generateForm.end_date,
        billing_cycle: generateForm.billing_cycle,
        instructor: generateForm.instructor.trim() || undefined
      });

      // Automatically approve sheet if generated
      if (res.sheet_name) {
        try {
          await approveInstructorPayout({ sheet_name: res.sheet_name });
          setGenerateSuccess(`Payout Sheet ${res.sheet_name} generated and approved successfully.`);
        } catch (appErr) {
          setGenerateSuccess(`Payout Sheet ${res.sheet_name} generated. (Pending approval)`);
        }
      } else {
        setGenerateSuccess("Payout Sheet generated successfully.");
      }

      await fetchData(true);
      setTimeout(() => {
        setShowGenerateModal(false);
        setGenerateSuccess(null);
      }, 1800);
    } catch (err: any) {
      setGenerateError(err?.message || "Failed to generate payout sheet.");
    } finally {
      setGeneratingSheet(false);
    }
  };

  // Admin Handler: Mark Payout Paid
  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    setMarkingPaid(true);
    setMarkPaidError(null);

    try {
      await markPayoutPaid({
        billing_name: markPaidForm.billing_name,
        payment_reference: markPaidForm.payment_reference,
        payment_mode: markPaidForm.payment_mode,
        paid_on: markPaidForm.paid_on
      });
      setShowMarkPaidModal(false);
      await fetchData(true);
    } catch (err: any) {
      setMarkPaidError(err?.message || "Failed to mark payout as paid.");
    } finally {
      setMarkingPaid(false);
    }
  };

  const openMarkPaidForRecord = (record: InstructorBillingRecord) => {
    setMarkPaidForm({
      billing_name: record.name,
      payment_reference: record.payment_reference || `UTR-${Date.now().toString().slice(-8)}`,
      payment_mode: record.payment_mode || "NEFT",
      paid_on: new Date().toISOString().split("T")[0]
    });
    setMarkPaidError(null);
    setShowMarkPaidModal(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading Payouts & Commission Dashboard...</p>
        <p className="text-xs text-slate-400 mt-1">Retrieving verified settlement records and ledger entries</p>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Failed to Load Dashboard</h3>
        <p className="text-xs text-slate-600 mb-4">{error}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Loading
        </button>
      </div>
    );
  }

  const stats = dashboardData?.lifetime_stats || {
    lifetime_gross_sales: 0,
    lifetime_net_earnings: 0,
    lifetime_tds_deducted: 0,
    lifetime_platform_commission: 0,
    pending_payout: 0,
    paid_out: 0,
    billing_records_count: 0
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & ADMIN CONTROLS ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Instructor Financial Settlement & Payouts</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Partner
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of course earnings, commission deductions, withholding tax (TDS), and bank disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setGenerateError(null);
                setGenerateSuccess(null);
                setShowGenerateModal(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Payout Sheet</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 1. FIVE FINANCIAL METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Paid Out (Net) */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-white to-white rounded-2xl p-5 border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Total Paid Out</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹ {formatINR(stats.paid_out)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-700 font-medium">
            <Building2 className="w-3.5 h-3.5" />
            <span>Deposited to bank account</span>
          </div>
        </div>

        {/* Card 2: Pending Payout */}
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-white rounded-2xl p-5 border border-amber-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Payout</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹ {formatINR(stats.pending_payout)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-700 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Awaiting cycle release</span>
          </div>
        </div>

        {/* Card 3: Lifetime Gross Sales */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-white to-white rounded-2xl p-5 border border-indigo-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Lifetime Gross</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹ {formatINR(stats.lifetime_gross_sales)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-indigo-700 font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Gross student receipts</span>
          </div>
        </div>

        {/* Card 4: Platform Commission + 18% GST */}
        <div className="bg-gradient-to-br from-purple-500/10 via-white to-white rounded-2xl p-5 border border-purple-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Platform Fee + GST</span>
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹ {formatINR(stats.lifetime_platform_commission)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-purple-700 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Includes 18% GST on fee</span>
          </div>
        </div>

        {/* Card 5: TDS Withheld (Sec 194J) */}
        <div className="bg-gradient-to-br from-blue-500/10 via-white to-white rounded-2xl p-5 border border-blue-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">TDS Withheld (194J)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹ {formatINR(stats.lifetime_tds_deducted)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-blue-700 font-medium">
            <FileText className="w-3.5 h-3.5" />
            <span>Filed with IT Dept</span>
          </div>
        </div>
      </div>

      {/* ── 2 & 3: TWO COLUMN LAYOUT: CURRENT CYCLE ESTIMATOR & TIERED ROADMAP ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Current Billing Cycle Real-Time Estimator (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Current Cycle Live Estimator
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                {formatDate(currentCycleDates.start_date)} → {formatDate(currentCycleDates.end_date)}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 mb-5 backdrop-blur-sm">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-slate-400">Projected Net Disbursable</span>
                <span className="text-xs text-emerald-400 font-semibold">
                  {previewData?.breakdown ? "Live Forecast" : "Calculating..."}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">
                ₹ {formatINR(previewData?.breakdown?.net_payout ?? 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Estimated settlement amount after platform fee, 18% GST, and statutory TDS deduction.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/50 border border-slate-800/60 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cycle Gross</span>
                <span className="text-slate-100 font-bold text-sm mt-0.5 block">
                  ₹ {formatINR(previewData?.breakdown?.gross_sales ?? 0)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {previewData?.breakdown?.total_transactions ?? 0} orders
                </span>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/60 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Platform Fee</span>
                <span className="text-slate-100 font-bold text-sm mt-0.5 block">
                  ₹ {formatINR(previewData?.breakdown?.platform_commission ?? 0)}
                </span>
                <span className="text-[10px] text-purple-400 font-mono">
                  {previewData?.breakdown?.platform_commission_rate ?? dashboardData?.settings?.default_commission_rate ?? 20}%
                </span>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/60 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">GST (18%)</span>
                <span className="text-slate-100 font-bold text-sm mt-0.5 block">
                  ₹ {formatINR(previewData?.breakdown?.gst_on_commission ?? 0)}
                </span>
                <span className="text-[10px] text-slate-500">On platform fee</span>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/60 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">TDS Sec 194J</span>
                <span className="text-slate-100 font-bold text-sm mt-0.5 block">
                  ₹ {formatINR(previewData?.breakdown?.tds_amount ?? 0)}
                </span>
                <span className="text-[10px] text-blue-400 font-mono">
                  {(previewData?.breakdown?.tds_rate ?? 0) > 0 ? `${previewData?.breakdown?.tds_rate}%` : "0% (Exempt)"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Next settlement disbursal scheduled around 1st-5th of following month.</span>
            <span className="text-slate-300 font-medium">Auto-compiled by Stride Engine</span>
          </div>
        </div>

        {/* Tiered Platform Fee Roadmap (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Tiered Platform Fee Roadmap</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Tier {currentTier.index + 1} Active
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              As your cumulative sales scale, your platform commission decreases automatically, putting more revenue directly into your pocket.
            </p>

            {/* Tiers List */}
            <div className="space-y-2.5">
              {tiers.map((tier, idx) => {
                const isActive = idx === currentTier.index;
                const isCompleted = idx < currentTier.index;
                const prevThreshold = idx > 0 ? tiers[idx - 1].threshold : 0;
                const isInfinityTier = idx === tiers.length - 1 || tier.threshold >= 100000000;
                const label =
                  idx === 0
                    ? `Up to ₹ ${Number(tier.threshold).toLocaleString("en-IN")}`
                    : isInfinityTier
                    ? `Above ₹ ${Number(prevThreshold).toLocaleString("en-IN")}`
                    : `₹ ${Number(prevThreshold).toLocaleString("en-IN")} - ₹ ${Number(tier.threshold).toLocaleString("en-IN")}`;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isActive
                        ? "bg-indigo-50/70 border-indigo-300 shadow-xs ring-1 ring-indigo-200"
                        : isCompleted
                        ? "bg-slate-50 border-slate-200 text-slate-500"
                        : "bg-white border-slate-200/80 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : isCompleted
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{label}</span>
                          {isActive && (
                            <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-full font-semibold">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {tier.label || (idx === 0 ? "Starter" : idx === 1 ? "Growth" : "Scale Partner")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-900">{tier.rate}%</span>
                      <span className="block text-[10px] text-slate-500 font-medium">Platform Fee</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress to next tier */}
          {currentTier.index < tiers.length - 1 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-slate-600">
                <span>Next Tier Unlock: {tiers[currentTier.index + 1].rate}% fee</span>
                <span className="font-bold text-slate-900">
                  ₹ {formatINR(Math.max(0, currentTier.tier.threshold - lifetimeGross))} away
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (lifetimeGross / currentTier.tier.threshold) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. MONTHLY SETTLEMENT STATEMENTS TABLE (`billing_history`) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Monthly Settlement Statements</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified tax-compliant monthly accounts ready for download and reconciliation.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(["All", "Paid", "Approved", "Draft"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === filter
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {filteredBillingHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[1080px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Statement ID</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Billing Period</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Gross Sales</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Platform Fee & GST</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">TDS (194J)</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Net Payout</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Payment Ref / UTR</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBillingHistory.map((rec) => {
                  const feePlusGst = (rec.platform_commission || 0) + (rec.gst_on_commission || 0);

                  return (
                    <tr key={rec.name} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Statement ID */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{rec.name}</span>
                        </div>
                        {rec.payout_sheet ? (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.payout_sheet}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">Automated Settlement</div>
                        )}
                      </td>

                      {/* 2. Billing Period */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap text-slate-600">
                        <div className="font-semibold text-slate-800 text-xs">
                          {formatDate(rec.start_date)} → {formatDate(rec.end_date)}
                        </div>
                        <span className="inline-block text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded capitalize mt-0.5">
                          {rec.billing_cycle || "Monthly"}
                        </span>
                      </td>

                      {/* 3. Gross Sales */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-xs">
                          ₹ {formatINR(rec.gross_sales)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">Gross Sales</span>
                      </td>

                      {/* 4. Platform Fee & GST */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div className="font-semibold text-purple-700 text-xs">
                          - ₹ {formatINR(feePlusGst)}
                        </div>
                        <span className="text-[10px] text-purple-600/70">
                          ({rec.platform_commission_rate}% fee + GST)
                        </span>
                      </td>

                      {/* 5. TDS (194J) */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        {(rec.tds_amount || 0) > 0 ? (
                          <>
                            <div className="font-semibold text-blue-700 text-xs">
                              - ₹ {formatINR(rec.tds_amount)}
                            </div>
                            <span className="text-[10px] text-blue-600/70">
                              ({rec.tds_rate}% IT Act)
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="font-semibold text-slate-400 text-xs">₹ 0.00</div>
                            <span className="text-[10px] text-slate-400">Exempt</span>
                          </>
                        )}
                      </td>

                      {/* 6. Net Payout */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div className="font-extrabold text-emerald-700 text-sm">
                          ₹ {formatINR(rec.net_payout)}
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-600/80">
                          Disbursable
                        </span>
                      </td>

                      {/* 7. Status */}
                      <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            rec.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : rec.status === "Approved"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : rec.status === "Draft"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {rec.status === "Paid" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {rec.status === "Approved" && <ShieldCheck className="w-3 h-3 text-blue-600" />}
                          {rec.status === "Draft" && <Clock className="w-3 h-3 text-amber-600" />}
                          {rec.status}
                        </span>
                      </td>

                      {/* 8. Payment Ref / UTR */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        {rec.payment_reference ? (
                          <div className="inline-flex items-center gap-1.5 bg-slate-100/80 border border-slate-200 px-2 py-1 rounded-lg">
                            <span className="font-mono text-[11px] font-bold text-slate-700">
                              {rec.payment_reference}
                            </span>
                            <button
                              onClick={() => handleCopy(rec.payment_reference!, `utr-${rec.name}`)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer"
                              title="Copy UTR Reference"
                            >
                              {copiedKey === `utr-${rec.name}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic font-medium">
                            <Clock className="w-3 h-3 text-slate-300" />
                            Pending Disbursal
                          </span>
                        )}
                      </td>

                      {/* 9. Actions */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSlipBilling(rec.name)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 border border-indigo-100 cursor-pointer shadow-2xs"
                            title="View / Download Official PDF Voucher"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Slip PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedVoucher(rec)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Summary</span>
                          </button>

                          {isAdmin && rec.status !== "Paid" && (
                            <button
                              onClick={() => openMarkPaidForRecord(rec)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Mark as Paid"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Disburse</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 mb-1">No Settlement Statements Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Statements are compiled automatically at the end of each billing cycle once your course and batch sales reach the minimum payout threshold.
            </p>
          </div>
        )}
      </div>

      {/* ── 5. RECENT SALES LEDGER (`recent_transactions`) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Student Course Transactions</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live ledger of incoming payments received for your published courses and live batches.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {dashboardData?.recent_transactions?.length || 0} Transactions
          </span>
        </div>

        {dashboardData?.recent_transactions && dashboardData.recent_transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Enrolled Item</th>
                  <th className="py-3 px-4 text-right">Gross Amount</th>
                  <th className="py-3 px-4">Razorpay Payment ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboardData.recent_transactions.map((tx, idx) => (
                  <tr key={tx.payment_id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{tx.student_name || "Student"}</div>
                      <div className="text-[11px] text-slate-400">{tx.student_email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">{tx.item_name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{tx.item_type || "Course"}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      ₹ {formatINR(tx.amount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {tx.payment_id}
                        </span>
                        <button
                          onClick={() => handleCopy(tx.payment_id, `tx-${idx}`)}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
                          title="Copy Transaction ID"
                        >
                          {copiedKey === `tx-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Captured
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 mb-1">No Recent Transactions</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Student payments for your courses will appear here in real time as soon as orders are placed.
            </p>
          </div>
        )}
      </div>

      {/* ── 6. LIVE REVENUE & COMMISSION CALCULATOR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-base">Live Revenue & Commission Calculator</h3>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Estimate earnings for any custom date range without waiting for settlement cycle finalization.
        </p>

        <form onSubmit={handleCalculateEstimate} className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={calcStart}
              onChange={(e) => setCalcStart(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={calcEnd}
              onChange={(e) => setCalcEnd(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={calcLoading || !calcStart || !calcEnd}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-indigo-200 disabled:opacity-50 cursor-pointer"
          >
            {calcLoading ? "Calculating..." : "Estimate Earnings"}
          </button>
        </form>

        {calcResult && calcResult.breakdown && (
          <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block text-[11px]">Gross Revenue</span>
              <strong className="text-slate-900 text-sm font-black">
                ₹ {formatINR(calcResult.breakdown.gross_sales)}
              </strong>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {calcResult.breakdown.total_transactions} orders
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[11px]">
                Commission ({calcResult.breakdown.platform_commission_rate}%)
              </span>
              <strong className="text-rose-600 text-sm font-black">
                - ₹ {formatINR(calcResult.breakdown.platform_commission)}
              </strong>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                + GST ₹ {formatINR(calcResult.breakdown.gst_on_commission)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[11px]">
                TDS ({calcResult.breakdown.tds_rate}%)
              </span>
              <strong className="text-purple-600 text-sm font-black">
                {calcResult.breakdown.tds_amount > 0 ? `- ₹ ${formatINR(calcResult.breakdown.tds_amount)}` : "NIL (Exempt)"}
              </strong>
              <span className="text-[10px] text-slate-400 block mt-0.5">Sec 194J</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[11px]">Estimated Net Payout</span>
              <strong className="text-emerald-600 text-base font-black">
                ₹ {formatINR(calcResult.breakdown.net_payout)}
              </strong>
              <span className="text-[10px] text-emerald-700 block mt-0.5">Creditable to bank</span>
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════
          MODAL 1: SETTLEMENT VOUCHER / DIGITAL PAYSLIP
      ═════════════════════════════════════════════════════════ */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            {/* Modal Controls Top Bar */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Settlement Advice & Remittance Voucher
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlipBilling(selectedVoucher.name);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Official PDF Slip</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Document */}
            <div className="p-6 sm:p-8 space-y-6 text-slate-800" id="settlement-voucher-printable">
              {/* Branding & Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">STRIDENEX ACADEMY LMS</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Instructor Royalty & Commission Remittance Advice</p>
                  <div className="mt-2 text-[11px] text-slate-600 space-y-0.5">
                    <p>GSTIN: 27AABCS1429B1Z8</p>
                    <p>Sec 194J Compliant Educational Payment Voucher</p>
                  </div>
                </div>

                <div className="sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200 sm:min-w-[180px]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Statement ID</span>
                  <span className="text-sm font-mono font-bold text-slate-900 block">{selectedVoucher.name}</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Sheet: {selectedVoucher.payout_sheet || "Direct"}
                  </span>
                </div>
              </div>

              {/* Beneficiary & Cycle Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Instructor / Payee</span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {selectedVoucher.instructor_name || dashboardData?.instructor_name || "Instructor"}
                  </span>
                  <span className="text-[11px] text-slate-500">{selectedVoucher.instructor || dashboardData?.instructor}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Settlement Cycle</span>
                  <span className="font-bold text-slate-900 block mt-0.5 capitalize">
                    {selectedVoucher.billing_cycle || "Monthly"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {formatDate(selectedVoucher.start_date)} to {formatDate(selectedVoucher.end_date)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Disbursement Status</span>
                  <span className="font-bold text-emerald-700 block mt-0.5">
                    {selectedVoucher.status}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {selectedVoucher.paid_on ? `Paid on ${formatDate(selectedVoucher.paid_on)}` : "Awaiting processing"}
                  </span>
                </div>
              </div>

              {/* Remittance Banking Details */}
              {selectedVoucher.payment_reference && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block">Bank Transaction Reference</span>
                    <span className="font-mono font-bold text-emerald-950 text-sm">{selectedVoucher.payment_reference}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-medium text-emerald-700 block">Mode: {selectedVoucher.payment_mode || "NEFT / Direct Bank"}</span>
                    <span className="text-[10px] text-emerald-600 font-mono">Disbursed successfully</span>
                  </div>
                </div>
              )}

              {/* Itemized Calculation Ledger */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Itemized Financial Breakdown</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 text-left">Description</th>
                        <th className="py-2.5 px-4 text-center">Rate / Basis</th>
                        <th className="py-2.5 px-4 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          Gross Student Enrollment Sales
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-500">100% Volume</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          ₹ {formatINR(selectedVoucher.gross_sales)}
                        </td>
                      </tr>

                      {selectedVoucher.refunds > 0 && (
                        <tr className="text-rose-600">
                          <td className="py-2.5 px-4 font-medium">Refunds & Reversals Deducted</td>
                          <td className="py-2.5 px-4 text-center">Reversal</td>
                          <td className="py-2.5 px-4 text-right font-medium">
                            - ₹ {formatINR(selectedVoucher.refunds)}
                          </td>
                        </tr>
                      )}

                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-700">
                          Platform Infrastructure & Gateway Commission
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-500 font-mono">
                          {selectedVoucher.platform_commission_rate}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-purple-700">
                          - ₹ {formatINR(selectedVoucher.platform_commission)}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-700">
                          GST on Platform Commission (CGST 9% + SGST 9%)
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-500 font-mono">18.0%</td>
                        <td className="py-2.5 px-4 text-right font-medium text-purple-700">
                          - ₹ {formatINR(selectedVoucher.gst_on_commission)}
                        </td>
                      </tr>

                      <tr className="bg-slate-50 font-semibold text-slate-800">
                        <td className="py-2.5 px-4">Subtotal Net Earnings (Pre-Tax)</td>
                        <td className="py-2.5 px-4 text-center">-</td>
                        <td className="py-2.5 px-4 text-right">
                          ₹ {formatINR(selectedVoucher.net_earnings)}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-700">
                          TDS Withheld under Section 194J (Professional / Royalty)
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-500 font-mono">
                          {(selectedVoucher.tds_rate || 0) > 0 ? `${selectedVoucher.tds_rate}%` : "0.0%"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-blue-700">
                          - ₹ {formatINR(selectedVoucher.tds_amount)}
                        </td>
                      </tr>

                      <tr className="bg-emerald-500/10 border-t-2 border-emerald-400 font-extrabold text-sm">
                        <td className="py-3 px-4 text-emerald-950">
                          TOTAL NET DISBURSED PAYOUT
                        </td>
                        <td className="py-3 px-4 text-center text-emerald-800 text-xs font-normal">
                          Bank Transfer
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-900 text-base">
                          ₹ {formatINR(selectedVoucher.net_payout)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Digital Certification Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 gap-2">
                <span>System generated digital voucher • No physical signature required</span>
                <span className="font-mono">Generated: {formatDate(selectedVoucher.created_at)}</span>
              </div>
            </div>

            {/* Modal Bottom Bar */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedVoucher(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          MODAL 2: ADMIN - GENERATE PAYOUT SHEET
      ═════════════════════════════════════════════════════════ */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">Generate Instructor Payout Sheet</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateSheet} className="p-6 space-y-4 text-xs">
              {generateError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{generateError}</span>
                </div>
              )}

              {generateSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{generateSuccess}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Cycle</label>
                <select
                  value={generateForm.billing_cycle}
                  onChange={(e) => setGenerateForm({ ...generateForm, billing_cycle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={generateForm.start_date}
                    onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={generateForm.end_date}
                    onChange={(e) => setGenerateForm({ ...generateForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Specific Instructor Email <span className="text-slate-400 font-normal">(Leave blank for all)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. instructor@domain.com"
                  value={generateForm.instructor}
                  onChange={(e) => setGenerateForm({ ...generateForm, instructor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-500 text-[11px]">
                This will calculate all gross course/batch sales, apply progressive commission tiers, deduct 18% GST and Sec 194J TDS, and generate official billing records for disbursal.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingSheet}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {generatingSheet ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Compiling Sheet...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Compile & Approve</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          MODAL 3: ADMIN - MARK PAYOUT PAID (DISBURSE)
      ═════════════════════════════════════════════════════════ */}
      {showMarkPaidModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Record Bank Disbursement</h3>
              </div>
              <button
                onClick={() => setShowMarkPaidModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMarkPaid} className="p-6 space-y-4 text-xs">
              {markPaidError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{markPaidError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Record ID</label>
                <input
                  type="text"
                  required
                  readOnly
                  value={markPaidForm.billing_name}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono text-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Payment Reference / UTR Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR1234567890"
                  value={markPaidForm.payment_reference}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, payment_reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={markPaidForm.payment_mode}
                    onChange={(e) => setMarkPaidForm({ ...markPaidForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Disbursed Date</label>
                  <input
                    type="date"
                    required
                    value={markPaidForm.paid_on}
                    onChange={(e) => setMarkPaidForm({ ...markPaidForm, paid_on: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarkPaidModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={markingPaid}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {markingPaid ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Disbursement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official PDF Slip Modal */}
      <PaymentSlipModal
        isOpen={!!selectedSlipBilling}
        onClose={() => setSelectedSlipBilling(null)}
        billingName={selectedSlipBilling}
        title="Instructor Settlement Advice & Payout Slip"
      />
    </div>
  );
}
