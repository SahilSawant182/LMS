'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  canUserSwitchView,
  getActiveViewMode,
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
  const [canSwitch, setCanSwitch] = useState<boolean>(() => {
    if (user?.roles) {
      const autoInstructorRoles = [
        "Instructor",
        "Course Creator",
        "Moderator",
        "Administrator",
        "System Manager",
        "Instructor Admin",
        "LMS Admin",
        "Admin Instructor",
        "Partner",
        "Partner Base",
        "Partner Admin",
        "Partner User",
        "Default Partner",
      ];
      const rList = Array.isArray(user.roles) ? user.roles : [user.roles];
      return rList.some((r: string) => autoInstructorRoles.includes(r));
    }
    return false;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('learner');

  // Synchronize instructor ability and view mode safely from storage/APIs
  const syncViewMode = useCallback(() => {
    if (typeof window === 'undefined') return;

    const rawRoles = localStorage.getItem('roles') || localStorage.getItem('lms_saved_instructor_roles') || '';
    const rolesStr = rawRoles.toLowerCase();
    const isPartner = rolesStr.includes('partner');
    const isAdmin = rolesStr.includes('administrator') || rolesStr.includes('system manager');
    const isRestrictedRole =
      rolesStr.includes('mentor') ||
      rolesStr.includes('college') ||
      rolesStr.includes('industry');

    if (!isPartner && !isAdmin && isRestrictedRole && localStorage.getItem('has_lms_access') !== 'true') {
      setCanSwitch(false);
      setViewMode('learner');
      return;
    }

    const switchable = canUserSwitchView();
    setCanSwitch(switchable);

    if (!switchable) {
      setViewMode('learner');
      return;
    }

    const saved = localStorage.getItem('lms_active_view_mode') as ViewMode | null;
    if (saved === 'learner' || saved === 'instructor') {
      setViewMode(saved);
    } else {
      setViewMode('instructor');
    }
  }, []);

  // Initial client mount synchronization
  useEffect(() => {
    setMounted(true);
    syncViewMode();

    // If user is authenticated, query user info in background to ensure accurate role flags
    const apiKey = localStorage.getItem('apiKey');
    const userEmail = localStorage.getItem('userEmail') || localStorage.getItem('user');
    if (apiKey || userEmail) {
      getUserInfo()
        .then((res: any) => {
          const data = res?.message || res?.data || res;
          if (data && typeof data === 'object') {
            const autoInstructorRoles = [
              "Instructor",
              "Course Creator",
              "Moderator",
              "Administrator",
              "System Manager",
              "Instructor Admin",
              "LMS Admin",
              "Admin Instructor",
              "Partner",
              "Partner Base",
              "Partner Admin",
              "Partner User",
              "Default Partner",
            ];
            const rawRoles = Array.isArray(data.roles) ? data.roles : [];
            const hasAutoInst = rawRoles.some((r: string) => autoInstructorRoles.includes(r)) || Boolean(data.is_instructor);

            const isRestrictedRole = rawRoles.some((r: string) => {
              const lower = (r || '').toLowerCase();
              return lower.includes('college') || lower.includes('industry') || lower.includes('mentor');
            });

            const isPartner = rawRoles.some((r: string) => (r || '').toLowerCase().includes('partner'));
            const isAdmin = rawRoles.some((r: string) => ['administrator', 'system manager'].includes((r || '').toLowerCase()));

            const hasLmsEntitlement = localStorage.getItem('has_lms_access') === 'true';
            const hasInst = hasAutoInst || (!isPartner && !isAdmin && isRestrictedRole && hasLmsEntitlement);

            if (!hasInst) {
              // Pure learner or unpaid restricted account: purge instructor flags and disable view switching
              localStorage.setItem('can_switch_view', 'false');
              localStorage.setItem('isInstructor', 'false');
              localStorage.removeItem('lms_saved_instructor_roles');
              localStorage.removeItem('lms_active_view_mode');
              if (Array.isArray(data.roles)) {
                localStorage.setItem('roles', JSON.stringify(data.roles));
              }
              setCanSwitch(false);
              setViewMode('learner');
              return;
            }

            // Authorized instructor account
            localStorage.setItem('can_switch_view', 'true');
            const activeMode = localStorage.getItem('lms_active_view_mode') as ViewMode | null;
            if (activeMode !== 'learner') {
              localStorage.setItem('isInstructor', 'true');
              if (Array.isArray(data.roles)) {
                localStorage.setItem('roles', JSON.stringify(data.roles));
              }
            }
            if (Array.isArray(data.roles)) {
              localStorage.setItem('lms_saved_instructor_roles', JSON.stringify(data.roles));
            }
            setCanSwitch(true);
            setViewMode(activeMode === 'learner' ? 'learner' : 'instructor');
          }
        })
        .catch(() => {
          // Non-blocking: fallback to local flags
        });
    }

    const handleAuthChange = () => syncViewMode();
    const handleViewModeEvent = (e: any) => {
      if (e.detail?.viewMode) {
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

  // Route protection and automatic mode elevation
  useEffect(() => {
    if (!mounted || !pathname) return;

    const rawRoles = localStorage.getItem('roles') || localStorage.getItem('lms_saved_instructor_roles') || '';
    const rolesStr = rawRoles.toLowerCase();
    const isPartner = rolesStr.includes('partner');
    const isAdmin = rolesStr.includes('administrator') || rolesStr.includes('system manager');
    const isRestrictedRole =
      rolesStr.includes('mentor') ||
      rolesStr.includes('college') ||
      rolesStr.includes('industry');

    const hasLmsAccess = localStorage.getItem('has_lms_access') === 'true';

    // In standalone mode, there are no plan restrictions
    const isUnpaidRestrictedUser =
      !isStandaloneLms() && !isPartner && !isAdmin && isRestrictedRole && !hasLmsAccess;

    // NOTE: /courses, /quizzes, and /quizzes/[quizId] are LEARNER facing catalogs!
    // They must NOT be marked as isInstructorRoute.
    const isInstructorRoute =
      pathname.startsWith('/instructor') ||
      pathname === '/course/create' ||
      pathname === '/batch/create' ||
      /^\/course\/[^/]+\/edit/.test(pathname) ||
      /^\/batch\/[^/]+\/edit/.test(pathname) ||
      pathname.startsWith('/sales-earnings') ||
      pathname.startsWith('/course-evaluators') ||
      pathname.startsWith('/certificate-evaluations') ||
      pathname.startsWith('/programming-exercises/create') ||
      pathname.startsWith('/assignments/create') ||
      pathname.startsWith('/badges/create') ||
      pathname.startsWith('/coupons');

    if (isInstructorRoute) {
      if (isUnpaidRestrictedUser) {
        // Only redirect to plans page in integrated mode
        let redirectTarget = '/mentor/dashboard/plans';
        if (rolesStr.includes('college')) {
          redirectTarget = '/college/dashboard/plans';
        } else if (rolesStr.includes('industry')) {
          redirectTarget = '/industry/dashboard/plans';
        } else if (rolesStr.includes('mentor')) {
          redirectTarget = '/mentor/dashboard/plans';
        }
        window.location.href = redirectTarget;
        return;
      }

      if (!canSwitch || viewMode === 'learner') {
        router.replace('/dashboard');
      }
    }
  }, [pathname, mounted, canSwitch, viewMode, router]);

  const switchView = (targetMode?: ViewMode) => {
    switchActiveViewMode(targetMode);
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
