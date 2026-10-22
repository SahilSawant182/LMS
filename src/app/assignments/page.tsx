"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { getAssignments, deleteAssignment, getAssignmentSubmissions } from '@/services/lms.services';
import { getCurrentUserEmail } from '@/services/api.services';
import { BookOpen, FileText, ChevronRight, Clock, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AssignmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);

  // If redirected with ?id=..., immediately open that assignment
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      router.push(`/assignments/${encodeURIComponent(id)}`);
    }
  }, [searchParams, router]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const userEmail = getCurrentUserEmail().trim().toLowerCase();

      const [response, submissionsRes] = await Promise.all([
        getAssignments(),
        getAssignmentSubmissions().catch(() => null)
      ]);
      
      const rawData = response?.data || response;
      const assignmentsData = rawData?.message?.data?.assignments || rawData?.message?.assignments || rawData?.assignments || rawData?.data || rawData?.message || [];
      const finalData = Array.isArray(assignmentsData) ? assignmentsData : (Array.isArray(rawData) ? rawData : []);
      
      let submissionsList: any[] = [];
      if (submissionsRes) {
        const subRaw: any = (submissionsRes as any)?.data || submissionsRes;
        if (Array.isArray(subRaw)) {
          submissionsList = subRaw;
        } else if (subRaw && typeof subRaw === 'object') {
          if (Array.isArray(subRaw.submissions)) submissionsList = subRaw.submissions;
          else if (subRaw.data && Array.isArray(subRaw.data.submissions)) submissionsList = subRaw.data.submissions;
          else if (subRaw.message && Array.isArray(subRaw.message.data)) submissionsList = subRaw.message.data;
          else if (subRaw.message && Array.isArray(subRaw.message.submissions)) submissionsList = subRaw.message.submissions;
          else if (Array.isArray(subRaw.data)) submissionsList = subRaw.data;
          else if (Array.isArray(subRaw.message)) submissionsList = subRaw.message;
        }
      }
      
      const mergedData = finalData.map(a => {
        const aName = String(a.name || '').trim().toLowerCase();
        const aTitle = String(a.title || a.assignment_title || '').trim().toLowerCase();

        // Check local storage submission specifically for this user
        let hasLocalSub = false;
        if (typeof window !== "undefined" && userEmail) {
          try {
            const userKeys = [
              `lms_submission_${userEmail}_${a.name}`,
              `lms_submission_${userEmail}_${a.title}`,
              `lms_submission_${userEmail}_${aName}`,
              `lms_submission_${userEmail}_${aTitle}`,
            ].filter(Boolean);

            hasLocalSub = userKeys.some(k => {
              const raw = localStorage.getItem(k);
              if (!raw) return false;
              try {
                const parsed = JSON.parse(raw);
                return Boolean(parsed?.status === 'Submitted' || parsed?.status === 'Graded' || parsed?.submitted_at || parsed?._is_submitted);
              } catch {
                return false;
              }
            });
          } catch (e) {}
        }

        const sub = submissionsList.find((s: any) => {
          const sAss = String(s.assignment || '').trim().toLowerCase();
          const sTitle = String(s.assignment_title || '').trim().toLowerCase();
          const matches = sAss === aName || (aTitle && sTitle === aTitle);
          if (!matches) return false;
          if (!userEmail) return false;
          const sMember = String(s.member || s.owner || s.member_name || s.user || '').trim().toLowerCase();
          return Boolean(sMember && (sMember === userEmail || sMember.includes(userEmail) || userEmail.includes(sMember)));
        });

        const isSub = Boolean(sub || hasLocalSub);
        const resolvedStatus = isSub ? ((sub?.status && sub.status !== 'Pending') ? sub.status : 'Submitted') : 'Pending';

        return {
          ...a,
          status: resolvedStatus,
          _is_submitted: isSub,
          submission_name: sub?.name
        };
      });
      
      setAssignments(mergedData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("apiKey");
      if (!apiKey) {
        router.push("/login");
        return;
      }
      
      const rolesStr = localStorage.getItem("roles");
      if (rolesStr) {
        try {
          const roles = JSON.parse(rolesStr);
          setIsInstructor(roles.includes("Instructor") || roles.includes("System Manager") || roles.includes("Administrator"));
        } catch (e) {}
      }
    }

    fetchAssignments();
  }, [router]);

  const handleDelete = async (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    setDeletingName(name);
    try {
      await deleteAssignment(name);
      await fetchAssignments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete assignment');
    } finally {
      setDeletingName(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      <div className="bg-slate-900 text-white pt-6 pb-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <h1 className="text-2xl font-extrabold mb-1">My Assignments</h1>
          <p className="text-indigo-200 text-xs sm:text-sm">Track and submit your course assignments.</p>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20">
        <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              All Assignments
            </h2>
            {isInstructor && (
              <Link href="/assignments/create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold shadow-sm">
                + Create
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-6 bg-red-50 text-red-600 rounded-lg">
              <p>{error}</p>
            </div>
          ) : assignments.length > 0 ? (
            <div className="space-y-4">
              {assignments.map((assignment: any, idx: number) => (
                <div 
                  key={assignment.name || idx} 
                  onClick={() => router.push(`/assignments/${assignment.name}`)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer bg-white"
                >
                  <div className="flex items-start gap-4 mb-4 sm:mb-0">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {assignment.title || assignment.assignment_title || assignment.name || 'Untitled Assignment'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                          {assignment.course ? `Course: ${assignment.course}` : 'Assignment Task'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 sm:pl-4 sm:border-l border-slate-100">
                      <div className="flex flex-col sm:items-end">
                        <span className="text-xs text-slate-400 font-medium">Status</span>
                        <span className={`text-sm font-medium flex items-center gap-1 ${assignment._is_submitted ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {assignment._is_submitted ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {assignment._is_submitted ? (assignment.status && assignment.status !== 'Pending' ? assignment.status : 'Submitted') : 'Pending'}
                        </span>
                      </div>
                      
                      {isInstructor && (
                        <div className="flex items-center gap-2 border-l border-slate-100 pl-4 ml-2">
                          <Link href={`/assignments/${assignment.name}/edit`} onClick={(e) => e.stopPropagation()} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button onClick={(e) => handleDelete(e, assignment.name)} disabled={deletingName === assignment.name} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors hidden sm:block" />
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">You have no assignments assigned yet.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <AssignmentsContent />
    </Suspense>
  );
}
