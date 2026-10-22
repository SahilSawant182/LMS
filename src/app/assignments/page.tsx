"use client";

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { getAssignments, deleteAssignment, getAssignmentSubmissions, getAssignmentResult } from '@/services/lms.services';
import { getCurrentUserEmail } from '@/services/api.services';
import { isAuthorizedInstructor } from '@/services/auth.services';
import { formatDate, timeAgo, getInitials } from '@/utils/formatters';
import { 
  BookOpen, 
  FileText, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  Edit, 
  Trash2, 
  Search, 
  Inbox, 
  ExternalLink, 
  Eye, 
  X, 
  AlertCircle,
  RefreshCw,
  User,
  GraduationCap
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function AssignmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);

  // Instructor Submissions state
  const [instructorSubmissions, setInstructorSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState<'assignments' | 'submissions'>('assignments');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'All' | 'Not Graded' | 'Graded'>('All');
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [loadingModalDetail, setLoadingModalDetail] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'submissions') {
      setActiveTab('submissions');
    } else if (tab === 'assignments') {
      setActiveTab('assignments');
    }
  }, [searchParams]);

  // If redirected with ?id=..., immediately open that assignment
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      router.push(`/assignments/${encodeURIComponent(id)}`);
    }
  }, [searchParams, router]);

  const fetchInstructorSubmissions = async (userEmailOverride?: string) => {
    const userEmail = (userEmailOverride || getCurrentUserEmail()).trim().toLowerCase();
    if (!userEmail) return;
    setLoadingSubmissions(true);
    try {
      const subs = await getAssignmentSubmissions({ user: userEmail });
      const list = Array.isArray(subs) ? subs : [];
      setInstructorSubmissions(list);
    } catch (subErr) {
      console.warn("Failed to fetch instructor assignment submissions:", subErr);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchAssignments = async (isInstUser?: boolean) => {
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

      // If user is instructor, fetch all student submissions using get_assignment_submissions?user=...
      const shouldFetchSubs = isInstUser ?? isInstructor;
      if (shouldFetchSubs && userEmail) {
        fetchInstructorSubmissions(userEmail);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isInst = false;
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
          isInst = roles.includes("Instructor") || roles.includes("System Manager") || roles.includes("Administrator");
        } catch (e) {}
      }
      if (!isInst && typeof isAuthorizedInstructor === "function") {
        isInst = isAuthorizedInstructor();
      }
      setIsInstructor(isInst);
    }

    fetchAssignments(isInst);
  }, [router]);

  const handleDelete = async (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    setDeletingName(name);
    try {
      await deleteAssignment(name);
      setAssignments((prev: any[]) => prev.filter((a: any) => a.name !== name));
      await fetchAssignments(isInstructor);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete assignment');
    } finally {
      setDeletingName(null);
    }
  };

  const handleOpenSubmissionModal = async (sub: any) => {
    setSelectedSubmission(sub);
    setViewModalOpen(true);
    if (sub.name) {
      setLoadingModalDetail(true);
      try {
        const studentUser = sub.member || sub.owner || sub.user || '';
        const full = await getAssignmentResult(sub.name, studentUser);
        if (full) {
          const resolvedAnswer =
            full.answer !== undefined ? full.answer :
            full.anwer !== undefined ? full.anwer :
            full.content !== undefined ? full.content :
            sub.answer || sub.anwer || sub.content || '';

          setSelectedSubmission((prev: any) => ({
            ...prev,
            ...full,
            answer: resolvedAnswer,
            anwer: resolvedAnswer,
            content: resolvedAnswer,
            submission_url: full.submission_url || full.url || prev?.submission_url,
            attachment: full.attachment || full.submission_attachment || prev?.attachment,
          }));
        }
      } catch (e) {
        console.warn("Could not fetch full assignment result:", e);
      } finally {
        setLoadingModalDetail(false);
      }
    }
  };

  const filteredSubmissions = useMemo(() => {
    return instructorSubmissions.filter((sub) => {
      // Status filter
      if (submissionStatusFilter !== 'All') {
        const status = (sub.status || 'Not Graded').trim().toLowerCase();
        const target = submissionStatusFilter.trim().toLowerCase();
        if (status !== target) return false;
      }
      // Search filter
      if (submissionSearch.trim()) {
        const query = submissionSearch.trim().toLowerCase();
        const studentName = String(sub.member_name || '').toLowerCase();
        const studentEmail = String(sub.member || '').toLowerCase();
        const assignmentTitle = String(sub.assignment_title || '').toLowerCase();
        const assignmentId = String(sub.assignment || '').toLowerCase();
        const subId = String(sub.name || '').toLowerCase();
        const course = String(sub.course || '').toLowerCase();
        return (
          studentName.includes(query) ||
          studentEmail.includes(query) ||
          assignmentTitle.includes(query) ||
          assignmentId.includes(query) ||
          subId.includes(query) ||
          course.includes(query)
        );
      }
      return true;
    });
  }, [instructorSubmissions, submissionStatusFilter, submissionSearch]);

  const notGradedCount = useMemo(() => {
    return instructorSubmissions.filter(s => (s.status || 'Not Graded') === 'Not Graded').length;
  }, [instructorSubmissions]);

  const gradedCount = useMemo(() => {
    return instructorSubmissions.filter(s => s.status === 'Graded').length;
  }, [instructorSubmissions]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-slate-900 text-white pt-6 pb-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold mb-1">
                {isInstructor ? "Assignments & Submissions" : "My Assignments"}
              </h1>
              <p className="text-indigo-200 text-xs sm:text-sm">
                {isInstructor ? "Track assignments, manage submissions, and review student work." : "Track and submit your course assignments."}
              </p>
            </div>

            {isInstructor && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchInstructorSubmissions()}
                  disabled={loadingSubmissions}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700 cursor-pointer disabled:opacity-50"
                  title="Refresh Submissions"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSubmissions ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>Refresh</span>
                </button>
                <Link
                  href="/assignments/create"
                  className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-sm"
                >
                  + Create Assignment
                </Link>
              </div>
            )}
          </div>

          {/* Instructor Tabs */}
          {isInstructor && (
            <div className="flex border-b border-slate-800 mt-6 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('assignments')}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
                  activeTab === 'assignments'
                    ? 'border-indigo-500 text-white font-bold bg-slate-800/60 rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20 rounded-t-xl'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>All Assignments</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'assignments' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {assignments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('submissions')}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
                  activeTab === 'submissions'
                    ? 'border-indigo-500 text-white font-bold bg-slate-800/60 rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20 rounded-t-xl'
                }`}
              >
                <Inbox className="w-4 h-4 text-indigo-400" />
                <span>Student Submissions</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'submissions' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {instructorSubmissions.length}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-2 relative z-20">
        {/* TAB 1: ALL ASSIGNMENTS */}
        {(!isInstructor || activeTab === 'assignments') && (
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
                      {!isInstructor && (
                        <div className="flex flex-col sm:items-end">
                          <span className="text-xs text-slate-400 font-medium">Status</span>
                          <span className={`text-sm font-medium flex items-center gap-1 ${assignment._is_submitted ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {assignment._is_submitted ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            {assignment._is_submitted ? (assignment.status && assignment.status !== 'Pending' ? assignment.status : 'Submitted') : 'Pending'}
                          </span>
                        </div>
                      )}
                      
                      {isInstructor && (
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/assignments/${assignment.name}/edit`} 
                            onClick={(e) => e.stopPropagation()} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Assignment"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={(e) => handleDelete(e, assignment.name)} 
                            disabled={deletingName === assignment.name} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Assignment"
                          >
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
        )}

        {/* TAB 2: STUDENT SUBMISSIONS (Instructor only) */}
        {isInstructor && activeTab === 'submissions' && (
          <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100">
            {/* Header, Search & Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-indigo-600" />
                  Student Submissions
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage and evaluate submissions received across all your assignments.
                </p>
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[240px] sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    placeholder="Search student, assignment..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {submissionSearch && (
                    <button
                      onClick={() => setSubmissionSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSubmissionStatusFilter('All')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      submissionStatusFilter === 'All'
                        ? 'bg-white text-indigo-600 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({instructorSubmissions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionStatusFilter('Not Graded')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      submissionStatusFilter === 'Not Graded'
                        ? 'bg-amber-100 text-amber-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Not Graded ({notGradedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionStatusFilter('Graded')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      submissionStatusFilter === 'Graded'
                        ? 'bg-emerald-100 text-emerald-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Graded ({gradedCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Submissions List */}
            {loadingSubmissions ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
                <p className="text-xs text-slate-500">Loading student assignment submissions...</p>
              </div>
            ) : filteredSubmissions.length > 0 ? (
              <div className="space-y-3">
                {filteredSubmissions.map((sub: any) => {
                  const isGraded = (sub.status || '').toLowerCase() === 'graded';
                  const studentName = sub.member_name || sub.member || 'Student';
                  const studentEmail = sub.member || sub.owner || '';
                  const assignmentTitle = sub.assignment_title || sub.assignment || 'Assignment';
                  const courseName = sub.course || null;

                  return (
                    <div
                      key={sub.name}
                      className="group flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all bg-white gap-4"
                    >
                      {/* Left side: Student & Assignment Information */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Student Initials Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                          {getInitials(studentName)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {studentName}
                            </span>
                            {studentEmail && (
                              <span className="text-xs text-slate-400 font-mono truncate">
                                &lt;{studentEmail}&gt;
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                              {sub.name}
                            </span>
                          </div>

                          {/* Assignment title & details */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                            <span className="font-semibold text-indigo-700 flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                              {assignmentTitle}
                            </span>
                            {sub.assignment && (
                              <span className="text-[11px] font-mono text-slate-400">
                                ({sub.assignment})
                              </span>
                            )}
                            {courseName && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                                {courseName}
                              </span>
                            )}
                            {sub.type && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-600">
                                {sub.type}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3" />
                              {sub.creation ? formatDate(sub.creation) : 'Submitted'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Status and Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          isGraded 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isGraded ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>{sub.status || 'Not Graded'}</span>
                        </span>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenSubmissionModal(sub)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-semibold border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          <Link
                            href={`/assignments/${encodeURIComponent(sub.assignment || '')}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                          >
                            <span>Open & Grade</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">No submissions found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {submissionSearch || submissionStatusFilter !== 'All' 
                    ? 'No submissions match your active search or filter criteria. Try clearing filters.'
                    : 'No student submissions have been submitted for your assignments yet.'}
                </p>
                {(submissionSearch || submissionStatusFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmissionSearch('');
                      setSubmissionStatusFilter('All');
                    }}
                    className="mt-4 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Submission Details Modal */}
      {viewModalOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Submission: {selectedSubmission.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedSubmission.assignment}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
              {/* Student and Assignment Summary Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Student</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedSubmission.member_name || selectedSubmission.member || 'Student'}
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {selectedSubmission.member}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Assignment Title</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedSubmission.assignment_title || selectedSubmission.assignment}
                  </div>
                  {selectedSubmission.course && (
                    <div className="text-slate-500 text-[11px]">
                      Course: {selectedSubmission.course}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Status</span>
                  <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                    selectedSubmission.status === 'Graded'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedSubmission.status === 'Graded' ? (
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Clock className="w-3 h-3 text-amber-600" />
                    )}
                    {selectedSubmission.status || 'Not Graded'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Submitted Date</span>
                  <div className="font-semibold text-slate-800 mt-1">
                    {selectedSubmission.creation ? formatDate(selectedSubmission.creation) : 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Submission Type</span>
                  <span className="inline-block mt-1 font-semibold text-slate-800">
                    {selectedSubmission.type || 'Text'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Evaluator</span>
                  <span className="inline-block mt-1 font-semibold text-slate-800">
                    {selectedSubmission.evaluator || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Submission Content / Student Work */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Student Submitted Answer
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Answer Field
                  </span>
                </h4>

                {loadingModalDetail ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                    Fetching full answer from server...
                  </div>
                ) : (selectedSubmission.answer || selectedSubmission.anwer || selectedSubmission.content) ? (
                  <div className="p-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl font-mono text-xs whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed selection:bg-indigo-600 selection:text-white">
                    {String(selectedSubmission.answer || selectedSubmission.anwer || selectedSubmission.content)}
                  </div>
                ) : selectedSubmission.submission_url ? (
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <a
                      href={selectedSubmission.submission_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {selectedSubmission.submission_url}
                    </a>
                  </div>
                ) : selectedSubmission.attachment ? (
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <a
                      href={selectedSubmission.attachment}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Submitted Document
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-center">
                    No answer body preview available. Click &quot;Open & Grade&quot; below to review full submission.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewModalOpen(false);
                  router.push(`/assignments/${encodeURIComponent(selectedSubmission.assignment || '')}`);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Go to Assignment & Grade</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
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
