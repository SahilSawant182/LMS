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
} from "@/types/live_class.types";

export const getConferencingSettings = async (): Promise<ConferencingSettings> => {
  const res = await apiService.get("method/lms.lms.stride_lms.get_conferencing_settings");
  const data = (res as any)?.data || res;
  return data || { zoom_accounts: [], google_meet_accounts: [], providers: [] };
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
