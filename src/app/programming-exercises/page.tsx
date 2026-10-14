"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getProgrammingExercises,
  deleteProgrammingExercise,
  getProgrammingExerciseSubmissionList,
  getProgrammingExerciseSubmission,
  deleteProgrammingExerciseSubmission,
  LMSProgrammingExercise,
  LMSProgrammingExerciseSubmission,
} from '@/services/lms.services';
import { getImageUrl } from '@/services/api.services';
import {
  Code2,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Eye,
  Play,
  Terminal,
  BookOpen,
  User,
  Users,
  Calendar,
  AlertCircle,
  X,
  FileCode,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Award,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

export default function ProgrammingExercisesPage() {
  const router = useRouter();

  // Authentication & Role State
  const [isInstructor, setIsInstructor] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [authChecked, setAuthChecked] = useState(false);

  // Data states
  const [exercises, setExercises] = useState<LMSProgrammingExercise[]>([]);
  const [submissions, setSubmissions] = useState<LMSProgrammingExerciseSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'exercises' | 'submissions'>('exercises');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states
  const [selectedSubmission, setSelectedSubmission] = useState<LMSProgrammingExerciseSubmission | null>(null);
  const [loadingSubmissionDetail, setLoadingSubmissionDetail] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<LMSProgrammingExercise | null>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<LMSProgrammingExerciseSubmission | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Initial Auth & Role Check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem('apiKey');
      const userEmail = localStorage.getItem('userEmail') || localStorage.getItem('user') || '';
      setCurrentUserEmail(userEmail);

      const rolesStr = localStorage.getItem('roles') || '';
      try {
        const roles = rolesStr.startsWith('[') ? JSON.parse(rolesStr) : rolesStr;
        const instructorDetected = Array.isArray(roles)
          ? roles.some((r: string) => ['Instructor', 'Administrator', 'System Manager', 'Course Creator'].includes(r))
          : ['Instructor', 'Administrator', 'System Manager'].some((r) => rolesStr.includes(r));
        setIsInstructor(instructorDetected);
      } catch {
        setIsInstructor(rolesStr.includes('Instructor') || rolesStr.includes('Administrator'));
      }
      setAuthChecked(true);
    }
  }, []);

  // Fetch Exercises and Submissions
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [exercisesRes, submissionsRes] = await Promise.allSettled([
        getProgrammingExercises(),
        getProgrammingExerciseSubmissionList(),
      ]);

      if (exercisesRes.status === 'fulfilled') {
        setExercises(exercisesRes.value || []);
      } else {
        console.warn('Failed to fetch exercises:', exercisesRes.reason);
      }

      if (submissionsRes.status === 'fulfilled') {
        setSubmissions(submissionsRes.value || []);
      } else {
        console.warn('Failed to fetch submissions:', submissionsRes.reason);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load programming exercises data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked) {
      fetchData();
    }
  }, [authChecked]);

  // Toast auto-dismiss
  useEffect(() => {
    if (actionMessage) {
      const t = setTimeout(() => setActionMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionMessage]);

  // Languages present
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((e) => {
      if (e.language) set.add(e.language);
    });
    return ['All', ...Array.from(set)];
  }, [exercises]);

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const titleMatch = (ex.title || ex.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const statementMatch = (ex.problem_statement || '').toLowerCase().includes(searchTerm.toLowerCase());
      const langMatch = languageFilter === 'All' || (ex.language || '').toLowerCase() === languageFilter.toLowerCase();
      return (titleMatch || statementMatch) && langMatch;
    });
  }, [exercises, searchTerm, languageFilter]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // If student, only show submissions by current student
      if (!isInstructor && currentUserEmail) {
        if (sub.member && sub.member.toLowerCase() !== currentUserEmail.toLowerCase()) {
          return false;
        }
      }

      const matchSearch =
        (sub.exercise || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.exercise_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.member || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.member_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchLang = languageFilter === 'All' || (sub.language || '').toLowerCase() === languageFilter.toLowerCase();
      const matchStatus = statusFilter === 'All' || (sub.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchLang && matchStatus;
    });
  }, [submissions, isInstructor, currentUserEmail, searchTerm, languageFilter, statusFilter]);

  // Check if an exercise has been solved or submitted by the current student
  const getExerciseStatusForStudent = (exerciseName: string) => {
    const studentSubs = submissions.filter(
      (s) =>
        s.exercise === exerciseName &&
        (!currentUserEmail || (s.member && s.member.toLowerCase() === currentUserEmail.toLowerCase()))
    );
    if (studentSubs.length === 0) return 'unattempted';
    const hasPassed = studentSubs.some((s) => (s.status || '').toLowerCase() === 'passed');
    return hasPassed ? 'solved' : 'attempted';
  };

  // Inspect single submission details
  const handleInspectSubmission = async (submission: LMSProgrammingExerciseSubmission) => {
    setSelectedSubmission(submission);
    setLoadingSubmissionDetail(true);
    try {
      const detail = await getProgrammingExerciseSubmission(submission.name);
      if (detail) {
        setSelectedSubmission({ ...submission, ...detail });
      }
    } catch (e) {
      console.warn('Could not fetch single submission detail, using list object', e);
    } finally {
      setLoadingSubmissionDetail(false);
    }
  };

  // Handle Delete Exercise (Instructor only)
  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    setDeleting(true);
    try {
      await deleteProgrammingExercise(exerciseToDelete.name);
      setActionMessage({ text: `Exercise "${exerciseToDelete.title}" deleted successfully.`, type: 'success' });
      setExerciseToDelete(null);
      await fetchData();
    } catch (err: any) {
      setActionMessage({ text: err?.message || 'Failed to delete exercise.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // Handle Delete Submission (Instructor only)
  const confirmDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    setDeleting(true);
    try {
      await deleteProgrammingExerciseSubmission(submissionToDelete.name);
      setActionMessage({ text: `Submission ${submissionToDelete.name} deleted.`, type: 'success' });
      setSubmissionToDelete(null);
      if (selectedSubmission?.name === submissionToDelete.name) {
        setSelectedSubmission(null);
      }
      await fetchData();
    } catch (err: any) {
      setActionMessage({ text: err?.message || 'Failed to delete submission.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white pt-8 pb-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 rounded-full bg-violet-600/15 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Terminal className="w-3.5 h-3.5" />
                  Coding & Algorithm Challenges
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    isInstructor
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isInstructor ? 'Instructor Portal' : 'Student Workspace'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Programming Exercises
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                {isInstructor
                  ? 'Author automated programming exercises, configure dynamic test cases, evaluate student code, and manage submissions.'
                  : 'Solve interactive coding challenges, write code in the live editor, run test cases, and track your submission history.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={loading}
                title="Refresh"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {isInstructor && (
                <Link
                  href="/programming-exercises/create"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  + Create Exercise
                </Link>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6">
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-xl p-3.5">
              <p className="text-xs text-slate-400 font-medium">Total Exercises</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-1">{exercises.length}</p>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-xl p-3.5">
              <p className="text-xs text-slate-400 font-medium">
                {isInstructor ? 'Total Submissions' : 'My Submissions'}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-300 mt-1">
                {isInstructor
                  ? submissions.length
                  : submissions.filter(
                      (s) =>
                        !currentUserEmail ||
                        (s.member && s.member.toLowerCase() === currentUserEmail.toLowerCase())
                    ).length}
              </p>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-xl p-3.5">
              <p className="text-xs text-slate-400 font-medium">Supported Languages</p>
              <p className="text-xl sm:text-2xl font-bold text-violet-300 mt-1">
                {Math.max(1, availableLanguages.length - 1)}
              </p>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-xl p-3.5">
              <p className="text-xs text-slate-400 font-medium">
                {isInstructor ? 'Submissions Pass Rate' : 'Challenges Solved'}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-300 mt-1">
                {isInstructor
                  ? submissions.length > 0
                    ? `${Math.round(
                        (submissions.filter((s) => (s.status || '').toLowerCase() === 'passed').length /
                          submissions.length) *
                          100
                      )}%`
                    : '0%'
                  : exercises.filter((ex) => getExerciseStatusForStudent(ex.name) === 'solved').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20">
        {/* Toast / Alert Feedback */}
        {actionMessage && (
          <div
            className={`mb-4 p-4 rounded-xl flex items-center justify-between shadow-sm border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="text-sm font-medium">{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs & Search Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('exercises')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'exercises'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>{isInstructor ? 'Exercise Catalog' : 'Coding Challenges'}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === 'exercises' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {exercises.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('submissions')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'submissions'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>{isInstructor ? 'Student Submissions' : 'My Submissions'}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === 'submissions' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isInstructor
                    ? submissions.length
                    : submissions.filter(
                        (s) =>
                          !currentUserEmail ||
                          (s.member && s.member.toLowerCase() === currentUserEmail.toLowerCase())
                      ).length}
                </span>
              </button>
            </div>

            {/* Role Helper Info */}
            <div className="text-xs text-slate-500 flex items-center gap-1.5 self-end sm:self-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isInstructor ? 'Instructor Mode active' : 'Student Mode active'}</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="pt-4 flex flex-col md:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === 'exercises'
                    ? 'Search exercises by title or keywords...'
                    : isInstructor
                    ? 'Search by student email, exercise, or ID...'
                    : 'Search my submissions...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Language Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 whitespace-nowrap">
                <Filter className="w-3.5 h-3.5" />
                <span>Language:</span>
              </div>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 w-full md:w-40"
              >
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>

              {/* Status filter (on submissions tab) */}
              {activeTab === 'submissions' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 w-full md:w-36"
                >
                  <option value="All">All Status</option>
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                  <option value="Submitted">Submitted</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Tab 1: Exercises Catalog */}
        {activeTab === 'exercises' && (
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3" />
                <p className="text-sm font-medium text-slate-500">Loading programming exercises...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-red-200 shadow-sm">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 font-semibold">{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Try Again
                </button>
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <Code2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">No Programming Exercises Found</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                  {searchTerm || languageFilter !== 'All'
                    ? 'No exercises match your search filters. Try resetting the filters.'
                    : isInstructor
                    ? 'No programming exercises have been authored yet. Click the button below to create your first exercise!'
                    : 'No coding challenges available at this moment. Please check back later.'}
                </p>
                {isInstructor && (
                  <Link
                    href="/programming-exercises/create"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create First Exercise
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredExercises.map((exercise) => {
                  const studentStatus = !isInstructor ? getExerciseStatusForStudent(exercise.name) : null;
                  const testCaseCount = Array.isArray(exercise.test_cases) ? exercise.test_cases.length : 0;
                  const cleanStatement = exercise.problem_statement
                    ? exercise.problem_statement.replace(/<[^>]*>?/gm, '').trim()
                    : 'No problem statement provided.';

                  return (
                    <div
                      key={exercise.name}
                      className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between overflow-hidden"
                    >
                      {/* Top Bar of Card */}
                      <div className="p-5 pb-3">
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {exercise.language || 'Python'}
                            </span>
                            <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {testCaseCount} {testCaseCount === 1 ? 'Test Case' : 'Test Cases'}
                            </span>
                          </div>

                          {/* Student Status Badge */}
                          {!isInstructor && studentStatus && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                studentStatus === 'solved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : studentStatus === 'attempted'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {studentStatus === 'solved' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Solved
                                </>
                              ) : studentStatus === 'attempted' ? (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Attempted
                                </>
                              ) : (
                                'New'
                              )}
                            </span>
                          )}

                          {/* Instructor Actions Menu */}
                          {isInstructor && (
                            <button
                              onClick={() => setExerciseToDelete(exercise)}
                              title="Delete Exercise"
                              className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Exercise Title */}
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {exercise.title || exercise.name}
                        </h3>

                        {/* Statement Snippet */}
                        <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                          {cleanStatement}
                        </p>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-5 pt-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {exercise.name}
                        </div>

                        <div className="flex items-center gap-2">
                          {isInstructor ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSearchTerm(exercise.title || exercise.name);
                                  setActiveTab('submissions');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-semibold border border-slate-200 transition-all active:scale-95"
                                title="View submissions for this exercise"
                              >
                                <Users className="w-3.5 h-3.5 text-indigo-600" />
                                <span>
                                  Submissions ({submissions.filter((s) => s.exercise === exercise.name).length})
                                </span>
                              </button>
                              {/* Preview button commented out */}
                              {/* <Link
                                href={`/programming-exercises/${encodeURIComponent(exercise.name)}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
                                title="Preview problem workspace"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </Link> */}
                            </div>
                          ) : (
                            <Link
                              href={`/programming-exercises/${encodeURIComponent(exercise.name)}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>
                                {studentStatus === 'solved'
                                  ? 'Review / Solve Again'
                                  : studentStatus === 'attempted'
                                  ? 'Continue Challenge'
                                  : 'Solve Challenge'}
                              </span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Submissions Hub */}
        {activeTab === 'submissions' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  {isInstructor ? 'All Student Submissions' : 'My Past Submissions'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isInstructor
                    ? 'Review, inspect student solutions, evaluate verdicts, and manage attempts.'
                    : 'Inspect your submitted code and execution verdicts.'}
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
                Showing {filteredSubmissions.length} of {submissions.length} records
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading submissions...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <FileCode className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Submissions Found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {isInstructor
                    ? 'No students have submitted solutions for the current filter criteria.'
                    : 'You have not submitted any solutions yet. Try solving an exercise!'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200/70">
                    <tr>
                      <th className="py-3 px-4">Submission ID</th>
                      <th className="py-3 px-4">Exercise</th>
                      {isInstructor && <th className="py-3 px-4">Student</th>}
                      <th className="py-3 px-4">Language</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredSubmissions.map((sub) => {
                      const isPassed = (sub.status || '').toLowerCase() === 'passed';
                      const isFailed = (sub.status || '').toLowerCase() === 'failed';

                      return (
                        <tr key={sub.name} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            {sub.name}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            <Link
                              href={`/programming-exercises/${encodeURIComponent(sub.exercise)}`}
                              className="hover:text-indigo-600 flex items-center gap-1 group font-semibold"
                            >
                              <span>{sub.exercise_title || sub.exercise}</span>
                              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
                            </Link>
                            {sub.exercise_title && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                ID: {sub.exercise}
                              </span>
                            )}
                          </td>
                          {isInstructor && (
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                {sub.member_image ? (
                                  <img
                                    src={getImageUrl(sub.member_image)}
                                    alt={sub.member_name || sub.member || 'Student'}
                                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                                    {(sub.member_name || sub.member || 'S')[0]}
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold text-slate-900 leading-tight truncate">
                                    {sub.member_name || sub.member || 'Student'}
                                  </span>
                                  {sub.member_name && sub.member && (
                                    <span className="text-[11px] text-slate-400 font-mono leading-tight truncate">
                                      {sub.member}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {sub.language || 'Python'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                isPassed
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isFailed
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}
                            >
                              {isPassed ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : isFailed ? (
                                <AlertCircle className="w-3 h-3 text-red-600" />
                              ) : (
                                <Clock className="w-3 h-3 text-indigo-600" />
                              )}
                              {sub.status || 'Submitted'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {sub.creation ? new Date(sub.creation).toLocaleDateString() : 'Recent'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Inspect Code Button */}
                              <button
                                onClick={() => handleInspectSubmission(sub)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Code
                              </button>

                              {/* Instructor Delete Button */}
                              {isInstructor && (
                                <button
                                  onClick={() => setSubmissionToDelete(sub)}
                                  title="Delete Submission"
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: Inspect Submission Code */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedSubmission.exercise_title || selectedSubmission.exercise}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {selectedSubmission.name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>
                      Student: {selectedSubmission.member_name ? `${selectedSubmission.member_name} (${selectedSubmission.member})` : (selectedSubmission.member || 'Anonymous')}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-indigo-400">
                      {selectedSubmission.language || 'Python'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    (selectedSubmission.status || '').toLowerCase() === 'passed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : (selectedSubmission.status || '').toLowerCase() === 'failed'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}
                >
                  {selectedSubmission.status || 'Submitted'}
                </span>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Code Viewer */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 font-mono text-xs space-y-4">
              <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                <span>Submitted Code</span>
                <button
                  onClick={() => handleCopyCode(selectedSubmission.code || '')}
                  className="flex items-center gap-1 text-[11px] hover:text-indigo-400 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 overflow-x-auto whitespace-pre font-mono leading-relaxed max-h-80">
                {selectedSubmission.code || '// No code provided in this submission.'}
              </div>

              {/* Execution Feedback / Output if available */}
              {(selectedSubmission.output || selectedSubmission.error_message) && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <span className="text-slate-400 block mb-2 font-sans font-semibold">Console Output / Verdict</span>
                  <div
                    className={`p-3 rounded-xl border font-mono text-xs ${
                      selectedSubmission.error_message
                        ? 'bg-red-950/30 border-red-800 text-red-300'
                        : 'bg-slate-950 border-slate-800 text-emerald-400'
                    }`}
                  >
                    {selectedSubmission.error_message || selectedSubmission.output}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
              {isInstructor ? (
                <button
                  onClick={() => {
                    setSubmissionToDelete(selectedSubmission);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Submission
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Exercise Confirmation */}
      {exerciseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center">
              Delete Programming Exercise?
            </h3>
            <p className="text-sm text-slate-500 text-center mt-2">
              Are you sure you want to delete <span className="font-semibold text-slate-800">&quot;{exerciseToDelete.title || exerciseToDelete.name}&quot;</span>? This will permanently remove the exercise and all student submissions.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setExerciseToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExercise}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Exercise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Submission Confirmation */}
      {submissionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center">
              Delete Submission Record?
            </h3>
            <p className="text-sm text-slate-500 text-center mt-2">
              Are you sure you want to delete submission <span className="font-semibold font-mono text-slate-800">{submissionToDelete.name}</span> for student <span className="font-semibold text-slate-800">{submissionToDelete.member || 'Learner'}</span>?
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setSubmissionToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSubmission}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
