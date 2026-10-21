import axios, { AxiosRequestConfig } from "axios";

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
export const BASE_URL = rawBaseUrl ? (rawBaseUrl.endsWith('/') ? rawBaseUrl : rawBaseUrl + '/') : '/';
export const BASE_DOMAIN = BASE_URL.replace(/\/api\/?$/, "") || "";
export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || "";
export const API_METHOD_PREFIX = process.env.NEXT_PUBLIC_API_METHOD_PREFIX || "lms.lms.stride_lms";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 600000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Generic API caller with token injection
const apiRequest = async (config: AxiosRequestConfig) => {
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("apiKey") : null;
  const apiSecret = typeof window !== "undefined" ? localStorage.getItem("apiSecret") : null;

  const headers: Record<string, any> = { ...config.headers };

  if (headers.Authorization === 'token ' || headers.Authorization === 'token :') {
    delete headers.Authorization;
  }

  // Do not attach token headers for login, signup, OTP, and master dropdown routes
  const isAuthRoute = typeof config.url === 'string' && 
    (config.url.includes('lms_login.login') || config.url.includes('lms_login.signup') || config.url.includes('lms_login.forgot_password') || config.url.includes('lms_login.send_') || config.url.includes('lms_login.validate_'));

  if (!isAuthRoute && !headers.Authorization && apiKey && apiSecret) {
    headers.Authorization = `token ${apiKey}:${apiSecret}`;
  }
  
  try {
    const response = await api({ ...config, headers });
    
    if (response.data?.message?.success === false || response.data?.success === false) {
      const errorMessage = response.data?.message?.message || response.data?.message || "Operation failed";
      
      interface CustomApiError extends Error {
        status?: number;
        response?: { data: unknown };
        isCustomApiError?: boolean;
      }
      
      const customError: CustomApiError = new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      
      customError.status = 400; // Mock status
      customError.response = { data: response.data };
      customError.isCustomApiError = true;
      throw customError;
    }

    // If the response data has key_details, return the whole data (login response special case)
    if (response.data && typeof response.data === 'object' && ('key_details' in response.data || 'full_name' in response.data)) {
      return response.data;
    }

    return response.data?.message || response.data;
  } catch (error: any) {
    if (error.isCustomApiError) {
      throw error;
    }

    let errMessage = error.message || "An unexpected error occurred.";
    const data = error.response?.data;

    if (data) {
      if (data._server_messages) {
        try {
          const serverMsgs = JSON.parse(data._server_messages);
          if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
            const first = typeof serverMsgs[0] === 'string' ? JSON.parse(serverMsgs[0]) : serverMsgs[0];
            const raw = first?.message || first;
            if (typeof raw === 'string') {
              const clean = raw.replace(/<[^>]*>?/gm, '').trim();
              if (clean) errMessage = clean;
            }
          }
        } catch (e) {}
      } else if (data.message) {
        if (typeof data.message === 'string') {
          errMessage = data.message;
        } else if (typeof data.message === 'object') {
          errMessage = data.message.message || JSON.stringify(data.message);
        }
      } else if (typeof data.exception === 'string') {
        const parts = data.exception.split(':');
        errMessage = parts.length > 1 ? parts.slice(1).join(':').trim() : data.exception;
      } else if (data.exc_type) {
        errMessage = String(data.exc_type);
      }
    }

    // Clean up internal Python tracebacks or method lookup errors
    if (
      typeof errMessage === 'string' &&
      (errMessage.includes('Failed to get method for command') ||
       errMessage.includes('has no attribute') ||
       errMessage.includes('Traceback (most recent call last)') ||
       errMessage.includes('AttributeError') ||
       errMessage.includes('frappe.exceptions.'))
    ) {
      errMessage = "The requested server operation failed. The required method is not configured on the backend.";
    }

    console.warn(`API Error (${config.method} ${config.url}):`, errMessage, data);
    
    if (error.response?.status === 401 && !isAuthRoute) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("apiKey");
        localStorage.removeItem("apiSecret");
        window.dispatchEvent(new Event("auth-changed"));
      }
    }

    interface CustomApiError extends Error {
      status?: number;
      response?: any;
      isCustomApiError?: boolean;
    }
    
    const customError: CustomApiError = new Error(errMessage);
    customError.status = error.response?.status || error.status || 500;
    customError.response = error.response;
    customError.isCustomApiError = true;
    throw customError;
  }
};

export const uploadFile = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('is_private', '0');
  
  return apiRequest({
    method: 'POST',
    url: 'method/upload_file',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });
};

export const apiService = {
  get: (url: string, config?: AxiosRequestConfig) => apiRequest({ ...config, method: "GET", url }),
  post: (url: string, data?: unknown, config?: AxiosRequestConfig) => apiRequest({ ...config, method: "POST", url, data }),
  put: (url: string, data?: unknown, config?: AxiosRequestConfig) => apiRequest({ ...config, method: "PUT", url, data }),
  patch: (url: string, data?: unknown, config?: AxiosRequestConfig) => apiRequest({ ...config, method: "PATCH", url, data }),
  delete: (url: string, config?: AxiosRequestConfig) => apiRequest({ ...config, method: "DELETE", url }),
};

export const getImageUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${BASE_DOMAIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

