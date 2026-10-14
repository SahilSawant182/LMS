"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

// Icon & Color styling based on document_type
function getNotificationIconInfo(docType?: string) {
  switch (docType) {
    case "LMS Enrollment":
      return {
        icon: GraduationCap,
        colorClass: "bg-blue-50 text-blue-600 border-blue-200",
        badgeBg: "bg-blue-500",
        label: "Enrollment",
      };
    case "LMS Badge Assignment":
      return {
        icon: Medal,
        colorClass: "bg-amber-50 text-amber-600 border-amber-200",
        badgeBg: "bg-amber-500",
        label: "Badge",
      };
    case "Discussion Reply":
      return {
        icon: MessageSquare,
        colorClass: "bg-purple-50 text-purple-600 border-purple-200",
        badgeBg: "bg-purple-500",
        label: "Discussion",
      };
    case "LMS Assignment Submission":
      return {
        icon: FileText,
        colorClass: "bg-orange-50 text-orange-600 border-orange-200",
        badgeBg: "bg-orange-500",
        label: "Assignment",
      };
    case "LMS Quiz Submission":
      return {
        icon: HelpCircle,
        colorClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
        badgeBg: "bg-emerald-500",
        label: "Quiz",
      };
    default:
      return {
        icon: Bell,
        colorClass: "bg-indigo-50 text-indigo-600 border-indigo-200",
        badgeBg: "bg-indigo-500",
        label: "Alert",
      };
  }
}

export default function NotificationBell() {
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

  // Click single notification - mark as read without any redirect
  const handleNotificationClick = async (notif: LMSNotification) => {
    if (notif.read === 0) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.name === notif.name ? { ...n, read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      setPagination((p) => ({ ...p, unread_count: Math.max(0, p.unread_count - 1) }));

      try {
        await markNotificationRead(notif.name);
      } catch (err) {
        console.warn("Could not mark notification as read on server:", err);
      }
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
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className={`relative p-2 rounded-xl transition-all duration-200 cursor-pointer ${
          isOpen
            ? "bg-indigo-50 text-indigo-600 shadow-sm ring-2 ring-indigo-200/60"
            : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80"
        }`}
      >
        <Bell className="w-4 h-4 transition-transform duration-200 hover:scale-110" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-rose-500 rounded-full ring-2 ring-white shadow-sm animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[330px] sm:w-[410px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-0 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-indigo-400" />
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-[11px] font-semibold text-indigo-200 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                title="Mark all notifications as read"
              >
                {markingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Subheader / Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-200/60 p-0.5 rounded-lg">
              <button
                onClick={() => handleFilterChange("all")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filterMode === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
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
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                )}
              </button>
            </div>

            <span className="text-[11px] font-medium text-slate-500">
              {pagination.total} total
            </span>
          </div>

          {/* Notifications Scroll Area */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {loading && notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <p className="text-xs font-medium">Loading notifications...</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {filterMode === "unread" ? "No Unread Notifications" : "No Notifications Yet"}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto">
                  {filterMode === "unread"
                    ? "You have caught up with all your updates!"
                    : "When courses enroll, badges are awarded, or milestones complete, they'll appear here."}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const iconInfo = getNotificationIconInfo(notif.document_type);
                const IconComponent = iconInfo.icon;
                const isUnread = notif.read === 0;

                return (
                  <div
                    key={notif.name}
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-4 py-3.5 transition-all flex items-start gap-3 relative group cursor-pointer ${
                      isUnread
                        ? "bg-indigo-50/40 hover:bg-indigo-50/70 border-l-3 border-indigo-600"
                        : "bg-white hover:bg-slate-50 border-l-3 border-transparent"
                    }`}
                  >
                    {/* Avatar / Icon Stack */}
                    <div className="relative shrink-0">
                      {notif.from_user_details?.user_image ? (
                        <img
                          src={notif.from_user_details.user_image}
                          alt={notif.from_user_details.full_name || "Sender"}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border ${iconInfo.colorClass}`}
                        >
                          {notif.from_user_details?.full_name ? (
                            getInitials(notif.from_user_details.full_name)
                          ) : (
                            <IconComponent className="w-4 h-4" />
                          )}
                        </div>
                      )}

                      {/* Small badge icon */}
                      <span
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white ${iconInfo.badgeBg} ring-2 ring-white`}
                        title={iconInfo.label}
                      >
                        <IconComponent className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-grow min-w-0 pr-1">
                      {/* Render subject with HTML (strong tags, etc.) */}
                      <div
                        className={`text-xs leading-snug line-clamp-2 ${
                          isUnread
                            ? "text-slate-900 font-semibold"
                            : "text-slate-700 font-normal"
                        }`}
                        dangerouslySetInnerHTML={{ __html: notif.subject }}
                      />

                      {/* Snippet / sender info & time */}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        {notif.from_user_details?.full_name && (
                          <span className="font-medium text-slate-600 truncate max-w-[120px]">
                            {notif.from_user_details.full_name}
                          </span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(notif.creation)}
                        </span>
                      </div>
                    </div>

                    {/* Right action / unread indicator */}
                    <div className="shrink-0 flex items-center">
                      {isUnread ? (
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100"
                          title="Unread notification - Click to mark read"
                        ></span>
                      ) : (
                        <span title="Read">
                          <Check className="w-3.5 h-3.5 text-slate-300" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Load more button */}
            {pagination.page < pagination.total_pages && (
              <div className="p-2 text-center bg-slate-50/50">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/60 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <span>
                      Load more ({pagination.total - notifications.length} remaining)
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
