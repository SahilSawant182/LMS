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

export const isSystemAdmin = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const rolesStr = localStorage.getItem("roles");
    if (!rolesStr) return false;
    const roles = rolesStr.startsWith("[") ? JSON.parse(rolesStr) : rolesStr;
    const adminRoles = ["Administrator", "System Manager"];
    if (Array.isArray(roles)) {
      return roles.some((r: string) => adminRoles.includes(r));
    }
    return adminRoles.some((r: string) => String(rolesStr).includes(r));
  } catch {
    return false;
  }
};

export const isCourseInstructorOrOwner = (course: any, userEmail?: string): boolean => {
  if (isSystemAdmin()) return true;
  const email = (userEmail || (typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "")).toLowerCase().trim();
  if (!email || !course) return false;

  const owner = String(course.owner || "").toLowerCase().trim();
  if (owner && owner === email) return true;

  const createdBy = String(course.created_by || "").toLowerCase().trim();
  if (createdBy && createdBy === email) return true;

  const instructor = String(course.instructor || "").toLowerCase().trim();
  if (instructor && instructor === email) return true;

  if (Array.isArray(course.instructors) && course.instructors.length > 0) {
    return course.instructors.some((inst: any) => {
      if (!inst) return false;
      if (typeof inst === "string") return inst.toLowerCase().trim() === email;
      const instName = String(inst?.name || "").toLowerCase().trim();
      const instEmail = String(inst?.email || "").toLowerCase().trim();
      const instUsername = String(inst?.username || "").toLowerCase().trim();
      const instInstructor = String(inst?.instructor || "").toLowerCase().trim();
      return (
        instName === email ||
        instEmail === email ||
        (instUsername && instUsername === email) ||
        (instInstructor && instInstructor === email)
      );
    });
  }

  return false;
};

export const isBatchInstructorOrOwner = (batch: any, userEmail?: string): boolean => {
  if (isSystemAdmin()) return true;
  const email = (userEmail || (typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "")).toLowerCase().trim();
  if (!email || !batch) return false;

  const owner = String(batch.owner || "").toLowerCase().trim();
  if (owner && owner === email) return true;

  const createdBy = String(batch.created_by || "").toLowerCase().trim();
  if (createdBy && createdBy === email) return true;

  const instructor = String(batch.instructor || "").toLowerCase().trim();
  if (instructor && instructor === email) return true;

  if (Array.isArray(batch.instructors) && batch.instructors.length > 0) {
    return batch.instructors.some((inst: any) => {
      if (!inst) return false;
      if (typeof inst === "string") return inst.toLowerCase().trim() === email;
      const instName = String(inst?.name || "").toLowerCase().trim();
      const instEmail = String(inst?.email || "").toLowerCase().trim();
      const instUsername = String(inst?.username || "").toLowerCase().trim();
      const instInstructor = String(inst?.instructor || "").toLowerCase().trim();
      return (
        instName === email ||
        instEmail === email ||
        (instUsername && instUsername === email) ||
        (instInstructor && instInstructor === email)
      );
    });
  }

  return false;
};

export const isProgramInstructorOrOwner = (program: any, userEmail?: string): boolean => {
  if (isSystemAdmin()) return true;
  const email = (userEmail || (typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "")).toLowerCase().trim();
  if (!email || !program) return false;

  const owner = String(program.owner || "").toLowerCase().trim();
  if (owner && owner === email) return true;

  const createdBy = String(program.created_by || "").toLowerCase().trim();
  if (createdBy && createdBy === email) return true;

  const instructor = String(program.instructor || "").toLowerCase().trim();
  if (instructor && instructor === email) return true;

  return false;
};
