"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Video,
  Plus,
  RefreshCw,
  Filter,
  AlertCircle,
  Wifi,
  Calendar,
  Clock,
} from "lucide-react";
import { LMSLiveClass, LiveClassStatus } from "@/types/live_class.types";
import { getBatchLiveClasses } from "@/services/live_class.services";
import LiveClassCard from "./LiveClassCard";
import ScheduleLiveClassModal from "./ScheduleLiveClassModal";
import LiveClassAttendanceModal from "./LiveClassAttendanceModal";

interface LiveClassTabProps {
  batchId: string;
  batchTitle: string;
  isInstructor: boolean;
  conferencingProvider?: string;
  zoomAccount?: string;
  googleMeetAccount?: string;
}

type FilterTab = "all" | "upcoming" | "live" | "ended";

const FILTER_OPTIONS: { key: FilterTab; label: string; icon?: React.ReactNode }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live Now" },
  { key: "ended", label: "Past Sessions" },
];

export default function LiveClassTab({
  batchId,
  batchTitle,
  isInstructor,
}: LiveClassTabProps) {
  const [classes, setClasses] = useState<LMSLiveClass[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingClass, setEditingClass] = useState<LMSLiveClass | null>(null);
  const [attendanceClass, setAttendanceClass] = useState<LMSLiveClass | null>(null);

  const fetchClasses = useCallback(
    async (statusFilter?: LiveClassStatus) => {
      setLoading(true);
      setError(null);
      try {
        const res = await getBatchLiveClasses(
          batchId,
          statusFilter && statusFilter !== ("all" as any) ? statusFilter : undefined
        );
        setClasses(res.classes || []);
        setCanManage(res.can_manage || isInstructor);
      } catch (e: any) {
        setError(e.message || "Failed to load live classes.");
      } finally {
        setLoading(false);
      }
    },
    [batchId, isInstructor]
  );

  useEffect(() => {
    const status = filter === "all" ? undefined : (filter as LiveClassStatus);
    fetchClasses(status);
  }, [filter, fetchClasses]);

  // Auto-refresh every 60s if there's a live class
  useEffect(() => {
    const hasLive = classes.some((c) => c.status === "live" || c.is_live);
    if (!hasLive) return;
    const iv = setInterval(() => {
      const status = filter === "all" ? undefined : (filter as LiveClassStatus);
      fetchClasses(status);
    }, 60000);
    return () => clearInterval(iv);
  }, [classes, filter, fetchClasses]);

  const handleEdit = (cls: LMSLiveClass) => {
    setEditingClass(cls);
    setShowScheduleModal(true);
  };

  const handleViewAttendance = (cls: LMSLiveClass) => {
    setAttendanceClass(cls);
  };

  const handleModalClose = () => {
    setShowScheduleModal(false);
    setEditingClass(null);
  };

  const handleSaved = () => {
    const status = filter === "all" ? undefined : (filter as LiveClassStatus);
    fetchClasses(status);
  };

  const liveCount = classes.filter((c) => c.status === "live" || c.is_live).length;
  const upcomingCount = classes.filter((c) => c.status === "upcoming" || c.is_upcoming).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Top gradient band */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Video className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Batch Live Classes</h2>
              {liveCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  {liveCount} Live
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Live interactive sessions, workshops, and cohort discussions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const status = filter === "all" ? undefined : (filter as LiveClassStatus);
                fetchClasses(status);
              }}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {(canManage || isInstructor) && (
              <button
                onClick={() => {
                  setEditingClass(null);
                  setShowScheduleModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="whitespace-nowrap">Schedule Live Class</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-6 pb-4 flex items-center gap-1.5 overflow-x-auto">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                filter === opt.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
              {opt.key === "live" && liveCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">
                  {liveCount}
                </span>
              )}
              {opt.key === "upcoming" && upcomingCount > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                    filter === "upcoming"
                      ? "bg-indigo-700 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {upcomingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative mb-4">
            <div className="w-12 h-12 border-4 border-indigo-100 rounded-full" />
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-sm text-slate-500">Loading classes…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Couldn't load classes</h3>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => fetchClasses()}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : classes.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-dashed border-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
            {filter === "live" ? (
              <Wifi className="w-8 h-8 text-indigo-300" />
            ) : filter === "ended" ? (
              <Clock className="w-8 h-8 text-indigo-300" />
            ) : filter === "upcoming" ? (
              <Calendar className="w-8 h-8 text-indigo-300" />
            ) : (
              <Video className="w-8 h-8 text-indigo-300" />
            )}
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-2">
            {filter === "live"
              ? "No Live Sessions Right Now"
              : filter === "ended"
              ? "No Past Sessions Yet"
              : filter === "upcoming"
              ? "No Upcoming Classes"
              : "No Live Classes Scheduled"}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {canManage || isInstructor
              ? "Click '+ Schedule Live Class' to set up your first interactive session for this batch."
              : "No live classes are currently scheduled for this batch. Check back soon!"}
          </p>
          {(canManage || isInstructor) && filter === "all" && (
            <button
              onClick={() => {
                setEditingClass(null);
                setShowScheduleModal(true);
              }}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Schedule Your First Session
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <LiveClassCard
              key={cls.name}
              cls={cls}
              canManage={canManage || isInstructor}
              onEdit={handleEdit}
              onViewAttendance={handleViewAttendance}
              onDeleted={handleSaved}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showScheduleModal && (
        <ScheduleLiveClassModal
          batchId={batchId}
          batchTitle={batchTitle}
          editClass={editingClass}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {attendanceClass && (
        <LiveClassAttendanceModal
          cls={attendanceClass}
          onClose={() => {
            setAttendanceClass(null);
            handleSaved();
          }}
          onUpdated={handleSaved}
        />
      )}
    </div>
  );
}
