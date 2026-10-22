"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Users,
  RefreshCw,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar,
  Download,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import {
  LMSLiveClass,
  LiveClassAttendanceData,
  EnrolledRosterStudent,
} from "@/types/live_class.types";
import {
  getLiveClassAttendance,
  syncLiveClassAttendance,
  markLiveClassAttendance,
  removeLiveClassParticipant,
  exportLiveClassAttendance,
} from "@/services/live_class.services";
import { getImageUrl } from "@/services/api.services";

interface LiveClassAttendanceModalProps {
  cls: LMSLiveClass;
  onClose: () => void;
  onUpdated?: () => void;
}

type FilterStatus = "all" | "present" | "absent";

function getCleanErrorMessage(e: any, fallback = "An unexpected error occurred."): string {
  if (!e) return fallback;
  if (typeof e === "string") return e;
  if (e.message && typeof e.message === "string") {
    try {
      const parsed = JSON.parse(e.message);
      if (parsed?.message && typeof parsed.message === "string") return parsed.message;
    } catch { }
    return e.message.replace(/^Error:\s*/i, "").trim();
  }
  if (e.response?.data) {
    const d = e.response.data;
    if (typeof d.message === "string") return d.message;
    if (d.message?.message && typeof d.message.message === "string") return d.message.message;
    if (d.exception && typeof d.exception === "string") {
      const parts = d.exception.split(":");
      return parts.length > 1 ? parts.slice(1).join(":").trim() : d.exception;
    }
  }
  return fallback;
}

export default function LiveClassAttendanceModal({
  cls,
  onClose,
  onUpdated,
}: LiveClassAttendanceModalProps) {
  const [attendanceData, setAttendanceData] = useState<LiveClassAttendanceData | null>(null);
  const [roster, setRoster] = useState<EnrolledRosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [togglingMember, setTogglingMember] = useState<string | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "warning" | "info" } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [sidebarOffset, setSidebarOffset] = useState("0px");
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamically compute sidebar offset so the modal centers exactly within the main page content area
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

  const showToast = (msg: string, type: "success" | "error" | "warning" | "info" = "info", duration = 4500) => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, duration);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const data = await getLiveClassAttendance(cls.name);
      setAttendanceData(data);

      if (Array.isArray(data.enrolled_roster) && data.enrolled_roster.length > 0) {
        setRoster(data.enrolled_roster);
      } else if (Array.isArray(data.participants) && data.participants.length > 0) {
        const mapped: EnrolledRosterStudent[] = data.participants.map((p) => ({
          member: p.member,
          member_name: p.member_name || p.member,
          member_image: p.member_image || null,
          is_present: true,
          participant_name: p.name,
          duration: p.duration || 0,
          joined_at: p.joined_at || null,
          formatted_joined_at: p.formatted_joined_at || p.joined_at || null,
        }));
        setRoster(mapped);
      } else {
        setRoster([]);
      }
    } catch (e: any) {
      const msg = getCleanErrorMessage(e, "Failed to load live class attendance records.");
      setErrorBanner(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls.name]);

  // Derived metrics with optimistic counts
  const totalEnrolled = useMemo(() => {
    return attendanceData?.total_enrolled && attendanceData.total_enrolled > roster.length
      ? attendanceData.total_enrolled
      : roster.length;
  }, [attendanceData, roster]);

  const totalPresent = useMemo(() => {
    return roster.filter((r) => r.is_present).length;
  }, [roster]);

  const totalAbsent = useMemo(() => {
    return Math.max(0, totalEnrolled - totalPresent);
  }, [totalEnrolled, totalPresent]);

  const attendanceRate = useMemo(() => {
    if (totalEnrolled <= 0) return 0;
    return Math.min(100, Math.round((totalPresent / totalEnrolled) * 100));
  }, [totalEnrolled, totalPresent]);

  // Search & Filter
  const filteredRoster = useMemo(() => {
    return roster.filter((student) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (student.member_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.member || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === "present") return student.is_present;
      if (filterStatus === "absent") return !student.is_present;
      return true;
    });
  }, [roster, searchTerm, filterStatus]);

  // Sync from Zoom
  const handleSyncZoom = async () => {
    setSyncing(true);
    try {
      const res = await syncLiveClassAttendance(cls.name);
      const count = res?.total_attendees ?? res?.updated_count;
      showToast(
        count !== undefined
          ? `Synced successfully from Zoom! (${count} attendees recorded)`
          : "Synced successfully from Zoom cloud records!",
        "success"
      );
      await fetchAttendance();
      onUpdated?.();
    } catch (e: any) {
      const raw = e?.message || String(e);
      if (
        raw.includes("402") ||
        raw.toLowerCase().includes("pro") ||
        raw.toLowerCase().includes("license") ||
        raw.toLowerCase().includes("payment required")
      ) {
        showToast(
          "Zoom cloud sync requires an active Zoom Pro/Business license. Manual toggles and student check-in work automatically.",
          "warning",
          6500
        );
      } else {
        const msg = getCleanErrorMessage(e, "Zoom synchronization failed. Please check meeting credentials.");
        showToast(msg, "error");
      }
    } finally {
      setSyncing(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let csvContent = "";
      let filename = `${cls.name}_attendance.csv`;

      try {
        const res = await exportLiveClassAttendance(cls.name);
        if (res?.csv_data) {
          csvContent = res.csv_data;
          if (res.filename) filename = res.filename;
        }
      } catch (apiErr) {
        console.warn("Backend export failed, generating from client roster:", apiErr);
      }

      // Fallback: Client-side CSV generation
      if (!csvContent) {
        const headers = ["Student Email", "Student Name", "Status", "Joined At", "Duration (Minutes)"];
        const rows = roster.map((s) => [
          `"${s.member}"`,
          `"${s.member_name.replace(/"/g, '""')}"`,
          s.is_present ? "Present" : "Absent",
          `"${s.formatted_joined_at || s.joined_at || "-"}"`,
          s.duration || 0,
        ]);
        csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("Attendance CSV report downloaded successfully.", "success");
    } catch (e: any) {
      showToast(getCleanErrorMessage(e, "Failed to export attendance CSV."), "error");
    } finally {
      setExporting(false);
    }
  };

  // Optimistic Toggle Attendance (Present <-> Absent)
  const handleToggleAttendance = async (student: EnrolledRosterStudent) => {
    const nextStatus = student.is_present ? "Absent" : "Present";
    const prevPresent = student.is_present;
    const defaultDuration = nextStatus === "Present" ? (student.duration || cls.duration || 60) : 0;

    // Optimistic state update
    setRoster((prev) =>
      prev.map((s) =>
        s.member === student.member
          ? {
            ...s,
            is_present: !prevPresent,
            duration: defaultDuration,
            formatted_joined_at: nextStatus === "Present" ? (s.formatted_joined_at || "Just now") : null,
          }
          : s
      )
    );

    setTogglingMember(student.member);

    try {
      const res = await markLiveClassAttendance(cls.name, student.member, nextStatus, defaultDuration);
      if (res?.participant_name) {
        setRoster((prev) =>
          prev.map((s) => (s.member === student.member ? { ...s, participant_name: res.participant_name } : s))
        );
      }
      onUpdated?.();
    } catch (e: any) {
      // Revert optimistic update on failure
      setRoster((prev) =>
        prev.map((s) =>
          s.member === student.member
            ? { ...s, is_present: prevPresent, duration: student.duration }
            : s
        )
      );
      showToast(getCleanErrorMessage(e, `Failed to update attendance status for ${student.member_name}.`), "error");
    } finally {
      setTogglingMember(null);
    }
  };

  // Remove Participant
  const handleRemoveParticipant = async (student: EnrolledRosterStudent) => {
    if (!student.participant_name) return;
    if (!confirm(`Remove attendance record for ${student.member_name}?`)) return;

    setDeletingParticipant(student.member);
    try {
      await removeLiveClassParticipant(student.participant_name);
      setRoster((prev) =>
        prev.map((s) =>
          s.member === student.member
            ? {
              ...s,
              is_present: false,
              participant_name: null,
              duration: 0,
              joined_at: null,
              formatted_joined_at: null,
            }
            : s
        )
      );
      showToast(`Removed participant record for ${student.member_name}.`, "success");
      onUpdated?.();
    } catch (e: any) {
      showToast(getCleanErrorMessage(e, "Failed to remove participant record."), "error");
    } finally {
      setDeletingParticipant(null);
    }
  };

  const providerBadge =
    cls.conferencing_provider === "Zoom"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : cls.conferencing_provider === "Google Meet"
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-purple-50 text-purple-700 border-purple-200";

  if (!mounted || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in transition-all duration-300"
      style={{
        paddingLeft: sidebarOffset !== "0px" ? `calc(${sidebarOffset} + 1rem)` : undefined,
      }}
    >
      {/* ── TOP-CENTER FLOATING TOAST NOTIFICATION (z-[99999] on top of navbar) ── */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-4 sm:top-5 left-1/2 z-[99999] max-w-md sm:max-w-xl w-auto min-w-[320px] px-4 py-3 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-xl ${toast.type === "success"
              ? "bg-slate-950/95 text-emerald-100 border-emerald-500/50 shadow-emerald-950/50 ring-1 ring-emerald-500/20"
              : toast.type === "error"
                ? "bg-slate-950/95 text-rose-100 border-rose-500/50 shadow-rose-950/50 ring-1 ring-rose-500/20"
                : toast.type === "warning"
                  ? "bg-slate-950/95 text-amber-100 border-amber-500/50 shadow-amber-950/50 ring-1 ring-amber-500/20"
                  : "bg-slate-950/95 text-slate-100 border-slate-700/80 shadow-slate-950/50"
            }`}
          style={{
            transform: `translateX(calc(-50% + (${sidebarOffset} / 2)))`,
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.type === "success" && (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            {toast.type === "error" && (
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
            )}
            {toast.type === "warning" && (
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
            )}
            {toast.type === "info" && (
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold leading-snug break-words">
                {toast.msg}
              </p>
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 ml-2 cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── MODAL CONTAINER (Center-Aligned with Page Content) ── */}
      <div
        ref={modalRef}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Attendance & Participant Roster
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${providerBadge}`}>
                {cls.conferencing_provider}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1 truncate">{cls.title}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {cls.formatted_date || cls.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {cls.formatted_time || cls.time} ({cls.duration} mins)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── INLINE ERROR BANNER (If Fetch or Roster Issue) ── */}
        {errorBanner && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium truncate">{errorBanner}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchAttendance}
                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px] transition-colors cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={() => setErrorBanner(null)}
                className="p-1 rounded-md text-rose-400 hover:text-rose-700 transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── 1. HEADER ANALYTICS BAR ── */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
          {/* Metric 1: Total Attended */}
          <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Attended</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-600">{totalPresent}</span>
              <span className="text-xs font-semibold text-slate-400">students</span>
            </div>
          </div>

          {/* Metric 2: Total Enrolled */}
          <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Enrolled</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{totalEnrolled}</span>
              <span className="text-xs font-semibold text-slate-400">in batch</span>
            </div>
          </div>

          {/* Metric 3: Absent */}
          <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Absent / Missed</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-rose-500">{totalAbsent}</span>
              <span className="text-xs font-semibold text-slate-400">learners</span>
            </div>
          </div>

          {/* Metric 4: Attendance Rate with Progress Bar */}
          <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attendance Rate</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-indigo-600">{attendanceRate}%</span>
              </div>
            </div>
            {/* Subtle progress bar */}
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── 2. ACTION TOOLBAR & FILTERS ── */}
        <div className="px-6 py-3.5 bg-slate-50/40 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filterStatus === "all"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                All ({roster.length})
              </button>
              <button
                onClick={() => setFilterStatus("present")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${filterStatus === "present"
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Present ({totalPresent})
              </button>
              <button
                onClick={() => setFilterStatus("absent")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${filterStatus === "absent"
                    ? "bg-white text-rose-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Absent ({totalAbsent})
              </button>
            </div>

            {/* Sync from Zoom Button (Available for Zoom Sessions) */}
            {cls.conferencing_provider === "Zoom" && (
              <button
                onClick={handleSyncZoom}
                disabled={syncing}
                title="Synchronize real-time participants and durations from Zoom"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {syncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Sync Zoom</span>
              </button>
            )}

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={exporting || roster.length === 0}
              title="Download formatted attendance CSV"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* ── 3. STUDENT ROSTER TABLE ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium text-slate-600">Loading participant roster...</p>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {searchTerm || filterStatus !== "all" ? "No matching students found" : "No Attendance Recorded Yet"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {searchTerm || filterStatus !== "all"
                  ? "Try adjusting your search terms or clearing the active status filter."
                  : "Attendance automatically updates when students join through the portal or after the meeting ends."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold sticky top-0 border-b border-slate-100 z-10">
                <tr>
                  <th className="py-3 px-6">Student</th>
                  <th className="py-3 px-4">Join Time</th>
                  <th className="py-3 px-4">Attended Duration</th>
                  <th className="py-3 px-4 text-center">Status & Toggle</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((student) => {
                  const isToggling = togglingMember === student.member;
                  const isDeleting = deletingParticipant === student.member;
                  const initials = (student.member_name || student.member || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={student.member}
                      className={`hover:bg-slate-50/80 transition-colors ${student.is_present ? "bg-white" : "bg-slate-50/30"
                        }`}
                    >
                      {/* Column 1: Student Avatar & Info */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          {student.member_image ? (
                            <img
                              src={getImageUrl(student.member_image)}
                              alt={student.member_name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[200px]">
                              {student.member_name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]" title={student.member}>
                              {student.member}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Join Time */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {student.formatted_joined_at || student.joined_at ? (
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{student.formatted_joined_at || student.joined_at}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Column 3: Duration */}
                      <td className="py-3.5 px-4">
                        {student.is_present ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {student.duration > 0 ? `${student.duration} mins` : "Attended"}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">0 mins</span>
                        )}
                      </td>

                      {/* Column 4: Status & Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          <button
                            onClick={() => handleToggleAttendance(student)}
                            disabled={isToggling}
                            className={`group relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer ${student.is_present ? "bg-emerald-500" : "bg-slate-200"
                              } ${isToggling ? "opacity-60 cursor-wait" : ""}`}
                            title={student.is_present ? "Click to mark Absent" : "Click to mark Present"}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${student.is_present ? "translate-x-7" : "translate-x-1"
                                }`}
                            />
                          </button>
                          <span
                            className={`ml-2 text-xs font-bold ${student.is_present ? "text-emerald-700" : "text-slate-400"
                              }`}
                          >
                            {student.is_present ? "Present" : "Absent"}
                          </span>
                        </div>
                      </td>

                      {/* Column 5: Delete / Remove Action */}
                      <td className="py-3.5 px-6 text-right">
                        {student.participant_name ? (
                          <button
                            onClick={() => handleRemoveParticipant(student)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove participant record"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400">
            Attendance changes save automatically with instant platform sync.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
