export interface CommissionTier {
  label?: string;
  gross_threshold?: number;
  commission_rate?: number;
  threshold?: number;
  rate?: number;
}

export interface BillingSettings {
  tds_threshold: number;
  tds_rate: number;
  default_commission_rate: number;
  apply_gst_on_commission: boolean;
  commission_tiers: CommissionTier[];
  min_payout_threshold: number;
  billing_cycle?: string;
  platform_name?: string;
}

export interface InstructorLifetimeStats {
  lifetime_gross_sales: number;
  lifetime_net_earnings: number;
  lifetime_tds_deducted: number;
  lifetime_platform_commission: number;
  pending_payout: number;
  paid_out: number;
  billing_records_count: number;
}

export type BillingLifetimeStats = InstructorLifetimeStats;

export interface InstructorBillingRecord {
  name: string;
  payout_sheet?: string | null;
  billing_cycle?: string;
  start_date?: string | null;
  end_date?: string | null;
  gross_sales: number;
  platform_commission_rate: number;
  platform_commission: number;
  gst_on_commission: number;
  refunds: number;
  net_earnings: number;
  tds_rate: number;
  tds_amount: number;
  net_payout: number;
  status: "Draft" | "Approved" | "Paid" | "Hold" | "Cancelled" | string;
  paid_on?: string | null;
  payment_reference?: string | null;
  payment_mode?: string | null;
  created_at?: string;
  instructor?: string;
  instructor_name?: string;
}

export interface RecentInstructorSale {
  payment_name: string;
  payment_id: string;
  student_name: string;
  student_email: string;
  item_type: string;
  item_name: string;
  amount: number;
  currency: string;
  created_at: string;
}

export type RecentTransaction = RecentInstructorSale;

export interface InstructorBillingDashboardData {
  instructor: string;
  instructor_name: string;
  lifetime_stats: InstructorLifetimeStats;
  billing_history: InstructorBillingRecord[];
  recent_transactions: RecentInstructorSale[];
  settings: BillingSettings;
}

export interface BillingPreviewData {
  instructor: string;
  instructor_name: string;
  period: { start_date: string; end_date: string };
  breakdown: {
    gross_sales: number;
    course_sales: number;
    batch_sales: number;
    total_transactions: number;
    platform_commission_rate: number;
    platform_commission: number;
    gst_on_commission: number;
    gst_rate: number;
    refunds: number;
    net_earnings: number;
    tds_rate: number;
    tds_amount: number;
    net_payout: number;
  };
  settings_applied: {
    tds_threshold: number;
    commission_tiers: CommissionTier[];
    apply_gst_on_commission: boolean;
  };
}

export type PayoutPreviewData = BillingPreviewData;

export interface PayoutSheetRow {
  name?: string;
  instructor: string;
  instructor_name: string;
  total_sales: number;
  gross_sales: number;
  course_gross: number;
  batch_gross: number;
  platform_commission_rate: number;
  platform_commission: number;
  gst_on_commission: number;
  refunds: number;
  net_earnings: number;
  tds_rate: number;
  tds_amount: number;
  net_payout: number;
  status: string;
  released: number | boolean;
}

export interface PayoutSheetData {
  sheet_name: string;
  billing_cycle: string;
  start_date: string;
  end_date: string;
  summary: {
    total_gross: number;
    total_commission: number;
    total_tds: number;
    total_net_payout: number;
    instructor_count: number;
    transaction_count: number;
  };
  instructor_rows: PayoutSheetRow[];
}

export interface PaymentSlipDetails {
  name: string;
  student_name?: string;
  student_email?: string;
  payment_id?: string;
  order_id?: string;
  item_type?: string;
  item_id?: string;
  item_title?: string;
  amount: number;
  original_amount?: number;
  discount_amount?: number;
  coupon_code?: string | null;
  currency?: string;
  payment_received?: boolean;
  date?: string;
  time?: string;
  [key: string]: any;
}

export interface PaymentSlipResponse {
  payment_name: string;
  filename: string;
  pdf_base64: string;
  pdf_data_url: string;
  view_url: string;
  download_url: string;
  details: PaymentSlipDetails;
}

export interface PayoutSlipDetails {
  name: string;
  instructor?: string;
  instructor_name?: string;
  payout_sheet?: string | null;
  billing_cycle?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  gross_sales?: number;
  platform_commission_rate?: number;
  platform_commission?: number;
  gst_on_commission?: number;
  refunds?: number;
  net_earnings?: number;
  tds_rate?: number;
  tds_amount?: number;
  net_payout?: number;
  paid_on?: string;
  payment_mode?: string;
  payment_reference?: string;
  [key: string]: any;
}

export interface PayoutSlipResponse {
  billing_name: string;
  filename: string;
  pdf_base64: string;
  pdf_data_url: string;
  view_url: string;
  download_url: string;
  details: PayoutSlipDetails;
}

export interface SalesReportFilter {
  period?: "all" | "this_month" | "last_month" | "last_30_days" | "last_90_days" | "this_year" | "custom";
  start_date?: string;
  end_date?: string;
  course?: string;
  item_type?: "all" | "course" | "batch";
  search?: string;
  page?: number;
  page_size?: number;
}

export interface SalesReportSummary {
  total_orders: number;
  total_gross_sales: number;
  total_discount_given: number;
  total_courses_sold: number;
  total_batches_sold: number;
  unique_students: number;
  average_order_value: number;
  top_performing_course: string;
}

export interface MonthlyBreakdownItem {
  month_key: string;
  month_label: string;
  sales_count: number;
  gross_revenue: number;
  courses_sold: number;
  batches_sold: number;
  unique_students: number;
}

export interface CourseWiseBreakdownItem {
  item_id: string;
  item_title: string;
  item_type: "course" | "batch";
  item_image: string | null;
  sales_count: number;
  gross_revenue: number;
  unique_students: number;
  percentage_of_total: number;
  average_price: number;
}

export interface ReportTransactionItem {
  name: string;
  payment_id: string;
  order_id: string;
  student_name: string;
  student_email: string;
  item_type: "course" | "batch";
  item_id: string;
  item_title: string;
  amount: number;
  original_amount: number;
  discount_amount: number;
  coupon_code: string | null;
  currency: string;
  date: string;
  time: string;
  created_at: string;
}

export interface SalesReportResponse {
  instructor: string;
  instructor_name: string;
  filter_applied: {
    period?: string;
    start_date?: string | null;
    end_date?: string | null;
    course?: string | null;
    item_type?: string | null;
    search?: string | null;
  };
  available_items: Array<{ id: string; title: string; type: string }>;
  summary: SalesReportSummary;
  monthly_breakdown: MonthlyBreakdownItem[];
  course_wise_breakdown: CourseWiseBreakdownItem[];
  transactions: ReportTransactionItem[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

