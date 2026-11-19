import { apiService, getCurrentUserEmail } from "./api.services";
import { isStandaloneLms } from "@/utils/environment";

export const checkLmsAccess = async (userEmail?: string) => {
  const email = userEmail || getCurrentUserEmail();
  const res = await apiService.post("method/lms.lms.stride_lms.check_lms_access", { user: email });
  const msg = (res as any)?.message || res;
  if (msg && typeof msg === 'object') {
    if (msg.can_access_stridenex !== undefined) {
      localStorage.setItem("can_access_stridenex", String(msg.can_access_stridenex));
      if (typeof document !== "undefined") {
        document.cookie = `can_access_stridenex=${msg.can_access_stridenex}; path=/; max-age=86400`;
      }
    }
    if (msg.can_switch_view !== undefined) {
      localStorage.setItem("can_switch_view", String(msg.can_switch_view));
      if (typeof document !== "undefined") {
        document.cookie = `can_switch_view=${msg.can_switch_view}; path=/; max-age=86400`;
      }
    }
    if (msg.has_access !== undefined) {
      localStorage.setItem("has_lms_access", String(msg.has_access));
      if (typeof document !== "undefined") {
        document.cookie = `has_lms_access=${msg.has_access}; path=/; max-age=86400`;
      }
    }
  }
  return res;
};

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

export const hasInstructorAccountRole = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    // 1. System admin always has full access
    if (isSystemAdmin()) return true;

    const rawRoles = localStorage.getItem("roles") || localStorage.getItem("lms_saved_instructor_roles") || "";
    let roles: string[] = [];
    try {
      if (rawRoles.startsWith("[")) {
        roles = JSON.parse(rawRoles);
      } else if (rawRoles) {
        roles = [rawRoles];
      }
    } catch {
      roles = rawRoles ? [rawRoles] : [];
    }

    // 2. Partner has NO plan restrictions
    if (roles.some((r: string) => r.toLowerCase().includes("partner"))) {
      return true;
    }

    // In Integrated mode only, restricted roles are plan-gated
    if (!isStandaloneLms()) {
      const isRestrictedRole = roles.some((r: string) => {
        const lower = r.toLowerCase();
        return lower.includes("college") || lower.includes("industry") || lower.includes("mentor");
      });

      if (isRestrictedRole) {
        return localStorage.getItem("has_lms_access") === "true";
      }
    }

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
      "Teacher",
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

    // Check saved instructor roles
    const savedRoles = localStorage.getItem("lms_saved_instructor_roles");
    if (checkRoles(savedRoles)) return true;

    // Check active roles array in localStorage
    const activeRoles = localStorage.getItem("roles");
    if (checkRoles(activeRoles)) return true;

    // Fallback: check isInstructor flag
    const isInst = localStorage.getItem("isInstructor");
    if (isInst === "true" && localStorage.getItem("has_lms_access") !== "false") return true;

    return false;
  } catch {
    return false;
  }
};

export const canUserSwitchView = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    let op: any = null;
    try {
      const rawOp = localStorage.getItem("operational_profile");
      if (rawOp) op = JSON.parse(rawOp);
    } catch {}

    const cookieTier = (document.cookie.match(/(?:^|;\s*)tier=([^;]+)/)?.[1] || "").toLowerCase().trim();
    const cookieMemberType = (document.cookie.match(/(?:^|;\s*)member_type=([^;]+)/)?.[1] || "").toLowerCase().trim();
    const tier = (op?.tier || localStorage.getItem("tier") || cookieTier || "").toLowerCase().trim();
    const memberType = (op?.member_type || localStorage.getItem("member_type") || cookieMemberType || "").toLowerCase().trim();

    // 1. Pure Learner Member or standard Student is STRICTLY prohibited from switching views
    if (tier === "learner_member" || memberType === "member" || tier === "student") {
      return false;
    }

    // 2. Admin / Owner / Partner can ALWAYS switch views
    if (
      tier === "owner" ||
      memberType === "owner" ||
      tier === "admin" ||
      tier === "admin_member" ||
      memberType === "admin" ||
      isAdminUserOrOwner()
    ) {
      return true;
    }

    // 3. Instructor Member can ALWAYS switch views
    if (tier === "instructor_member" || memberType === "instructor") {
      return true;
    }

    // 4. Check explicit instructor roles
    const rawRoles = localStorage.getItem("roles") || localStorage.getItem("lms_saved_instructor_roles") || "";
    let rolesList: string[] = [];
    try {
      rolesList = rawRoles.startsWith("[") ? JSON.parse(rawRoles) : [rawRoles];
    } catch {
      rolesList = rawRoles ? [rawRoles] : [];
    }

    const hasInstructorRole = rolesList.some((r: string) =>
      ["Instructor", "Course Creator", "Moderator", "Administrator", "System Manager", "Partner", "Industry Admin", "College Admin", "Instructor Admin", "LMS Admin"].includes(r)
    );

    if (hasInstructorRole || localStorage.getItem("isInstructor") === "true") {
      return true;
    }

    return hasInstructorAccountRole();
  } catch {
    return false;
  }
};

export const getActiveViewMode = (): "instructor" | "learner" => {
  if (typeof window === "undefined") return "learner";
  try {
    if (!canUserSwitchView()) return "learner";

    const saved = localStorage.getItem("lms_active_view_mode");
    if (saved === "learner" || saved === "instructor") {
      return saved;
    }
    return "instructor";
  } catch {
    return "learner";
  }
};

export const setActiveViewMode = (mode: "instructor" | "learner") => {
  switchActiveViewMode(mode);
};

export const switchActiveViewMode = (targetMode?: "instructor" | "learner") => {
  if (typeof window === "undefined") return;

  const currentMode =
    (localStorage.getItem("lms_active_view_mode") as "instructor" | "learner") || "instructor";
  const nextMode = targetMode || (currentMode === "instructor" ? "learner" : "instructor");

  localStorage.setItem("lms_active_view_mode", nextMode);

  if (typeof document !== "undefined") {
    document.cookie = `lms_active_view_mode=${nextMode}; path=/; max-age=86400`;
  }

  // Restore preserved roles when switching to instructor
  if (nextMode === "instructor") {
    const savedRoles = localStorage.getItem("lms_saved_instructor_roles");
    if (savedRoles) {
      localStorage.setItem("roles", savedRoles);
    }
  }

  window.dispatchEvent(new Event("auth-changed"));
  window.dispatchEvent(new CustomEvent("view-mode-changed", { detail: { viewMode: nextMode } }));
};

export const isAuthorizedInstructor = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    let op: any = null;
    try {
      const rawOp = localStorage.getItem("operational_profile");
      if (rawOp) {
        op = JSON.parse(rawOp);
      } else {
        const match = document.cookie.match(/(?:^|;\s*)operational_profile=([^;]+)/);
        if (match) op = JSON.parse(decodeURIComponent(match[1]));
      }
    } catch {}

    const cookieTier = (document.cookie.match(/(?:^|;\s*)tier=([^;]+)/)?.[1] || "").toLowerCase().trim();
    const cookieMemberType = (document.cookie.match(/(?:^|;\s*)member_type=([^;]+)/)?.[1] || "").toLowerCase().trim();
    const tier = (op?.tier || localStorage.getItem("tier") || cookieTier || "").toLowerCase().trim();
    const memberType = (op?.member_type || localStorage.getItem("member_type") || cookieMemberType || "").toLowerCase().trim();

    // 1. Learner members and pure students are NEVER authorized instructors
    if (tier === "learner_member" || memberType === "member" || tier === "student") {
      return false;
    }

    if (isSystemAdmin() || isAdminUserOrOwner()) return true;

    if (tier === "instructor_member" || memberType === "instructor") {
      return true;
    }

    const isInst = localStorage.getItem("isInstructor");
    if (isInst === "true") return true;

    const rawRoles = localStorage.getItem("roles") || localStorage.getItem("lms_saved_instructor_roles") || "";
    const authorizedRoles = [
      "Instructor",
      "Course Creator",
      "Moderator",
      "Administrator",
      "System Manager",
      "Instructor Admin",
      "LMS Admin",
      "Admin Instructor",
      "Partner"
    ];

    let roles: string[] = [];
    try {
      roles = rawRoles.startsWith("[") ? JSON.parse(rawRoles) : [rawRoles];
    } catch {
      roles = rawRoles ? [rawRoles] : [];
    }

    return roles.some((r: string) => authorizedRoles.includes(r));
  } catch {
    return false;
  }
};

/**
 * Returns true ONLY if the user is an authorized instructor AND is currently
 * operating in 'instructor' view mode. When in 'learner' view mode, returns false.
 */
export const isEffectiveInstructorMode = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const activeMode = getActiveViewMode();
    if (activeMode === "learner") return false;
    return isAuthorizedInstructor();
  } catch {
    return false;
  }
};

export const isAdminInstructor = (): boolean => {
  return isSystemAdmin();
};

export const isAdminUserOrOwner = (): boolean => {
  if (typeof window === "undefined") return false;

  let op: any = null;
  try {
    const rawOp = localStorage.getItem("operational_profile");
    if (rawOp) {
      op = JSON.parse(rawOp);
    } else {
      const match = document.cookie.match(/(?:^|;\s*)operational_profile=([^;]+)/);
      if (match) op = JSON.parse(decodeURIComponent(match[1]));
    }
  } catch {}

  const cookieTier = (document.cookie.match(/(?:^|;\s*)tier=([^;]+)/)?.[1] || "").toLowerCase().trim();
  const cookieMemberType = (document.cookie.match(/(?:^|;\s*)member_type=([^;]+)/)?.[1] || "").toLowerCase().trim();

  const tier = (op?.tier || localStorage.getItem("tier") || cookieTier || "").toLowerCase().trim();
  const memberType = (op?.member_type || localStorage.getItem("member_type") || cookieMemberType || "").toLowerCase().trim();

  // 1. Sub-members (learner_member, instructor_member, member, instructor, student) are STRICTLY NOT admin or owner!
  if (
    tier === "learner_member" ||
    tier === "instructor_member" ||
    memberType === "member" ||
    memberType === "instructor" ||
    tier === "student" ||
    localStorage.getItem("can_access_stridenex") === "false" ||
    (document.cookie.match(/(?:^|;\s*)can_access_stridenex=([^;]+)/)?.[1] === "false")
  ) {
    return false;
  }

  // 2. Explicit owner / admin tier or org owner flag
  if (
    tier === "owner" ||
    memberType === "owner" ||
    tier === "admin" ||
    tier === "admin_member" ||
    memberType === "admin" ||
    localStorage.getItem("is_org_owner") === "true" ||
    (document.cookie.match(/(?:^|;\s*)is_org_owner=([^;]+)/)?.[1] === "true")
  ) {
    return true;
  }

  // 3. User email or login name
  const cookieUser = (document.cookie.match(/(?:^|;\s*)(?:user_id|user_email|user)=([^;]+)/)?.[1] || "").toLowerCase();
  const user = (localStorage.getItem("userEmail") || localStorage.getItem("user") || localStorage.getItem("currentUser") || localStorage.getItem("email") || cookieUser || "").toLowerCase().trim();
  if (user === "administrator" || user.startsWith("admin@") || user === "admin") {
    return true;
  }

  // 4. Roles list from localStorage or cookies (ONLY genuine administrative roles!)
  // Note: DO NOT include "industry base" or "college base" - those are assigned to all org members!
  const cookieRoles = (document.cookie.match(/(?:^|;\s*)roles=([^;]+)/)?.[1] || "").toLowerCase();
  const rawRoles = (localStorage.getItem("roles") || localStorage.getItem("lms_saved_instructor_roles") || cookieRoles || "").toLowerCase();
  if (
    rawRoles.includes("administrator") ||
    rawRoles.includes("system manager") ||
    rawRoles.includes("industry admin") ||
    rawRoles.includes("college admin") ||
    rawRoles.includes("instructor admin") ||
    rawRoles.includes("lms admin") ||
    rawRoles.includes("company admin")
  ) {
    return true;
  }

  // 5. Industry / College organization account owner (role='industry' or 'college' or can_access_stridenex=true and is NOT a sub-member)
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const cookieRoleMatch = document.cookie.match(/(?:^|;\s*)user_role=([^;]+)/);
  const cookieRole = (cookieRoleMatch ? decodeURIComponent(cookieRoleMatch[1]) : "").toLowerCase();
  const canAccessStridenexFlag =
    localStorage.getItem("can_access_stridenex") === "true" ||
    (document.cookie.match(/(?:^|;\s*)can_access_stridenex=([^;]+)/)?.[1] === "true");

  if (
    role === "industry" ||
    role === "college" ||
    cookieRole === "industry" ||
    cookieRole === "college" ||
    canAccessStridenexFlag
  ) {
    return true;
  }

  // 6. Partner
  if (tier === "partner" || memberType === "partner" || rawRoles.includes("partner") || role === "partner" || cookieRole === "partner") {
    return true;
  }

  return isSystemAdmin();
};

export const checkCanAccessStrideNex = (): boolean => {
  if (typeof window === "undefined") return false;

  // 1. CRITICAL: Standalone LMS must NEVER show "Back to StrideNex"!
  if (isStandaloneLms()) {
    return false;
  }

  // 2. In Integrated LMS:
  // Sub-members (instructor members, learner members, students) MUST NEVER see Back to StrideNex!
  let op: any = null;
  try {
    const rawOp = localStorage.getItem("operational_profile");
    if (rawOp) {
      op = JSON.parse(rawOp);
    } else {
      const match = document.cookie.match(/(?:^|;\s*)operational_profile=([^;]+)/);
      if (match) op = JSON.parse(decodeURIComponent(match[1]));
    }
  } catch {}

  const cookieTier = (document.cookie.match(/(?:^|;\s*)tier=([^;]+)/)?.[1] || "").toLowerCase().trim();
  const cookieMemberType = (document.cookie.match(/(?:^|;\s*)member_type=([^;]+)/)?.[1] || "").toLowerCase().trim();
  const tier = (op?.tier || localStorage.getItem("tier") || cookieTier || "").toLowerCase().trim();
  const memberType = (op?.member_type || localStorage.getItem("member_type") || cookieMemberType || "").toLowerCase().trim();

  if (
    tier === "learner_member" ||
    tier === "instructor_member" ||
    memberType === "member" ||
    memberType === "instructor" ||
    tier === "student" ||
    localStorage.getItem("can_access_stridenex") === "false" ||
    (document.cookie.match(/(?:^|;\s*)can_access_stridenex=([^;]+)/)?.[1] === "false")
  ) {
    return false;
  }

  // ONLY Admin and Organization Owner are permitted to see this button!
  return isAdminUserOrOwner();
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
