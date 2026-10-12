import { apiService, API_TOKEN } from "./api.services";
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
  BatchWithEnrollment
} from "@/types/payment.types";

const METHOD_PREFIX = "method/lms.lms.stride_lms";

const authHeaders = () => {
  const headers: Record<string, string> = {};
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
export const getCourseWithEnrollment = async (name: string): Promise<CourseWithEnrollment> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_course_with_enrollment`, {
    params: { name },
    headers: authHeaders(),
  });
  return extractData<CourseWithEnrollment>(res);
};

export const getBatchWithEnrollment = async (name: string): Promise<BatchWithEnrollment> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_batch_with_enrollment`, {
    params: { name },
    headers: authHeaders(),
  });
  return extractData<BatchWithEnrollment>(res);
};

export const getCoursesWithEnrollment = async (): Promise<CourseWithEnrollment[]> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_courses_with_enrollment`, {
    headers: authHeaders(),
  });
  const data = extractData<CourseWithEnrollment[]>(res);
  return Array.isArray(data) ? data : [];
};

export const getBatchesWithEnrollment = async (): Promise<BatchWithEnrollment[]> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_batches_with_enrollment`, {
    headers: authHeaders(),
  });
  const data = extractData<BatchWithEnrollment[]>(res);
  return Array.isArray(data) ? data : [];
};
