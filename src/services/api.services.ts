import axios, { AxiosRequestConfig } from "axios";

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
export const BASE_URL = rawBaseUrl ? (rawBaseUrl.endsWith('/') ? rawBaseUrl : rawBaseUrl + '/') : '/';
export const BASE_DOMAIN = BASE_URL.replace(/\/api\/?$/, "") || "";
export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || "";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 600000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Generic API caller with token injection
const apiRequest = async (config: AxiosRequestConfig) => {
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("apiKey") : null;
  const apiSecret = typeof window !== "undefined" ? localStorage.getItem("apiSecret") : null;

  const headers = {
    ...config.headers,
    ...(apiKey && apiSecret ? { Authorization: `token ${apiKey}:${apiSecret}` } : {}),
  };
  
  try {
    const response = await api({ ...config, headers });
    
    if (response.data?.message?.success === false || response.data?.success === false) {
      const errorMessage = response.data?.message?.message || response.data?.message || "Operation failed";
      const customError = new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      (customError as any).status = 400; // Mock status
      (customError as any).response = { data: response.data };
      throw customError;
    }

    // Usually Frappe sends data in `message` or `data` property
    return response.data?.message ?? response.data?.data ?? response.data;
  } catch (error: any) {
    console.error(`API Error (${config.method} ${config.url}):`, error.message || "Request failed");
    throw error;
  }
};

export const apiService = {
  get: (url: string, config?: AxiosRequestConfig) => apiRequest({ ...config, method: "GET", url }),
  post: (url: string, data?: any, config?: AxiosRequestConfig) => apiRequest({ ...config, method: "POST", url, data }),
  put: (url: string, data?: any, config?: AxiosRequestConfig) => apiRequest({ ...config, method: "PUT", url, data }),
  patch: (url: string, data?: any, config?: AxiosRequestConfig) => apiRequest({ ...config, method: "PATCH", url, data }),
  delete: (url: string, config?: AxiosRequestConfig) => apiRequest({ ...config, method: "DELETE", url }),
};

export const getImageUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${BASE_DOMAIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

