"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createProgrammingExercise, ProgrammingExerciseTestCase } from '@/services/lms.services';
import {
  ArrowLeft,
  Code2,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileCode,
  Terminal,
  Layers,
  Wand2,
  Copy
} from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  'Python',
  'JavaScript',
  'TypeScript',
  'C++',
  'Java',
  'C',
  'Go',
  'Rust',
];

const PREDEFINED_TEMPLATES = [
  {
    title: 'Python Addition',
    language: 'Python',
    problem_statement: '<p>Write a Python program to add two integers and print the result.</p>',
    test_cases: [
      { input: '2 3', output: '5' },
      { input: '10 20', output: '30' },
      { input: '7 8', output: '15' },
    ],
  },
  {
    title: 'Palindrome Checker',
    language: 'Python',
    problem_statement: '<p>Given a string, return <code>true</code> if it is a palindrome, otherwise return <code>false</code>. Ignore casing and spaces.</p>',
    test_cases: [
      { input: 'radar', output: 'true' },
      { input: 'hello', output: 'false' },
      { input: 'A man a plan a canal Panama', output: 'true' },
    ],
  },
  {
    title: 'Array Sum and Average',
    language: 'Python',
    problem_statement: '<p>Given a space-separated list of integers on standard input, calculate and print the sum and integer average separated by a space.</p>',
    test_cases: [
      { input: '10 20 30 40', output: '100 25' },
      { input: '5 15', output: '20 10' },
      { input: '1 2 3', output: '6 2' },
    ],
  },
];

function CreateProgrammingExerciseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || (typeof window !== 'undefined' ? sessionStorage.getItem('lms_return_url') : null);

  const [isInstructor, setIsInstructor] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');

  // Form Fields
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('Python');
  const [problemStatement, setProblemStatement] = useState('');
  const [testCases, setTestCases] = useState<ProgrammingExerciseTestCase[]>([
    { input: '', output: '' },
    { input: '', output: '' },
  ]);

  // Auth & Role Protection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem('apiKey');
      if (!apiKey) {
        router.push('/login');
        return;
      }

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
    }
  }, [router]);

  // Load a predefined template (like user's Python Addition)
  const applyTemplate = (template: (typeof PREDEFINED_TEMPLATES)[0]) => {
    setTitle(template.title);
    setLanguage(template.language);
    setProblemStatement(template.problem_statement);
    setTestCases(template.test_cases);
  };

  // Add test case
  const addTestCase = () => {
    setTestCases((prev) => [...prev, { input: '', output: '' }]);
  };

  // Update test case
  const updateTestCase = (index: number, field: 'input' | 'output', value: string) => {
    setTestCases((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Remove test case
  const removeTestCase = (index: number) => {
    if (testCases.length <= 1) {
      alert('An exercise must contain at least one test case.');
      return;
    }
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick insertion helpers for problem statement
  const insertFormatting = (tag: string) => {
    if (tag === 'code') {
      setProblemStatement((prev) => prev + '<code>your_code_here</code>');
    } else if (tag === 'p') {
      setProblemStatement((prev) => prev + '<p>Add explanation or context here.</p>');
    } else if (tag === 'example') {
      setProblemStatement(
        (prev) =>
          prev +
          '<div style="background:#f8fafc;padding:12px;border-radius:8px;margin-top:8px;"><strong>Example 1:</strong><br/>Input: <code>2 3</code><br/>Output: <code>5</code></div>'
      );
    } else if (tag === 'constraints') {
      setProblemStatement(
        (prev) =>
          prev +
          '<h4>Constraints:</h4><ul><li>1 &le; N &le; 10<sup>5</sup></li><li>Numbers are within 32-bit signed integer range.</li></ul>'
      );
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!title.trim()) {
      setError('Please provide an exercise title.');
      return;
    }
    if (!problemStatement.trim()) {
      setError('Please describe the problem statement.');
      return;
    }
    const validTestCases = testCases.filter((tc) => tc.output.trim() !== '');
    if (validTestCases.length === 0) {
      setError('Please add at least one test case with an expected output.');
      return;
    }

    setSaving(true);
    try {
      // Ensure problem statement is wrapped in HTML paragraph if raw text
      let formattedStatement = problemStatement.trim();
      if (!formattedStatement.startsWith('<')) {
        formattedStatement = `<p>${formattedStatement}</p>`;
      }

      const payload = {
        title: title.trim(),
        problem_statement: formattedStatement,
        language: language.trim(),
        test_cases: validTestCases.map((tc) => ({
          input: tc.input.trim(),
          output: tc.output.trim(),
          expected_output: tc.output.trim(),
        })),
      };

      await createProgrammingExercise(payload);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('lms_return_url');
      }
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        router.push('/programming-exercises');
      }
    } catch (err: any) {
      console.error('Failed to create programming exercise:', err);
      setError(err?.message || 'Failed to create programming exercise. Please check all fields.');
    } finally {
      setSaving(false);
    }
  };

  if (isInstructor === false) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        <div className="max-w-xl mx-auto my-20 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Instructor Access Required</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Authoring and configuring programming exercises is reserved for instructors and course creators.
          </p>
          <Link
            href="/programming-exercises"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Challenges
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-slate-900 text-white pt-6 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <Link
            href={returnUrl || "/programming-exercises"}
            className="inline-flex items-center text-xs font-semibold text-indigo-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {returnUrl ? "Back to Lesson Editor" : "Back to Exercises"}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
                <Code2 className="w-3.5 h-3.5" />
                Instructor Authoring Studio
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Create Programming Exercise
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Define exercise instructions, choose programming language, and specify automated test cases for student validation.
              </p>
            </div>

            {/* Quick Templates Dropdown */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-400">Load sample:</span>
              <button
                type="button"
                onClick={() => applyTemplate(PREDEFINED_TEMPLATES[0])}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                Python Addition
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-700 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Exercise Details</h2>
                <p className="text-xs text-slate-500">Provide title and target runtime language.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Exercise Title */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Exercise Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Python Addition, Reverse a String, Two Sum"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                />
              </div>

              {/* Language Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Language <span className="text-red-500">*</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Problem Statement */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Problem Statement & Instructions</h2>
                  <p className="text-xs text-slate-500">
                    Write instructions in HTML/text format for students.
                  </p>
                </div>
              </div>

              {/* Editor / Preview Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPreviewTab('editor')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    previewTab === 'editor'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  HTML / Markdown Editor
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('preview')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                    previewTab === 'preview'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  Live Preview
                </button>
              </div>
            </div>

            {/* Quick Insertion Toolbar */}
            {previewTab === 'editor' && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 px-1">Quick Tags:</span>
                <button
                  type="button"
                  onClick={() => insertFormatting('p')}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                >
                  &lt;p&gt; Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('code')}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                >
                  &lt;code&gt; Inline Code
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('example')}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                >
                  + Example Box
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('constraints')}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                >
                  + Constraints
                </button>
              </div>
            )}

            {previewTab === 'editor' ? (
              <div className="space-y-1.5">
                <textarea
                  rows={6}
                  placeholder="<p>Write a Python program to add two integers and print the result.</p>"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  required
                  className="w-full p-4 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400">
                  Tip: Standard HTML tags such as &lt;p&gt;, &lt;code&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt; are supported.
                </p>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl min-h-[160px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Student Problem View:
                </h4>
                {problemStatement ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: problemStatement }}
                  />
                ) : (
                  <p className="text-xs text-slate-400 italic">No statement entered yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Test Cases Builder */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Automated Test Cases</h2>
                  <p className="text-xs text-slate-500">
                    Input passed via stdin and the expected output on stdout.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addTestCase}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Test Case
              </button>
            </div>

            <div className="space-y-3">
              {testCases.map((tc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                      Test Case #{idx + 1}
                    </span>
                    {testCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors"
                        title="Remove test case"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Input (stdin)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2 3"
                        value={tc.input}
                        onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                      />
                    </div>

                    {/* Output */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Expected Output (stdout) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 5"
                        value={tc.output}
                        onChange={(e) => updateTestCase(idx, 'output', e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex items-center justify-between">
            <Link
              href={returnUrl || "/programming-exercises"}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Creating Exercise...' : 'Save & Publish Exercise'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function CreateProgrammingExercisePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
      <CreateProgrammingExerciseForm />
    </Suspense>
  );
}
