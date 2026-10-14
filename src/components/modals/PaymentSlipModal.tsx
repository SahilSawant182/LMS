"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Download,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Printer,
} from "lucide-react";
import {
  getPaymentSlipData,
  getInstructorPayoutSlipData,
  getPaymentSlipDownloadUrl,
  getPayoutSlipDownloadUrl,
} from "@/services/billing.services";

interface PaymentSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pass paymentName for student receipt, or billingName for instructor payout voucher */
  paymentName?: string | null;
  billingName?: string | null;
  title?: string;
}

export default function PaymentSlipModal({
  isOpen,
  onClose,
  paymentName,
  billingName,
  title = "Payment Receipt Slip",
}: PaymentSlipModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("Payment_Slip.pdf");
  const [metaDetails, setMetaDetails] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || (!paymentName && !billingName)) {
      setPdfUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      setDownloadUrl(null);
      setError(null);
      setMetaDetails(null);
      return;
    }

    let isMounted = true;
    let createdBlobUrl: string | null = null;
    setLoading(true);
    setError(null);

    const loadSlip = async () => {
      try {
        if (paymentName) {
          const res = await getPaymentSlipData(paymentName);
          if (isMounted) {
            let activeUrl = res.pdf_data_url;
            if (res.pdf_base64 && typeof window !== "undefined") {
              try {
                const cleanBase64 = res.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
                const byteCharacters = atob(cleanBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "application/pdf" });
                createdBlobUrl = URL.createObjectURL(blob);
                activeUrl = createdBlobUrl;
              } catch (bErr) {
                console.warn("Could not create Blob URL, falling back to data URL:", bErr);
              }
            }

            setPdfUrl(activeUrl || res.pdf_data_url || res.view_url);
            setDownloadUrl(res.download_url || getPaymentSlipDownloadUrl(paymentName, true));
            setFilename(res.filename || `Payment_Slip_${paymentName}.pdf`);
            setMetaDetails(res.details);
          }
        } else if (billingName) {
          const res = await getInstructorPayoutSlipData(billingName);
          if (isMounted) {
            let activeUrl = res.pdf_data_url;
            if (res.pdf_base64 && typeof window !== "undefined") {
              try {
                const cleanBase64 = res.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
                const byteCharacters = atob(cleanBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "application/pdf" });
                createdBlobUrl = URL.createObjectURL(blob);
                activeUrl = createdBlobUrl;
              } catch (bErr) {
                console.warn("Could not create Blob URL, falling back to data URL:", bErr);
              }
            }

            setPdfUrl(activeUrl || res.pdf_data_url || res.view_url);
            setDownloadUrl(res.download_url || getPayoutSlipDownloadUrl(billingName, true));
            setFilename(res.filename || `Payout_Slip_${billingName}.pdf`);
            setMetaDetails(res.details);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to load PDF slip:", err);
          let errMsg = "Could not generate or load the PDF slip.";
          const rawMsg = err?.response?.data?.message;
          if (typeof rawMsg === "string") {
            errMsg = rawMsg;
          } else if (rawMsg && typeof rawMsg === "object") {
            errMsg = rawMsg.message || rawMsg.error || JSON.stringify(rawMsg);
          } else if (typeof err?.message === "string") {
            errMsg = err.message;
          }
          setError(errMsg);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSlip();

    return () => {
      isMounted = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [isOpen, paymentName, billingName]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById("pdf-slip-frame") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (pErr) {
        console.warn("Direct iframe print failed, opening in new window:", pErr);
        if (pdfUrl) {
          const printWindow = window.open(pdfUrl, "_blank");
          printWindow?.print();
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500 font-mono">
                {paymentName ? `Ref: ${paymentName}` : `Voucher: ${billingName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!loading && !error && pdfUrl && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  title="Print Slip"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-indigo-200 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-slate-100/50 flex flex-col">
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Generating Official PDF Slip...</p>
              <p className="text-xs text-slate-400 mt-1">Preparing verified digital voucher</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <div className="flex-1 flex flex-col h-full min-h-[460px]">
              {/* Quick Summary Pill Bar */}
              {metaDetails && (
                <div className="mb-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      {metaDetails.status || "Verified Paid"}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {metaDetails.item_title || metaDetails.instructor_name || metaDetails.payment_name || metaDetails.billing_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-600">
                    <span>
                      Amount:{" "}
                      <strong className="text-slate-900 font-bold">
                        ₹ {(metaDetails.amount || metaDetails.net_payout || 0).toLocaleString("en-IN")}
                      </strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span>{metaDetails.date || metaDetails.paid_on || "Recent"}</span>
                  </div>
                </div>
              )}

              {/* Embedded PDF Viewer */}
              <div className="flex-1 bg-white rounded-xl border border-slate-300 overflow-hidden shadow-inner min-h-[420px]">
                <iframe
                  id="pdf-slip-frame"
                  src={pdfUrl}
                  title="Payment Slip PDF Viewer"
                  className="w-full h-full min-h-[440px] border-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>StrideNex LMS Official Receipt &bull; Computer Generated Document</span>
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Open in new browser tab
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
