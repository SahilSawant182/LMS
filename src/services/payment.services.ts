import { apiService, API_TOKEN } from "./api.services";
import { isAuthorizedInstructor } from "./auth.services";
import {
  ItemType,
  CheckoutAddress,
  CheckoutSummary,
  ValidateCouponPayload,
  ValidateCouponResponse,
  InitiatePaymentPayload,
  InitiatePaymentResponse,
  VerifyPaymentPayload,
  VerifyPaymentResponse,
  PaymentStatus,
  PaymentHistoryResponse,
  CourseWithEnrollment,
  BatchWithEnrollment,
  UnifiedPaymentHistoryData,
  UnifiedPaymentHistoryResponse,
  UserInfo,
  ActivePlan,
  PaymentSummary,
  MentorEarningsSummary,
  CategoryTab,
  PaymentItem
} from "@/types/payment.types";

export type {
  ItemType,
  CheckoutAddress,
  CheckoutSummary,
  ValidateCouponPayload,
  ValidateCouponResponse,
  InitiatePaymentPayload,
  InitiatePaymentResponse,
  VerifyPaymentPayload,
  VerifyPaymentResponse,
  PaymentStatus,
  PaymentHistoryResponse,
  CourseWithEnrollment,
  BatchWithEnrollment,
  UnifiedPaymentHistoryData,
  UnifiedPaymentHistoryResponse,
  UserInfo,
  ActivePlan,
  PaymentSummary,
  MentorEarningsSummary,
  CategoryTab,
  PaymentItem
};

const METHOD_PREFIX = "method/lms.lms.stride_lms";

const authHeaders = () => {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
      return headers;
    }
  }
  if (API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }
  return headers;
};

const extractData = <T = any>(res: any): T => {
  if (res && typeof res === "object") {
    if ("data" in res && res.data !== undefined) {
      return res.data as T;
    }
    if (res.message && typeof res.message === "object" && "data" in res.message && res.message.data !== undefined) {
      return res.message.data as T;
    }
  }
  return res as T;
};

/**
 * 1) Get Checkout Summary
 * Endpoint: GET /api/method/lms.lms.stride_lms.get_checkout_summary
 */
export const getCheckoutSummary = async (params: {
  item_type: ItemType;
  item_id: string;
  coupon_code?: string;
  country?: string;
}): Promise<CheckoutSummary> => {
  const queryParams: Record<string, any> = {
    item_type: params.item_type,
    item_id: params.item_id,
    [params.item_type]: params.item_id, // also provides batch=... or course=...
  };
  if (params.coupon_code) queryParams.coupon_code = params.coupon_code;
  if (params.country) queryParams.country = params.country;

  const res = await apiService.get(`${METHOD_PREFIX}.get_checkout_summary`, {
    params: queryParams,
    headers: authHeaders(),
  });
  return extractData<CheckoutSummary>(res);
};

/**
 * 2) Validate Coupon for Item
 * Endpoint: POST /api/method/lms.lms.stride_lms.validate_coupon_for_item
 */
export const validateCoupon = async (payload: ValidateCouponPayload): Promise<ValidateCouponResponse> => {
  const res = await apiService.post(`${METHOD_PREFIX}.validate_coupon_for_item`, payload, {
    headers: authHeaders(),
  });
  return extractData<ValidateCouponResponse>(res);
};

/**
 * 3) Initiate Payment (Creates Order)
 * Endpoint: POST /api/method/lms.lms.stride_lms.initiate_payment
 */
export const initiatePayment = async (payload: InitiatePaymentPayload): Promise<InitiatePaymentResponse> => {
  const body = {
    source: payload.source || "Web",
    Source: "Web",
    ...payload,
    address: {
      source: "Web",
      ...payload.address,
    },
  };
  const res = await apiService.post(`${METHOD_PREFIX}.initiate_payment`, body, {
    headers: authHeaders(),
  });
  return extractData<InitiatePaymentResponse>(res);
};

/**
 * 4) Verify Payment
 * Endpoint: POST /api/method/lms.lms.stride_lms.verify_payment
 */
export const verifyPayment = async (payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> => {
  const body = {
    source: "Web",
    ...payload,
  };
  const res = await apiService.post(`${METHOD_PREFIX}.verify_payment`, body, {
    headers: authHeaders(),
  });
  return extractData<VerifyPaymentResponse>(res);
};

/**
 * 5) Get Payment Status
 * Endpoint: GET /api/method/lms.lms.stride_lms.get_payment_status
 */
export const getPaymentStatus = async (payment_name: string): Promise<PaymentStatus> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_payment_status`, {
    params: { payment_name },
    headers: authHeaders(),
  });
  return extractData<PaymentStatus>(res);
};

/**
 * 6) Student Payment History
 * Endpoint: GET /api/method/lms.lms.stride_lms.get_my_payments
 */
export const getMyPayments = async (params?: {
  limit?: number;
  offset?: number;
}): Promise<PaymentHistoryResponse> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_my_payments`, {
    params: {
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    },
    headers: authHeaders(),
  });
  return extractData<PaymentHistoryResponse>(res);
};

/**
 * 7) Free Batch Self-Enrollment
 * Endpoint: POST /api/method/lms.lms.stride_lms.enroll_in_batch_api
 */
export const enrollInBatch = async (payload: { batch: string }): Promise<{ batch: string; member: string }> => {
  const res = await apiService.post(`${METHOD_PREFIX}.enroll_in_batch_api`, payload, {
    headers: authHeaders(),
  });
  return extractData<{ batch: string; member: string }>(res);
};

/**
 * 8) Course & Batch Detail with Enrollment State
 */
export const getCourseWithEnrollment = async (name: string, payload?: any): Promise<CourseWithEnrollment> => {
  const currentUser = typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "";
  const res = await apiService.get(`${METHOD_PREFIX}.get_course_with_enrollment`, {
    params: {
      name,
      ...(currentUser ? { user: currentUser } : {}),
      ...(payload || {})
    },
    headers: authHeaders(),
  });
  return extractData<CourseWithEnrollment>(res);
};

export const getBatchWithEnrollment = async (name: string, payload?: any): Promise<BatchWithEnrollment> => {
  const isInstructor = isAuthorizedInstructor();
  const currentUser = typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "";
  const params: Record<string, any> = {
    name,
    ...(payload || {})
  };
  if (isInstructor && currentUser) {
    params.user = currentUser;
  } else {
    delete params.user;
    params.no_user = true;
  }
  const res = await apiService.get(`${METHOD_PREFIX}.get_batch_with_enrollment`, {
    params,
    headers: authHeaders(),
  });
  return extractData<BatchWithEnrollment>(res);
};

export const getCoursesWithEnrollment = async (payload?: any): Promise<CourseWithEnrollment[]> => {
  const currentUser = typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "";
  const params: Record<string, any> = {
    limit: 0,
    all: 1,
    ...(payload || {})
  };
  if (currentUser && !params.member) {
    params.member = currentUser;
    params.user = currentUser;
  }
  const res = await apiService.get(`${METHOD_PREFIX}.get_courses_with_enrollment`, {
    params,
    headers: authHeaders(),
  });
  const data = extractData<any>(res);
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.courses)) return data.courses;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.message)) return data.message;
  }
  return [];
};

export const getBatchesWithEnrollment = async (payload?: any): Promise<BatchWithEnrollment[]> => {
  const currentUser = typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "";
  const params: Record<string, any> = {
    limit: 0,
    all: 1,
    ...(payload || {})
  };
  if (currentUser && !params.member) {
    params.member = currentUser;
    params.user = currentUser;
  }
  const res = await apiService.get(`${METHOD_PREFIX}.get_batches_with_enrollment`, {
    params,
    headers: authHeaders(),
  });
  const data = extractData<any>(res);
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.batches)) return data.batches;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.message)) return data.message;
  }
  return [];
};

export interface StudentDashboardData {
  courses: Array<{
    enrollment_id: string;
    course: string;
    course_title: string;
    title: string;
    image: string | null;
    short_introduction?: string;
    category?: string;
    progress: number;
    completed_lessons: number;
    total_lessons: number;
    current_lesson?: string;
    enrollment_from_batch?: string;
    instructors: any[];
    enrolled_on: string;
    is_enrolled: boolean;
    is_paid: boolean;
  }>;
  batches: Array<{
    enrollment_id: string;
    batch: string;
    title: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    medium?: string;
    courses: string[];
    courses_count: number;
    instructors: any[];
    enrolled_on: string;
    is_enrolled: boolean;
  }>;
  programs: Array<{
    membership_id: string;
    program: string;
    title: string;
    progress: number;
    courses_count: number;
    enrolled_on: string;
    is_enrolled: boolean;
  }>;
  stats: {
    enrolled_courses: number;
    completed_courses: number;
    enrolled_batches: number;
    enrolled_programs: number;
    certificates_earned: number;
  };
}

/**
 * 9) Student Dashboard
 * Endpoint: GET /api/method/lms.lms.stride_lms.get_student_dashboard
 */
export const getStudentDashboard = async (): Promise<StudentDashboardData> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_student_dashboard`, {
    headers: authHeaders(),
  });
  const data = extractData<any>(res);
  if (data && typeof data === "object") {
    if ("courses" in data || "batches" in data) {
      return data as StudentDashboardData;
    }
    if (data.message && typeof data.message === "object" && ("courses" in data.message || "batches" in data.message)) {
      return data.message as StudentDashboardData;
    }
    if (data.data && typeof data.data === "object" && ("courses" in data.data || "batches" in data.data)) {
      return data.data as StudentDashboardData;
    }
  }
  return data as StudentDashboardData;
};


export interface InstructorDashboardData {
  is_instructor: boolean;
  instructor?: string;
  stats: {
    total_revenue: number;
    total_students: number;
    total_courses: number;
    published_courses: number;
    draft_courses: number;
    total_batches: number;
  };
  courses: Array<{
    name: string;
    title: string;
    image: string | null;
    published: boolean;
    paid_course: boolean;
    price: number;
    currency: string;
    category?: string;
    short_introduction?: string;
    enrollments_count: number;
    revenue: number;
    lessons_count: number;
    rating: number;
    created_at: string;
  }>;
  batches: Array<{
    name: string;
    title: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    medium?: string;
    seat_count: number;
    enrolled_count: number;
    seats_left?: number;
    is_sold_out: boolean;
    paid_batch: boolean;
    amount: number;
    currency: string;
    revenue: number;
    published: boolean;
    created_at: string;
  }>;
  recent_sales: Array<{
    payment_name: string;
    payment_id?: string;
    member: string;
    student_name: string;
    item_type: "Course" | "Batch";
    item_name: string;
    amount: number;
    currency: string;
    created_at: string;
    progress?: number;
  }>;
}

/**
 * 10) Instructor / Creator Sales Dashboard
 * Endpoint: GET /api/method/lms.lms.stride_lms.get_instructor_dashboard
 */
export const getInstructorDashboard = async (): Promise<InstructorDashboardData> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_instructor_dashboard`, {
    headers: authHeaders(),
  });
  const data = extractData<any>(res);
  if (data && typeof data === "object") {
    if ("stats" in data && ("courses" in data || "is_instructor" in data)) {
      return data as InstructorDashboardData;
    }
    if (data.message && typeof data.message === "object" && "stats" in data.message) {
      return data.message as InstructorDashboardData;
    }
    if (data.data && typeof data.data === "object" && "stats" in data.data) {
      return data.data as InstructorDashboardData;
    }
  }
  return data as InstructorDashboardData;
};

/**
 * 11) Unified User Payment History & Subscriptions
 * Endpoint: GET /api/method/lms.lms.stride_lms.get_user_payment_history
 */
export const getUserPaymentHistory = async (params?: {
  category?: string;
  page?: number;
  page_length?: number;
}): Promise<UnifiedPaymentHistoryData> => {
  const category = params?.category || "all";
  const page = params?.page || 1;
  const page_length = params?.page_length || 20;

  const res = await apiService.get(`${METHOD_PREFIX}.get_user_payment_history`, {
    params: {
      category,
      page,
      page_length,
    },
    headers: authHeaders(),
  });
  return extractData<UnifiedPaymentHistoryData>(res);
};
