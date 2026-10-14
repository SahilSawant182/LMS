import { apiService, API_TOKEN } from "./api.services";
import {
  InstructorBillingDashboardData,
  PayoutPreviewData,
  PayoutSheetData,
  BillingSettings,
  InstructorBillingRecord,
  PaymentSlipResponse,
  PayoutSlipResponse,
  SalesReportFilter,
  SalesReportResponse,
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

export function previewInstructorBilling(params: {
  instructor?: string;
  start_date: string;
  end_date: string;
}): Promise<PayoutPreviewData>;
export function previewInstructorBilling(
  startDate?: string,
  endDate?: string,
  instructor?: string
): Promise<PayoutPreviewData>;
export async function previewInstructorBilling(
  arg1?: string | { instructor?: string; start_date?: string; end_date?: string },
  arg2?: string,
  arg3?: string
): Promise<PayoutPreviewData> {
  const params: Record<string, any> = {};
  if (typeof arg1 === "object" && arg1 !== null) {
    if (arg1.instructor) params.instructor = arg1.instructor;
    if (arg1.start_date) params.start_date = arg1.start_date;
    if (arg1.end_date) params.end_date = arg1.end_date;
  } else {
    if (arg1) params.start_date = arg1;
    if (arg2) params.end_date = arg2;
    if (arg3) params.instructor = arg3;
  }

  const res = await apiService.get(`${METHOD_PREFIX}.preview_instructor_billing`, {
    params,
    headers: authHeaders(),
  });
  return extractData<PayoutPreviewData>(res);
}

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

export const getPaymentSlipData = async (
  paymentName: string
): Promise<PaymentSlipResponse> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_payment_slip_data`, {
    params: { payment_name: paymentName },
    headers: authHeaders(),
  });
  const data = extractData<PaymentSlipResponse>(res);
  if (data && !data.pdf_data_url && data.pdf_base64) {
    data.pdf_data_url = `data:application/pdf;base64,${data.pdf_base64}`;
  }
  return data;
};

export const getInstructorPayoutSlipData = async (
  billingName: string
): Promise<PayoutSlipResponse> => {
  const res = await apiService.get(`${METHOD_PREFIX}.get_instructor_payout_slip_data`, {
    params: { billing_name: billingName },
    headers: authHeaders(),
  });
  const data = extractData<PayoutSlipResponse>(res);
  if (data && !data.pdf_data_url && data.pdf_base64) {
    data.pdf_data_url = `data:application/pdf;base64,${data.pdf_base64}`;
  }
  return data;
};

export const getPaymentSlipDownloadUrl = (
  paymentName: string,
  asAttachment = true
): string => {
  const att = asAttachment ? "&as_attachment=1" : "";
  return `/api/method/lms.lms.stride_lms.download_payment_slip?payment_name=${encodeURIComponent(
    paymentName
  )}${att}`;
};

export const getPayoutSlipDownloadUrl = (
  billingName: string,
  asAttachment = true
): string => {
  const att = asAttachment ? "&as_attachment=1" : "";
  return `/api/method/lms.lms.stride_lms.download_instructor_payout_slip?billing_name=${encodeURIComponent(
    billingName
  )}${att}`;
};

export const getInstructorSalesReport = async (
  filters: SalesReportFilter = {},
  instructor?: string
): Promise<SalesReportResponse> => {
  const params: Record<string, any> = {};
  if (instructor) params.instructor = instructor;
  if (filters.period) params.period = filters.period;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.course) params.course = filters.course;
  if (filters.item_type && filters.item_type !== "all") params.item_type = filters.item_type;
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = String(filters.page);
  if (filters.page_size !== undefined) params.page_size = String(filters.page_size);

  const res = await apiService.get(`${METHOD_PREFIX}.get_instructor_sales_report`, {
    params,
    headers: authHeaders(),
  });
  return extractData<SalesReportResponse>(res);
};

export const getInstructorSalesReportCsvUrl = (
  filters: SalesReportFilter = {},
  instructor?: string
): string => {
  const params = new URLSearchParams();
  if (instructor) params.append("instructor", instructor);
  if (filters.period) params.append("period", filters.period);
  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);
  if (filters.course) params.append("course", filters.course);
  if (filters.item_type && filters.item_type !== "all") params.append("item_type", filters.item_type);
  if (filters.search) params.append("search", filters.search);

  return `/api/method/lms.lms.stride_lms.export_instructor_sales_report_csv?${params.toString()}`;
};

