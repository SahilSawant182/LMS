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
