"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Video,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Info,
  User,
  Building,
  Calendar,
  Key,
  Shield,
  ExternalLink,
  Lock,
} from "lucide-react";
import { ZoomSetting, GoogleMeetSetting } from "@/types/live_class.types";
import {
  getMyZoomSettings,
  deleteZoomSetting,
  getMyGoogleMeetSettings,
  saveGoogleMeetSetting,
  deleteGoogleMeetSetting,
} from "@/services/live_class.services";
import ConnectZoomModal from "./ConnectZoomModal";
import ConnectGoogleMeetModal from "./ConnectGoogleMeetModal";

export default function ZoomIntegrationsTab() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Zoom accounts state
  const [zoomAccounts, setZoomAccounts] = useState<ZoomSetting[]>([]);
  const [loadingZoom, setLoadingZoom] = useState(true);
  const [zoomError, setZoomError] = useState<string | null>(null);

  // Google Meet accounts state
  const [googleAccounts, setGoogleAccounts] = useState<GoogleMeetSetting[]>([]);
  const [loadingGoogle, setLoadingGoogle] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Zoom modals state
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [editingZoomAccount, setEditingZoomAccount] = useState<ZoomSetting | null>(null);
  const [deletingZoomAccount, setDeletingZoomAccount] = useState<ZoomSetting | null>(null);
  const [isDeletingZoom, setIsDeletingZoom] = useState(false);

  // Google Meet modals state
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [editingGoogleAccount, setEditingGoogleAccount] = useState<GoogleMeetSetting | null>(null);
  const [newGoogleName, setNewGoogleName] = useState("");
  const [isSavingGoogleName, setIsSavingGoogleName] = useState(false);
  const [deletingGoogleAccount, setDeletingGoogleAccount] = useState<GoogleMeetSetting | null>(null);
  const [isDeletingGoogle, setIsDeletingGoogle] = useState(false);
  const [togglingGoogleId, setTogglingGoogleId] = useState<string | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchZoomAccounts = async () => {
    setLoadingZoom(true);
    setZoomError(null);
    try {
      const data = await getMyZoomSettings();
      setZoomAccounts(data);
    } catch (err: any) {
      setZoomError(err?.message || "Failed to load Zoom accounts.");
    } finally {
      setLoadingZoom(false);
    }
  };

  const fetchGoogleAccounts = async () => {
    setLoadingGoogle(true);
    setGoogleError(null);
    try {
      const data = await getMyGoogleMeetSettings();
      setGoogleAccounts(data);
    } catch (err: any) {
      setGoogleError(err?.message || "Failed to load Google Meet accounts.");
    } finally {
      setLoadingGoogle(false);
    }
  };

  useEffect(() => {
    fetchZoomAccounts();
    fetchGoogleAccounts();
  }, []);

  // Handle Google OAuth return callback params (?google_meet=connected or ?google_error=...)
  useEffect(() => {
    if (!searchParams) return;
    const googleMeet = searchParams.get("google_meet");
    const account = searchParams.get("account");
    const googleErr = searchParams.get("google_error");

    if (googleMeet === "connected") {
      showToast(
        "success",
        `Google Meet account '${account || "Personal"}' connected and authorized successfully!`
      );
      fetchGoogleAccounts();
      // Clean query parameters from URL
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } else if (googleErr) {
      showToast("error", `Google authorization failed: ${googleErr}`);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [searchParams]);

  // Zoom handlers
  const handleOpenAddZoom = () => {
    setEditingZoomAccount(null);
    setZoomModalOpen(true);
  };

  const handleOpenEditZoom = (account: ZoomSetting) => {
    setEditingZoomAccount(account);
    setZoomModalOpen(true);
  };

  const handleSuccessZoomSave = (savedAccount?: ZoomSetting) => {
    fetchZoomAccounts();
    showToast(
      "success",
      editingZoomAccount
        ? `Zoom account "${savedAccount?.account_name || editingZoomAccount.account_name}" updated successfully.`
        : `Zoom account "${savedAccount?.account_name || "New Account"}" connected successfully!`
    );
  };

  const handleDeleteZoom = async () => {
    if (!deletingZoomAccount) return;
    setIsDeletingZoom(true);
    try {
      const accountName = deletingZoomAccount.name || deletingZoomAccount.account_name;
      const res = await deleteZoomSetting(accountName);
      showToast("success", res.message || `Zoom account "${accountName}" deleted successfully.`);
      setDeletingZoomAccount(null);
      await fetchZoomAccounts();
    } catch (err: any) {
      const msg =
        err.response?.data?.message?.message ||
        err.response?.data?.message ||
        err.message ||
        "Failed to delete Zoom account.";
      showToast("error", typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsDeletingZoom(false);
    }
  };

  // Google Meet handlers
  const handleToggleGoogleEnabled = async (acc: GoogleMeetSetting) => {
    setTogglingGoogleId(acc.name);
    try {
      const newEnabled = acc.enabled ? 0 : 1;
      await saveGoogleMeetSetting({
        name: acc.name,
        account_name: acc.account_name,
        enabled: newEnabled,
      });
      showToast(
        "success",
        `Google Meet account '${acc.account_name}' ${newEnabled ? "enabled" : "disabled"}.`
      );
      await fetchGoogleAccounts();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update Google Meet account status.");
    } finally {
      setTogglingGoogleId(null);
    }
  };

  const handleOpenEditGoogle = (acc: GoogleMeetSetting) => {
    setEditingGoogleAccount(acc);
    setNewGoogleName(acc.account_name || acc.name);
  };

  const handleSaveGoogleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoogleAccount || !newGoogleName.trim()) return;

    setIsSavingGoogleName(true);
    try {
      await saveGoogleMeetSetting({
        name: editingGoogleAccount.name,
        account_name: newGoogleName.trim(),
        enabled: editingGoogleAccount.enabled ? 1 : 0,
      });
      showToast("success", `Google Meet account renamed to '${newGoogleName.trim()}'.`);
      setEditingGoogleAccount(null);
      await fetchGoogleAccounts();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to rename Google Meet account.");
    } finally {
      setIsSavingGoogleName(false);
    }
  };

  const handleDeleteGoogle = async () => {
    if (!deletingGoogleAccount) return;
    setIsDeletingGoogle(true);
    try {
      const accountName = deletingGoogleAccount.name;
      const res = await deleteGoogleMeetSetting(accountName);
      showToast(
        "success",
        res?.message || `Google Meet account '${deletingGoogleAccount.account_name}' disconnected.`
      );
      setDeletingGoogleAccount(null);
      await fetchGoogleAccounts();
    } catch (err: any) {
      const msg =
        err.response?.data?.message?.message ||
        err.response?.data?.message ||
        err.message ||
        "Failed to disconnect Google Meet account.";
      showToast("error", typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsDeletingGoogle(false);
    }
  };

  const maskString = (val?: string) => {
    if (!val) return "—";
    if (val.length <= 6) return `${val.slice(0, 2)}***`;
    return `${val.slice(0, 3)}***${val.slice(-3)}`;
  };

  return (
    <div className="space-y-7">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ==================== 1. ZOOM INTEGRATION CARD ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 via-white to-blue-50/20">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Zoom Integration
                </h2>
                <span className="px-2 py-0.5 text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                  Server-to-Server OAuth
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Link personal or department Zoom credentials to host webinars and live lectures with automated participant tracking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchZoomAccounts}
              disabled={loadingZoom}
              className="p-2 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer bg-white"
              title="Refresh Zoom Accounts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingZoom ? "animate-spin text-indigo-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenAddZoom}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Zoom</span>
            </button>
          </div>
        </div>

        {/* Zoom Table */}
        <div className="p-6">
          {loadingZoom ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-medium">Loading connected Zoom accounts...</p>
            </div>
          ) : zoomError ? (
            <div className="py-8 text-center">
              <AlertCircle className="w-7 h-7 text-red-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 mb-1">Failed to load Zoom accounts</p>
              <p className="text-xs text-slate-500 mb-3">{zoomError}</p>
              <button
                type="button"
                onClick={fetchZoomAccounts}
                className="px-3 py-1 text-xs font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg"
              >
                Try Again
              </button>
            </div>
          ) : zoomAccounts.length === 0 ? (
            <div className="py-8 border-2 border-dashed border-slate-200 rounded-2xl text-center px-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">No Zoom Accounts Connected</p>
              <p className="text-[11px] text-slate-400 mb-3">
                Connect your Zoom app to schedule sessions directly from the LMS.
              </p>
              <button
                type="button"
                onClick={handleOpenAddZoom}
                className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Connect Zoom Account</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">Account Name</th>
                    <th className="pb-3 px-3">Account ID</th>
                    <th className="pb-3 px-3">Client ID</th>
                    <th className="pb-3 px-3">Ownership</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {zoomAccounts.map((acc) => {
                    const isOwner = acc.is_owner ?? true;
                    const isEnabled = Boolean(acc.enabled);

                    return (
                      <tr key={acc.name || acc.account_name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                              <Video className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {acc.account_name || acc.name}
                              </span>
                              {acc.member && (
                                <span className="text-[11px] text-slate-400">{acc.member}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                          {maskString(acc.account_id)}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                          {maskString(acc.client_id)}
                        </td>
                        <td className="py-3.5 px-3">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <User className="w-2.5 h-2.5" />
                              Your Account
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Building className="w-2.5 h-2.5" />
                              Institution
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          {isEnabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditZoom(acc)}
                              disabled={!isOwner}
                              title={isOwner ? "Edit Account" : "Permission denied"}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingZoomAccount(acc)}
                              disabled={!isOwner}
                              title={isOwner ? "Delete Account" : "Permission denied"}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 2. GOOGLE MEET INTEGRATION CARD ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 via-white to-emerald-50/20">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Google Meet & Calendar Integration
                </h2>
                <span className="px-2 py-0.5 text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                  Google OAuth 2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Authorize Google Calendar offline access. Scheduled live sessions automatically create Google Calendar events with official Google Meet join links.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchGoogleAccounts}
              disabled={loadingGoogle}
              className="p-2 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer bg-white"
              title="Refresh Google Accounts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGoogle ? "animate-spin text-emerald-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setGoogleModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Google Meet</span>
            </button>
          </div>
        </div>

        {/* Google Meet Table */}
        <div className="p-6">
          {loadingGoogle ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
              <p className="text-xs font-medium">Loading Google Meet accounts...</p>
            </div>
          ) : googleError ? (
            <div className="py-8 text-center">
              <AlertCircle className="w-7 h-7 text-red-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 mb-1">Failed to load Google Meet accounts</p>
              <p className="text-xs text-slate-500 mb-3">{googleError}</p>
              <button
                type="button"
                onClick={fetchGoogleAccounts}
                className="px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-lg"
              >
                Try Again
              </button>
            </div>
          ) : googleAccounts.length === 0 ? (
            <div className="py-8 border-2 border-dashed border-slate-200 rounded-2xl text-center px-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">No Google Meet Accounts Connected</p>
              <p className="text-[11px] text-slate-400 mb-3">
                Authorize your Google account to auto-generate Meet video rooms for your students.
              </p>
              <button
                type="button"
                onClick={() => setGoogleModalOpen(true)}
                className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Connect Google Meet</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">Account Name</th>
                    <th className="pb-3 px-3">Linked Google Calendar</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Enable / Disable</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {googleAccounts.map((acc) => {
                    const isAuthorized = acc.is_authorized ?? true;
                    const isEnabled = Boolean(acc.enabled);
                    const isOwner = acc.is_owner ?? true;
                    const isToggling = togglingGoogleId === acc.name;

                    return (
                      <tr key={acc.name} className="hover:bg-slate-50/80 transition-colors">
                        {/* Account Name */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100">
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                              </svg>
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {acc.account_name || acc.name}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {acc.member_name || acc.member}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Calendar info */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-mono text-[11px] truncate max-w-[220px]">
                              {acc.google_calendar || "LMS Calendar"}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3">
                          {!isAuthorized ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Reauthorization Required
                            </span>
                          ) : isEnabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Authorized & Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Disabled
                            </span>
                          )}
                        </td>

                        {/* Toggle switch */}
                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            disabled={!isOwner || isToggling}
                            onClick={() => handleToggleGoogleEnabled(acc)}
                            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 disabled:opacity-40 ${
                              isEnabled ? "bg-emerald-600" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? "translate-x-3.5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isAuthorized && (
                              <button
                                type="button"
                                onClick={() => setGoogleModalOpen(true)}
                                className="px-2 py-1 text-[10.5px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                              >
                                Reconnect
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditGoogle(acc)}
                              disabled={!isOwner}
                              title={isOwner ? "Rename Account" : "Permission denied"}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingGoogleAccount(acc)}
                              disabled={!isOwner}
                              title={isOwner ? "Disconnect Account" : "Permission denied"}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Zoom Connect/Edit Modal */}
      <ConnectZoomModal
        isOpen={zoomModalOpen}
        onClose={() => setZoomModalOpen(false)}
        onSuccess={handleSuccessZoomSave}
        initialAccount={editingZoomAccount}
      />

      {/* Google Meet Connect Modal */}
      <ConnectGoogleMeetModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
      />

      {/* Google Meet Rename Modal */}
      {editingGoogleAccount && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Rename Google Meet Account</h3>
              <button
                type="button"
                onClick={() => setEditingGoogleAccount(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <Trash2 className="w-4 h-4 hidden" />
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveGoogleRename} className="space-y-3">
              <input
                type="text"
                value={newGoogleName}
                onChange={(e) => setNewGoogleName(e.target.value)}
                placeholder="Account Name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                required
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingGoogleAccount(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingGoogleName}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  {isSavingGoogleName ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zoom Delete Modal */}
      {deletingZoomAccount && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Zoom Account?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete{" "}
                <strong className="text-slate-800">
                  {deletingZoomAccount.account_name || deletingZoomAccount.name}
                </strong>
                ?
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Cascade Unlink Warning:</strong> Any batches or live classes linked to this account will be automatically unlinked. Their session details and history will remain intact.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingZoomAccount(null)}
                disabled={isDeletingZoom}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteZoom}
                disabled={isDeletingZoom}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingZoom ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Meet Disconnect / Delete Modal */}
      {deletingGoogleAccount && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Disconnect Google Meet Account?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to disconnect and delete{" "}
                <strong className="text-slate-800">
                  {deletingGoogleAccount.account_name || deletingGoogleAccount.name}
                </strong>
                ?
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Unlink Notice:</strong> This will revoke Google Calendar event sync and unlink this account from any scheduled batches. Existing batch schedules and history will remain intact.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingGoogleAccount(null)}
                disabled={isDeletingGoogle}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteGoogle}
                disabled={isDeletingGoogle}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingGoogle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Disconnecting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Disconnect Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ZoomIntegrationsTab as ConferencingIntegrationsTab };
