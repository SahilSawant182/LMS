import { apiService } from "./api.services";

export const login = async (payload: any) => {
  return apiService.post("method/lms.lms.lms_login.login", payload);
};

export const signup = async (payload: any) => {
  return apiService.post("method/lms.lms.lms_login.signup", payload);
};

export const logout = async () => {
  return apiService.post("method/lms.lms.lms_login.logout", {});
};

export const forgotPassword = async (payload: { user: string }) => {
  return apiService.post("method/lms.lms.lms_login.forgot_password", payload);
};

export const sendMobileOtp = async (payload: { mobile_no: string }) => {
  return apiService.post("method/lms.lms.lms_login.send_mobile_otp", payload);
};

export const sendEmailOtp = async (payload: { email: string }) => {
  return apiService.post("method/lms.lms.lms_login.send_email_otp", payload);
};

export const validateMobileOtp = async (payload: { mobile_no: string, otp: string }) => {
  return apiService.post("method/lms.lms.lms_login.validate_mobile_otp", payload);
};

export const validateEmailOtp = async (payload: { email: string, otp: string }) => {
  return apiService.post("method/lms.lms.lms_login.validate_email_otp", payload);
};

export const isAuthorizedInstructor = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const isInst = localStorage.getItem("isInstructor");
    if (isInst === "true") return true;

    const rolesStr = localStorage.getItem("roles");
    if (!rolesStr) return false;

    const roles = rolesStr.startsWith("[") ? JSON.parse(rolesStr) : rolesStr;
    const authorizedRoles = ["Instructor", "Course Creator", "Moderator", "Administrator", "System Manager"];

    if (Array.isArray(roles)) {
      return roles.some((r: string) => authorizedRoles.includes(r));
    }
    return authorizedRoles.some((r: string) => rolesStr.includes(r));
  } catch {
    return false;
  }
};
