"use client";

import React, { useState, useEffect, Suspense } from "react";
import Navbar from "@/components/Navbar";
import {
  SlidersHorizontal,
  TrendingUp,
  PanelLeft,
  CreditCard,
  Mail,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Bell,
  Video,
} from "lucide-react";
import { getLmsSettings, updateLmsSettings } from "@/services/lms.services";
import ZoomIntegrationsTab from "@/components/live-class/ZoomIntegrationsTab";

type SettingsTab = "general" | "progress" | "sidebar" | "payments" | "emails" | "conferencing";

export interface LMSSettingsState {
  // General Tab
  allow_guest_access: number;
  prevent_skipping_videos: number;
  send_calendar_invite_for_evaluations: number;
  disable_pwa: number;
  default_home: number;
  persona_captured: number;
  demo_data_present: number;
  unsplash_access_key?: string | null;
  livecode_url?: string | null;
  send_notification_for_published_courses?: string | null;
  send_notification_for_published_batches?: string | null;

  // Course Progress Tab
  enforce_video_completion: number;
  enforce_quiz_completion: number;
  enforce_assignment_completion: number;
  lesson_dwell_time: number;

  // Sidebar Tab
  courses: number;
  batches: number;
  certifications: number;
  programming_exercises: number;
  jobs: number;
  statistics: number;
  notifications: number;

  // Payment Settings Tab
  payment_gateway?: string | null;
  default_currency?: string | null;
  apply_gst: number;
  show_usd_equivalent: number;
  apply_rounding: number;
  send_payment_reminders_for_batch: number;
  send_payment_reminders_for_course: number;

  // Email Templates Tab
  certification_template?: string | null;
  payment_reminder_template?: string | null;
  batch_confirmation_template?: string | null;

  // Server baseline for other payload fields
  show_day_view: number;
  show_dashboard: number;
  show_courses: number;
  show_students: number;
  show_assessments: number;
  show_live_class: number;
  show_discussions: number;
  show_emails: number;
  user_category: number;
  disable_signup: number;
  custom_signup_content?: string | null;
  certified_members: number;
  sidebar_items: any[];
  mentor_request_creation?: string | null;
  mentor_request_status_update?: string | null;
  exception_country: any[];
  meta_description?: string | null;
  meta_image?: string | null;
  meta_keywords?: string | null;
  contact_us_email?: string | null;
  contact_us_url?: string | null;
  allow_job_posting: number;

  [key: string]: any;
}

const DEFAULT_SETTINGS: LMSSettingsState = {
  // General
  allow_guest_access: 1,
  prevent_skipping_videos: 0,
  send_calendar_invite_for_evaluations: 0,
  disable_pwa: 0,
  default_home: 0,
  persona_captured: 0,
  demo_data_present: 1,
  unsplash_access_key: "",
  livecode_url: "https://falcon.frappe.io",
  send_notification_for_published_courses: "",
  send_notification_for_published_batches: "",

  // Course Progress
  enforce_video_completion: 1,
  enforce_quiz_completion: 1,
  enforce_assignment_completion: 1,
  lesson_dwell_time: 30,

  // Sidebar
  courses: 1,
  batches: 1,
  certifications: 1,
  programming_exercises: 1,
  jobs: 1,
  statistics: 1,
  notifications: 1,

  // Payment Settings
  payment_gateway: "Razorpay",
  default_currency: "INR",
  apply_gst: 0,
  show_usd_equivalent: 0,
  apply_rounding: 0,
  send_payment_reminders_for_batch: 0,
  send_payment_reminders_for_course: 0,

  // Email Templates
  certification_template: "",
  payment_reminder_template: "",
  batch_confirmation_template: "",

  // Server baseline for other payload fields
  show_day_view: 0,
  show_dashboard: 1,
  show_courses: 1,
  show_students: 1,
  show_assessments: 1,
  show_live_class: 1,
  show_discussions: 1,
  show_emails: 1,
  user_category: 0,
  disable_signup: 1,
  custom_signup_content: "",
  certified_members: 0,
  sidebar_items: [],
  mentor_request_creation: "",
  mentor_request_status_update: "",
  exception_country: [],
  meta_description: "",
  meta_image: "",
  meta_keywords: "",
  contact_us_email: "",
  contact_us_url: "",
  allow_job_posting: 1,
};

const FIELDS_TO_CHECK = [
  "allow_guest_access",
  "prevent_skipping_videos",
  "send_calendar_invite_for_evaluations",
  "disable_pwa",
  "default_home",
  "persona_captured",
  "demo_data_present",
  "unsplash_access_key",
  "livecode_url",
  "send_notification_for_published_courses",
  "send_notification_for_published_batches",
  "enforce_video_completion",
  "enforce_quiz_completion",
  "enforce_assignment_completion",
  "lesson_dwell_time",
  "courses",
  "batches",
  "certifications",
  "programming_exercises",
  "jobs",
  "statistics",
  "notifications",
  "payment_gateway",
  "default_currency",
  "apply_gst",
  "show_usd_equivalent",
  "apply_rounding",
  "send_payment_reminders_for_batch",
  "send_payment_reminders_for_course",
  "certification_template",
  "payment_reminder_template",
  "batch_confirmation_template",
];

// Robust extractor for Frappe { message: { success: true, data: { ... } } } responses
function extractSettingsData(res: any): Record<string, any> | null {
  if (!res || typeof res !== "object") return null;

  if (res?.message?.data && typeof res.message.data === "object") {
    return res.message.data;
  }
  if (res?.data?.data && typeof res.data.data === "object") {
    return res.data.data;
  }
  if (res?.data && typeof res.data === "object" && !Array.isArray(res.data)) {
    return res.data;
  }
  if (res?.message && typeof res.message === "object" && !Array.isArray(res.message)) {
    return res.message;
  }
  return res;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settings, setSettings] = useState<LMSSettingsState>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<LMSSettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    fetchSettings();
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p === "conferencing" || p === "zoom" || p === "integrations") {
        setActiveTab("conferencing");
      }
    }
  }, []);

  // Synchronize dirty state
  useEffect(() => {
    if (loading) {
      setIsDirty(false);
      return;
    }
    const hasChanges = FIELDS_TO_CHECK.some((k) => {
      const currentVal = settings[k] ?? "";
      const initVal = initialSettings[k] ?? "";
      return currentVal !== initVal;
    });
    setIsDirty(hasChanges);
  }, [settings, initialSettings, loading]);

  const fetchSettings = async (showLoadingSpinner: boolean = true) => {
    if (showLoadingSpinner) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getLmsSettings();
      const rawData = extractSettingsData(res);
      if (rawData && typeof rawData === "object") {
        const merged: LMSSettingsState = { ...DEFAULT_SETTINGS };
        Object.keys(DEFAULT_SETTINGS).forEach((key) => {
          if (rawData[key] !== undefined && rawData[key] !== null) {
            merged[key] = rawData[key];
          }
        });
        setSettings({ ...merged });
        setInitialSettings({ ...merged });
        setIsDirty(false);
      }
    } catch (err: any) {
      console.warn("Could not fetch server settings, using current defaults:", err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const handleToggle = (key: keyof LMSSettingsState) => {
    setSettings((prev) => {
      const currentVal = prev[key];
      const nextVal = currentVal === 1 ? 0 : 1;
      return { ...prev, [key]: nextVal };
    });
  };

  const handleChange = (key: keyof LMSSettingsState, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setSettings({ ...initialSettings });
    setIsDirty(false);
    setErrorMessage(null);
    setSuccessMessage("All unsaved changes have been discarded.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Exact 52 fields specified by user payload
      const payload: Record<string, any> = {
        allow_guest_access: Number(settings.allow_guest_access ? 1 : 0),
        prevent_skipping_videos: Number(settings.prevent_skipping_videos ? 1 : 0),
        send_calendar_invite_for_evaluations: Number(settings.send_calendar_invite_for_evaluations ? 1 : 0),
        disable_pwa: Number(settings.disable_pwa ? 1 : 0),
        default_home: Number(settings.default_home ? 1 : 0),
        unsplash_access_key: settings.unsplash_access_key || null,
        livecode_url: settings.livecode_url || null,
        send_notification_for_published_courses: settings.send_notification_for_published_courses || "",
        send_notification_for_published_batches: settings.send_notification_for_published_batches || "",
        show_day_view: Number(settings.show_day_view ? 1 : 0),
        show_dashboard: Number(settings.show_dashboard ? 1 : 0),
        show_courses: Number(settings.show_courses ? 1 : 0),
        show_students: Number(settings.show_students ? 1 : 0),
        show_assessments: Number(settings.show_assessments ? 1 : 0),
        show_live_class: Number(settings.show_live_class ? 1 : 0),
        show_discussions: Number(settings.show_discussions ? 1 : 0),
        show_emails: Number(settings.show_emails ? 1 : 0),
        enforce_video_completion: Number(settings.enforce_video_completion ? 1 : 0),
        enforce_quiz_completion: Number(settings.enforce_quiz_completion ? 1 : 0),
        enforce_assignment_completion: Number(settings.enforce_assignment_completion ? 1 : 0),
        lesson_dwell_time: Number(settings.lesson_dwell_time ?? 30),
        user_category: Number(settings.user_category ? 1 : 0),
        disable_signup: Number(settings.disable_signup ? 1 : 0),
        custom_signup_content: settings.custom_signup_content || null,
        courses: Number(settings.courses ? 1 : 0),
        batches: Number(settings.batches ? 1 : 0),
        certified_members: Number(settings.certified_members ? 1 : 0),
        certifications: Number(settings.certifications ? 1 : 0),
        programming_exercises: Number(settings.programming_exercises ? 1 : 0),
        jobs: Number(settings.jobs ? 1 : 0),
        statistics: Number(settings.statistics ? 1 : 0),
        notifications: Number(settings.notifications ? 1 : 0),
        sidebar_items: Array.isArray(settings.sidebar_items) ? settings.sidebar_items : [],
        mentor_request_creation: settings.mentor_request_creation || null,
        mentor_request_status_update: settings.mentor_request_status_update || null,
        payment_gateway: settings.payment_gateway || "Razorpay",
        default_currency: settings.default_currency || null,
        exception_country: Array.isArray(settings.exception_country) ? settings.exception_country : [],
        apply_gst: Number(settings.apply_gst ? 1 : 0),
        show_usd_equivalent: Number(settings.show_usd_equivalent ? 1 : 0),
        apply_rounding: Number(settings.apply_rounding ? 1 : 0),
        send_payment_reminders_for_batch: Number(settings.send_payment_reminders_for_batch ? 1 : 0),
        send_payment_reminders_for_course: Number(settings.send_payment_reminders_for_course ? 1 : 0),
        certification_template: settings.certification_template || null,
        batch_confirmation_template: settings.batch_confirmation_template || null,
        payment_reminder_template: settings.payment_reminder_template || null,
        meta_description: settings.meta_description || null,
        meta_image: settings.meta_image || null,
        meta_keywords: settings.meta_keywords || null,
        contact_us_email: settings.contact_us_email || null,
        contact_us_url: settings.contact_us_url || null,
        allow_job_posting: Number(settings.allow_job_posting ? 1 : 0),
      };

      await updateLmsSettings(payload);

      // Call the get settings API after successful update to fetch latest server data
      await fetchSettings(false);

      setIsDirty(false);
      setSuccessMessage("LMS settings updated and synchronized successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Failed to update LMS settings:", err);
      setErrorMessage(
        err?.message || "Failed to update settings. Please verify administrator permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  const tabs: {
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "general", label: "General", icon: SlidersHorizontal },
    { id: "progress", label: "Course Progress", icon: TrendingUp },
    { id: "sidebar", label: "Sidebar", icon: PanelLeft },
    { id: "payments", label: "Payment Settings", icon: CreditCard },
    { id: "emails", label: "Email Templates", icon: Mail },
    { id: "conferencing", label: "Conferencing & Zoom", icon: Video },
  ];

  // Helper modern sleek toggle button component in place of checkbox
  const ToggleItem = ({
    label,
    checked,
    onChange,
    disabled = false,
  }: {
    label: string;
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
  }) => (
    <div
      onClick={() => {
        if (!disabled) onChange();
      }}
      className={`flex items-center justify-between gap-3 p-3 px-3.5 rounded-xl border transition-all select-none cursor-pointer group ${
        disabled
          ? "bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed"
          : checked
          ? "bg-indigo-50/40 border-indigo-200 hover:border-indigo-300 shadow-2xs"
          : "bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs"
      }`}
    >
      <span className="text-[12.5px] font-semibold text-slate-700 group-hover:text-slate-900 leading-tight">
        {label}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange();
        }}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1 ${
          checked ? "bg-indigo-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 w-full">
        {/* Sticky Action Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                LMS Global Settings
              </h1>
              {isDirty && (
                <span className="px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Configure system behavior, access rules, video dwell times, sidebar modules, payments, and automated email templates.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {successMessage && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold shadow-xs animate-fade-in-up">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-semibold shadow-xs animate-fade-in-up">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Navigation Pill Bar (5 clean tabs) */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/60 rounded-2xl mb-6 overflow-x-auto custom-scrollbar border border-slate-200/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-white text-indigo-700 shadow-sm shadow-slate-300/40"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mx-auto mb-2.5" />
            <p className="text-xs font-semibold text-slate-700">Loading LMS configuration...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. GENERAL TAB */}
            {activeTab === "general" && (
              <div className="space-y-5 animate-fade-in-up">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  {/* General Toggle Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <ToggleItem
                      label="Allow Guest Access"
                      checked={settings.allow_guest_access === 1}
                      onChange={() => handleToggle("allow_guest_access")}
                    />
                    <ToggleItem
                      label="Prevent Skipping Videos"
                      checked={settings.prevent_skipping_videos === 1}
                      onChange={() => handleToggle("prevent_skipping_videos")}
                    />
                    <ToggleItem
                      label="Send calendar invite for evaluations"
                      checked={settings.send_calendar_invite_for_evaluations === 1}
                      onChange={() => handleToggle("send_calendar_invite_for_evaluations")}
                    />
                    <ToggleItem
                      label="Disable PWA"
                      checked={settings.disable_pwa === 1}
                      onChange={() => handleToggle("disable_pwa")}
                    />
                    <ToggleItem
                      label="Make LMS the default home"
                      checked={settings.default_home === 1}
                      onChange={() => handleToggle("default_home")}
                    />
                    <ToggleItem
                      label="Persona Captured"
                      checked={settings.persona_captured === 1}
                      onChange={() => handleToggle("persona_captured")}
                    />
                    <ToggleItem
                      label="Demo Data Present"
                      checked={settings.demo_data_present === 1}
                      onChange={() => handleToggle("demo_data_present")}
                    />
                  </div>

                  {/* Text inputs: Unsplash Access Key & LiveCode URL */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Unsplash Access Key
                      </label>
                      <input
                        type="text"
                        value={settings.unsplash_access_key || ""}
                        onChange={(e) => handleChange("unsplash_access_key", e.target.value)}
                        placeholder="Enter key..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        LiveCode URL
                      </label>
                      <input
                        type="text"
                        value={settings.livecode_url || ""}
                        onChange={(e) => handleChange("livecode_url", e.target.value)}
                        placeholder="https://falcon.frappe.io"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Section: Notifications */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Bell className="w-3.5 h-3.5 text-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-900 tracking-tight">Notifications</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Send Notification for Published Courses
                        </label>
                        <input
                          type="text"
                          value={settings.send_notification_for_published_courses || ""}
                          onChange={(e) =>
                            handleChange("send_notification_for_published_courses", e.target.value)
                          }
                          placeholder="Select notification template..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Send Notification for Published Batches
                        </label>
                        <input
                          type="text"
                          value={settings.send_notification_for_published_batches || ""}
                          onChange={(e) =>
                            handleChange("send_notification_for_published_batches", e.target.value)
                          }
                          placeholder="Select notification template..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. COURSE PROGRESS TAB */}
            {activeTab === "progress" && (
              <div className="space-y-5 animate-fade-in-up">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left: 3 Toggles */}
                    <div className="space-y-2.5">
                      <ToggleItem
                        label="Enforce Video Completion"
                        checked={settings.enforce_video_completion === 1}
                        onChange={() => handleToggle("enforce_video_completion")}
                      />
                      <ToggleItem
                        label="Enforce Quiz Completion"
                        checked={settings.enforce_quiz_completion === 1}
                        onChange={() => handleToggle("enforce_quiz_completion")}
                      />
                      <ToggleItem
                        label="Enforce Assignment Completion"
                        checked={settings.enforce_assignment_completion === 1}
                        onChange={() => handleToggle("enforce_assignment_completion")}
                      />
                    </div>

                    {/* Right: Lesson Dwell Time */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-center">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        Lesson Dwell Time (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="3600"
                        value={settings.lesson_dwell_time ?? 30}
                        onChange={(e) => handleChange("lesson_dwell_time", Number(e.target.value))}
                        className="w-full max-w-xs px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                      />
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        Minimum time in seconds learner must remain active on a lesson before it counts as completed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SIDEBAR TAB */}
            {activeTab === "sidebar" && (
              <div className="space-y-5 animate-fade-in-up">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="mb-3.5">
                    <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Items in Sidebar
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <ToggleItem
                      label="Courses"
                      checked={settings.courses === 1}
                      onChange={() => handleToggle("courses")}
                    />
                    <ToggleItem
                      label="Batches"
                      checked={settings.batches === 1}
                      onChange={() => handleToggle("batches")}
                    />
                    <ToggleItem
                      label="Certifications"
                      checked={settings.certifications === 1}
                      onChange={() => handleToggle("certifications")}
                    />
                    <ToggleItem
                      label="Programming Exercises"
                      checked={settings.programming_exercises === 1}
                      onChange={() => handleToggle("programming_exercises")}
                    />
                    <ToggleItem
                      label="Jobs"
                      checked={settings.jobs === 1}
                      onChange={() => handleToggle("jobs")}
                    />
                    <ToggleItem
                      label="Statistics"
                      checked={settings.statistics === 1}
                      onChange={() => handleToggle("statistics")}
                    />
                    <ToggleItem
                      label="Notifications"
                      checked={settings.notifications === 1}
                      onChange={() => handleToggle("notifications")}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. PAYMENT SETTINGS TAB */}
            {activeTab === "payments" && (
              <div className="space-y-5 animate-fade-in-up">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  {/* Selects & Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Payment Gateway
                      </label>
                      <input
                        type="text"
                        value={settings.payment_gateway || "Razorpay"}
                        onChange={(e) => handleChange("payment_gateway", e.target.value)}
                        placeholder="Razorpay"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Default Currency
                      </label>
                      <input
                        type="text"
                        value={settings.default_currency || ""}
                        onChange={(e) => handleChange("default_currency", e.target.value)}
                        placeholder="INR"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Toggle Options */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <ToggleItem
                        label="Apply GST for India"
                        checked={settings.apply_gst === 1}
                        onChange={() => handleToggle("apply_gst")}
                      />
                      <ToggleItem
                        label="Show USD Equivalent"
                        checked={settings.show_usd_equivalent === 1}
                        onChange={() => handleToggle("show_usd_equivalent")}
                      />
                      <ToggleItem
                        label="Apply Rounding on Equivalent"
                        checked={settings.apply_rounding === 1}
                        onChange={() => handleToggle("apply_rounding")}
                      />
                      <ToggleItem
                        label="Send Payment Reminders for Batch"
                        checked={settings.send_payment_reminders_for_batch === 1}
                        onChange={() => handleToggle("send_payment_reminders_for_batch")}
                      />
                      <ToggleItem
                        label="Send Payment Reminders for Course"
                        checked={settings.send_payment_reminders_for_course === 1}
                        onChange={() => handleToggle("send_payment_reminders_for_course")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. EMAIL TEMPLATES TAB */}
            {activeTab === "emails" && (
              <div className="space-y-5 animate-fade-in-up">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Certificate Email Template
                      </label>
                      <input
                        type="text"
                        value={settings.certification_template || ""}
                        onChange={(e) => handleChange("certification_template", e.target.value)}
                        placeholder="Certificate template name..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Payment Reminder Template
                      </label>
                      <input
                        type="text"
                        value={settings.payment_reminder_template || ""}
                        onChange={(e) => handleChange("payment_reminder_template", e.target.value)}
                        placeholder="Payment reminder template..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Batch Confirmation Template
                      </label>
                      <input
                        type="text"
                        value={settings.batch_confirmation_template || ""}
                        onChange={(e) => handleChange("batch_confirmation_template", e.target.value)}
                        placeholder="Batch confirmation template..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. CONFERENCING & ZOOM TAB */}
            {activeTab === "conferencing" && (
              <div className="animate-fade-in-up">
                <Suspense
                  fallback={
                    <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">Loading integrations...</p>
                    </div>
                  }
                >
                  <ZoomIntegrationsTab />
                </Suspense>
              </div>
            )}
          </div>
        )}

        {/* Floating Bottom Sticky Save Bar if dirty */}
        {isDirty && (
          <div className="fixed bottom-6 right-6 z-40 bg-slate-900/90 backdrop-blur-md text-white p-2.5 px-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3.5 animate-fade-in-up">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold">You have unsaved changes</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
