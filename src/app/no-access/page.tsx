'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Lock } from 'lucide-react';

export default function NoAccessPage() {
  const [tier, setTier] = useState<string>('');
  const [memberType, setMemberType] = useState<string>('');
  const [planMessage, setPlanMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('operational_profile');
      if (raw) {
        const op = JSON.parse(raw);
        setTier(op.tier || '');
        setMemberType(op.member_type || '');
        setPlanMessage(op.plan_message || null);
      } else {
        setTier(localStorage.getItem('tier') || '');
        setMemberType(localStorage.getItem('member_type') || '');
      }
    } catch {}
  }, []);

  const isOwner = tier === 'owner' || memberType === 'Owner' || tier === 'individual';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          {isOwner ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900">LMS Plan Required</h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                You do not have an active LMS subscription plan. Please upgrade your billing package to gain LMS access.
              </p>
              <div className="mt-6 flex justify-center">
                <a
                  href="/profile/payments"
                  className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Upgrade Plan
                </a>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900">Access Required</h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                {planMessage || "Your organization's administrator does not have an active LMS subscription. Please ask your administrator to upgrade the plan to gain LMS access."}
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Refresh Status
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

