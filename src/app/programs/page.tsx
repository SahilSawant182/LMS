"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  ArrowRight,
  Search,
  Lock,
  LayoutList,
  Sparkles,
  Plus,
  GraduationCap,
} from 'lucide-react';
import { getProgramList, Program } from '@/services/lms.services';
import { getImageUrl } from '@/services/api.services';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filtered, setFiltered] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isInstructor, setIsInstructor] = useState(false);

  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      try {
        const rawResponse = await getProgramList();
        const arr = Array.isArray(rawResponse)
          ? rawResponse
          : ((rawResponse as any)?.data || (rawResponse as any)?.message || []);
        const data: Program[] = Array.isArray(arr) ? arr : [];
        setPrograms(data);
        setFiltered(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch programs');
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();

    // Check instructor role
    try {
      const rolesStr = localStorage.getItem('roles');
      if (rolesStr) {
        const roles = JSON.parse(rolesStr);
        setIsInstructor(
          roles.includes('Instructor') ||
          roles.includes('LMS Admin') ||
          roles.includes('System Manager')
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(programs);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        programs.filter(
          (p) =>
            p.title?.toLowerCase().includes(q) ||
            p.short_introduction?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, programs]);

  return (
    <>
      <title>Learning Paths & Programs | StrideNex LMS</title>
      <meta
        name="description"
        content="Explore structured Learning Paths on StrideNex. Follow guided sequences of courses, track your progress, and earn certificates."
      />

      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />

        {/* ── Hero ── */}
        <div className="bg-slate-900 text-white pt-16 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
            <div className="absolute top-20 -left-24 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-4 py-1.5 text-sm font-semibold mb-5">
              <Sparkles className="w-4 h-4" />
              Guided Learning Experiences
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight">
              Learning{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                Paths
              </span>
            </h1>
            <p className="text-indigo-200 max-w-2xl mx-auto text-base mb-0">
              Structured programs that guide you through multiple courses in sequence.
            </p>
          </div>
        </div>

        {/* ── Main ── */}
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

          {/* Stats Cards */}
          {!loading && !error && programs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                {
                  label: 'Total Programs',
                  value: programs.length,
                  icon: LayoutList,
                  color: 'bg-indigo-50 text-indigo-600',
                },
                {
                  label: 'Total Courses',
                  value: programs.reduce((a, p) => a + (p.course_count || 0), 0),
                  icon: BookOpen,
                  color: 'bg-violet-50 text-violet-600',
                },
                {
                  label: 'Total Learners',
                  value: programs.reduce((a, p) => a + (p.member_count || 0), 0),
                  icon: Users,
                  color: 'bg-emerald-50 text-emerald-600',
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900 leading-none mb-1">{value}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Toolbar: Search + Create */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">All Programs</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {loading ? 'Loading…' : `${filtered.length} program${filtered.length !== 1 ? 's' : ''} available`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search programs…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full sm:w-56 transition"
                  />
                </div>
                {/* Create — visible to Instructors / Admins */}
                {isInstructor && (
                  <Link
                    href="/programs/create"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Create Program
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              <p className="font-semibold">{error}</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((program, idx) => (
                <ProgramCard key={program.name || idx} program={program} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold text-lg">No programs found.</p>
              {search ? (
                <p className="text-slate-400 text-sm mt-1">
                  Try a different search term.
                </p>
              ) : isInstructor ? (
                <Link
                  href="/programs/create"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create your first program
                </Link>
              ) : null}
            </div>
          )}
        </main>

        <footer className="bg-slate-900 text-slate-300 py-8 text-center mt-auto">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-sm">© 2026 Stridenex Inc. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}

// ── Program Card ──────────────────────────────────────────────────────────────
function ProgramCard({ program }: { program: Program }) {
  const imageUrl = getImageUrl(program.image);
  const slug = encodeURIComponent(program.title);

  return (
    <Link
      href={`/programs/${slug}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
    >
      {/* Thumbnail */}
      <div className="relative h-44 w-full bg-gradient-to-br from-indigo-500 to-violet-600 overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={program.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <LayoutList className="w-14 h-14 text-white/30" />
          </div>
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Top-left badge */}
        {program.enforce_course_order === 1 && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <Lock className="w-3 h-3" /> Ordered
            </span>
          </div>
        )}

        {/* Bottom-right pill */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <BookOpen className="w-3.5 h-3.5" />
          {program.course_count ?? 0} Courses
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-grow">
        <h2 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1.5 line-clamp-2 leading-snug">
          {program.title}
        </h2>

        {program.short_introduction && (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed flex-grow">
            {program.short_introduction}
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>{program.member_count ?? 0} Learners</span>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 group-hover:gap-2 transition-all">
            View Path <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
