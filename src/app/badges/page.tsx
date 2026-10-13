"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  Medal,
  Sparkles,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  Info,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Tag,
  RefreshCw
} from 'lucide-react';
import { getBadgeList, LMSBadge } from '@/services/lms.services';
import { getImageUrl } from '@/services/api.services';

export default function BadgesPage() {
  const [badges, setBadges] = useState<LMSBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<LMSBadge | null>(null);

  const fetchBadges = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBadgeList();
      if (Array.isArray(data)) {
        setBadges(data);
      } else {
        setBadges([]);
      }
    } catch (err: any) {
      console.error("Badge API error:", err);
      setError(err?.message || "Failed to fetch badges");
      setBadges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const roles = localStorage.getItem('roles') || '';
      setIsInstructor(roles.includes('Instructor'));
    }
    fetchBadges();
  }, []);

  const filteredBadges = badges.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.reference_doctype && b.reference_doctype.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'enabled'
        ? Number(b.enabled) === 1
        : Number(b.enabled) === 0;

    const matchesEvent =
      eventFilter === 'all' || (b.event && b.event.toLowerCase() === eventFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesEvent;
  });

  const uniqueEvents = Array.from(
    new Set(badges.map((b) => b.event).filter(Boolean))
  ) as string[];

  const activeCount = badges.filter((b) => Number(b.enabled) === 1).length;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-slate-900 text-white pt-6 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl"></div>
          <div className="absolute top-10 -left-20 w-60 h-60 rounded-full bg-indigo-500/15 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold mb-2 border border-amber-500/30">
                <Medal className="w-3.5 h-3.5 text-amber-400" />
                Achievement System
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Badges &{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200">
                  Achievements
                </span>
              </h1>
              <p className="text-slate-300 max-w-2xl text-xs md:text-sm mt-1.5">
                Recognizing student dedication, milestone mastery, and active cohort engagement across the platform.
              </p>
            </div>

            {/* Instructor Quick Actions */}
            {isInstructor && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/badges/create"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 hover:scale-[1.02] transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Create New Badge
                </Link>
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <p className="text-[11px] text-slate-400 font-medium">Total Badges</p>
              <p className="text-xl font-bold text-white mt-0.5">{badges.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <p className="text-[11px] text-slate-400 font-medium">Active Badges</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">{activeCount}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <p className="text-[11px] text-slate-400 font-medium">Assignment Events</p>
              <p className="text-xl font-bold text-amber-300 mt-0.5">
                {uniqueEvents.length || 2}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <p className="text-[11px] text-slate-400 font-medium">Role Access</p>
              <p className="text-xs font-bold text-indigo-300 mt-1">
                {isInstructor ? 'Instructor (Admin)' : 'Learner View'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20">
        {/* Controls Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by badge name, doctype, description..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="all">All Statuses</option>
                <option value="enabled">Active Only</option>
                <option value="disabled">Inactive Only</option>
              </select>

              {/* Event Filter */}
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="all">All Events</option>
                {uniqueEvents.map((evt) => (
                  <option key={evt} value={evt}>
                    {evt}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                onClick={fetchBadges}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 transition-colors"
                title="Refresh badges"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Badges Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-500 mt-4">Loading achievement badges...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-red-200 flex flex-col items-center p-8">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Unable to Load Badges</h3>
            <p className="text-sm text-slate-500 max-w-md mb-6">
              {error}
            </p>
            <button
              onClick={fetchBadges}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        ) : filteredBadges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBadges.map((badge, idx) => {
              const isEnabled = Number(badge.enabled) === 1;
              const imageUrl = badge.image ? getImageUrl(badge.image) : null;

              return (
                <div
                  key={badge.name || badge.title + idx}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group relative"
                >
                  {/* Card Header Gradient with floating Badge Emblem */}
                  <div className="h-32 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>

                    {/* Status Pill */}
                    <div className="flex justify-between items-start relative z-10">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isEnabled ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-400" /> Inactive
                          </>
                        )}
                      </span>

                      {badge.grant_only_once ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/20">
                          Grant Once
                        </span>
                      ) : null}
                    </div>

                    {/* Floating Avatar / Emblem */}
                    <div className="absolute -bottom-6 left-6 p-2 bg-white rounded-2xl shadow-md border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-300 flex items-center justify-center overflow-hidden shadow-inner p-1">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={badge.title}
                            className="w-full h-full object-contain drop-shadow-sm"
                            onError={(e) => {
                              // fallback to icon if image fails to load
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Medal className="w-9 h-9 text-white drop-shadow-sm" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 pt-10 flex-grow flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {badge.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed flex-grow">
                      {badge.description || "No description provided for this achievement badge."}
                    </p>

                    {/* Meta Tags */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Layers className="w-3.5 h-3.5" /> Reference DocType
                        </span>
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] truncate max-w-[150px]">
                          {badge.reference_doctype || 'Direct'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Sparkles className="w-3.5 h-3.5" /> Trigger Event
                        </span>
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                          {badge.event || 'Manual Assignment'}
                        </span>
                      </div>

                      {badge.user_field && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Tag className="w-3.5 h-3.5" /> User Field
                          </span>
                          <span className="font-mono text-slate-700 text-[11px]">
                            {badge.user_field}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]">
                      {badge.name || 'System Badge'}
                    </span>
                    <button
                      onClick={() => setSelectedBadge(badge)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      Inspect Rules <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
              <Medal className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Badges Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {searchTerm || statusFilter !== 'all' || eventFilter !== 'all'
                ? 'Try adjusting your filters or search keywords to find what you are looking for.'
                : 'No badges have been created yet. As an instructor, you can create the first badge right away.'}
            </p>
            {isInstructor && (
              <Link
                href="/badges/create"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Badge
              </Link>
            )}
          </div>
        )}
      </main>

      {/* Inspect Badge Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-fade-in-up">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-md">
                    <Medal className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedBadge.title}</h3>
                    <p className="text-xs text-indigo-200">
                      DocType: {selectedBadge.reference_doctype || 'Standard'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedBadge.description || "No description specified."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Event Trigger</span>
                  <span className="font-bold text-slate-800">{selectedBadge.event || 'Manual'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Status</span>
                  <span className={`font-bold ${Number(selectedBadge.enabled) === 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(selectedBadge.enabled) === 1 ? 'Active & Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Grant Only Once</span>
                  <span className="font-bold text-slate-800">
                    {selectedBadge.grant_only_once ? 'Yes (Once per user)' : 'No (Repeated)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">User Field</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedBadge.user_field || 'owner'}
                  </span>
                </div>
              </div>

              {selectedBadge.condition && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Evaluation Condition (JSON)
                  </label>
                  <pre className="text-xs bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono overflow-x-auto">
                    {selectedBadge.condition}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedBadge(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors"
              >
                Close
              </button>
              {isInstructor && (
                <Link
                  href="/badges/create"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Another
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs">© 2026 Stridenex LMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
