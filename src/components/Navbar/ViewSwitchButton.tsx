'use client';

import React from 'react';
import { useViewMode } from '@/context/ViewModeContext';
import { GraduationCap, Briefcase } from 'lucide-react';

export default function ViewSwitchButton({ className = '' }: { className?: string }) {
  const { viewMode, switchView, canSwitch, mounted } = useViewMode();

  if (!mounted || !canSwitch) return null;

  return (
    <button
      type="button"
      onClick={() => switchView()}
      aria-label={
        viewMode === 'instructor'
          ? 'Switch to student learning mode'
          : 'Switch back to instructor portal'
      }
      title={
        viewMode === 'instructor'
          ? 'Switch to student learning mode'
          : 'Switch back to instructor portal'
      }
      className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-8.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all shadow-xs cursor-pointer active:scale-95 ${
        viewMode === 'instructor'
          ? 'bg-blue-50/90 text-blue-700 hover:bg-blue-100 border border-blue-200/90 hover:border-blue-300'
          : 'bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/90 hover:border-emerald-300 ring-2 ring-emerald-500/10'
      } ${className}`}
    >
      {viewMode === 'instructor' ? (
        <>
          <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="hidden md:inline">Switch to Learner View</span>
          <span className="md:hidden">Learner View</span>
        </>
      ) : (
        <>
          <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="hidden md:inline">Switch to Instructor View</span>
          <span className="md:hidden">Instructor View</span>
        </>
      )}
    </button>
  );
}
