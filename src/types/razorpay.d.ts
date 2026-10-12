export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

export interface RazorpayTheme {
  color?: string;
  backdrop_color?: string;
  image?: string;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayErrorResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise (e.g. 10000 = ₹100.00)
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: RazorpayPrefill;
  notes?: Record<string, string>;
  theme?: RazorpayTheme;
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
    confirm_close?: boolean;
    animation?: boolean;
  };
}

export interface RazorpayInstance {
  open: () => void;
  close?: () => void;
  on: (event: string, callback: (response: any) => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
