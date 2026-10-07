"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createAssignment, getCourses } from '@/services/lms.services';
import { ArrowLeft, BookOpen, Save, CheckCircle } from 'lucide-react';

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  
  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Text');
  const [question, setQuestion] = useState('');
  const searchParams = useSearchParams();
  const [course, setCourse] = useState(searchParams.get('course') || '');
  const [gradeAssignment, setGradeAssignment] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answer, setAnswer] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("apiKey");
      if (!apiKey) {
        router.push("/login");
        return;
      }
    }
    fetchCourses();
  }, [router]);

  const fetchCourses = async () => {
    try {
      const res = await getCourses();
      const data = Array.isArray(res) ? res : (res as any)?.data?.message || (res as any)?.message || (res as any)?.data || [];
      if (Array.isArray(data)) {
        setCourses(data);
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      // Based on Postman screenshot: x-www-form-urlencoded or form-data
      const payload: Record<string, any> = {
        title,
        type,
        question,
        course,
        grade_assignment: gradeAssignment ? 1 : 0,
        show_answer: showAnswer ? 1 : 0,
        answer
      };

      await createAssignment(payload);
      
      setSubmitSuccess(true);
      
      // Navigate to course detail or dashboard after a short delay
      setTimeout(() => {
        if (course) {
          router.push(`/course/${course}`);
        } else {
          router.push('/dashboard');
        }
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Header */}
      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <Link href={course ? `/course/${course}` : '/dashboard'} className="inline-flex items-center text-indigo-300 hover:text-white mb-6 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 leading-tight">
            Create Assignment
          </h1>
          <p className="text-indigo-200">Design a new task for your students to complete.</p>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-6 relative z-10">
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
            {error}
          </div>
        )}
        
        {submitSuccess && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Assignment created successfully!</span>
          </div>
        )}

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python Assignment 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type
                </label>
                <select
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow bg-white"
                >
                  <option value="Text">Text</option>
                  <option value="Document">Document</option>
                  <option value="Code">Code</option>
                  <option value="Quiz">Quiz</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Course
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BookOpen className="w-5 h-5 text-slate-400" />
                </div>
                {courses.length > 0 ? (
                  <select
                    required
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow bg-white appearance-none"
                  >
                    <option value="" disabled>Select a course</option>
                    {courses.map((c: any) => (
                      <option key={c.name} value={c.name}>{c.title || c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. advanced-python-development"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Question / Instructions
              </label>
              <textarea
                required
                rows={4}
                placeholder="Write a program to calculate factorial of a number..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow resize-y"
              ></textarea>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center">
                <input
                  id="grade_assignment"
                  type="checkbox"
                  checked={gradeAssignment}
                  onChange={(e) => setGradeAssignment(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="grade_assignment" className="ml-2 block text-sm font-medium text-slate-700">
                  Grade Assignment
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="show_answer"
                  type="checkbox"
                  checked={showAnswer}
                  onChange={(e) => setShowAnswer(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="show_answer" className="ml-2 block text-sm font-medium text-slate-700">
                  Show Answer Immediately
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Correct Answer / Reference (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. 1"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow resize-y"
              ></textarea>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center py-2.5 px-6 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Create Assignment
                  </span>
                )}
              </button>
            </div>
            
          </form>
        </div>
      </main>
    </div>
  );
}
