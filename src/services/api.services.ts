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

// Helper to retrieve current authenticated user email
export const getCurrentUserEmail = (): string => {
  if (typeof window === "undefined") return "";
  const raw =
    localStorage.getItem("userEmail") ||
    localStorage.getItem("user") ||
    localStorage.getItem("email") ||
    sessionStorage.getItem("userEmail") ||
    sessionStorage.getItem("user") ||
    "";
    
  if (raw && raw.trim()) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.email) return String(parsed.email).trim();
        if (parsed.user) return String(parsed.user).trim();
        if (parsed.user_id) return String(parsed.user_id).trim();
      } catch {}
    }
    return trimmed;
  }

  try {
    const match = document.cookie.match(/(?:^|;\s*)(?:user_id|user_email|user)=([^;]+)/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]).trim();
      if (decoded && decoded !== "Guest") return decoded;
    }
  } catch {}

  return "";
};

// Helper to determine if user is in student role (not an authorized instructor)
export const isStudentUser = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    const isInst = localStorage.getItem("isInstructor");
    if (isInst === "true") return false;

    const rolesStr = localStorage.getItem("roles");
    if (!rolesStr) return true;

    const roles = rolesStr.startsWith("[") ? JSON.parse(rolesStr) : rolesStr;
    const authorizedRoles = ["Instructor", "Course Creator", "Moderator", "Administrator", "System Manager"];

    if (Array.isArray(roles)) {
      return !roles.some((r: string) => authorizedRoles.includes(r));
    }
    return !authorizedRoles.some((r: string) => rolesStr.includes(r));
  } catch {
    return true;
  }
};

// Helper to determine if a URL points to any batch-related GET API
export const isBatchApi = (url?: string): boolean => {
  if (typeof url !== "string") return false;
  return (
    url.includes("get_batches") ||
    url.includes("get_batch") ||
    url.includes("resource/LMS Batch") ||
    url.includes("LMS Batch")
  );
};

// Helper to determine if a URL points to any course-related GET API
export const isCourseApi = (url?: string): boolean => {
  if (typeof url !== "string") return false;
  return (
    url.includes("get_courses") ||
    url.includes("get_course") ||
    url.includes("get_courses_with_enrollment") ||
    url.includes("resource/LMS Course") ||
    url.includes("LMS Course")
  );
};

// Helper to determine if user has the Instructor role only (and not Admin)
export const isInstructorOnlyUser = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const rolesStr = localStorage.getItem("roles") || "";
    const isInst = localStorage.getItem("isInstructor") === "true" || rolesStr.includes("Instructor");
    const isAdmin = rolesStr.includes("Administrator") || rolesStr.includes("System Manager");
    return isInst && !isAdmin;
  } catch {
    return false;
  }
};

// Helper to determine if a URL points to any coupon-related GET API
export const isCouponApi = (url?: string): boolean => {
  if (typeof url !== "string") return false;
  return (
    url.includes("get_lms_coupon_list") ||
    url.includes("get_lms_coupon") ||
    url.includes("lms_coupon") ||
    url.includes("resource/LMS Coupon")
  );
};

// Helper to check whether user param should NOT be automatically attached
const shouldBypassUserParam = (url?: string, params?: any): boolean => {
  if (
    typeof url === "string" &&
    (url.includes("resource/") ||
      url.includes("get_dropdown_options") ||
      url.includes("master.get_dropdown_options") ||
      url.includes("preview_certificate") ||
      url.includes("get_certificate_templates"))
  ) {
    return true;
  }
  // For student role, remove user from query params on batch and course APIs
  if ((isBatchApi(url) || isCourseApi(url)) && isStudentUser()) {
    return true;
  }
  // For coupon API, only attach user param for instructor role (bypass for admins and other roles)
  if (isCouponApi(url) && !isInstructorOnlyUser()) {
    return true;
  }
  if (!params) return false;
  if (
    params.all ||
    params.no_user ||
    params.user === "" ||
    params.user === null ||
    params.user === false
  ) {
    return true;
  }
  return false;
};

// Global interceptor to automatically attach user query param on all GET requests
api.interceptors.request.use((reqConfig) => {
  if (typeof FormData !== "undefined" && reqConfig.data instanceof FormData) {
    if (reqConfig.headers) {
      delete reqConfig.headers["Content-Type"];
    }
  }
  const method = (reqConfig.method || "GET").toUpperCase();
  if (method === "GET") {
    const isDropdownOrResource =
      typeof reqConfig.url === "string" &&
      (reqConfig.url.includes("resource/") ||
        reqConfig.url.includes("get_dropdown_options") ||
        reqConfig.url.includes("master.get_dropdown_options"));

    const isBatchForStudent = isBatchApi(reqConfig.url) && isStudentUser();
    const isCourseForStudent = isCourseApi(reqConfig.url) && isStudentUser();
    const isCouponForNonInstructor = isCouponApi(reqConfig.url) && !isInstructorOnlyUser();
    const shouldStripUser = isDropdownOrResource || isBatchForStudent || isCourseForStudent || isCouponForNonInstructor;

    if (shouldStripUser && typeof reqConfig.url === "string" && reqConfig.url.includes("user=")) {
      reqConfig.url = reqConfig.url.replace(/([?&])user=[^&]*(&|$)/, (_, p1, p2) => (p2 === "&" ? p1 : "")).replace(/[?&]$/, "");
    }

    if (shouldBypassUserParam(reqConfig.url, reqConfig.params)) {
      if (typeof reqConfig.params === "object" && reqConfig.params !== null) {
        if ("no_user" in reqConfig.params) delete reqConfig.params.no_user;
        if ("all" in reqConfig.params) delete reqConfig.params.all;
        if (
          "user" in reqConfig.params &&
          (shouldStripUser ||
            reqConfig.params.user === "" ||
            reqConfig.params.user === null ||
            reqConfig.params.user === false)
        ) {
          delete reqConfig.params.user;
        }
      } else if (reqConfig.params instanceof URLSearchParams) {
        if (shouldStripUser || reqConfig.params.get("user") === "" || reqConfig.params.get("user") === "null") {
          reqConfig.params.delete("user");
        }
        reqConfig.params.delete("no_user");
        reqConfig.params.delete("all");
      }
      return reqConfig;
    }

    const userEmail = getCurrentUserEmail();
    if (userEmail) {
      const urlHasUser = typeof reqConfig.url === "string" && (reqConfig.url.includes("?user=") || reqConfig.url.includes("&user="));
      if (!urlHasUser) {
        if (reqConfig.params instanceof URLSearchParams) {
          if (!reqConfig.params.has("user")) {
            reqConfig.params.append("user", userEmail);
          }
        } else if (typeof reqConfig.params === "object" && reqConfig.params !== null) {
          if (!("user" in reqConfig.params) || !(reqConfig.params as any).user) {
            reqConfig.params = { ...reqConfig.params, user: userEmail };
          }
        } else {
          reqConfig.params = { user: userEmail };
        }
      }
    }
  }
  return reqConfig;
});

// Generic API caller with token injection
const apiRequest = async (config: AxiosRequestConfig) => {
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("apiKey") : null;
  const apiSecret = typeof window !== "undefined" ? localStorage.getItem("apiSecret") : null;

  const headers: Record<string, any> = { ...config.headers };

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete headers["Content-Type"];
    if (config.headers) {
      delete config.headers["Content-Type"];
    }
  }

  if (headers.Authorization === 'token ' || headers.Authorization === 'token :') {
    delete headers.Authorization;
  }

  // Do not attach token headers for login, signup, OTP, and master dropdown routes
  const isAuthRoute = typeof config.url === 'string' && 
    (config.url.includes('lms_login.login') || config.url.includes('lms_login.signup') || config.url.includes('lms_login.forgot_password') || config.url.includes('lms_login.send_') || config.url.includes('lms_login.validate_'));

  if (!isAuthRoute && !headers.Authorization && apiKey && apiSecret) {
    headers.Authorization = `token ${apiKey}:${apiSecret}`;
  }

  // Ensure user=emailid is appended to GET APIs query parameters unless bypassed
  const method = (config.method || "GET").toUpperCase();
  let params = config.params;
  if (method === "GET") {
    const isDropdownOrResource =
      typeof config.url === "string" &&
      (config.url.includes("resource/") ||
        config.url.includes("get_dropdown_options") ||
        config.url.includes("master.get_dropdown_options"));

    const isBatchForStudent = isBatchApi(config.url) && isStudentUser();
    const shouldStripUser = isDropdownOrResource || isBatchForStudent;

    if (shouldStripUser && typeof config.url === "string" && config.url.includes("user=")) {
      config.url = config.url.replace(/([?&])user=[^&]*(&|$)/, (_, p1, p2) => (p2 === "&" ? p1 : "")).replace(/[?&]$/, "");
    }

    if (shouldBypassUserParam(config.url, params)) {
      if (typeof params === "object" && params !== null) {
        if ("no_user" in params) delete params.no_user;
        if ("all" in params) delete params.all;
        if (
          "user" in params &&
          (shouldStripUser ||
            params.user === "" ||
            params.user === null ||
            params.user === false)
        ) {
          delete params.user;
        }
      } else if (params instanceof URLSearchParams) {
        if (shouldStripUser || params.get("user") === "" || params.get("user") === "null") {
          params.delete("user");
        }
        params.delete("no_user");
        params.delete("all");
      }
    } else {
      const userEmail = getCurrentUserEmail();
      if (userEmail) {
        const urlHasUser = typeof config.url === "string" && (config.url.includes("?user=") || config.url.includes("&user="));
        if (!urlHasUser) {
          if (params instanceof URLSearchParams) {
            if (!params.has("user")) {
              params.append("user", userEmail);
            }
          } else if (typeof params === "object" && params !== null) {
            if (!("user" in params) || !(params as any).user) {
              params = { ...params, user: userEmail };
            }
          } else {
            params = { user: userEmail };
          }
        }
      }
    }
  }
  
  try {
    const response = await api({ ...config, headers, params });
    
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

