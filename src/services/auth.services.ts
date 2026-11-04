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

export const getUserInfo = async () => {
  return apiService.get("method/lms.lms.api.get_user_info");
};

export const hasInstructorAccountRole = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const instructorRoles = [
      "Instructor",
      "Course Creator",
      "Moderator",
      "Administrator",
      "System Manager",
      "Instructor Admin",
      "LMS Admin",
      "Admin Instructor",
      "Mentor",
      // ADD COLLEGE AND INDUSTRY ROLES:
      "College",
      "College Base",
      "College Admin",
      "College User",
      "Industry",
      "Industry Base",
      "Industry Admin",
      "Industry User",
      "Partner",
    ];
    const checkRoles = (raw: string | null): boolean => {
      if (!raw) return false;
      try {
        const parsed = raw.startsWith("[") ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
          return parsed.some((r: string) => instructorRoles.includes(r));
        }
      } catch { }
      return instructorRoles.some((r: string) => raw.includes(r));
    };
    // 1. Check saved instructor roles
    const savedRoles = localStorage.getItem("lms_saved_instructor_roles");
    if (checkRoles(savedRoles)) return true;
    // 2. Check active roles array in localStorage
    const activeRoles = localStorage.getItem("roles");
    if (checkRoles(activeRoles)) return true;
    // 3. Fallback: check isInstructor / is_instructor flags
    const isInst = localStorage.getItem("isInstructor");
    if (isInst === "true") return true;
    return false;
  } catch {
    return false;
  }
};

export const canUserSwitchView = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    // If user does not have any instructor/admin role, they are purely a learner.
    // Pure learners can NEVER switch views and must NEVER see the toggle button.
    if (!hasInstructorAccountRole()) {
      return false;
    }

    const canSwitch = localStorage.getItem("can_switch_view");
    if (canSwitch === "false") return false;

    return true;
  } catch {
    return false;
  }
};

export const getActiveViewMode = (): "instructor" | "learner" => {
  if (typeof window === "undefined") return "learner";
  try {
    // If not an instructor account, view mode is strictly 'learner'
    if (!hasInstructorAccountRole()) return "learner";

    const saved = localStorage.getItem("lms_active_view_mode");
    if (saved === "learner" || saved === "instructor") {
      return saved;
    }
    const isInst = localStorage.getItem("isInstructor");
    if (isInst === "false") return "learner";
    if (isInst === "true") return "instructor";
    return isAuthorizedInstructor() ? "instructor" : "learner";
  } catch {
    return "learner";
  }
};

export const setActiveViewMode = (mode: "instructor" | "learner") => {
  switchActiveViewMode(mode);
};

export const switchActiveViewMode = (targetMode?: "instructor" | "learner") => {
  if (typeof window === "undefined") return;

  const currentMode = localStorage.getItem("lms_active_view_mode") || (localStorage.getItem("isInstructor") === "false" ? "learner" : "instructor");
  const nextMode = targetMode || (currentMode === "instructor" ? "learner" : "instructor");

  if (nextMode === "learner") {
    // 1. Preserve original instructor roles so we can switch back
    const currentRoles = localStorage.getItem("roles");
    if (currentRoles && hasInstructorAccountRole()) {
      localStorage.setItem("lms_saved_instructor_roles", currentRoles);
    }
    // 2. Soft-login as Student / Learner
    localStorage.setItem("lms_active_view_mode", "learner");
    localStorage.setItem("isInstructor", "false");
    localStorage.setItem("roles", JSON.stringify(["Student", "LMS Student", "Website User"]));
    localStorage.setItem("can_switch_view", "true");
  } else {
    // 1. Restore original instructor roles
    const savedRoles = localStorage.getItem("lms_saved_instructor_roles") || JSON.stringify(["Instructor", "Student", "LMS Student", "Website User"]);
    localStorage.setItem("lms_active_view_mode", "instructor");
    localStorage.setItem("isInstructor", "true");
    localStorage.setItem("roles", savedRoles);
    localStorage.setItem("can_switch_view", "true");
  }

  // 3. Dispatch auth and view change events
  window.dispatchEvent(new Event("auth-changed"));
  window.dispatchEvent(new CustomEvent("view-mode-changed", { detail: { viewMode: nextMode } }));

  // 4. Directly reload on dashboard as that role using LMS base path
  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/lms") ? "/lms" : "/lms";
  window.location.href = `${basePath}/dashboard`;
};

export const isAuthorizedInstructor = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const activeMode = localStorage.getItem("lms_active_view_mode");
    if (activeMode === "learner") return false;

    const isInst = localStorage.getItem("isInstructor");
    if (isInst === "false") return false;
    if (isInst === "true") return true;

    const rolesStr = localStorage.getItem("roles");
    if (!rolesStr) return false;

    const roles = rolesStr.startsWith("[") ? JSON.parse(rolesStr) : rolesStr;
    const authorizedRoles = [
      "Instructor",
      "Course Creator",
      "Moderator",
      "Administrator",
      "System Manager",
      "Instructor Admin",
      "LMS Admin",
      "Admin Instructor",
      "Mentor",
      "College",
      "College Base",
      "College Admin",
      "College User",
      "Industry",
      "Industry Base",
      "Industry Admin",
      "Industry User",
      "Partner",
    ];

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
    const savedRolesStr = localStorage.getItem("lms_saved_instructor_roles");
    const adminRoles = ["Administrator", "System Manager", "Instructor Admin", "LMS Admin", "Admin Instructor"];

    const checkRoles = (raw: string | null): boolean => {
      if (!raw) return false;
      try {
        const roles = raw.startsWith("[") ? JSON.parse(raw) : raw;
        if (Array.isArray(roles)) {
          return roles.some((r: string) => adminRoles.includes(r));
        }
        return adminRoles.some((r: string) => String(raw).includes(r));
      } catch {
        return adminRoles.some((r: string) => raw.includes(r));
      }
    };

    if (checkRoles(rolesStr) || checkRoles(savedRolesStr)) return true;

    const user = (localStorage.getItem("userEmail") || localStorage.getItem("user") || "").toLowerCase().trim();
    if (user === "administrator") return true;

    return false;
  } catch {
    return false;
  }
};

export const isAdminInstructor = (): boolean => {
  return isSystemAdmin();
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
