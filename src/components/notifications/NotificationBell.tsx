"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Check,
  GraduationCap,
  Medal,
  MessageSquare,
  FileText,
  HelpCircle,
  Sparkles,
  Clock,
  Loader2,
  X,
  ArrowUpRight,
  Trophy,
  Users,
  BookOpen,
  Award,
  Inbox,
  CheckCircle2,
} from "lucide-react";
import {
  LMSNotification,
  NotificationPagination,
} from "@/types/notification.types";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/notification.services";

// Helper for relative time
function formatTimeAgo(dateStr: string): string {
  try {
    const formattedStr = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
    const date = new Date(formattedStr);
    if (isNaN(date.getTime())) return "recently";

    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 45) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch (e) {
    return "recently";
  }
}

// Helper to format full date for tooltip
function formatFullDate(dateStr: string): string {
  try {
    const formattedStr = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
    const date = new Date(formattedStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return dateStr;
  }
}

// Helper for sender initials
function getInitials(name?: string): string {
  if (!name) return "U";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Helper to clean HTML content in email_content (strip empty <p></p> tags, trailing breaks, etc.)
function cleanHtmlContent(raw?: string | null): string {
  if (!raw) return "";
  let content = raw.trim();

  // Strip empty paragraphs and breaks: <p></p>, <p><br></p>, <p>&nbsp;</p>
  content = content
    .replace(/<p[^>]*>\s*(?:<br\s*\/?>|&nbsp;|\s)*<\/p>/gi, "")
    .replace(/(?:<br\s*\/?>|\s)+$/gi, "")
    .trim();

  // If after stripping tags it is completely empty, return ""
  const textOnly = content.replace(/<[^>]*>/g, "").trim();
  if (!textOnly) return "";

  return content;
}

// Resolve backend Frappe link to Next.js route
export function resolveNotificationLink(rawLink?: string | null): string | null {
  if (!rawLink || !rawLink.trim()) return null;
  let link = rawLink.trim();

  // If already full external URL
  if (link.startsWith("http://") || link.startsWith("https://")) {
    return link;
  }

  // Normalize Frappe path prefixes to Next.js routes
  // /lms/courses/:slug -> /course/:slug
  if (link.startsWith("/lms/courses/")) {
    link = link.replace(/^\/lms\/courses\//, "/course/");
  } else if (link.startsWith("/lms/batches/")) {
    link = link.replace(/^\/lms\/batches\//, "/batches/");
  } else if (link.startsWith("/lms/")) {
    link = link.replace(/^\/lms\//, "/");
  }

  // Frappe user badges/profile link /users/:username -> /badges or /dashboard
  if (link.startsWith("/users/")) {
    return "/badges";
  }

  return link;
}

// Icon & Color styling based on document_type and subject context
function getNotificationDetails(notif: LMSNotification) {
  const docType = notif.document_type;
  const subject = (notif.subject || "").toLowerCase();
  const isCompletion = subject.includes("completed");

  if (isCompletion) {
    return {
      icon: Trophy,
      colorClass: "bg-amber-50 text-amber-600 border-amber-200",
      badgeBg: "bg-amber-500",
      tagClass: "bg-amber-50 text-amber-700 border-amber-200",
      label: "Course Completed",
      actionText: "View Course",
    };
  }

  switch (docType) {
    case "LMS Enrollment":
      return {
        icon: GraduationCap,
        colorClass: "bg-blue-50 text-blue-600 border-blue-200",
        badgeBg: "bg-blue-500",
        tagClass: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Course Enrollment",
        actionText: "View Course",
      };
    case "LMS Batch Enrollment":
      return {
        icon: Users,
        colorClass: "bg-teal-50 text-teal-600 border-teal-200",
        badgeBg: "bg-teal-500",
        tagClass: "bg-teal-50 text-teal-700 border-teal-200",
        label: "Batch Enrollment",
        actionText: "View Batch",
      };
    case "LMS Batch":
      return {
        icon: MessageSquare,
        colorClass: "bg-purple-50 text-purple-600 border-purple-200",
        badgeBg: "bg-purple-500",
        tagClass: "bg-purple-50 text-purple-700 border-purple-200",
        label: "Batch Discussion",
        actionText: "View Discussion",
      };
    case "LMS Course":
      return {
        icon: BookOpen,
        colorClass: "bg-sky-50 text-sky-600 border-sky-200",
        badgeBg: "bg-sky-500",
        tagClass: "bg-sky-50 text-sky-700 border-sky-200",
        label: "Course Content",
        actionText: "View Course",
      };
    case "LMS Badge Assignment":
      return {
        icon: Medal,
        colorClass: "bg-amber-50 text-amber-600 border-amber-200",
        badgeBg: "bg-amber-500",
        tagClass: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Badge Awarded",
        actionText: "View Badges",
      };
    case "LMS Quiz Submission":
      return {
        icon: Award,
        colorClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
        badgeBg: "bg-emerald-500",
        tagClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Quiz Submission",
        actionText: "View Quiz",
      };
    case "LMS Assignment Submission":
      return {
        icon: FileText,
        colorClass: "bg-orange-50 text-orange-600 border-orange-200",
        badgeBg: "bg-orange-500",
        tagClass: "bg-orange-50 text-orange-700 border-orange-200",
        label: "Assignment",
        actionText: "View Submission",
      };
    case "Discussion Reply":
      return {
        icon: MessageSquare,
        colorClass: "bg-violet-50 text-violet-600 border-violet-200",
        badgeBg: "bg-violet-500",
        tagClass: "bg-violet-50 text-violet-700 border-violet-200",
        label: "Discussion",
        actionText: "View Discussion",
      };
    default:
      return {
        icon: Bell,
        colorClass: "bg-indigo-50 text-indigo-600 border-indigo-200",
        badgeBg: "bg-indigo-500",
        tagClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
        label: "Notification",
        actionText: "View Details",
      };
  }
}

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<LMSNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");
  const [pagination, setPagination] = useState<NotificationPagination>({
    page: 1,
    page_size: 20,
    total: 0,
    unread_count: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch initial unread count (lightweight call)
  const fetchUnreadCountOnly = useCallback(async () => {
    try {
      const data = await getNotifications({
        page: 1,
        page_size: 1,
        unread_only: 1,
      });
      if (typeof data.pagination?.unread_count === "number") {
        setUnreadCount(data.pagination.unread_count);
      }
    } catch (err) {
      // Ignore polling errors silently
    }
  }, []);

  // Fetch notifications list
  const loadNotifications = useCallback(
    async (pageToLoad = 1, append = false, onlyUnread = filterMode === "unread") => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await getNotifications({
          page: pageToLoad,
          page_size: 20,
          unread_only: onlyUnread,
        });

        if (append) {
          setNotifications((prev) => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications || []);
        }

        if (data.pagination) {
          setPagination(data.pagination);
          if (typeof data.pagination.unread_count === "number") {
            setUnreadCount(data.pagination.unread_count);
          }
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filterMode]
  );

  // Initial mount & periodic polling (every 60s)
  useEffect(() => {
    fetchUnreadCountOnly();

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchUnreadCountOnly();
      }
    }, 60000);

    const handleAuth = () => {
      fetchUnreadCountOnly();
    };

    window.addEventListener("auth-changed", handleAuth);

    return () => {
      clearInterval(interval);
      window.removeEventListener("auth-changed", handleAuth);
    };
  }, [fetchUnreadCountOnly]);

  // Click outside and Esc key listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // When panel toggled open
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadNotifications(1, false, filterMode === "unread");
    }
  };

  // Change filter tab (All vs Unread)
  const handleFilterChange = (mode: "all" | "unread") => {
    if (mode === filterMode) return;
    setFilterMode(mode);
    loadNotifications(1, false, mode === "unread");
  };

  // Load next page
  const handleLoadMore = () => {
    if (pagination.page < pagination.total_pages && !loadingMore) {
      loadNotifications(pagination.page + 1, true, filterMode === "unread");
    }
  };

  // Mark single notification read
  const markAsReadInternal = async (name: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.name === name ? { ...n, read: 1 } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    setPagination((p) => ({ ...p, unread_count: Math.max(0, p.unread_count - 1) }));

    try {
      await markNotificationRead(name);
    } catch (err) {
      console.warn("Could not mark notification as read on server:", err);
    }
  };

  // Click single notification card - mark as read and navigate if link exists
  const handleNotificationClick = async (notif: LMSNotification) => {
    if (notif.read === 0) {
      markAsReadInternal(notif.name);
    }

    const targetLink = resolveNotificationLink(notif.link);
    if (targetLink) {
      setIsOpen(false);
      if (targetLink.startsWith("http://") || targetLink.startsWith("https://")) {
        window.open(targetLink, "_blank", "noopener,noreferrer");
      } else {
        router.push(targetLink);
      }
    }
  };

  // Toggle read icon click (without triggering card navigation)
  const handleToggleReadOnly = (e: React.MouseEvent, notif: LMSNotification) => {
    e.stopPropagation();
    if (notif.read === 0) {
      markAsReadInternal(notif.name);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    setUnreadCount(0);
    setPagination((p) => ({ ...p, unread_count: 0 }));

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const displayedNotifications =
    filterMode === "unread"
      ? notifications.filter((n) => n.read === 0)
      : notifications;

  return (
    <div className="relative whitespace-normal text-left" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className={`relative p-2 rounded-xl transition-all duration-200 cursor-pointer ${
          isOpen
            ? "bg-indigo-50 text-indigo-600 shadow-xs ring-2 ring-indigo-200/60"
            : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80"
        }`}
      >
        <Bell className="w-4 h-4 transition-transform duration-200 hover:scale-110" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-full ring-2 ring-white shadow-xs animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel - Responsive layout with strict word wrapping and no horizontal overflow */}
      {isOpen && (
        <div
          className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2.5 w-auto sm:w-[420px] md:w-[440px] max-w-[calc(100vw-1.5rem)] sm:max-w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5 whitespace-normal text-left"
          style={{ maxHeight: "calc(100vh - 5rem)" }}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 whitespace-normal">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center text-indigo-300 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white tracking-tight">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full shrink-0">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-normal truncate">
                  {unreadCount > 0
                    ? `You have ${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                    : "You're caught up with all updates"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="text-[11px] font-semibold text-indigo-200 hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1 rounded-lg hover:bg-white/10 active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Mark all notifications as read"
                >
                  {markingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader / Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs shrink-0 backdrop-blur-xs whitespace-normal">
            <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg shrink-0">
              <button
                onClick={() => handleFilterChange("all")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filterMode === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All {pagination.total > 0 && <span className="opacity-70 ml-1">({pagination.total})</span>}
              </button>
              <button
                onClick={() => handleFilterChange("unread")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterMode === "unread"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            <span className="text-[11px] font-medium text-slate-500 shrink-0">
              {filterMode === "unread" ? `${unreadCount} unread` : `${pagination.total} total`}
            </span>
          </div>

          {/* Notifications Scroll Area - Explicit overflow-x-hidden and whitespace-normal */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 overscroll-contain whitespace-normal">
            {loading && notifications.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                <p className="text-xs font-medium text-slate-500">Loading notifications...</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-14 px-6 text-center">
                <div className="w-13 h-13 rounded-2xl bg-indigo-50/80 text-indigo-500 border border-indigo-100 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                  {filterMode === "unread" ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Inbox className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {filterMode === "unread" ? "All Caught Up!" : "No Notifications Yet"}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[260px] mx-auto leading-relaxed">
                  {filterMode === "unread"
                    ? "You don't have any unread notifications at the moment."
                    : "Course enrollments, badge achievements, and discussions will appear here."}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const info = getNotificationDetails(notif);
                const IconComponent = info.icon;
                const isUnread = notif.read === 0;
                const cleanContent = cleanHtmlContent(notif.email_content);
                const targetLink = resolveNotificationLink(notif.link);

                return (
                  <div
                    key={notif.name}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 transition-all duration-150 flex items-start gap-3 relative group cursor-pointer w-full min-w-0 max-w-full overflow-hidden whitespace-normal ${
                      isUnread
                        ? "bg-indigo-50/35 hover:bg-indigo-50/65 border-l-[3.5px] border-indigo-600"
                        : "bg-white hover:bg-slate-50/90 border-l-[3.5px] border-transparent"
                    }`}
                  >
                    {/* Avatar / Icon Stack */}
                    <div className="relative shrink-0 mt-0.5">
                      {notif.from_user_details?.user_image ? (
                        <img
                          src={notif.from_user_details.user_image}
                          alt={notif.from_user_details.full_name || "Sender"}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-xs"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border shadow-2xs ${info.colorClass}`}
                        >
                          {notif.from_user_details?.full_name ? (
                            getInitials(notif.from_user_details.full_name)
                          ) : (
                            <IconComponent className="w-5 h-5" />
                          )}
                        </div>
                      )}

                      {/* Small badge icon on avatar */}
                      <span
                        className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center text-white ${info.badgeBg} ring-2 ring-white shadow-xs`}
                        title={info.label}
                      >
                        <IconComponent className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    {/* Content Section - Strict wrapping */}
                    <div className="flex-1 min-w-0 max-w-full overflow-hidden whitespace-normal">
                      {/* Top Metadata Row */}
                      <div className="flex items-center flex-wrap gap-1.5 text-[11px] mb-1.5 whitespace-normal">
                        {/* Category tag pill */}
                        <span className={`px-2 py-0.5 rounded-full font-semibold border text-[10px] shrink-0 ${info.tagClass}`}>
                          {info.label}
                        </span>

                        {notif.from_user_details?.full_name && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                              {notif.from_user_details.full_name}
                            </span>
                          </>
                        )}

                        <span className="text-slate-300">•</span>
                        <span
                          className="flex items-center gap-1 text-slate-400 shrink-0"
                          title={formatFullDate(notif.creation)}
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeAgo(notif.creation)}
                        </span>
                      </div>

                      {/* Subject - Full HTML, unclipped, wrapping naturally */}
                      <div
                        className={`text-sm leading-snug break-words whitespace-normal ${
                          isUnread
                            ? "text-slate-900 font-semibold"
                            : "text-slate-800 font-normal"
                        } [&_strong]:font-bold [&_strong]:text-slate-900 [&_em]:italic`}
                        style={{
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                        }}
                        dangerouslySetInnerHTML={{ __html: notif.subject }}
                      />

                      {/* Description / Content (email_content) */}
                      {cleanContent && (
                        <div
                          className="mt-2 bg-slate-50/90 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-600 leading-relaxed break-words whitespace-normal w-full max-w-full overflow-hidden [&_*]:whitespace-normal [&_p]:whitespace-normal [&_p]:mb-1 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-slate-800"
                          style={{
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          <div
                            className="whitespace-normal break-words"
                            style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal" }}
                            dangerouslySetInnerHTML={{ __html: cleanContent }}
                          />
                        </div>
                      )}

                      {/* Navigation Action Link */}
                      {targetLink && (
                        <div className="mt-2.5 flex items-center">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 group-hover:underline">
                            <span>{info.actionText}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Mark as Read Button */}
                    <div className="shrink-0 flex items-center ml-1">
                      {isUnread ? (
                        <button
                          onClick={(e) => handleToggleReadOnly(e, notif)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-100/60 transition-colors"
                          title="Mark as read"
                          aria-label="Mark as read"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 group-hover:hidden" />
                          <Check className="w-4 h-4 hidden group-hover:block" />
                        </button>
                      ) : (
                        <span className="w-7 h-7 flex items-center justify-center text-slate-300" title="Read">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Load more button */}
            {pagination.page < pagination.total_pages && (
              <div className="p-3 text-center bg-slate-50/50 border-t border-slate-100">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full py-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/70 border border-indigo-100 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading more notifications...</span>
                    </>
                  ) : (
                    <span>
                      Load more notifications ({pagination.total - notifications.length} remaining)
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
