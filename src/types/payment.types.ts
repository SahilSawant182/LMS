export type ItemType = "course" | "batch" | "certificate";

export interface CheckoutAddress {
  billing_name: string;
  city: string;
  country: string;
  address_line1?: string;
  address_line2?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
}

export interface CheckoutSummary {
  item_type: ItemType;
  item_id: string;
  doctype: string;
  title: string;
  currency: string;
  original_amount: number;
  original_amount_formatted: string;
  discount_amount: number;
  discount_amount_formatted: string;
  gst_applied: number;
  gst_amount_formatted: string;
  amount: number;
  total_amount: number;
  total_amount_formatted: string;
  is_free: boolean;
  coupon?: string | null;
  saved_address?: Record<string, any> | null;
  image?: string | null;
  description?: string | null;
}

export interface ValidateCouponPayload {
  item_type: "course" | "batch";
  item_id: string;
  coupon_code: string;
}

export interface ValidateCouponResponse {
  original_amount: number;
  original_amount_formatted?: string;
  discount_amount: number;
  discount_amount_formatted?: string;
  amount: number;
  currency: string;
  coupon: string;
  gst_applied?: number;
  gst_amount_formatted?: string;
  total_amount?: number;
  total_amount_formatted?: string;
  [key: string]: any;
}

export interface InitiatePaymentPayload {
  item_type: ItemType;
  item_id: string;
  coupon_code?: string;
  source?: string;
  address: CheckoutAddress;
}

export interface InitiatePaymentResponse {
  is_free: boolean;
  enrolled?: boolean;
  payment_name: string;
  razorpay_order_id?: string;
  razorpay_key_id?: string;
  amount?: number; // in paise
  amount_display?: number;
  currency?: string;
  item_type: ItemType;
  item_id: string;
  title?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export interface VerifyPaymentPayload {
  payment_name: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  coupon_code?: string;
}

export interface VerifyPaymentResponse {
  enrolled: boolean;
  payment_name: string;
  razorpay_payment_id: string;
  item_type: ItemType;
  item_id: string;
}

export interface PaymentStatus {
  payment_name: string;
  payment_received: boolean;
  payment_id?: string;
  order_id?: string;
  amount: number;
  currency: string;
  item_type: ItemType;
  item_id: string;
  title?: string;
  is_enrolled: boolean;
  created_at?: string;
}

export interface PaymentHistoryItem {
  name: string;
  amount: number;
  original_amount?: number;
  discount_amount?: number;
  amount_with_gst?: number;
  currency: string;
  payment_received: boolean;
  payment_id?: string;
  order_id?: string;
  payment_for_document_type: string;
  payment_for_document: string;
  title?: string;
  coupon_code?: string | null;
  billing_name?: string;
  creation: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CourseWithEnrollment {
  name: string;
  title: string;
  is_enrolled: boolean;
  is_paid: boolean;
  course_price: number;
  currency: string;
  image?: string | null;
  description?: string | null;
  short_introduction?: string | null;
  lessons?: number;
  enrollments?: number;
  rating?: string | number;
  category?: string | null;
  instructors?: any[];
  [key: string]: any;
}

export interface BatchWithEnrollment {
  name: string;
  title: string;
  is_enrolled: boolean;
  is_paid: boolean;
  amount: number;
  currency?: string;
  seats_left: number;
  is_sold_out: boolean;
  start_date?: string;
  end_date?: string;
  instructors?: any[];
  [key: string]: any;
}

export interface UserInfo {
  email: string;
  full_name: string;
  roles: string[];
  role_label: "Student" | "Mentor" | "Instructor" | "College" | "Industry" | "Partner" | "Course Creator";
  account_view: "organization" | "mentor" | "student";
  is_mentor: boolean;
  is_organization: boolean;
  is_student: boolean;
}

export interface ActivePlan {
  name: string;
  package_type: string;
  duration: string;
  purchase_date: string | null;
  expiry_date: string | null;
  invoice_no: string;
  invoice_url: string | null;
}

export interface PaymentSummary {
  currency: string;
  account_view: "organization" | "mentor" | "student";
  role_label: string;
  total_spent: number;
  total_transactions: number;
  plans_count: number;
  plans_spent: number;
  // Student metrics
  sessions_count?: number;
  sessions_spent?: number;
  courses_count?: number;
  courses_spent?: number;
  // Mentor metrics
  mentor_sessions_count?: number;
  mentor_total_earnings?: number;
  // Active plan for College/Industry/Mentors
  active_plan?: ActivePlan | null;
}

export interface MentorEarningsSummary {
  total_sessions_conducted: number;
  completed_sessions: number;
  total_earnings: number;
  pending_payout_count: number;
  currency: string;
}

export interface CategoryTab {
  key: "all" | "plan" | "mentorship" | "course" | "conducted_session";
  label: string;
  count: number;
}

export interface PaymentItem {
  id: string;
  category: "plan" | "mentorship" | "course" | "conducted_session";
  category_label: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: string; // "Paid", "Completed", "Active", "Pending", "Cancelled"
  status_badge: "success" | "warning" | "danger";
  date: string;
  created_at?: string;
  payment_id?: string;
  invoice_no?: string;
  invoice_url?: string | null;
  download_url?: string | null;
  payout_status?: string; // For conducted_session
  payout_reference?: string;
  meta?: Record<string, any>;
}

export interface UnifiedPaymentHistoryData {
  user_info: UserInfo;
  summary: PaymentSummary;
  categories: CategoryTab[];
  pagination: {
    page: number;
    page_length: number;
    total_items: number;
    total_pages: number;
  };
  payments: PaymentItem[];
  mentor_earnings_summary?: MentorEarningsSummary | null;
}

export interface UnifiedPaymentHistoryResponse {
  message: {
    status: number;
    success: boolean;
    data: UnifiedPaymentHistoryData;
  };
}

