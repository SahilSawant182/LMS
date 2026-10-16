"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

const TOAST_EVENT = "stride_lms_toast_event";

export const showToast = {
  success: (message: string, title?: string, duration = 5000) => {
    emitToast({ type: "success", message, title, duration });
  },
  error: (message: string, title?: string, duration = 6000) => {
    emitToast({ type: "error", message, title, duration });
  },
  info: (message: string, title?: string, duration = 5000) => {
    emitToast({ type: "info", message, title, duration });
  },
  warning: (message: string, title?: string, duration = 5000) => {
    emitToast({ type: "warning", message, title, duration });
  },
};

function emitToast(detail: Omit<ToastItem, "id">) {
  if (typeof window !== "undefined") {
    const id = Math.random().toString(36).substring(2, 9);
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { ...detail, id } }));
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Intercept native window.alert to prevent native alert popup flashing/closing bug
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      const text = typeof msg === "string" ? msg : msg !== undefined ? JSON.stringify(msg) : "";
      if (!text) return;
      if (/success|complete|enrolled|created|updated/i.test(text)) {
        showToast.success(text);
      } else if (/fail|error|not found|denied|wrong/i.test(text)) {
        showToast.error(text);
      } else if (/must|please|warning|caution/i.test(text)) {
        showToast.warning(text);
      } else {
        showToast.info(text);
      }
    };

    const handleNewToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (customEvent.detail) {
        setToasts((prev) => [...prev.slice(-4), customEvent.detail]);
      }
    };

    window.addEventListener(TOAST_EVENT, handleNewToast);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener(TOAST_EVENT, handleNewToast);
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 5000;

  useEffect(() => {
    if (isPaused) return;

    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, duration, onDismiss]);

  const config = {
    success: {
      border: "border-emerald-200",
      bg: "bg-white",
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      icon: <CheckCircle2 className="w-5 h-5" />,
      bar: "bg-emerald-500",
      defaultTitle: "Success",
    },
    error: {
      border: "border-rose-200",
      bg: "bg-white",
      iconBg: "bg-rose-50 text-rose-600 border-rose-100",
      icon: <AlertCircle className="w-5 h-5" />,
      bar: "bg-rose-500",
      defaultTitle: "Error",
    },
    warning: {
      border: "border-amber-200",
      bg: "bg-white",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
      icon: <AlertTriangle className="w-5 h-5" />,
      bar: "bg-amber-500",
      defaultTitle: "Notice",
    },
    info: {
      border: "border-indigo-200",
      bg: "bg-white",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
      icon: <Info className="w-5 h-5" />,
      bar: "bg-indigo-500",
      defaultTitle: "Information",
    },
  }[toast.type];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${config.border} ${config.bg} p-4 shadow-xl shadow-slate-900/10 transition-all duration-300 transform translate-y-0 opacity-100 flex items-start gap-3.5`}
    >
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${config.iconBg}`}>
        {config.icon}
      </div>

      <div className="flex-1 pt-0.5 pr-2">
        <h4 className="text-xs font-bold text-slate-900 mb-0.5">
          {toast.title || config.defaultTitle}
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed break-words">
          {toast.message}
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
        <div
          className={`h-full transition-all duration-75 ease-linear ${config.bar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
