"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Medal,
  Sparkles,
  Upload,
  Check,
  AlertCircle,
  ArrowLeft,
  ShieldAlert,
  Info,
  Layers,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  Flame,
  Star,
  Award
} from 'lucide-react';
import { createBadge, CreateBadgePayload } from '@/services/lms.services';
import { uploadFile, getImageUrl } from '@/services/api.services';

export default function CreateBadgePage() {
  const router = useRouter();
  const [isInstructor, setIsInstructor] = useState<boolean | null>(null);

  // Form State initialized completely blank with no static/default data
  const [title, setTitle] = useState('');
  const [enabled, setEnabled] = useState(1);
  const [description, setDescription] = useState('');
  const [referenceDoctype, setReferenceDoctype] = useState('');
  const [customDoctype, setCustomDoctype] = useState('');
  const [event, setEvent] = useState('');
  const [image, setImage] = useState('');
  const [grantOnlyOnce, setGrantOnlyOnce] = useState(0);
  const [userField, setUserField] = useState('');
  const [fieldToCheck, setFieldToCheck] = useState('');
  const [condition, setCondition] = useState('');

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBadgeName, setSuccessBadgeName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem('apiKey');
      const roles = localStorage.getItem('roles') || '';
      if (!apiKey) {
        setIsInstructor(false);
      } else {
        setIsInstructor(roles.includes('Instructor'));
      }
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const res = await uploadFile(file);
      const fileUrl = res?.file_url || res?.message?.file_url || res?.data?.file_url;
      if (fileUrl) {
        setImage(fileUrl);
      } else {
        // If file url not returned directly, fallback to object url for visual display
        setImage(URL.createObjectURL(file));
      }
    } catch (err: any) {
      console.error('File upload failed:', err);
      // Fallback for visual preview
      setImage(URL.createObjectURL(file));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for the badge.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const actualDoctype =
      referenceDoctype === 'Custom' ? customDoctype.trim() : referenceDoctype;

    // Exact payload structure matching API requirements
    const payload: CreateBadgePayload = {
      title: title.trim(),
      enabled: Number(enabled),
      description: description.trim(),
      reference_doctype: actualDoctype.trim(),
      event: event.trim(),
      image: image.trim(),
      grant_only_once: Number(grantOnlyOnce),
      user_field: userField.trim() || 'user',
      field_to_check: fieldToCheck.trim() ? fieldToCheck.trim() : null,
      condition: condition.trim() ? condition : '{\n  "published": 1\n}',
    };

    try {
      const res = await createBadge(payload);
      const badgeId =
        res?.name ||
        res?.message?.name ||
        res?.data?.name ||
        res?.message ||
        title;
      setSuccessBadgeName(typeof badgeId === 'string' ? badgeId : title);
    } catch (err: any) {
      console.error('Create badge failed:', err);
      setError(
        err.message ||
          'Failed to create badge. Please ensure you are logged in as an Instructor with valid permissions.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading authorization check
  if (isInstructor === null) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  // Unauthorized Gate for Non-Instructors
  if (!isInstructor) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-6 shadow-sm">
            <Lock className="w-10 h-10" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 mb-3">
            Instructor Access Only
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Permission Required
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-md">
            Only authorized Instructors and Administrators have permission to create and configure
            achievement badges for the platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/badges"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              Browse Available Badges
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              Sign In as Instructor
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Header Bar */}
      <div className="bg-slate-900 text-white py-8 border-b border-slate-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/badges"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Badges Catalog
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Create Achievement Badge
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Configure conditions, metadata, and visual presentation for learner recognition.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Instructor Mode
            </span>
          </div>
        </div>
      </div>

      {/* Main Form & Preview Area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Success Alert Modal */}
        {successBadgeName && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-100 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-300 mx-auto flex items-center justify-center text-white mb-5 shadow-lg shadow-amber-400/30">
                <Medal className="w-10 h-10 drop-shadow-sm" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Badge Created!</h2>
              <p className="text-xs text-slate-500 mb-6">
                Your badge <strong className="text-slate-800 font-bold">{title}</strong> has been successfully published to the platform and can now be granted.
              </p>
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/badges"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  View in Badges Catalog
                </Link>
                <button
                  onClick={() => {
                    setSuccessBadgeName(null);
                    setTitle('');
                    setDescription('');
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Create Another Badge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Error Creating Badge</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Badge Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Badge Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Contributor, Python Champion, Top Finisher"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm font-medium transition-all"
                />
              </div>

              {/* Status and Grant Rules Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                {/* Enabled Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">Status Enabled</label>
                    <span className="text-[11px] text-slate-400">Badge is active & grantable</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnabled(enabled ? 0 : 1)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Grant Only Once Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">Grant Only Once</label>
                    <span className="text-[11px] text-slate-400">Limit to one per learner</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGrantOnlyOnce(grantOnlyOnce ? 0 : 1)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      grantOnlyOnce ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        grantOnlyOnce ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Badge Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the achievements, qualifications, or milestones required to unlock this badge..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm font-medium transition-all"
                />
              </div>

              {/* Reference DocType & Event Trigger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category / DocType
                  </label>
                  <select
                    value={referenceDoctype}
                    onChange={(e) => setReferenceDoctype(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-xs font-semibold bg-white"
                  >
                    <option value="">Select Category / DocType...</option>
                    <option value="Access Log">Access Log</option>
                    <option value="About Us Team Member">About Us Team Member</option>
                    <option value="LMS Course">LMS Course</option>
                    <option value="LMS Batch">LMS Batch</option>
                    <option value="LMS Certificate">LMS Certificate</option>
                    <option value="LMS Quiz">LMS Quiz</option>
                    <option value="User">User</option>
                    <option value="Custom">Custom DocType...</option>
                  </select>

                  {referenceDoctype === 'Custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom doctype..."
                      value={customDoctype}
                      onChange={(e) => setCustomDoctype(e.target.value)}
                      className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Awarding Event
                  </label>
                  <select
                    value={event}
                    onChange={(e) => setEvent(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-xs font-semibold bg-white"
                  >
                    <option value="">Select Event...</option>
                    <option value="Manual Assignment">Manual Assignment</option>
                    <option value="DocType Event">DocType Event</option>
                    <option value="Course Completion">Course Completion</option>
                    <option value="Quiz Passed">Quiz Passed</option>
                    <option value="Batch Graduation">Batch Graduation</option>
                  </select>
                </div>
              </div>

              {/* Badge Emblem / Image Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Badge Icon / Emblem Image
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="e.g. /private/files/badge.png or image URL"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-xs font-mono font-medium"
                    />
                  </div>

                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/badges"
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Badge...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Create & Publish Badge
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Real-time Preview Column (5 cols) */}
          <div className="lg:col-span-5 sticky top-28 space-y-6">
            <div className="bg-gradient-to-b from-white to-slate-50/80 rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Live Badge Preview
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    enabled
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {enabled ? 'Active' : 'Disabled'}
                </span>
              </div>

              {/* Animated Interactive Badge Card */}
              <div className="rounded-2xl border border-amber-300/80 bg-white overflow-hidden shadow-lg transition-transform hover:scale-[1.02] duration-300">
                {/* Header Backdrop */}
                <div className="h-32 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4 relative flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex justify-between items-center z-10">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-amber-300 border border-amber-300/30">
                      {event}
                    </span>
                    {grantOnlyOnce ? (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500 text-white">
                        1x Only
                      </span>
                    ) : null}
                  </div>

                  {/* Emblem */}
                  <div className="absolute -bottom-7 left-6 p-2 bg-white rounded-2xl shadow-md border border-slate-100">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-300 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                      {image ? (
                        <img
                          src={getImageUrl(image)}
                          alt="Badge preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Medal className="w-9 h-9 text-white drop-shadow-sm" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 pt-10">
                  <h3 className="text-lg font-extrabold text-slate-900 truncate">
                    {title || 'Untitled Achievement Badge'}
                  </h3>
                  <p className="text-xs text-indigo-600 font-semibold mb-2">
                    {referenceDoctype === 'Custom' ? customDoctype || 'Custom DocType' : referenceDoctype}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed min-h-[3rem] line-clamp-3">
                    {description || 'Provide a compelling description so learners understand why this badge is prestigious and how it was earned.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Recipients: <strong className="text-slate-700 font-mono">{userField}</strong></span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Informative Tip */}
              <div className="mt-6 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100/70 text-indigo-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  Instructor Guidelines
                </p>
                <p className="text-[11px] text-indigo-700/90 leading-relaxed">
                  Badges provide milestone recognition. When learners meet the specified conditions (e.g. course completion or batch graduation), this badge is automatically awarded to their profile and certificates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs">© 2026 Stridenex LMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
