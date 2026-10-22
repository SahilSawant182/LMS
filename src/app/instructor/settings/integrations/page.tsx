"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { SlidersHorizontal, ChevronRight, Video, Sparkles, Loader2 } from "lucide-react";
import ZoomIntegrationsTab from "@/components/live-class/ZoomIntegrationsTab";

export default function InstructorIntegrationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 w-full">
        {/* Navigation Breadcrumbs & Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5">
              <Link href="/dashboard" className="hover:text-slate-700 transition-colors">
                Dashboard
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/settings" className="hover:text-slate-700 transition-colors">
                Settings
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-indigo-600 font-bold">Conferencing & Integrations</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                <Video className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Conferencing & Integrations
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Connect and manage your personal or institutional Zoom Server-to-Server OAuth accounts to automatically schedule live classes and sync attendance rosters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>All Settings</span>
            </Link>
          </div>
        </div>

        {/* Conferencing Integrations (Zoom & Google Meet) */}
        <Suspense
          fallback={
            <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">Loading integrations...</p>
            </div>
          }
        >
          <ZoomIntegrationsTab />
        </Suspense>
      </main>
    </div>
  );
}
