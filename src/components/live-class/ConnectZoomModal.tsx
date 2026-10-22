"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Video,
  Key,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import {
  ZoomSetting,
  SaveZoomSettingPayload,
  TestZoomCredentialsPayload,
} from "@/types/live_class.types";
import {
  testZoomCredentials,
  saveZoomSetting,
} from "@/services/live_class.services";

interface ConnectZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedAccount?: ZoomSetting) => void;
  initialAccount?: ZoomSetting | null;
}

export default function ConnectZoomModal({
  isOpen,
  onClose,
  onSuccess,
  initialAccount,
}: ConnectZoomModalProps) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOffset, setSidebarOffset] = useState<string>("0px");

  const isEdit = Boolean(initialAccount);

  const [form, setForm] = useState({
    account_name: "",
    account_id: "",
    client_id: "",
    client_secret: "",
    enabled: 1,
  });

  const [showSecret, setShowSecret] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Testing status: null | "testing" | "success" | "error"
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Populate form if editing or reset if new
  useEffect(() => {
    if (initialAccount) {
      setForm({
        account_name: initialAccount.account_name || initialAccount.name || "",
        account_id: initialAccount.account_id || "",
        client_id: initialAccount.client_id || "",
        client_secret: "",
        enabled: initialAccount.enabled ? 1 : 0,
      });
    } else {
      setForm({
        account_name: "",
        account_id: "",
        client_id: "",
        client_secret: "",
        enabled: 1,
      });
    }
    setTestStatus("idle");
    setTestMessage(null);
    setSaveError(null);
    setShowSecret(false);
  }, [initialAccount, isOpen]);

  // Esc key dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((p) => ({ ...p, [name]: checked ? 1 : 0 }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
    // Clear test status on relevant credential edit
    if (["account_id", "client_id", "client_secret"].includes(name)) {
      if (testStatus !== "idle") {
        setTestStatus("idle");
        setTestMessage(null);
      }
    }
    if (saveError) setSaveError(null);
  };

  const handleTestConnection = async () => {
    if (!form.account_id.trim()) {
      setTestStatus("error");
      setTestMessage("Account ID is required to test credentials.");
      return;
    }
    if (!form.client_id.trim()) {
      setTestStatus("error");
      setTestMessage("Client ID is required to test credentials.");
      return;
    }
    if (!form.client_secret.trim()) {
      setTestStatus("error");
      setTestMessage(
        isEdit
          ? "Please enter the Client Secret to test credentials."
          : "Client Secret is required to test credentials."
      );
      return;
    }

    setTestStatus("testing");
    setTestMessage(null);
    setSaveError(null);

    try {
      const payload: TestZoomCredentialsPayload = {
        account_id: form.account_id.trim(),
        client_id: form.client_id.trim(),
        client_secret: form.client_secret.trim(),
      };
      const res = await testZoomCredentials(payload);

      if (res?.status === 200 || (res as any)?.message?.status === 200) {
        setTestStatus("success");
        setTestMessage(
          res.message || "Zoom Server-to-Server OAuth credentials verified successfully!"
        );
      } else {
        setTestStatus("error");
        setTestMessage(
          res?.message ||
            (res as any)?.data?.message ||
            "Zoom authentication failed. Please verify credentials."
        );
      }
    } catch (err: any) {
      setTestStatus("error");
      const zoomErr =
        err.response?.data?.message?.message ||
        err.response?.data?.message ||
        err.message ||
        "Failed to verify Zoom credentials. Please verify your Account ID, Client ID, and Secret.";
      setTestMessage(typeof zoomErr === "string" ? zoomErr : JSON.stringify(zoomErr));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.account_name.trim()) {
      setSaveError("Account Name is required (e.g., 'Biology Dept Zoom').");
      return;
    }
    if (!form.account_id.trim()) {
      setSaveError("Account ID is required.");
      return;
    }
    if (!form.client_id.trim()) {
      setSaveError("Client ID is required.");
      return;
    }
    if (!isEdit && !form.client_secret.trim()) {
      setSaveError("Client Secret is required for new accounts.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const payload: SaveZoomSettingPayload = {
        account_name: form.account_name.trim(),
        account_id: form.account_id.trim(),
        client_id: form.client_id.trim(),
        enabled: form.enabled,
        test_connection: form.client_secret ? 1 : 0,
      };

      if (form.client_secret.trim()) {
        payload.client_secret = form.client_secret.trim();
      }

      if (isEdit && initialAccount) {
        payload.name = initialAccount.name;
      }

      const res = await saveZoomSetting(payload);

      if (res?.status === 200 || (res as any)?.message?.status === 200) {
        const saved = res.data || (res as any)?.message?.data || {
          name: form.account_name.trim(),
          account_name: form.account_name.trim(),
          account_id: form.account_id.trim(),
          client_id: form.client_id.trim(),
          enabled: form.enabled,
          is_owner: true,
          member: "",
        };
        onSuccess(saved);
        onClose();
      } else {
        const errMsg =
          res?.message ||
          (res as any)?.data?.message ||
          "Failed to save Zoom setting.";
        setSaveError(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message?.message ||
        err.response?.data?.message ||
        err.message ||
        "An unexpected error occurred while saving Zoom credentials.";
      setSaveError(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !mounted || typeof window === "undefined") return null;

  const inputClass =
    "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none transition-all";
  const labelClass = "block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider";

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
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {isEdit ? "Edit Zoom Account" : "Connect Zoom Account"}
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                  Server-to-Server OAuth
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? "Update API credentials and settings for this Zoom account"
                  : "Link your Zoom app to automatically host and schedule live classes"}
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4.5">
          {/* Save Error Alert */}
          {saveError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Failed to save account</span>
                <span>{saveError}</span>
              </div>
            </div>
          )}

          {/* Test Status Feedback */}
          {testStatus === "success" && testMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Zoom Connected Successfully!</span>
                <span>{testMessage}</span>
              </div>
            </div>
          )}

          {testStatus === "error" && testMessage && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Zoom Verification Failed</span>
                <span>{testMessage}</span>
              </div>
            </div>
          )}

          {/* Account Name */}
          <div>
            <label className={labelClass}>
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="account_name"
              value={form.account_name}
              onChange={handleChange}
              placeholder="e.g. My Personal Zoom or Biology Dept"
              className={inputClass}
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              A friendly label to identify this account across batches and live sessions.
            </p>
          </div>

          {/* Account ID */}
          <div>
            <label className={labelClass}>
              Account ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="account_id"
              value={form.account_id}
              onChange={handleChange}
              placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className={inputClass}
              required
            />
          </div>

          {/* Client ID */}
          <div>
            <label className={labelClass}>
              Client ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="client_id"
              value={form.client_id}
              onChange={handleChange}
              placeholder="e.g. abcdefghijk123456"
              className={inputClass}
              required
            />
          </div>

          {/* Client Secret */}
          <div>
            <label className={labelClass}>
              Client Secret{" "}
              {isEdit ? (
                <span className="text-slate-400 font-normal lowercase">(optional)</span>
              ) : (
                <span className="text-red-500">*</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                name="client_secret"
                value={form.client_secret}
                onChange={handleChange}
                placeholder={
                  isEdit
                    ? "Leave blank to keep existing secret"
                    : "Enter your Zoom Server-to-Server Client Secret"
                }
                className={`${inputClass} pr-10`}
                required={!isEdit}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isEdit && (
              <p className="text-[11px] text-slate-400 mt-1">
                Your existing secret is securely stored on the server. Only enter a new secret if you want to replace it.
              </p>
            )}
          </div>

          {/* Enabled Status Switch */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Enable this Account
              </span>
              <span className="text-[11px] text-slate-500">
                Allow this account to be selected for scheduling batches and live classes.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.enabled === 1}
              onClick={() => setForm((p) => ({ ...p, enabled: p.enabled === 1 ? 0 : 1 }))}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1 ${
                form.enabled === 1 ? "bg-indigo-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  form.enabled === 1 ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Collapsible Help Accordion */}
          <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-indigo-900 hover:bg-indigo-100/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>How to get Zoom Server-to-Server OAuth credentials</span>
              </div>
              {showHelp ? (
                <ChevronUp className="w-4 h-4 text-indigo-600 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
            </button>

            {showHelp && (
              <div className="px-4 pb-4 pt-1 text-xs text-slate-600 space-y-2 border-t border-indigo-100/80 bg-white/70">
                <ol className="list-decimal list-inside space-y-1.5 text-[12px] leading-relaxed">
                  <li>
                    Log in to the{" "}
                    <a
                      href="https://marketplace.zoom.us/develop/create"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-semibold underline inline-flex items-center gap-0.5 hover:text-indigo-700"
                    >
                      Zoom App Marketplace <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    Select <strong>Server-to-Server OAuth</strong> app and click <strong>Create</strong>.
                  </li>
                  <li>
                    Under <strong>Scopes</strong>, add these 3 required permissions:
                    <div className="mt-1 flex flex-wrap gap-1 font-mono text-[10.5px]">
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md">
                        meeting:write:admin
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md">
                        meeting:read:admin
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md">
                        meeting:read:list_past_participants:admin
                      </span>
                    </div>
                  </li>
                  <li>
                    Click <strong>Activate your app</strong>, then navigate to <strong>App Credentials</strong> to copy your <strong>Account ID</strong>, <strong>Client ID</strong>, and <strong>Client Secret</strong>.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus === "testing" || saving}
            className="px-4 py-2 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {testStatus === "testing" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Verifying...</span>
              </>
            ) : testStatus === "success" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || testStatus === "testing"}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isEdit ? "Update Account" : "Save Account"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
