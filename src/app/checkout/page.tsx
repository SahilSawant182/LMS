"use client";

import React, { useState, useEffect, Suspense } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  ArrowLeft,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  Building2,
  HelpCircle,
  Sparkles,
  BookOpen,
  Users,
  Award
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  getCheckoutSummary,
  validateCoupon,
  initiatePayment,
  verifyPayment
} from "@/services/payment.services";
import {
  ItemType,
  CheckoutAddress,
  CheckoutSummary
} from "@/types/payment.types";
import { navigateBack } from "@/utils/navigation";

const RAZORPAY_FALLBACK_KEY = "rzp_test_TmszSSoa6e9eLQ";

const safeErrorMessage = (err: any, fallback: string): string => {
  if (typeof err === "string") return err;
  if (typeof err?.message === "string") return err.message;
  if (err?.response?.data) {
    const d = err.response.data;
    if (d._server_messages) {
      try {
        const msgs = JSON.parse(d._server_messages);
        if (Array.isArray(msgs) && msgs.length > 0) {
          const first = typeof msgs[0] === "string" ? JSON.parse(msgs[0]) : msgs[0];
          const raw = first?.message || first;
          if (typeof raw === "string") {
            const clean = raw.replace(/<[^>]*>?/gm, "").trim();
            if (clean) return clean;
          }
        }
      } catch (e) {}
    }
    if (typeof d.message === "string") return d.message;
    if (d.message && typeof d.message === "object" && typeof d.message.message === "string") {
      return d.message.message;
    }
  }
  return fallback;
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const itemTypeParam = (searchParams.get("item_type") || "course") as ItemType;
  const itemIdParam = searchParams.get("item_id") || "";

  // State
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);

  // Billing address state
  const [address, setAddress] = useState<CheckoutAddress>({
    billing_name: "",
    city: "",
    country: "India",
    address_line1: "",
    address_line2: "",
    state: "",
    pincode: "",
    phone: "",
    gstin: "",
    pan: "",
  });
  const [userEmail, setUserEmail] = useState("");
  const [showTaxFields, setShowTaxFields] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState<string | null>(null);

  // Payment execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Check auth and fetch checkout summary
  useEffect(() => {
    if (typeof window === "undefined") return;

    const email = localStorage.getItem("userEmail") || "";
    const fullName = localStorage.getItem("fullName") || "";
    const apiKey = localStorage.getItem("apiKey");
    setUserEmail(email);

    if (!apiKey && !email) {
      const redirectUrl = `/checkout?item_type=${itemTypeParam}&item_id=${encodeURIComponent(itemIdParam)}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    if (!itemIdParam) {
      setSummaryError("No item specified for checkout.");
      setLoadingSummary(false);
      return;
    }

    const fetchSummary = async () => {
      setLoadingSummary(true);
      setSummaryError(null);
      try {
        const data = await getCheckoutSummary({
          item_type: itemTypeParam,
          item_id: itemIdParam,
        });

        setSummary(data);

        // Pre-fill address if saved_address returned or fallback to profile
        if (data.saved_address) {
          setAddress({
            billing_name: data.saved_address.billing_name || fullName || "",
            city: data.saved_address.city || "",
            country: data.saved_address.country || "India",
            address_line1: data.saved_address.address_line1 || "",
            address_line2: data.saved_address.address_line2 || "",
            state: data.saved_address.state || "",
            pincode: data.saved_address.pincode || "",
            phone: data.saved_address.phone || "",
            gstin: data.saved_address.gstin || "",
            pan: data.saved_address.pan || "",
          });
          if (data.saved_address.gstin || data.saved_address.pan) {
            setShowTaxFields(true);
          }
        } else {
          setAddress((prev) => ({
            ...prev,
            billing_name: fullName || prev.billing_name,
          }));
        }

        if (data.coupon) {
          setAppliedCoupon(data.coupon);
          setCouponInput(data.coupon);
        }
      } catch (err: any) {
        console.error("Error loading checkout summary:", err);
        if (err.status === 409 || err.response?.status === 409) {
          setAlreadyEnrolled(true);
        } else if (err.status === 401 || err.response?.status === 401) {
          const redirectUrl = `/checkout?item_type=${itemTypeParam}&item_id=${encodeURIComponent(itemIdParam)}`;
          router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
        } else if (err.status === 400 || err.response?.status === 400) {
          setSummaryError(err.message || "This batch is currently sold out or has no available seats.");
        } else {
          setSummaryError(err.message || "Failed to load checkout details.");
        }
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [itemTypeParam, itemIdParam, router]);

  // Form field change handler
  const handleAddressChange = (field: keyof CheckoutAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Live Coupon Validation
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = couponInput.trim();
    if (!code) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccessMsg(null);

    try {
      const res = await validateCoupon({
        item_type: itemTypeParam === "batch" ? "batch" : "course",
        item_id: itemIdParam,
        coupon_code: code,
      });

      // Update summary amounts with validated coupon response
      if (summary) {
        const disc = Number(res.discount_amount || 0);
        const orig = Number(res.original_amount || summary.original_amount);
        const total = Math.max(0, Number(res.amount !== undefined ? res.amount : orig - disc));
        
        // Calculate the 18% GST included within the tax-inclusive total
        const includedGst = res.gst_applied !== undefined 
          ? Number(res.gst_applied) 
          : (total > 0 ? Math.round(total - (total / 1.18)) : 0);

        setSummary({
          ...summary,
          coupon: res.coupon || code,
          original_amount: orig,
          original_amount_formatted: res.original_amount_formatted || `₹ ${orig.toLocaleString("en-IN")}`,
          discount_amount: disc,
          discount_amount_formatted: res.discount_amount_formatted || `₹ ${disc.toLocaleString("en-IN")}`,
          gst_applied: includedGst,
          gst_amount_formatted: res.gst_amount_formatted || `₹ ${includedGst.toLocaleString("en-IN")}`,
          total_amount: total,
          total_amount_formatted: `₹ ${total.toLocaleString("en-IN")}`,
          is_free: total === 0,
        });
      }

      setAppliedCoupon(code);
      setCouponSuccessMsg(`Coupon "${code}" applied successfully!`);
    } catch (err: any) {
      console.error("Coupon validation error:", err);
      const errMsg = err.response?.data?.message || err.message || "Invalid coupon code";
      setCouponError(typeof errMsg === "string" ? errMsg : "Invalid coupon code");
    } finally {
      setCouponLoading(false);
    }
  };

  // Remove coupon handler
  const handleRemoveCoupon = async () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
    setCouponSuccessMsg(null);
    setCouponLoading(true);

    try {
      // Re-fetch clean checkout summary without coupon
      const fresh = await getCheckoutSummary({
        item_type: itemTypeParam === "batch" ? "batch" : "course",
        item_id: itemIdParam,
      });
      setSummary(fresh);
    } catch (err: any) {
      console.error("Error resetting checkout summary:", err);
      // Fallback: reset discount to 0
      if (summary) {
        const orig = summary.original_amount;
        const includedGst = orig > 0 ? Math.round(orig - (orig / 1.18)) : 0;
        setSummary({
          ...summary,
          coupon: null,
          discount_amount: 0,
          discount_amount_formatted: "",
          gst_applied: includedGst,
          gst_amount_formatted: `₹ ${includedGst.toLocaleString("en-IN")}`,
          total_amount: orig,
          total_amount_formatted: `₹ ${orig.toLocaleString("en-IN")}`,
          is_free: orig === 0,
        });
      }
    } finally {
      setCouponLoading(false);
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!address.billing_name.trim()) errors.billing_name = "Full Name is required";
    if (!address.city.trim()) errors.city = "City is required";
    if (!address.country.trim()) errors.country = "Country is required";

    if (address.phone && !/^[0-9+\s-]{7,15}$/.test(address.phone.trim())) {
      errors.phone = "Please enter a valid phone number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Primary Payment Checkout Flow
  const handleProceedToPay = async () => {
    setPaymentError(null);
    setPaymentNotice(null);

    if (!validateForm()) {
      window.scrollTo({ top: 120, behavior: "smooth" });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Initiate Payment with backend
      const initiateRes = await initiatePayment({
        item_type: itemTypeParam,
        item_id: itemIdParam,
        coupon_code: appliedCoupon || undefined,
        address: {
          billing_name: address.billing_name.trim(),
          city: address.city.trim(),
          country: address.country.trim(),
          address_line1: address.address_line1?.trim() || "",
          address_line2: address.address_line2?.trim() || "",
          state: address.state?.trim() || "",
          pincode: address.pincode?.trim() || "",
          phone: address.phone?.trim() || "",
          gstin: showTaxFields ? address.gstin?.trim() : undefined,
          pan: showTaxFields ? address.pan?.trim() : undefined,
        },
      });

      // Step 2: Handle Free Item / 100% Coupon
      if (initiateRes.is_free) {
        router.push(
          `/payment-success?payment_name=${encodeURIComponent(
            initiateRes.payment_name
          )}&item_type=${encodeURIComponent(itemTypeParam)}&item_id=${encodeURIComponent(
            itemIdParam
          )}`
        );
        return;
      }

      // Step 3: Handle Paid Razorpay Checkout Modal
      if (typeof window === "undefined" || !window.Razorpay) {
        throw new Error(
          "Payment gateway SDK is loading. Please wait 2 seconds and try again."
        );
      }

      const keyId = initiateRes.razorpay_key_id || RAZORPAY_FALLBACK_KEY;
      const orderId = initiateRes.razorpay_order_id;
      const amountPaise = initiateRes.amount || Math.round((summary?.total_amount || 0) * 100);

      if (!orderId) {
        throw new Error("Failed to generate order ID from payment gateway.");
      }

      const options: any = {
        key: keyId,
        amount: amountPaise,
        currency: initiateRes.currency || "INR",
        name: "StrideNex LMS",
        description: initiateRes.description || `Enrollment for ${summary?.title || itemIdParam}`,
        order_id: orderId,
        prefill: {
          name: initiateRes.prefill?.name || address.billing_name,
          email: initiateRes.prefill?.email || userEmail,
          contact: initiateRes.prefill?.contact || address.phone || "",
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setPaymentNotice("Payment was cancelled. You can retry whenever you are ready.");
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setIsVerifying(true);
          try {
            const verifyRes = await verifyPayment({
              payment_name: initiateRes.payment_name,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            router.push(
              `/payment-success?payment_name=${encodeURIComponent(
                verifyRes.payment_name || initiateRes.payment_name
              )}&item_type=${encodeURIComponent(itemTypeParam)}&item_id=${encodeURIComponent(
                itemIdParam
              )}`
            );
          } catch (err: any) {
            console.error("Verification failed:", err);
            setIsVerifying(false);
            setIsProcessing(false);
            setPaymentError(
              safeErrorMessage(
                err,
                "Payment verification failed. If your account was debited, please contact support with your payment ID: " +
                  response.razorpay_payment_id
              )
            );
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (failRes: any) => {
        setIsProcessing(false);
        const desc = failRes?.error?.description || "Payment failed at bank gateway";
        setPaymentError(`Payment failed: ${desc}. Please try again.`);
      });
      razorpay.open();
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      setIsProcessing(false);
      setPaymentError(
        safeErrorMessage(err, "Failed to initiate payment. Please try again.")
      );
    }
  };

  // Item redirect target
  const itemLink = itemTypeParam === "batch" ? `/batch/${itemIdParam}` : `/course/${itemIdParam}`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Navbar />

      {/* Verifying Fullscreen Modal Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-indigo-600/20 border border-indigo-400/40 flex items-center justify-center mb-6">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Verifying Your Payment</h2>
          <p className="text-slate-300 max-w-md text-sm md:text-base leading-relaxed mb-6">
            We are confirming your transaction and completing your enrollment with our secure server.
            Please do not refresh or close this window.
          </p>
          <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium bg-indigo-950/60 px-4 py-2 rounded-full border border-indigo-800">
            <Lock className="w-3.5 h-3.5" />
            256-Bit SSL Encrypted Verification
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb & Navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={itemLink}
            onClick={(e) => {
              e.preventDefault();
              navigateBack(router, itemLink);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {itemTypeParam === "batch" ? "Batch" : "Course"}
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Bank-Grade 256-bit Secure Checkout
          </div>
        </div>

        {/* Loading State */}
        {loadingSummary && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Preparing Your Checkout</h3>
            <p className="text-sm text-slate-500 mt-1">Fetching live pricing, discounts and saved billing details...</p>
          </div>
        )}

        {/* Already Enrolled State */}
        {!loadingSummary && alreadyEnrolled && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-10 max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">You are already enrolled!</h2>
            <p className="text-slate-600 text-sm mb-6">
              You already have active access to this {itemTypeParam}. You can jump right into your dashboard or course material.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={itemLink}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all text-sm"
              >
                Go to {itemTypeParam === "batch" ? "Batch" : "Course Material"}
              </Link>
              <Link
                href="/my-payments"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3 rounded-xl transition-all text-sm"
              >
                View Past Invoices
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loadingSummary && !alreadyEnrolled && summaryError && (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-10 max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Unable to Load Checkout</h2>
            <p className="text-slate-600 text-sm mb-6">{summaryError}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-sm transition-all"
              >
                Retry
              </button>
              <Link
                href={itemLink}
                onClick={(e) => {
                  e.preventDefault();
                  navigateBack(router, itemLink);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-2.5 rounded-xl text-sm transition-all inline-flex items-center justify-center cursor-pointer"
              >
                Back to {itemTypeParam === "batch" ? "Batch" : "Course"}
              </Link>
            </div>
          </div>
        )}

        {/* Main 2-Column Checkout Content */}
        {!loadingSummary && !alreadyEnrolled && summary && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Billing Information Form */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Billing Details</h1>
                  <p className="text-sm text-slate-500 mt-0.5">Please provide your details for the tax invoice and receipt.</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>

              {/* Notice / Alert Banners */}
              {paymentNotice && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{paymentNotice}</p>
                  </div>
                </div>
              )}

              {paymentError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Payment Error</p>
                    <p className="text-xs text-rose-700 mt-0.5">{typeof paymentError === "string" ? paymentError : JSON.stringify(paymentError)}</p>
                  </div>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleProceedToPay(); }} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address.billing_name}
                    onChange={(e) => handleAddressChange("billing_name", e.target.value)}
                    placeholder="e.g. John Doe"
                    className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 transition-all ${
                      formErrors.billing_name
                        ? "border-rose-400 focus:ring-rose-200 bg-rose-50/20"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                    }`}
                  />
                  {formErrors.billing_name && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.billing_name}</p>
                  )}
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-500 text-sm cursor-not-allowed"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Receipt will be emailed to your account</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={address.phone || ""}
                      onChange={(e) => handleAddressChange("phone", e.target.value)}
                      placeholder="e.g. 9876543210"
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 transition-all ${
                        formErrors.phone
                          ? "border-rose-400 focus:ring-rose-200"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                      }`}
                    />
                    {formErrors.phone && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Address Line 1 */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={address.address_line1 || ""}
                    onChange={(e) => handleAddressChange("address_line1", e.target.value)}
                    placeholder="Street address, building, floor"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-100 transition-all"
                  />
                </div>

                {/* Address Line 2 */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Address Line 2 <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={address.address_line2 || ""}
                    onChange={(e) => handleAddressChange("address_line2", e.target.value)}
                    placeholder="Suite, apartment, unit, landmark"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-100 transition-all"
                  />
                </div>

                {/* City, State, Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => handleAddressChange("city", e.target.value)}
                      placeholder="e.g. Mumbai"
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 transition-all ${
                        formErrors.city
                          ? "border-rose-400 focus:ring-rose-200 bg-rose-50/20"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                      }`}
                    />
                    {formErrors.city && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      State
                    </label>
                    <input
                      type="text"
                      value={address.state || ""}
                      onChange={(e) => handleAddressChange("state", e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      value={address.pincode || ""}
                      onChange={(e) => handleAddressChange("pincode", e.target.value)}
                      placeholder="e.g. 400001"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={address.country}
                    onChange={(e) => handleAddressChange("country", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-100 transition-all cursor-pointer"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Singapore">Singapore</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="Germany">Germany</option>
                    <option value="Other">Other Country</option>
                  </select>
                </div>

                {/* Business Tax Details Accordion */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTaxFields(!showTaxFields)}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors py-1"
                  >
                    <Building2 className="w-4 h-4" />
                    {showTaxFields ? "Remove Business GSTIN / PAN" : "+ Add Business GSTIN / PAN for Tax Invoice"}
                  </button>

                  {showTaxFields && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            GSTIN Number
                          </label>
                          <input
                            type="text"
                            value={address.gstin || ""}
                            onChange={(e) => handleAddressChange("gstin", e.target.value.toUpperCase())}
                            placeholder="e.g. 27AABCU9603R1ZX"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            PAN Number
                          </label>
                          <input
                            type="text"
                            value={address.pan || ""}
                            onChange={(e) => handleAddressChange("pan", e.target.value.toUpperCase())}
                            placeholder="e.g. ABCDE1234F"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Inputting valid tax details ensures your company name & GSTIN appear on your GST invoice.
                      </p>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* RIGHT COLUMN: Order Summary Card */}
            <div className="lg:col-span-5 sticky top-24 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)] p-6 sm:p-7">
                <h2 className="text-xl font-black text-slate-900 tracking-tight pb-4 border-b border-slate-100 flex items-center justify-between">
                  <span>Order Summary</span>
                  <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 uppercase">
                    {summary.item_type}
                  </span>
                </h2>

                {/* Item Card Details */}
                <div className="py-5 flex gap-4 items-start border-b border-slate-100">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    {summary.item_type === "batch" ? (
                      <Users className="w-7 h-7" />
                    ) : summary.item_type === "certificate" ? (
                      <Award className="w-7 h-7" />
                    ) : (
                      <BookOpen className="w-7 h-7" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                      {summary.doctype || `LMS ${summary.item_type}`}
                    </p>
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 mt-0.5">
                      {summary.title || itemIdParam}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Lifetime access & verification
                    </p>
                  </div>
                </div>

                {/* Coupon Validation Input Section */}
                <div className="py-5 border-b border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    Discount Coupon
                  </label>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-xs font-bold text-emerald-800 tracking-wide">
                            {appliedCoupon} <span className="font-semibold text-emerald-600">• Applied</span>
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            Saved {summary.discount_amount_formatted || `₹ ${summary.discount_amount}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        disabled={couponLoading}
                        className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors px-2 py-1"
                        title="Remove coupon"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError(null);
                        }}
                        placeholder="Enter coupon code (e.g. SAVE500)"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                  )}

                  {couponError && (
                    <p className="text-xs text-rose-600 mt-2 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {couponError}
                    </p>
                  )}

                  {couponSuccessMsg && !couponError && (
                    <p className="text-xs text-emerald-600 mt-2 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {couponSuccessMsg}
                    </p>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="py-5 space-y-3 text-sm border-b border-slate-100">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Original Price</span>
                    <span className="font-semibold text-slate-900">
                      {summary.original_amount_formatted || `₹ ${summary.original_amount.toLocaleString("en-IN")}`}
                    </span>
                  </div>

                  {summary.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600">
                      <span className="flex items-center gap-1 font-medium">
                        <Tag className="w-3.5 h-3.5" /> Coupon Discount
                      </span>
                      <span className="font-bold">
                        - {summary.discount_amount_formatted || `₹ ${summary.discount_amount.toLocaleString("en-IN")}`}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1">
                      GST / Taxes
                      <span className="text-[10px] text-slate-400 font-normal">(Included)</span>
                    </span>
                    <span className="font-medium text-slate-700">
                      {summary.gst_amount_formatted || (summary.gst_applied ? `₹ ${Math.round(summary.gst_applied).toLocaleString("en-IN")}` : "₹ 0")}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-baseline">
                    <div>
                      <span className="text-base font-black text-slate-900">Total Payable</span>
                      <p className="text-[11px] text-slate-400">All applicable taxes included</p>
                    </div>
                    <span className="text-2xl font-black text-indigo-700">
                      {summary.total_amount_formatted || `₹ ${summary.total_amount.toLocaleString("en-IN")}`}
                    </span>
                  </div>
                </div>

                {/* Primary CTA Button */}
                <div className="pt-5">
                  <button
                    type="button"
                    onClick={handleProceedToPay}
                    disabled={isProcessing || isVerifying}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all transform active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 text-base"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Securing Order...</span>
                      </>
                    ) : summary.total_amount === 0 ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Complete Free Enrollment</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 opacity-90" />
                        <span>
                          Proceed to Pay {summary.total_amount_formatted || `₹ ${summary.total_amount.toLocaleString("en-IN")}`}
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400 mt-3 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Guaranteed secure payment powered by Razorpay
                  </p>
                </div>
              </div>

              {/* Trust & Guarantee Box */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Instant Access</p>
                    <p className="text-slate-500">Access full curriculum and assignments immediately after payment.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Verified Certificate</p>
                    <p className="text-slate-500">Receive an official verifiable course certificate upon completion.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Loading Checkout...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
