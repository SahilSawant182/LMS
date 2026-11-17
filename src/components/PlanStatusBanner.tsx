'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function PlanStatusBanner() {
  const [mounted, setMounted] = useState(false);
  const [hasLmsAccess, setHasLmsAccess] = useState<boolean>(true);
  const [tier, setTier] = useState<string>('');
  const [memberType, setMemberType] = useState<string>('');
  const [planMessage, setPlanMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const syncStatus = () => {
      if (typeof window === 'undefined') return;

      let op: any = null;
      try {
        const raw = localStorage.getItem('operational_profile');
        if (raw) op = JSON.parse(raw);
      } catch {}

      if (!op) {
        try {
          const cookieMatch = document.cookie.match(/(?:^|;\s*)operational_profile=([^;]+)/);
          if (cookieMatch && cookieMatch[1]) {
            op = JSON.parse(decodeURIComponent(cookieMatch[1]));
          }
        } catch {}
      }

      const lmsAccessStorage = localStorage.getItem('has_lms_access');
      const lmsAccessCookie = document.cookie.match(/(?:^|;\s*)has_lms_access=([^;]+)/)?.[1];
      const hasAccess = op?.has_lms_access ?? (lmsAccessStorage !== null ? lmsAccessStorage === 'true' : (lmsAccessCookie !== undefined ? lmsAccessCookie === 'true' : true));

      const currentTier = op?.tier || localStorage.getItem('tier') || document.cookie.match(/(?:^|;\s*)tier=([^;]+)/)?.[1] || '';
      const currentMemberType = op?.member_type || localStorage.getItem('member_type') || document.cookie.match(/(?:^|;\s*)member_type=([^;]+)/)?.[1] || '';

      setHasLmsAccess(hasAccess);
      setTier(currentTier);
      setMemberType(currentMemberType);
      setPlanMessage(op?.plan_message || null);
    };

    syncStatus();
    window.addEventListener('auth-changed', syncStatus);
    window.addEventListener('storage', syncStatus);
    return () => {
      window.removeEventListener('auth-changed', syncStatus);
      window.removeEventListener('storage', syncStatus);
    };
  }, []);

  if (!mounted || hasLmsAccess) return null;

  const isOwnerOrIndividual = tier === 'owner' || tier === 'individual' || memberType === 'Owner' || memberType === 'Individual';

  if (isOwnerOrIndividual) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong className="font-semibold">LMS Plan Required:</strong> You do not have an active LMS subscription plan. Please upgrade your billing package to gain LMS access.
            </span>
          </div>
          <a
            href="/profile/payments"
            className="shrink-0 font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-3 py-1 rounded-md transition-colors shadow-2xs"
          >
            Upgrade Plan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 sm:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm text-red-900 text-center">
        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
        <span>
          <strong className="font-semibold">Access Required:</strong> {planMessage || "Your organization's administrator does not have an active LMS subscription. Please ask your administrator to upgrade the plan to gain LMS access."}
        </span>
      </div>
    </div>
  );
}

