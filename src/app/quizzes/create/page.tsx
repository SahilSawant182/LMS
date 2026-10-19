"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createQuiz } from '@/services/lms.services';
import { isAuthorizedInstructor } from '@/services/auth.services';
import { ArrowLeft, HelpCircle, Save, CheckCircle, ShieldAlert, Plus } from 'lucide-react';

function CreateQuizForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || (typeof window !== 'undefined' ? sessionStorage.getItem('lms_return_url') : null);

  const [isInstructor, setIsInstructor] = useState<boolean | null>(null);
  const [title, setTitle] = useState('');
  const [passingPercentage, setPassingPercentage] = useState<number>(60);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [duration, setDuration] = useState<number>(0);
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem('apiKey');
      if (!apiKey) {
        router.push('/login');
        return;
      }
      setIsInstructor(isAuthorizedInstructor());
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a quiz title.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      const payload = {
        title: title.trim(),
        passing_percentage: Number(passingPercentage),
        max_attempts: Number(maxAttempts),
        duration: duration ? Number(duration) : undefined,
        description: description.trim() || undefined,
      };

      await createQuiz(payload);
      setSubmitSuccess(true);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('lms_return_url');
      }

      setTimeout(() => {
        if (returnUrl) {
          router.push(returnUrl);
        } else {
          router.push('/quizzes');
        }
      }, 1200);
    } catch (err: any) {
      console.error('Failed to create quiz:', err);
      setError(err?.response?.data?.message?.message || err?.message || 'Failed to create quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (isInstructor === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Navbar />
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5 border border-amber-100 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Access Restricted</h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              Creating LMS quizzes is restricted to authorized instructors and administrators.
            </p>
            <Link
              href={returnUrl || "/quizzes"}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all"
            >
              {returnUrl ? "Back to Lesson Editor" : "Back to Assessments"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Header */}
      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <Link
            href={returnUrl || "/quizzes"}
            className="inline-flex items-center text-indigo-300 hover:text-white mb-6 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {returnUrl ? "Back to Lesson Editor" : "Back to Quizzes"}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
                <HelpCircle className="w-3.5 h-3.5" />
                Instructor Quiz Studio
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 leading-tight">
                Create Quiz
              </h1>
              <p className="text-indigo-200 text-sm">
                Define a new quiz assessment with grading rules and attempt limits.
              </p>
            </div>

            <Link
              href={`/quizzes/create-question${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Question First
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-6 relative z-10">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
            {error}
          </div>
        )}

        {submitSuccess && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <span>Quiz created successfully! Redirecting back...</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Quiz Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Kubernetes Basics"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Max Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  placeholder="0 for unlimited"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Instructions / Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide guidelines for learners taking this quiz..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm resize-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={returnUrl || "/quizzes"}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Creating Quiz...' : 'Create Quiz'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function CreateQuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
      <CreateQuizForm />
    </Suspense>
  );
}
