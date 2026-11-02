import { apiService } from "./api.services";
import { isAdminInstructor } from "./auth.services";

export interface AdminUserData {
  user: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email: string;
  enabled: number | boolean;
  roles?: string | string[];
}

export interface AdminCourseData {
  name: string;
  title: string;
  owner: string;
  published: number | boolean;
  paid_certificate?: number | boolean;
  creation?: string;
  modified?: string;
  short_introduction?: string | null;
  image?: string | null;
}

export interface StudentEnrolledCourseData {
  enrollment: string;
  member: string;
  course: string;
  enrollment_status?: string | null;
  creation?: string;
  title?: string;
  owner?: string;
  published?: number | boolean;
  image?: string | null;
  short_introduction?: string | null;
}

export interface AdminCourseListParams {
  status?: string;
  payment?: string;
  owner?: string;
  search?: string;
  limit?: number;
  start?: number;
}

export interface AdminCourseListResponse {
  status: string;
  total: number;
  count: number;
  limit: number;
  start: number;
  data: AdminCourseData[];
}

export interface AdminUsersResponse {
  status: string;
  count: number;
  data: AdminUserData[];
}

export interface StudentEnrolledCoursesResponse {
  status: string;
  student: string;
  total: number;
  count: number;
  limit: number;
  start: number;
  data: StudentEnrolledCourseData[];
}

/**
 * Fetch all users (students and instructors) from backend admin API
 */
export const getStudentInstructorUsers = async (): Promise<AdminUsersResponse> => {
  const res: any = await apiService.get("method/lms.lms.admin.get_student_instructor_users");
  const payload = res?.message || res?.data || res;
  return {
    status: payload?.status || "success",
    count: payload?.count || (Array.isArray(payload?.data) ? payload.data.length : 0),
    data: Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [],
  };
};

/**
 * Fetch courses list for admin with optional filters, search, and pagination
 */
export const getAdminCourseList = async (
  params?: AdminCourseListParams
): Promise<AdminCourseListResponse> => {
  const queryParams: Record<string, any> = {};
  if (params?.status && params.status !== "All") queryParams.status = params.status;
  if (params?.payment && params.payment !== "All") queryParams.payment = params.payment;
  if (params?.owner && params.owner !== "All") queryParams.owner = params.owner;
  if (params?.search && params.search.trim()) queryParams.search = params.search.trim();
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.start !== undefined) queryParams.start = params.start;

  const res: any = await apiService.get("method/lms.lms.admin.get_lms_course_list", {
    params: queryParams,
  });

  const payload = res?.message || res?.data || res;
  return {
    status: payload?.status || "success",
    total: Number(payload?.total ?? (Array.isArray(payload?.data) ? payload.data.length : 0)),
    count: Number(payload?.count ?? (Array.isArray(payload?.data) ? payload.data.length : 0)),
    limit: Number(payload?.limit ?? (params?.limit || 20)),
    start: Number(payload?.start ?? (params?.start || 0)),
    data: Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [],
  };
};

/**
 * Fetch enrolled courses for a given student
 */
export const getStudentEnrolledCourses = async (
  studentEmail: string
): Promise<StudentEnrolledCoursesResponse> => {
  const res: any = await apiService.get("method/lms.lms.admin.get_student_enrolled_courses", {
    params: { student: studentEmail },
  });

  const payload = res?.message || res?.data || res;
  return {
    status: payload?.status || "success",
    student: payload?.student || studentEmail,
    total: Number(payload?.total ?? (Array.isArray(payload?.data) ? payload.data.length : 0)),
    count: Number(payload?.count ?? (Array.isArray(payload?.data) ? payload.data.length : 0)),
    limit: Number(payload?.limit ?? 20),
    start: Number(payload?.start ?? 0),
    data: Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [],
  };
};

/**
 * Validates whether the logged-in user has admin privileges.
 * First verifies via backend API if implemented, otherwise falls back to local role verification.
 */
export const verifyAdminInstructorAccess = async (): Promise<boolean> => {
  // Check local roles first for instant evaluation
  const localAdmin = isAdminInstructor();

  try {
    const res: any = await apiService.get("method/lms.lms.admin.check_admin_access");
    const payload = res?.message || res?.data || res;
    if (payload?.is_admin !== undefined) {
      return Boolean(payload.is_admin);
    }
    if (payload?.status === "success") {
      return true;
    }
  } catch {
    // If check_admin_access endpoint is not yet mounted on backend, fallback to local role evaluation
  }

  return localAdmin;
};
