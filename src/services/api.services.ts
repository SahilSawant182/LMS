import axios, { AxiosRequestConfig } from "axios";

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
export const BASE_URL = rawBaseUrl ? (rawBaseUrl.endsWith('/') ? rawBaseUrl : rawBaseUrl + '/') : '/';
export const BASE_DOMAIN = BASE_URL.replace(/\/api\/?$/, "") || "";
export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || "";
export const API_METHOD_PREFIX = process.env.NEXT_PUBLIC_API_METHOD_PREFIX || "stridenex_app.api_stridenex_app.lms";

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

  // Do not attach token headers for login and signup routes
  const isAuthRoute = typeof config.url === 'string' && 
    (config.url.includes('lms_login.login') || config.url.includes('lms_login.signup'));

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
      }
      
      const customError: CustomApiError = new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      
      customError.status = 400; // Mock status
      customError.response = { data: response.data };
      throw customError;
    }

    // If the response data has key_details, return the whole data (login response special case)
    if (response.data && typeof response.data === 'object' && ('key_details' in response.data || 'full_name' in response.data)) {
      return response.data;
    }

    // Usually Frappe sends data in `message` or `data` property
    return response.data?.message ?? response.data?.data ?? response.data;
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Request failed";
    console.error(`API Error (${config.method} ${config.url}):`, errMessage);
    throw error;
  }
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

