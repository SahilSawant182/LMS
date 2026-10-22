import { apiService } from "./api.services";
import {
  LMSLiveClass,
  LMSLiveClassParticipant,
  ConferencingSettings,
  CreateLiveClassPayload,
  UpdateLiveClassPayload,
  LiveClassStatus,
  LiveClassAttendanceData,
  RecordJoinResponse,
  ZoomSetting,
  SaveZoomSettingPayload,
  TestZoomCredentialsPayload,
  GoogleMeetStatus,
  GoogleMeetSetting,
  GoogleMeetAuthUrlResponse,
} from "@/types/live_class.types";

export const getConferencingSettings = async (): Promise<ConferencingSettings> => {
  const res = await apiService.get("method/lms.lms.stride_lms.get_conferencing_settings");
  const raw = (res as any)?.data || res;
  const zoomAccounts = raw?.zoom_accounts || raw?.zoom || [];
  const googleMeetAccounts = raw?.google_meet_accounts || raw?.google_meet || [];
  const providers = raw?.providers || ["Zoom", "Google Meet"];
  return {
    zoom_accounts: Array.isArray(zoomAccounts) ? zoomAccounts : [],
    google_meet_accounts: Array.isArray(googleMeetAccounts) ? googleMeetAccounts : [],
    providers: Array.isArray(providers) ? providers : [],
  };
};

export const getBatchLiveClasses = async (
  batchName: string,
  status?: LiveClassStatus
): Promise<{ can_manage: boolean; classes: LMSLiveClass[]; total: number }> => {
  const res = await apiService.get("method/lms.lms.stride_lms.get_batch_live_classes", {
    params: { batch: batchName, ...(status ? { status } : {}) },
  });
  const data = (res as any)?.data || res;
  return data || { can_manage: false, classes: [], total: 0 };
};

export const getLiveClass = async (className: string): Promise<LMSLiveClass> => {
  const res = await apiService.get("method/lms.lms.stride_lms.get_live_class", {
    params: { name: className },
  });
  const data = (res as any)?.data || res;
  return data;
};

export const createLiveClass = async (payload: CreateLiveClassPayload): Promise<LMSLiveClass> => {
  const res = await apiService.post("method/lms.lms.stride_lms.create_live_class", payload);
  const data = (res as any)?.data || res;
  return data;
};

export const updateLiveClass = async (payload: UpdateLiveClassPayload): Promise<LMSLiveClass> => {
  const res = await apiService.post("method/lms.lms.stride_lms.update_live_class", payload);
  const data = (res as any)?.data || res;
  return data;
};

export const deleteLiveClass = async (className: string, reason?: string) => {
  return await apiService.post("method/lms.lms.stride_lms.delete_live_class", {
    name: className,
    reason,
  });
};

// 1. Student Check-in on Join
export const recordLiveClassJoin = async (liveClassId: string): Promise<RecordJoinResponse> => {
  const res = await apiService.post("method/lms.lms.stride_lms.record_live_class_join", {
    live_class: liveClassId,
  });
  const data = (res as any)?.data || res;
  return data;
};

// 2. Fetch Full Attendance Roster & Analytics
export const getLiveClassAttendance = async (
  liveClassId: string
): Promise<LiveClassAttendanceData> => {
  const res = await apiService.post("method/lms.lms.stride_lms.get_live_class_attendance", {
    live_class: liveClassId,
  });
  const data = (res as any)?.data || res;
  return data || {
    live_class: liveClassId,
    title: "",
    date: "",
    time: "",
    duration: 0,
    conferencing_provider: "",
    total_attendees: 0,
    total_enrolled: 0,
    attendance_rate: 0,
    participants: [],
    enrolled_roster: [],
    my_attendance: null,
    is_instructor: false,
  };
};

// 3. Mark Individual Student Attendance (Present / Absent)
export const markLiveClassAttendance = async (
  liveClassId: string,
  memberEmail: string,
  status: "Present" | "Absent",
  duration?: number
) => {
  const res = await apiService.post("method/lms.lms.stride_lms.mark_live_class_attendance", {
    live_class: liveClassId,
    member: memberEmail,
    status,
    duration,
  });
  return (res as any)?.data || res;
};

// 4. Bulk Mark Attendance
export const bulkMarkLiveClassAttendance = async (
  liveClassId: string,
  attendees: Array<{ member: string; status: "Present" | "Absent"; duration?: number }>
) => {
  const res = await apiService.post("method/lms.lms.stride_lms.bulk_mark_live_class_attendance", {
    live_class: liveClassId,
    attendees,
  });
  return (res as any)?.data || res;
};

// 5. Delete / Remove Participant
export const removeLiveClassParticipant = async (participantName: string) => {
  const res = await apiService.post("method/lms.lms.stride_lms.remove_live_class_participant", {
    name: participantName,
  });
  return (res as any)?.data || res;
};

// 6. Export Attendance CSV
export const exportLiveClassAttendance = async (
  liveClassId: string
): Promise<{ csv_data: string; filename: string }> => {
  const res = await apiService.post("method/lms.lms.stride_lms.export_live_class_attendance", {
    live_class: liveClassId,
  });
  const data = (res as any)?.data || res;
  return data;
};

// 7. Sync from Zoom Cloud API
export const syncLiveClassAttendance = async (liveClassId: string) => {
  const res = await apiService.post("method/lms.lms.stride_lms.sync_live_class_attendance", {
    live_class: liveClassId,
  });
  return (res as any)?.data || res;
};

export const retryLiveClassInvites = async (className: string) => {
  return await apiService.post("method/lms.lms.stride_lms.retry_live_class_invites", {
    live_class: className,
  });
};

export const getMyLiveClasses = async (limit = 10): Promise<LMSLiveClass[]> => {
  const res = await apiService.get("method/lms.lms.stride_lms.get_my_live_classes", {
    params: { limit },
  });
  const data = (res as any)?.data || res;
  return Array.isArray(data) ? data : [];
};

export const getAdminLiveClasses = async (limit = 10): Promise<LMSLiveClass[]> => {
  const res = await apiService.get("method/lms.lms.stride_lms.get_admin_live_classes", {
    params: { limit },
  });
  const data = (res as any)?.data || res;
  return Array.isArray(data) ? data : [];
};

// ==================== ZOOM ACCOUNT MANAGEMENT ====================

// Test credentials before saving
export const testZoomCredentials = async (
  payload: TestZoomCredentialsPayload
): Promise<{ status: number; message: string; data?: any }> => {
  const res = await apiService.post("method/lms.lms.stride_lms.test_zoom_credentials", payload);
  const data = (res as any)?.message || res;
  return data;
};

// Save (create or update) Zoom account
export const saveZoomSetting = async (
  payload: SaveZoomSettingPayload
): Promise<{ status: number; message: string; data?: ZoomSetting }> => {
  const res = await apiService.post("method/lms.lms.stride_lms.save_zoom_setting", payload);
  const data = (res as any)?.message || res;
  return data;
};

// Get instructor's connected Zoom accounts
export const getMyZoomSettings = async (): Promise<ZoomSetting[]> => {
  const res = await apiService.get("method/lms.lms.stride_lms.get_my_zoom_settings");
  const raw = (res as any)?.message || res;
  const accounts = raw?.data || raw || [];
  return Array.isArray(accounts) ? accounts : [];
};

// Delete Zoom account
export const deleteZoomSetting = async (
  name: string
): Promise<{ status: number; message: string }> => {
  const res = await apiService.post("method/lms.lms.stride_lms.delete_zoom_setting", { name });
  const data = (res as any)?.message || res;
  return data;
};

// ==================== GOOGLE MEET & CALENDAR MANAGEMENT ====================

// Check server Google OAuth credentials status
export const getGoogleMeetStatus = async (): Promise<GoogleMeetStatus> => {
  const res = await apiService.get("method/lms.lms.stride_lms.get_google_meet_status");
  const data = (res as any)?.message?.data || (res as any)?.data || res;
  return data;
};

// Admin only: Configure Google OAuth credentials
export const configureGoogleOAuth = async (payload: {
  client_id: string;
  client_secret?: string;
  enabled?: number;
}): Promise<{ status: number; message: string; data?: any }> => {
  const res = await apiService.post("method/lms.lms.stride_lms.configure_google_oauth", payload);
  const data = (res as any)?.message || res;
  return data;
};

// Get instructor's connected Google Meet accounts
export const getMyGoogleMeetSettings = async (): Promise<GoogleMeetSetting[]> => {
  const res = await apiService.get("method/lms.lms.stride_lms.get_my_google_meet_settings");
  const raw = (res as any)?.message || res;
  const accounts = raw?.data || raw || [];
  return Array.isArray(accounts) ? accounts : [];
};

// Generate Google OAuth authorization URL for offline calendar access
export const getGoogleMeetAuthUrl = async (
  accountName: string,
  redirectUri?: string
): Promise<GoogleMeetAuthUrlResponse> => {
  const currentUrl = typeof window !== "undefined" ? window.location.href : undefined;
  const res = await apiService.post("method/lms.lms.stride_lms.get_google_meet_auth_url", {
    account_name: accountName,
    redirect_uri: redirectUri || currentUrl,
  });
  const data = (res as any)?.message?.data || (res as any)?.data || res;
  return data;
};

// Update Google Meet account (rename / toggle enabled)
export const saveGoogleMeetSetting = async (payload: {
  name?: string;
  account_name: string;
  enabled?: number;
}): Promise<{ status: number; message: string; data?: GoogleMeetSetting }> => {
  const res = await apiService.post("method/lms.lms.stride_lms.save_google_meet_setting", payload);
  const data = (res as any)?.message || res;
  return data;
};

// Delete Google Meet account (unlinks from batches automatically on backend)
export const deleteGoogleMeetSetting = async (
  name: string
): Promise<{ status: number; message: string }> => {
  const res = await apiService.post("method/lms.lms.stride_lms.delete_google_meet_setting", { name });
  const data = (res as any)?.message || res;
  return data;
};

