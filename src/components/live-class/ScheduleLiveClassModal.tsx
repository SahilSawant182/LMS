"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  Clock,
  Loader2,
  Video,
  CheckCircle2,
  Link as LinkIcon,
  FileText,
  ChevronDown,
} from "lucide-react";
import {
  LMSLiveClass,
  ConferencingSettings,
  CreateLiveClassPayload,
  UpdateLiveClassPayload,
} from "@/types/live_class.types";
import {
  getConferencingSettings,
  createLiveClass,
  updateLiveClass,
} from "@/services/live_class.services";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "Africa/Nairobi",
  "UTC",
];

interface ScheduleLiveClassModalProps {
  batchId: string;
  batchTitle: string;
  editClass?: LMSLiveClass | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ScheduleLiveClassModal({
  batchId,
  batchTitle,
  editClass,
  onClose,
  onSaved,
}: ScheduleLiveClassModalProps) {
  const isEdit = Boolean(editClass);
  const modalRef = useRef<HTMLDivElement>(null);

  const defaultTz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
      return "Asia/Kolkata";
    }
  })();

  const [settings, setSettings] = useState<ConferencingSettings>({
    zoom_accounts: [],
    google_meet_accounts: [],
    providers: [],
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarOffset, setSidebarOffset] = useState("0px");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateSidebarOffset = () => {
      if (typeof window !== "undefined" && document.body.classList.contains("has-sidebar")) {
        const width = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width").trim() || "16rem";
        setSidebarOffset(window.innerWidth >= 1024 ? width : "0px");
      } else {
        setSidebarOffset("0px");
      }
    };

    updateSidebarOffset();
    window.addEventListener("resize", updateSidebarOffset);
    window.addEventListener("sidebar-toggle", updateSidebarOffset);
    return () => {
      window.removeEventListener("resize", updateSidebarOffset);
      window.removeEventListener("sidebar-toggle", updateSidebarOffset);
    };
  }, []);

  const [form, setForm] = useState({
    title: editClass?.title || "",
    date: editClass?.date || "",
    time: editClass?.time?.slice(0, 5) || "",
    duration: editClass?.duration || 60,
    timezone: editClass?.timezone || defaultTz,
    description: editClass?.description || "",
    conferencing_provider: editClass?.conferencing_provider || ("Zoom" as "Zoom" | "Google Meet" | "Custom"),
    zoom_account: editClass?.zoom_account || "",
    google_meet_account: editClass?.google_meet_account || "",
    auto_recording: editClass?.auto_recording || ("No Recording" as "No Recording" | "Local" | "Cloud"),
    join_url: editClass?.join_url || "",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const s = await getConferencingSettings();
        setSettings(s);
        // Auto-select first accounts
        if (!form.zoom_account && s.zoom_accounts.length > 0) {
          setForm((p) => ({ ...p, zoom_account: s.zoom_accounts[0].name }));
        }
        if (!form.google_meet_account && s.google_meet_accounts.length > 0) {
          setForm((p) => ({ ...p, google_meet_account: s.google_meet_accounts[0].name }));
        }
      } catch {
        // silently ignore
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc key dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleProviderChange = (provider: "Zoom" | "Google Meet" | "Custom") => {
    setForm((p) => ({ ...p, conferencing_provider: provider }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.date) return "Date is required.";
    if (!form.time) return "Time is required.";
    if (form.duration <= 0) return "Duration must be positive.";
    if (!isEdit) {
      const selectedDate = new Date(`${form.date}T${form.time}`);
      if (selectedDate < new Date()) return "Date/time cannot be in the past.";
    }
    if (form.conferencing_provider === "Custom" && !form.join_url.trim()) {
      return "Join URL is required for Custom provider.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEdit && editClass) {
        const payload: UpdateLiveClassPayload = {
          name: editClass.name,
          title: form.title,
          description: form.description,
          date: form.date,
          time: form.time,
          duration: Number(form.duration),
          timezone: form.timezone,
          auto_recording: form.auto_recording,
          join_url: form.join_url,
        };
        await updateLiveClass(payload);
        setToast("Class updated successfully!");
      } else {
        const payload: CreateLiveClassPayload = {
          batch_name: batchId,
          title: form.title,
          date: form.date,
          time: form.time,
          duration: Number(form.duration),
          timezone: form.timezone,
          description: form.description,
          conferencing_provider: form.conferencing_provider,
          zoom_account: form.conferencing_provider === "Zoom" ? form.zoom_account : undefined,
          google_meet_account:
            form.conferencing_provider === "Google Meet" ? form.google_meet_account : undefined,
          auto_recording:
            form.conferencing_provider === "Zoom" ? form.auto_recording : undefined,
          join_url: form.conferencing_provider === "Custom" ? form.join_url : undefined,
        };
        await createLiveClass(payload);
        setToast("Class scheduled successfully!");
      }

      setTimeout(() => {
        onSaved();
        onClose();
      }, 1000);
    } catch (e: any) {
      setError(e.message || "Failed to save class. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all";
  const labelClass = "block text-xs font-semibold text-slate-600 mb-1";

  if (!mounted || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300"
      style={{
        paddingLeft: sidebarOffset !== "0px" ? `calc(${sidebarOffset} + 1rem)` : undefined,
      }}
    >
      <div
        ref={modalRef}
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? "Edit Live Class" : "Schedule Live Class"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{batchTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {toast}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="schedule-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className={labelClass}>Session Title *</label>
              <input
                name="title"
                required
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Introduction to React Hooks"
                className={inputClass}
              />
            </div>

            {/* Date / Time / Duration */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  value={form.date}
                  onChange={handleChange}
                  min={!isEdit ? new Date().toISOString().split("T")[0] : undefined}
                  className={`${inputClass} uppercase`}
                />
              </div>
              <div>
                <label className={labelClass}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  Start Time *
                </label>
                <input
                  type="time"
                  name="time"
                  required
                  value={form.time}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Duration (mins) *</label>
                <input
                  type="number"
                  name="duration"
                  required
                  min={5}
                  max={480}
                  value={form.duration}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className={labelClass}>Timezone</label>
              <div className="relative">
                <select
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  className={`${inputClass} appearance-none pr-8`}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Conferencing Provider (only on create) */}
            {!isEdit && (
              <div>
                <label className={labelClass}>
                  <Video className="w-3 h-3 inline mr-1" />
                  Conferencing Provider
                </label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {(["Zoom", "Google Meet", "Custom"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProviderChange(p)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        form.conferencing_provider === p
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Zoom options */}
                {form.conferencing_provider === "Zoom" && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <div>
                      <label className={labelClass}>Zoom Account</label>
                      {loadingSettings ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                          <Loader2 className="w-3 h-3 animate-spin" /> Loading accounts…
                        </div>
                      ) : settings.zoom_accounts.length > 0 ? (
                        <div className="relative">
                          <select
                            name="zoom_account"
                            value={form.zoom_account}
                            onChange={handleChange}
                            className={`${inputClass} appearance-none pr-8`}
                          >
                            <option value="">Select account</option>
                            {settings.zoom_accounts.map((a) => (
                              <option key={a.name} value={a.name}>
                                {a.account_name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-2">
                          No Zoom accounts configured.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Auto Recording</label>
                      <div className="relative">
                        <select
                          name="auto_recording"
                          value={form.auto_recording}
                          onChange={handleChange}
                          className={`${inputClass} appearance-none pr-8`}
                        >
                          <option value="No Recording">No Recording</option>
                          <option value="Local">Local</option>
                          <option value="Cloud">Cloud</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Google Meet options */}
                {form.conferencing_provider === "Google Meet" && (
                  <div className="mt-3 p-3 bg-green-50/50 border border-green-100 rounded-xl">
                    <label className={labelClass}>Google Meet Account</label>
                    {loadingSettings ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading accounts…
                      </div>
                    ) : settings.google_meet_accounts.length > 0 ? (
                      <div className="relative">
                        <select
                          name="google_meet_account"
                          value={form.google_meet_account}
                          onChange={handleChange}
                          className={`${inputClass} appearance-none pr-8`}
                        >
                          <option value="">Select account</option>
                          {settings.google_meet_accounts.map((a) => (
                            <option key={a.name} value={a.name}>
                              {a.account_name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-2">
                        No Google Meet accounts configured.
                      </p>
                    )}
                  </div>
                )}

                {/* Custom URL */}
                {form.conferencing_provider === "Custom" && (
                  <div className="mt-3 p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
                    <label className={labelClass}>
                      <LinkIcon className="w-3 h-3 inline mr-1" />
                      Meeting Join URL *
                    </label>
                    <input
                      name="join_url"
                      value={form.join_url}
                      onChange={handleChange}
                      placeholder="https://meet.google.com/xyz or https://zoom.us/j/..."
                      className={inputClass}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Custom URL on edit (allowed to update join URL) */}
            {isEdit && (
              <div>
                <label className={labelClass}>
                  <LinkIcon className="w-3 h-3 inline mr-1" />
                  Meeting Join URL
                </label>
                <input
                  name="join_url"
                  value={form.join_url}
                  onChange={handleChange}
                  placeholder="Leave blank to keep existing"
                  className={inputClass}
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label className={labelClass}>
                <FileText className="w-3 h-3 inline mr-1" />
                Agenda / Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="What will you cover in this session?"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                <X className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="schedule-form"
            disabled={saving}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEdit ? "Updating…" : "Scheduling…"}
              </>
            ) : (
              <>{isEdit ? "Update Class" : "Schedule Class"}</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
