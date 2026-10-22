"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  Settings,
  Sparkles,
} from "lucide-react";
import { GoogleMeetStatus } from "@/types/live_class.types";
import {
  getGoogleMeetStatus,
  getGoogleMeetAuthUrl,
  configureGoogleOAuth,
} from "@/services/live_class.services";

interface ConnectGoogleMeetModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectUri?: string;
}

export default function ConnectGoogleMeetModal({
  isOpen,
  onClose,
  redirectUri,
}: ConnectGoogleMeetModalProps) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOffset, setSidebarOffset] = useState<string>("0px");

  const [accountName, setAccountName] = useState("");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [status, setStatus] = useState<GoogleMeetStatus | null>(null);

  // Authorize loading
  const [authorizing, setAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin configuration state
  const [showAdminConfig, setShowAdminConfig] = useState(false);
  const [adminClientId, setAdminClientId] = useState("");
  const [adminClientSecret, setAdminClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute sidebar offset for true page centering
  useEffect(() => {
    if (!isOpen) return;
    const updateOffset = () => {
      const sbWidth = getComputedStyle(document.documentElement).getPropertyValue(
        "--sidebar-width"
      );
      if (sbWidth && window.innerWidth >= 1024) {
        setSidebarOffset(sbWidth.trim());
      } else {
        setSidebarOffset("0px");
      }
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, [isOpen]);

  // Fetch integration status when opened
  const fetchStatus = async () => {
    setLoadingStatus(true);
    setAuthError(null);
    try {
      const st = await getGoogleMeetStatus();
      setStatus(st);
      if (st?.client_id) {
        setAdminClientId(st.client_id);
      }
    } catch (err: any) {
      setAuthError(err?.message || "Failed to check Google Meet server status.");
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setAccountName("");
      setAuthError(null);
      setConfigSuccess(null);
      setConfigError(null);
      fetchStatus();
    }
  }, [isOpen]);

  // Esc key dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      setAuthError("Please provide an Account Name (e.g. 'Math Live Sessions').");
      return;
    }

    setAuthorizing(true);
    setAuthError(null);

    try {
      // Remember account name in session storage
      if (typeof window !== "undefined") {
        sessionStorage.setItem("last_google_account_name", accountName.trim());
      }

      const returnUrl =
        redirectUri || (typeof window !== "undefined" ? window.location.href : undefined);

      const res = await getGoogleMeetAuthUrl(accountName.trim(), returnUrl);

      if (res?.auth_url) {
        // Redirect browser to Google OAuth consent screen
        window.location.href = res.auth_url;
      } else {
        throw new Error("Google OAuth URL was not returned by the server.");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message?.message ||
        err.response?.data?.message ||
        err.message ||
        "Failed to initiate Google authorization.";
      setAuthError(typeof msg === "string" ? msg : JSON.stringify(msg));
      setAuthorizing(false);
    }
  };

  const handleSaveAdminConfig = async (e?: React.FormEvent | React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!adminClientId.trim()) {
      setConfigError("Google Client ID is required.");
      return;
    }

    setSavingConfig(true);
    setConfigError(null);
    setConfigSuccess(null);

    try {
      await configureGoogleOAuth({
        client_id: adminClientId.trim(),
        client_secret: adminClientSecret.trim() || undefined,
        enabled: 1,
      });

      setConfigSuccess("Google OAuth credentials configured successfully!");
      await fetchStatus();
      setTimeout(() => setConfigSuccess(null), 3000);
    } catch (err: any) {
      const msg =
        err.response?.data?.message?.message ||
        err.response?.data?.message ||
        err.message ||
        "Failed to configure Google OAuth credentials.";
      setConfigError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSavingConfig(false);
    }
  };

  if (!isOpen || !mounted || typeof window === "undefined") return null;

  const isConfigured = Boolean(status?.configured);
  const isAdmin = Boolean(status?.is_admin);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
      style={{
        paddingLeft: sidebarOffset !== "0px" ? `calc(${sidebarOffset} + 1rem)` : undefined,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-green-50/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              {/* Google Meet icon graphic */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Connect Google Meet
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                  Calendar Sync
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Schedule Meet sessions and automatically create Google Calendar events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4.5">
          {loadingStatus ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">
                Checking Google Meet integration status...
              </p>
            </div>
          ) : !isConfigured ? (
            /* SERVER NOT CONFIGURED NOTICE */
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-amber-950 mb-1">
                      Google OAuth Not Configured
                    </h3>
                    <p className="text-amber-800 leading-relaxed">
                      {isAdmin
                        ? "Google Cloud credentials (Client ID & Secret) have not yet been saved on this LMS server. As an Administrator, you can configure them below directly without visiting Desk."
                        : "Google Meet integration has not been enabled by the system administrator yet. Please contact your platform admin to configure Google OAuth."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Configuration Form */}
              {isAdmin && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Settings className="w-4 h-4 text-indigo-600" />
                      <span>Admin Setup: Google OAuth Credentials</span>
                    </div>
                  </div>

                  {configSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{configSuccess}</span>
                    </div>
                  )}

                  {configError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{configError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveAdminConfig} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Google Client ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={adminClientId}
                        onChange={(e) => setAdminClientId(e.target.value)}
                        placeholder="xxxx.apps.googleusercontent.com"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Google Client Secret
                      </label>
                      <div className="relative">
                        <input
                          type={showSecret ? "text" : "password"}
                          value={adminClientSecret}
                          onChange={(e) => setAdminClientSecret(e.target.value)}
                          placeholder="GOCSPX-xxxxxxxxxxxx"
                          className="w-full px-3 py-2 pr-9 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={savingConfig}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {savingConfig ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Credentials...</span>
                          </>
                        ) : (
                          <>
                            <Shield className="w-3.5 h-3.5" />
                            <span>Save Google OAuth Settings</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* CONFIGURED: READY TO AUTHORIZE */
            <form onSubmit={handleAuthorize} className="space-y-4">
              {authError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Informational Card */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    Seamless Google Calendar Integration
                  </span>
                  You will be redirected to Google to authorize Calendar access. Live class Meet links and calendar invites will be created automatically under your account.
                </div>
              </div>

              {/* Account Name Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="e.g. My Physics Department Meet or Instructor Personal"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white outline-none transition-all"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  A recognizable label for selecting this Google Meet account when scheduling batches or classes.
                </p>
              </div>

              {/* Developer / Admin credentials shortcut */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminConfig(!showAdminConfig)}
                  className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{showAdminConfig ? "Hide" : "Configure"} Google Cloud Credentials</span>
                  {showAdminConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                  {showAdminConfig && (
                    <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs animate-in fade-in">
                      <div className="font-mono text-[11px] text-slate-600 truncate">
                        <strong>Client ID:</strong> {status?.client_id || "Configured"}
                      </div>
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          value={adminClientId}
                          onChange={(e) => setAdminClientId(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveAdminConfig();
                            }
                          }}
                          placeholder="Update Client ID"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <div className="relative">
                          <input
                            type={showSecret ? "text" : "password"}
                            value={adminClientSecret}
                            onChange={(e) => setAdminClientSecret(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveAdminConfig();
                              }
                            }}
                            placeholder="Update Client Secret (leave blank to keep)"
                            className="w-full px-2.5 py-1.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                          >
                            {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveAdminConfig()}
                          disabled={savingConfig}
                          className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[11px] font-bold hover:bg-slate-900 cursor-pointer"
                        >
                          {savingConfig ? "Saving..." : "Update Credentials"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={authorizing}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {isConfigured && (
            <button
              type="button"
              onClick={handleAuthorize}
              disabled={authorizing || loadingStatus}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {authorizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  {/* Google 'G' icon */}
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                  </svg>
                  <span>Authorize with Google</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
