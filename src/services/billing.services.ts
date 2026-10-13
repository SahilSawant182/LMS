import { apiService, API_TOKEN } from "./api.services";
import {
  InstructorBillingDashboardData,
  PayoutPreviewData,
  PayoutSheetData,
  BillingSettings,
  InstructorBillingRecord,
} from "@/types/billing.types";

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
    if (
      res.message &&
      typeof res.message === "object" &&
      "data" in res.message &&
      res.message.data !== undefined
    ) {
      return res.message.data as T;
    }
    if (res.message !== undefined && typeof res.message === "object") {
      return res.message as T;
    }
  }
  return res as T;
};

export const getInstructorBillingDashboard = async (
  instructor?: string
): Promise<InstructorBillingDashboardData> => {
  const params: Record<string, any> = {};
  if (instructor) params.instructor = instructor;
  const res = await apiService.get(`${METHOD_PREFIX}.get_instructor_billing_dashboard`, {
    params,
    headers: authHeaders(),
  });
  return extractData<InstructorBillingDashboardData>(res);
};

export const previewInstructorBilling = async (params: {
  instructor?: string;
  start_date: string;
  end_date: string;
}): Promise<PayoutPreviewData> => {
  const res = await apiService.get(`${METHOD_PREFIX}.preview_instructor_billing`, {
    params,
    headers: authHeaders(),
  });
  return extractData<PayoutPreviewData>(res);
};

export const generateInstructorPayoutSheet = async (payload: {
  start_date: string;
  end_date: string;
  billing_cycle?: string;
  instructor?: string;
}): Promise<PayoutSheetData> => {
  const res = await apiService.post(
    `${METHOD_PREFIX}.generate_instructor_payout_sheet`,
    payload,
    { headers: authHeaders() }
  );
  return extractData<PayoutSheetData>(res);
};

export const approveInstructorPayout = async (payload: {
  sheet_name: string;
  instructor_list?: string[];
}): Promise<{ sheet_name: string; approved_count: number; billing_docs: string[] }> => {
  const res = await apiService.post(
    `${METHOD_PREFIX}.approve_instructor_payout`,
    {
      sheet_name: payload.sheet_name,
      instructor_list: payload.instructor_list
        ? JSON.stringify(payload.instructor_list)
        : undefined,
    },
    { headers: authHeaders() }
  );
  return extractData(res);
};

export const markPayoutPaid = async (payload: {
  billing_name: string;
  payment_reference: string;
  payment_mode?: string;
  paid_on?: string;
}): Promise<InstructorBillingRecord> => {
  const res = await apiService.post(`${METHOD_PREFIX}.mark_payout_paid`, payload, {
    headers: authHeaders(),
  });
  return extractData(res);
};

export const getAllInstructorPayouts = async (params?: {
  page?: number;
  page_size?: number;
  status?: string;
  billing_cycle?: string;
}) => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_all_instructor_payouts`, {
    params,
    headers: authHeaders(),
  });
  return extractData(res);
};

export const getInstructorBillingSettings = async (): Promise<BillingSettings> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_instructor_billing_settings`, {
    headers: authHeaders(),
  });
  return extractData<BillingSettings>(res);
};

export const updateInstructorBillingSettings = async (
  payload: Partial<BillingSettings>
): Promise<BillingSettings> => {
  const res = await apiService.post(
    `${METHOD_PREFIX}.update_instructor_billing_settings`,
    payload,
    { headers: authHeaders() }
  );
  return extractData<BillingSettings>(res);
};
