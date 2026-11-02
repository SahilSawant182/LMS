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
    if (user?.can_switch_view !== undefined) return Boolean(user.can_switch_view);
    if (user?.is_instructor !== undefined) return Boolean(user.is_instructor);
    return false;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('instructor');

  // Synchronize instructor ability and view mode safely from storage/APIs
  const syncViewMode = useCallback(() => {
    if (typeof window === 'undefined') return;

    let switchable = false;
    if (user?.can_switch_view !== undefined || user?.is_instructor !== undefined) {
      switchable = Boolean(user?.can_switch_view || user?.is_instructor);
    } else {
      switchable = canUserSwitchView();
    }
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
  }, [user]);

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
            const activeMode = localStorage.getItem('lms_active_view_mode') as ViewMode | null;
            if (data.can_switch_view !== undefined) {
              localStorage.setItem('can_switch_view', String(Boolean(data.can_switch_view)));
            }
            if (data.is_instructor !== undefined) {
              if (activeMode !== 'learner') {
                localStorage.setItem('isInstructor', String(Boolean(data.is_instructor)));
              }
            }
            if (Array.isArray(data.roles)) {
              localStorage.setItem('lms_saved_instructor_roles', JSON.stringify(data.roles));
              if (activeMode !== 'learner') {
                localStorage.setItem('roles', JSON.stringify(data.roles));
              }
            }
            const updatedSwitchable = Boolean(data.can_switch_view || data.is_instructor || canUserSwitchView());
            setCanSwitch(updatedSwitchable);
            const active = getActiveViewMode();
            setViewMode(active);
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

    const isInstructorRoute =
      pathname.startsWith('/instructor') ||
      pathname === '/course/create' ||
      pathname === '/batch/create' ||
      /^\/course\/[^/]+\/edit/.test(pathname) ||
      /^\/batch\/[^/]+\/edit/.test(pathname) ||
      pathname.startsWith('/sales-earnings') ||
      pathname.startsWith('/course-evaluators') ||
      pathname.startsWith('/certificate-evaluations');

    if (isInstructorRoute) {
      if (!canSwitch || viewMode === 'learner') {
        // Non-instructors or users in learner view attempting to enter instructor areas are safely redirected
        router.replace('/dashboard');
      }
    }
  }, [pathname, mounted, canSwitch, viewMode, router]);

  const switchView = (targetMode?: ViewMode) => {
    switchActiveViewMode(targetMode);
  };

  const effectiveMode: ViewMode = mounted ? (canSwitch ? viewMode : 'learner') : 'instructor';

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
