"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Video,
  Users,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle2,
  Wifi,
  Loader2,
} from "lucide-react";
import { LMSLiveClass } from "@/types/live_class.types";
import { deleteLiveClass, retryLiveClassInvites, recordLiveClassJoin } from "@/services/live_class.services";
import { getImageUrl } from "@/services/api.services";

interface LiveClassCardProps {
  cls: LMSLiveClass;
  canManage: boolean;
  onEdit: (cls: LMSLiveClass) => void;
  onViewAttendance: (cls: LMSLiveClass) => void;
  onDeleted: () => void;
}

function useCountdown(targetDate: string, targetTime: string, timezone: string) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const getTargetMs = () => {
      try {
        const dt = new Date(`${targetDate}T${targetTime}`);
        return dt.getTime();
      } catch {
        return null;
      }
    };

    const update = () => {
      const target = getTargetMs();
      if (!target) return;
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setTimeLeft(`${d}d ${h}h`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m`);
      else setTimeLeft(`${m}m`);
    };

    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [targetDate, targetTime, timezone]);

  return timeLeft;
}

const PROVIDER_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Zoom: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  "Google Meet": {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  Custom: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
};

export default function LiveClassCard({
  cls,
  canManage,
  onEdit,
  onViewAttendance,
  onDeleted,
}: LiveClassCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [joining, setJoining] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const countdown = useCountdown(cls.date, cls.time, cls.timezone);
  const providerStyle = PROVIDER_STYLES[cls.conferencing_provider] || PROVIDER_STYLES["Custom"];

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = async () => {
    if (!confirm(`Cancel "${cls.title}"? Students will be notified.`)) return;
    setDeleting(true);
    try {
      await deleteLiveClass(cls.name);
      showToast("Class cancelled successfully.", "success");
      setTimeout(onDeleted, 800);
    } catch (e: any) {
      showToast(e.message || "Failed to cancel class.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleRetryInvites = async () => {
    setRetrying(true);
    try {
      await retryLiveClassInvites(cls.name);
      showToast("Retrying calendar invites...", "success");
    } catch (e: any) {
      showToast(e.message || "Retry failed.", "error");
    } finally {
      setRetrying(false);
    }
  };

  const handleJoin = async () => {
    if (canManage) {
      const url = cls.start_url || cls.join_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    setJoining(true);
    let targetUrl = cls.join_url;
    try {
      const res = await recordLiveClassJoin(cls.name);
      if (res?.join_url) {
        targetUrl = res.join_url;
      }
    } catch (e: any) {
      console.warn("Check-in record error, falling back to join_url:", e);
    } finally {
      setJoining(false);
      if (targetUrl) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  const isLive = cls.status === "live" || cls.is_live;
  const isEnded = cls.status === "ended" || cls.is_ended;
  const isUpcoming = cls.status === "upcoming" || cls.is_upcoming;

  const canJoinNow = isLive || cls.can_join;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${
        isLive
          ? "border-red-200 ring-1 ring-red-100"
          : "border-slate-200/80"
      }`}
    >
      {/* Toast */}
      {toast && (
        <div
          className={`absolute top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-fade-in ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Status bar at top */}
      <div
        className={`h-1.5 w-full ${
          isLive ? "bg-red-500" : isUpcoming ? "bg-indigo-500" : "bg-slate-200"
        }`}
      />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-2">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  LIVE NOW
                </span>
              ) : isUpcoming ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  UPCOMING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  ENDED
                </span>
              )}

              {/* Provider badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${providerStyle.bg} ${providerStyle.text} ${providerStyle.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${providerStyle.dot}`} />
                {cls.conferencing_provider}
              </span>

              {/* Failed invites warning */}
              {cls.invite_status === "Failed" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Invite Failed
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
              {cls.title}
            </h3>
          </div>

          {/* Host avatar */}
          {cls.host_image ? (
            <img
              src={getImageUrl(cls.host_image)}
              alt={cls.host_name || cls.host}
              className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm border-2 border-white shadow-sm shrink-0">
              {(cls.host_name || cls.host || "H").charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium">{cls.formatted_date || cls.date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium">
              {cls.formatted_time || cls.time}{" "}
              <span className="text-slate-400">({cls.duration} mins)</span>
              {cls.timezone && (
                <span className="ml-1 text-slate-400">{cls.timezone}</span>
              )}
            </span>
          </div>
          {canManage && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium">{cls.attendees || 0} Attendees</span>
            </div>
          )}
          {!canManage && isEnded && (
            <div className="flex items-center gap-1.5">
              {cls.my_attendance || cls.is_attended ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Attended {cls.my_attendance?.duration || cls.attendance_duration ? `(${cls.my_attendance?.duration || cls.attendance_duration}m)` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Absent
                </span>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {cls.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{cls.description}</p>
        )}

        {/* Countdown pill for upcoming */}
        {isUpcoming && countdown && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg w-fit">
            <Clock className="w-3 h-3 text-indigo-500" />
            <span className="text-[11px] font-bold text-indigo-700">Starts in {countdown}</span>
          </div>
        )}

        {/* Failed invite banner */}
        {cls.invite_status === "Failed" && canManage && (
          <div className="flex items-center justify-between gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[11px] font-semibold text-amber-700">
                Calendar invite failed ({cls.invite_attempts || 0} attempts)
              </span>
            </div>
            <button
              onClick={handleRetryInvites}
              disabled={retrying}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50"
            >
              {retrying ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Retry
            </button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap border-t border-slate-100 pt-4">
          {canManage ? (
            <>
              {/* Start Class */}
              {!isEnded && (
                <button
                  onClick={handleJoin}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isLive
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  }`}
                >
                  {isLive ? (
                    <>
                      <Wifi className="w-3.5 h-3.5" />
                      Host Session
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Start Class
                    </>
                  )}
                </button>
              )}

              {/* View Attendance */}
              <button
                onClick={() => onViewAttendance(cls)}
                title="View attendance roster and analytics"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                Attendance
              </button>

              {/* Edit & Delete */}
              {!isEnded && (
                <>
                  <button
                    onClick={() => onEdit(cls)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 transition-colors"
                    title="Edit class"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-600 transition-colors disabled:opacity-50"
                    title="Cancel class"
                  >
                    {deleting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {/* Student Join button */}
              {isEnded ? (
                <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-400 cursor-not-allowed">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Session Ended
                </div>
              ) : canJoinNow ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-75 ${
                    isLive
                      ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {joining ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Joining...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Join Class</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 text-slate-500 border border-slate-100">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Starts {cls.formatted_date || cls.date}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
