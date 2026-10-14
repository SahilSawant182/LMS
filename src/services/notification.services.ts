import { apiService } from "./api.services";
import {
  LMSNotification,
  NotificationPagination,
  GetNotificationsResponse,
  GetNotificationsParams,
} from "@/types/notification.types";

const getCsrfToken = (): string => {
  if (typeof document !== "undefined") {
    return (
      document.cookie
        .split("; ")
        .find((r) => r.startsWith("X-Frappe-CSRF-Token="))
        ?.split("=")[1] || ""
    );
  }
  return "";
};

const getNotificationHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  const csrf = getCsrfToken();
  if (csrf) {
    headers["X-Frappe-CSRF-Token"] = csrf;
  }
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  return headers;
};

const isUserLoggedIn = (): boolean => {
  if (typeof window === "undefined") return false;
  const apiKey = localStorage.getItem("apiKey");
  const userEmail = localStorage.getItem("userEmail") || localStorage.getItem("user");
  return Boolean(apiKey || userEmail);
};

export const getNotifications = async (
  params?: GetNotificationsParams
): Promise<GetNotificationsResponse> => {
  if (!isUserLoggedIn()) {
    return {
      notifications: [],
      pagination: {
        page: 1,
        page_size: params?.page_size || 20,
        total: 0,
        unread_count: 0,
        total_pages: 0,
      },
    };
  }

  const queryParams: Record<string, any> = {
    page: params?.page || 1,
    page_size: params?.page_size || 20,
  };

  if (params?.unread_only) {
    queryParams.unread_only = 1;
  }

  const res = await apiService.get("method/lms.lms.api.get_notifications", {
    params: queryParams,
    headers: getNotificationHeaders(),
  });

  if (res && typeof res === "object") {
    if ("notifications" in res && "pagination" in res) {
      return res as GetNotificationsResponse;
    }
    if (res.message && typeof res.message === "object" && "notifications" in res.message) {
      return res.message as GetNotificationsResponse;
    }
  }

  return {
    notifications: Array.isArray(res?.notifications) ? res.notifications : [],
    pagination: res?.pagination || {
      page: params?.page || 1,
      page_size: params?.page_size || 20,
      total: 0,
      unread_count: 0,
      total_pages: 0,
    },
  };
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  if (!isUserLoggedIn()) return 0;
  try {
    const data = await getNotifications({ page: 1, page_size: 1, unread_only: 1 });
    return typeof data.pagination?.unread_count === "number" ? data.pagination.unread_count : 0;
  } catch (err) {
    console.warn("Failed to fetch unread notification count:", err);
    return 0;
  }
};

export const markNotificationRead = async (name: string): Promise<boolean> => {
  if (!isUserLoggedIn() || !name) return false;
  const res = await apiService.post(
    "method/lms.lms.api.mark_notification_read",
    { name },
    { headers: getNotificationHeaders() }
  );

  if (res && typeof res === "object") {
    if ("success" in res) return Boolean(res.success);
    if (res.message && "success" in res.message) return Boolean(res.message.success);
  }
  return true;
};

export const markAllNotificationsRead = async (): Promise<number> => {
  if (!isUserLoggedIn()) return 0;
  const res = await apiService.post(
    "method/lms.lms.api.mark_all_notifications_read",
    {},
    { headers: getNotificationHeaders() }
  );

  if (res && typeof res === "object") {
    if (typeof res.marked_count === "number") return res.marked_count;
    if (res.message && typeof res.message.marked_count === "number") return res.message.marked_count;
  }
  return 0;
};
