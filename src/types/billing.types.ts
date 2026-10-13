export interface CommissionTier {
  threshold: number;
  rate: number;
  label?: string;
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

export interface BillingLifetimeStats {
  lifetime_gross_sales: number;
  lifetime_net_earnings: number;
  lifetime_tds_deducted: number;
  lifetime_platform_commission: number;
  pending_payout: number;
  paid_out: number;
  billing_records_count: number;
}

export interface InstructorBillingRecord {
  name: string;
  payout_sheet: string;
  billing_cycle: string;
  start_date: string;
  end_date: string;
  gross_sales: number;
  platform_commission_rate: number;
  platform_commission: number;
  gst_on_commission: number;
  refunds: number;
  net_earnings: number;
  tds_rate: number;
  tds_amount: number;
  net_payout: number;
  status: "Draft" | "Approved" | "Paid" | "Cancelled";
  paid_on?: string;
  payment_reference?: string;
  payment_mode?: string;
  created_at: string;
  instructor?: string;
  instructor_name?: string;
}

export interface RecentTransaction {
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

export interface InstructorBillingDashboardData {
  instructor: string;
  instructor_name: string;
  lifetime_stats: BillingLifetimeStats;
  billing_history: InstructorBillingRecord[];
  recent_transactions: RecentTransaction[];
  settings: BillingSettings;
}

export interface PayoutPreviewData {
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
