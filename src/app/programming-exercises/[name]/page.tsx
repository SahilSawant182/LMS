"use client";

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  getProgrammingExercise,
  createProgrammingExerciseSubmission,
  getProgrammingExerciseSubmissionList,
  getProgrammingExerciseSubmission,
  deleteProgrammingExercise,
  LMSProgrammingExercise,
  LMSProgrammingExerciseSubmission,
} from '@/services/lms.services';
import { navigateBack } from '@/utils/navigation';
import {
  ArrowLeft,
  Code2,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Terminal,
  FileCode,
  Sparkles,
  Copy,
  Check,
  Trash2,
  User,
  BookOpen,
  RotateCcw,
  X,
  Eye,
} from 'lucide-react';

export default function SolveProgrammingExercisePage() {
  const params = useParams();
  const router = useRouter();
  const exerciseName = decodeURIComponent((params?.name as string) || '');

  // Auth & Roles
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [isInstructor, setIsInstructor] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Exercise & Submissions Data
  const [exercise, setExercise] = useState<LMSProgrammingExercise | null>(null);
  const [submissions, setSubmissions] = useState<LMSProgrammingExerciseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: 'problem' or 'submissions'
  const [activeTab, setActiveTab] = useState<'problem' | 'submissions'>('problem');

  // Simple Solution Box State
  const [code, setCode] = useState('');
  const [copiedInput, setCopiedInput] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    show: boolean;
    passed: boolean;
    message: string;
    submissionName?: string;
  } | null>(null);

  // Inspect past submission code modal
  const [selectedSubmission, setSelectedSubmission] = useState<LMSProgrammingExerciseSubmission | null>(null);
  const [copiedModalCode, setCopiedModalCode] = useState(false);

  // Delete exercise state (Instructors only)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Auth Detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem('apiKey');
      if (!apiKey) {
        router.push('/login');
        return;
      }
      const email = localStorage.getItem('userEmail') || localStorage.getItem('user') || '';
      setCurrentUserEmail(email);

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
  }, [router]);

  // Fetch Exercise & Submissions
  const fetchExerciseData = async () => {
    if (!exerciseName) return;
    setLoading(true);
    setError(null);
    try {
      const [exRes, subsRes] = await Promise.allSettled([
        getProgrammingExercise(exerciseName),
        getProgrammingExerciseSubmissionList({ exercise: exerciseName }),
      ]);

      if (exRes.status === 'fulfilled' && exRes.value) {
        setExercise(exRes.value);
      } else {
        setError('Could not load exercise details. The exercise may have been removed.');
      }

      if (subsRes.status === 'fulfilled') {
        setSubmissions(subsRes.value || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch exercise.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked && exerciseName) {
      fetchExerciseData();
    }
  }, [authChecked, exerciseName]);

  // Copy sample test case input
  const copyInputText = (text: string, idx: number) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedInput(idx);
      setTimeout(() => setCopiedInput(null), 2000);
    }
  };

  // Safe helper to extract expected output
  const getTestCaseOutput = (tc: any) => {
    if (!tc) return '';
    const val =
      tc.expected_output !== undefined && tc.expected_output !== null && tc.expected_output !== 'null'
        ? tc.expected_output
        : (tc.output !== undefined && tc.output !== null && tc.output !== 'null' ? tc.output : '');
    return String(val);
  };

  // Submit Solution
  const handleSubmitSolution = async () => {
    if (!exercise) return;
    if (!code.trim()) {
      alert('Please enter your solution before submitting.');
      if (textareaRef.current) textareaRef.current.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await createProgrammingExerciseSubmission({
        exercise: exercise.name,
        code: code.trim(),
        language: exercise.language || 'Python',
        member: currentUserEmail,
        status: 'Submitted',
      });

      const submissionName = res?.name || res?.data?.name || res?.message?.name || 'Submission Recorded';

      setSubmissionFeedback({
        show: true,
        passed: true,
        message: 'Your solution has been submitted successfully!',
        submissionName,
      });

      // Refresh submissions list
      const updatedList = await getProgrammingExerciseSubmissionList({ exercise: exercise.name });
      setSubmissions(updatedList || []);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit solution. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete exercise handler (Instructors only)
  const handleDeleteExercise = async () => {
    if (!exercise) return;
    setDeleting(true);
    try {
      await deleteProgrammingExercise(exercise.name);
      router.push('/programming-exercises');
    } catch (err: any) {
      alert(err?.message || 'Failed to delete exercise.');
    } finally {
      setDeleting(false);
    }
  };

  // Copy code in inspection modal
  const handleCopyModalCode = (codeText: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(codeText);
      setCopiedModalCode(true);
      setTimeout(() => setCopiedModalCode(false), 2000);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-4" />
          <p className="text-sm text-slate-400 font-medium">Loading challenge details...</p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error || !exercise) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        <Navbar />
        <div className="max-w-xl mx-auto my-20 p-8 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Exercise Not Found</h2>
          <p className="text-sm text-slate-400">{error || 'This programming challenge does not exist.'}</p>
          <Link
            href="/programming-exercises"
            onClick={(e) => {
              e.preventDefault();
              navigateBack(router, "/programming-exercises");
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>
    );
  }

  const testCases = exercise.test_cases || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Navbar />

      {/* Top Header Bar */}
      <div className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-30 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/programming-exercises"
            onClick={(e) => {
              e.preventDefault();
              navigateBack(router, "/programming-exercises");
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {exercise.title || exercise.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
              {exercise.language || 'Python'}
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Instructor Delete Exercise */}
          {isInstructor && (
            <button
              onClick={() => setShowDeleteModal(true)}
              title="Delete Exercise"
              className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          {/* Student Submit Button (Top shortcut) */}
          {!isInstructor && (
            <button
              onClick={handleSubmitSolution}
              disabled={submitting}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Code'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('problem')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'problem'
                ? 'border-indigo-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Problem Statement</span>
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'submissions'
                ? 'border-indigo-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{isInstructor ? 'Student Submissions' : 'My Submissions'}</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-mono">
              {submissions.length}
            </span>
          </button>
        </div>

        {/* TAB 1: Problem & Solution Box */}
        {activeTab === 'problem' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Problem Statement & Sample Cases */}
            <div className="lg:col-span-6 space-y-5">
              {/* Problem Statement Card */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Problem Description
                </h2>
                <div
                  className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed break-words"
                  dangerouslySetInnerHTML={{
                    __html: exercise.problem_statement || '<p>No problem description provided.</p>',
                  }}
                />
              </div>

              {/* Sample Test Cases Card */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Sample Test Cases ({testCases.length})
                </h3>

                {testCases.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No sample test cases specified for this challenge.</p>
                ) : (
                  <div className="space-y-4">
                    {testCases.map((tc, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-3"
                      >
                        <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800/80 font-sans">
                          <span className="font-bold text-slate-200">
                            Example {idx + 1}
                          </span>
                          <button
                            onClick={() => copyInputText(tc.input, idx)}
                            className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                          >
                            {copiedInput === idx ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Input</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold mb-1">
                              Input:
                            </span>
                            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-200 overflow-x-auto whitespace-pre">
                              {tc.input || '(empty)'}
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold mb-1">
                              Expected Output:
                            </span>
                            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-emerald-400 font-bold overflow-x-auto whitespace-pre">
                              {getTestCaseOutput(tc) || '(none)'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Standard I/O Tips */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-indigo-200">
                  <Sparkles className="w-4 h-4" />
                  Standard Input & Output
                </p>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  Make sure your program reads from <code className="text-indigo-300 px-1 py-0.5 rounded bg-slate-900">stdin</code> and prints the result to <code className="text-indigo-300 px-1 py-0.5 rounded bg-slate-900">stdout</code> without extra introductory greetings or prompts.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Simple Solution Box */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col">
                {/* Solution Box Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Your Solution
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-800 text-slate-300 font-mono">
                      {exercise.language || 'Code'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {code && (
                      <button
                        onClick={() => {
                          if (window.confirm('Clear solution box?')) {
                            setCode('');
                          }
                        }}
                        className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-900"
                        title="Clear solution box"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Simple Solution Textarea */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    rows={16}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    className="w-full p-4 font-mono text-sm leading-relaxed bg-slate-900/90 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-y placeholder:text-slate-600 selection:bg-indigo-600/40"
                    placeholder={`// Enter or paste your ${exercise.language || ''} solution here...\n\nfunction solve() {\n    // write your logic\n}\n\nsolve();`}
                  />
                </div>

                {/* Solution Box Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs font-mono text-slate-500">
                    {code ? code.split('\n').length : 0} lines • {code.length} characters
                  </div>

                  {/* Submit Button (Students) */}
                  {!isInstructor ? (
                    <button
                      onClick={handleSubmitSolution}
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitting ? 'Submitting Solution...' : 'Submit Solution'}</span>
                    </button>
                  ) : (
                    <div className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                      Instructor Mode: Review student attempts in Submissions tab
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Submissions List */}
        {activeTab === 'submissions' && (
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  {isInstructor ? 'Student Submissions for this Challenge' : 'My Past Attempts'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isInstructor
                    ? 'Review student solutions, evaluation status, and timestamps.'
                    : 'Review your submitted code and execution records.'}
                </p>
              </div>

              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                {submissions.length} Total
              </span>
            </div>

            {submissions.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <FileCode className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Submissions Recorded</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {isInstructor
                    ? 'No students have submitted solutions for this challenge yet.'
                    : 'You have not submitted a solution yet. Enter your code in the Problem tab to submit!'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Submission ID</th>
                      {isInstructor && <th className="py-3 px-4">Student</th>}
                      <th className="py-3 px-4">Language</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-300">
                    {submissions.map((sub) => {
                      const isPassed = (sub.status || '').toLowerCase() === 'passed';
                      const isFailed = (sub.status || '').toLowerCase() === 'failed';

                      return (
                        <tr key={sub.name} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                            {sub.name}
                          </td>
                          {isInstructor && (
                            <td className="py-3.5 px-4">
                              <span className="flex items-center gap-1.5 text-slate-200">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {sub.member_name || sub.member || 'Student'}
                              </span>
                            </td>
                          )}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                              {sub.language || 'Python'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                isPassed
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : isFailed
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              }`}
                            >
                              {isPassed ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : isFailed ? (
                                <XCircle className="w-3 h-3 text-red-400" />
                              ) : (
                                <Clock className="w-3 h-3 text-indigo-400" />
                              )}
                              {sub.status || 'Submitted'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {sub.creation ? new Date(sub.creation).toLocaleDateString() : 'Recent'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Load into solution box */}
                              <button
                                onClick={async () => {
                                  if (sub.code) {
                                    setCode(sub.code);
                                    setActiveTab('problem');
                                  } else {
                                    try {
                                      const detail = await getProgrammingExerciseSubmission(sub.name);
                                      if (detail?.code) {
                                        setCode(detail.code);
                                        setActiveTab('problem');
                                      }
                                    } catch (e) {
                                      console.warn('Could not load code', e);
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition-colors"
                              >
                                Load Code
                              </button>

                              {/* View Code Modal */}
                              <button
                                onClick={async () => {
                                  setSelectedSubmission(sub);
                                  try {
                                    const detail = await getProgrammingExerciseSubmission(sub.name);
                                    if (detail) {
                                      setSelectedSubmission({ ...sub, ...detail });
                                    }
                                  } catch (e) {
                                    console.warn('Could not load detail', e);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-[11px] font-semibold border border-indigo-500/30 transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
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
      </div>

      {/* Submission Success Modal */}
      {submissionFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Solution Submitted!</h3>
              <p className="text-xs text-slate-400 mt-1">{submissionFeedback.message}</p>
              {submissionFeedback.submissionName && (
                <p className="text-[11px] font-mono text-indigo-300 mt-2 bg-slate-950 py-1.5 px-3 rounded-lg border border-slate-800 inline-block">
                  Record ID: {submissionFeedback.submissionName}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSubmissionFeedback(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
              >
                Keep Editing
              </button>
              <Link
                href="/programming-exercises"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all text-center"
              >
                All Challenges
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* View Code Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Submission Code</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {selectedSubmission.name}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Student: {selectedSubmission.member_name || selectedSubmission.member || 'Anonymous'} • Language: {selectedSubmission.language || 'Python'}
                </p>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                <span>Code Content</span>
                <button
                  onClick={() => handleCopyModalCode(selectedSubmission.code || '')}
                  className="flex items-center gap-1 text-[11px] hover:text-indigo-400 transition-colors"
                >
                  {copiedModalCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedModalCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 overflow-x-auto whitespace-pre font-mono leading-relaxed max-h-80">
                {selectedSubmission.code || '// No code recorded in this submission.'}
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Exercise Modal (Instructor only) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white text-center">
              Delete Programming Exercise?
            </h3>
            <p className="text-xs text-slate-400 text-center mt-2">
              Are you sure you want to delete <span className="font-semibold text-white">&quot;{exercise.title || exercise.name}&quot;</span>? This will permanently delete the problem statement, test cases, and student submissions.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteExercise}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-600/30 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Exercise'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
