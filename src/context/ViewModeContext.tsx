'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  canUserSwitchView,
  isAuthorizedInstructor,
  getUserInfo,
  switchActiveViewMode,
} from '@/services/auth.services';
import { isStandaloneLms } from "@/utils/environment";

export type ViewMode = 'instructor' | 'learner';

export interface ViewModeContextType {
  viewMode: ViewMode;
  switchView: (mode?: ViewMode) => void;
  canSwitch: boolean;
  mounted: boolean;
  isInstructorMode: boolean;
  isLearnerMode: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: any;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState<boolean>(false);
  const [canSwitch, setCanSwitch] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('learner');

  const syncViewMode = useCallback(() => {
    if (typeof window === 'undefined') return;

    let op: any = null;
    try {
      const rawOp = localStorage.getItem('operational_profile');
      if (rawOp) op = JSON.parse(rawOp);
    } catch {}

    const cookieTier = document.cookie.match(/(?:^|;\s*)tier=([^;]+)/)?.[1];
    const cookieMemberType = document.cookie.match(/(?:^|;\s*)member_type=([^;]+)/)?.[1];
    const cookieActiveMode = document.cookie.match(/(?:^|;\s*)lms_active_view_mode=([^;]+)/)?.[1] as ViewMode | undefined;

    const rawRoles = localStorage.getItem('roles') || localStorage.getItem('lms_saved_instructor_roles') || '';
    let rolesList: string[] = [];
    try {
      rolesList = rawRoles.startsWith('[') ? JSON.parse(rawRoles) : [rawRoles];
    } catch {
      rolesList = rawRoles ? [rawRoles] : [];
    }

    const hasInstructorRole = rolesList.some((r: string) =>
      ['Instructor', 'Course Creator', 'Moderator', 'Administrator', 'System Manager', 'Partner', 'Industry Admin', 'College Admin', 'Instructor Admin', 'LMS Admin'].includes(r)
    );

    const tier = op?.tier || localStorage.getItem('tier') || cookieTier || '';
    const memberType = op?.member_type || localStorage.getItem('member_type') || cookieMemberType || '';
    const isExplicitInstructor = tier === 'instructor_member' || memberType === 'Instructor' || hasInstructorRole || localStorage.getItem('isInstructor') === 'true';
    const isExplicitAdmin = tier === 'owner' || memberType === 'Owner' || tier === 'admin_member' || memberType === 'Admin' || rolesList.some((r: string) => ['Administrator', 'System Manager', 'Partner'].includes(r));
    const userCanSwitch = isExplicitInstructor || isExplicitAdmin;

    // RULE 1: Pure Learner Member or Student (without Instructor or Admin role)
    if (!userCanSwitch || ((tier === 'learner_member' || memberType === 'Member' || tier === 'student') && !hasInstructorRole && localStorage.getItem('isInstructor') !== 'true')) {
      setCanSwitch(false);
      setViewMode('learner');
      localStorage.setItem('can_switch_view', 'false');
      localStorage.setItem('isInstructor', 'false');
      localStorage.setItem('lms_active_view_mode', 'learner');
      return;
    }

    // RULE 2: Instructor or Admin user
    setCanSwitch(true);
    localStorage.setItem('can_switch_view', 'true');
    localStorage.setItem('isInstructor', 'true');

    // Check URL query param (?view=instructor or ?view=learner)
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view') as ViewMode | null;
    if (viewParam === 'instructor' || viewParam === 'learner') {
      setViewMode(viewParam);
      localStorage.setItem('lms_active_view_mode', viewParam);
      return;
    }

    // Check saved user preference (localStorage or cookie); default to 'instructor'
    const saved = cookieActiveMode || (localStorage.getItem('lms_active_view_mode') as ViewMode | null);
    if (saved === 'learner' || saved === 'instructor') {
      setViewMode(saved);
    } else {
      setViewMode('instructor');
      localStorage.setItem('lms_active_view_mode', 'instructor');
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    syncViewMode();

    const apiKey = localStorage.getItem('apiKey');
    const userEmail = localStorage.getItem('userEmail') || localStorage.getItem('user');
    if (apiKey || userEmail) {
      getUserInfo()
        .then((res: any) => {
          const data = res?.message || res?.data || res;
          if (data && typeof data === 'object') {
            const rawRoles = Array.isArray(data.roles) ? data.roles : [];
            const autoInstructorRoles = [
              "Instructor", "Course Creator", "Moderator", "Administrator",
              "System Manager", "Instructor Admin", "LMS Admin", "Partner"
            ];
            const hasAutoInst = rawRoles.some((r: string) => autoInstructorRoles.includes(r)) || Boolean(data.is_instructor);

            let op: any = null;
            try {
              const rawOp = localStorage.getItem('operational_profile');
              if (rawOp) op = JSON.parse(rawOp);
            } catch {}

            const isInstMember = op?.tier === 'instructor_member' || op?.member_type === 'Instructor';

            if (hasAutoInst || isInstMember) {
              setCanSwitch(true);
              localStorage.setItem('can_switch_view', 'true');
              if (Array.isArray(data.roles)) {
                localStorage.setItem('roles', JSON.stringify(data.roles));
                localStorage.setItem('lms_saved_instructor_roles', JSON.stringify(data.roles));
              }
            }
          }
        })
        .catch(() => {});
    }

    const handleAuthChange = () => syncViewMode();
    const handleViewModeEvent = (e: any) => {
      if (e?.detail?.viewMode) {
        setViewMode(e.detail.viewMode);
      } else {
        syncViewMode();
      }
    };

    window.addEventListener('auth-changed', handleAuthChange);
    window.addEventListener('view-mode-changed', handleViewModeEvent);
    window.addEventListener('storage', handleViewModeEvent);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
      window.removeEventListener('view-mode-changed', handleViewModeEvent);
      window.removeEventListener('storage', handleViewModeEvent);
    };
  }, [syncViewMode]);

  // Route protection
  useEffect(() => {
    if (!mounted || !pathname) return;

    let op: any = null;
    try {
      const raw = localStorage.getItem("operational_profile");
      if (raw) op = JSON.parse(raw);
    } catch {}

    const memberType = op?.member_type || localStorage.getItem("member_type") || "";
    const tier = op?.tier || localStorage.getItem("tier") || "";
    const isLearnerMember = memberType === "Member" || tier === "learner_member";

    if (isLearnerMember) {
      if (
        pathname.includes("/courses/create") ||
        pathname.includes("/course/create") ||
        pathname.startsWith("/instructor") ||
        pathname.startsWith("/lms/instructor") ||
        pathname.startsWith("/sales-earnings") ||
        pathname.startsWith("/coupons")
      ) {
        router.replace("/courses");
        return;
      }
    }

    const hasLmsAccess = op?.has_lms_access ?? (localStorage.getItem("has_lms_access") === "true");
    const isRestrictedRole = tier.includes("_member") || isLearnerMember || tier === "instructor_member";
    if (hasLmsAccess === false || localStorage.getItem("has_lms_access") === "false") {
      if (isRestrictedRole && !pathname.includes("/no-access")) {
        router.replace("/no-access");
        return;
      }
    }
  }, [pathname, mounted, router]);

  // Smooth client-side switchView function (No hard page reloads!)
  const switchView = (targetMode?: ViewMode) => {
    const nextMode = targetMode || (viewMode === 'instructor' ? 'learner' : 'instructor');
    setViewMode(nextMode);
    switchActiveViewMode(nextMode);

    // Smooth route transition
    if (pathname === '/dashboard' || pathname === '/lms/dashboard') {
      router.push(`/dashboard?view=${nextMode}`);
    }
  };

  const effectiveMode: ViewMode = mounted ? (canSwitch ? viewMode : 'learner') : 'learner';

  return (
    <ViewModeContext.Provider
      value={{
        viewMode: effectiveMode,
        switchView,
        canSwitch,
        mounted,
        isInstructorMode: effectiveMode === 'instructor',
        isLearnerMode: effectiveMode === 'learner',
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};
