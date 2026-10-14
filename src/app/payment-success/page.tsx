"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Receipt,
  Download,
  Calendar,
  CreditCard,
  BookOpen,
  Users,
  ShieldCheck,
  Loader2,
  Copy,
  Check
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getPaymentStatus } from "@/services/payment.services";
import { PaymentStatus, ItemType } from "@/types/payment.types";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paymentName = searchParams.get("payment_name") || "";
  const itemType = (searchParams.get("item_type") || "course") as ItemType;
  const itemId = searchParams.get("item_id") || "";

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!paymentName) {
        setLoading(false);
        return;
      }
      try {
        const data = await getPaymentStatus(paymentName);
        setStatus(data);
      } catch (err) {
        console.error("Error fetching payment status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [paymentName]);

  const targetLink = itemType === "batch" ? `/batch/${itemId}` : `/course/${itemId}`;
  const targetLabel = itemType === "batch" ? "Go to Batch" : "Start Learning Now";

  const handleCopyTransaction = () => {
    const idToCopy = status?.payment_id || status?.order_id || paymentName;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-slate-900">Verifying Enrollment Details</h2>
            <p className="text-sm text-slate-500 mt-1">Generating your official receipt...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Top Celebratory Header Card */}
            <div className="bg-white rounded-3xl border border-emerald-100 shadow-[0_10px_35px_-5px_rgba(16,185,129,0.1)] p-8 sm:p-12 text-center relative overflow-hidden">
              {/* Subtle festive background blobs */}
              <div className="absolute -top-24 -left-24 w-52 h-52 bg-emerald-100/60 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-indigo-100/60 rounded-full blur-2xl pointer-events-none" />

              <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200 transform scale-100 animate-bounce duration-1000">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-200/60">
                <ShieldCheck className="w-3.5 h-3.5" /> Enrollment Confirmed
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
                Payment Successful!
              </h1>
              <p className="text-slate-600 max-w-lg mx-auto text-base sm:text-lg leading-relaxed">
                Congratulations! You are officially enrolled. Your course access and learning dashboard are fully unlocked.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={targetLink}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all text-sm transform active:scale-95"
                >
                  {targetLabel}
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/my-payments"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3.5 rounded-xl transition-all text-sm"
                >
                  <Receipt className="w-4 h-4 text-slate-500" />
                  View Billing History
                </Link>
              </div>
            </div>

            {/* Official Digital Receipt Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 print:shadow-none print:border-none">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Payment Receipt</h2>
                    <p className="text-xs text-slate-500">Official proof of payment and enrollment</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyTransaction}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    {copiedId ? "Copied" : "Copy ID"}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Print Receipt
                  </button>
                </div>
              </div>

              {/* Receipt Line Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-slate-100 text-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Enrolled Item</p>
                  <div className="flex items-start gap-3 mt-1.5">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                      {itemType === "batch" ? <Users className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-base leading-snug">
                        {status?.title || itemId}
                      </p>
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mt-0.5">
                        {itemType}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Status</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Paid / Confirmed
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Amount Paid</span>
                    <span className="text-lg font-black text-slate-900">
                      ₹ {status?.amount !== undefined ? status.amount.toLocaleString("en-IN") : "0"}
                    </span>
                  </div>

                  {status?.payment_id && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400">Razorpay Payment ID</span>
                      <span className="font-mono font-medium text-slate-700">{status.payment_id}</span>
                    </div>
                  )}

                  {status?.order_id && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400">Razorpay Order ID</span>
                      <span className="font-mono font-medium text-slate-700">{status.order_id}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold uppercase tracking-wider text-slate-400">Internal Reference</span>
                    <span className="font-mono font-medium text-slate-700">{status?.payment_name || paymentName}</span>
                  </div>

                  {status?.created_at && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400">Transaction Date</span>
                      <span className="font-medium text-slate-700">{status.created_at}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                <p>
                  Need assistance with your purchase? Contact{" "}
                  <a href="mailto:support@stridenex.ai" className="text-indigo-600 font-semibold underline">
                    support@stridenex.ai
                  </a>
                </p>
                <div className="flex items-center gap-1.5 font-medium text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Verified StrideNex Transaction
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Loading Confirmation...</p>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
