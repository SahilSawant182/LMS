"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { getCertificateEvaluation } from '@/services/lms.services';
import {
  User, BookOpen, Calendar, Clock, Star,
  ArrowLeft, FileText, XCircle, Mail, Layers
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { navigateBack } from '@/utils/navigation';

export default function CertificateEvaluationDetailPage({ params }: { params: any }) {
  const router = useRouter();
  const [evalData, setEvalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const resolveParamsAndFetch = async () => {
      const p = await params;
      const resolvedName = decodeURIComponent(p?.name || '');
      if (resolvedName) {
        fetchDetails(resolvedName);
      } else {
        setError('Invalid Evaluation Name.');
        setLoading(false);
      }
    };
    resolveParamsAndFetch();
  }, [params]);

  const fetchDetails = async (name: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await getCertificateEvaluation(name);
      let fullData = null;
      if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
        fullData = res.data;
      } else if (res?.message?.data && typeof res.message.data === 'object' && !Array.isArray(res.message.data)) {
        fullData = res.message.data;
      } else if (res && typeof res === 'object' && res.name) {
        fullData = res;
      } else if (Array.isArray(res)) {
        fullData = res[0];
      } else if (res?.data && Array.isArray(res.data)) {
        fullData = res.data[0];
      } else if (res?.message && Array.isArray(res.message)) {
        fullData = res.message[0];
      }
      if (fullData) {
        setEvalData(fullData);
      } else {
        setError('Certificate evaluation not found.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch certificate evaluation details.');
    } finally {
      setLoading(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Error
  if (error || !evalData) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Evaluation Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">{error || 'Could not locate the requested evaluation record.'}</p>
          <Link
            href="/certificate-evaluations"
            onClick={(e) => { e.preventDefault(); navigateBack(router, '/certificate-evaluations'); }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Evaluations
          </Link>
        </div>
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    if (status === 'Pass') return { badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' };
    if (status === 'Fail') return { badge: 'bg-red-100 text-red-700 border border-red-200', dot: 'bg-red-500' };
    return { badge: 'bg-amber-100 text-amber-700 border border-amber-200', dot: 'bg-amber-500' };
  };
  const statusStyle = getStatusStyle(evalData.status);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-slate-900 text-white pt-6 pb-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute top-10 -left-20 w-60 h-60 rounded-full bg-violet-500/15 blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <Link
            href="/certificate-evaluations"
            onClick={(e) => { e.preventDefault(); navigateBack(router, '/certificate-evaluations'); }}
            className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-white transition-colors text-sm font-semibold mb-5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Evaluations
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-lg">
                {(evalData.member_name || evalData.member || 'S').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {evalData.member_name || evalData.member || 'Student'}
                </h1>
                {evalData.member_name && (
                  <p className="text-indigo-300 text-sm mt-0.5">{evalData.member}</p>
                )}
              </div>
            </div>
            {/* Status badge */}
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border self-start sm:self-auto ${statusStyle.badge}`}>
              <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
              {evalData.status || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-8 relative z-20 space-y-5">

        {/* Info Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Course */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Course</p>
              <p className="text-sm font-bold text-slate-900 truncate">{evalData.course || '—'}</p>
              {evalData.batch_name && <p className="text-[11px] text-slate-500 truncate">{evalData.batch_name}</p>}
            </div>
          </div>

          {/* Date */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date</p>
              <p className="text-sm font-bold text-slate-900">{evalData.date || '—'}</p>
            </div>
          </div>

          {/* Time */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Duration</p>
              <p className="text-sm font-bold text-slate-900 whitespace-nowrap">
                {evalData.start_time || '--'} – {evalData.end_time || '--'}
              </p>
            </div>
          </div>

          {/* Rating */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rating</p>
              <div className="flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < (evalData.rating || 0) ? 'fill-current' : 'text-slate-200'}`} />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{evalData.rating || 0} / 5</p>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <User className="w-4.5 h-4.5 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">Evaluation Details</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Member */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Member / Student</p>
                <p className="text-sm font-semibold text-slate-900">{evalData.member_name || evalData.member || 'Unknown'}</p>
                {evalData.member_name && <p className="text-xs text-slate-500 mt-0.5">{evalData.member}</p>}
              </div>
            </div>

            {/* Evaluator */}
            {evalData.evaluator && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Evaluator</p>
                  <p className="text-sm font-semibold text-slate-900">{evalData.evaluator}</p>
                </div>
              </div>
            )}

            {/* Course & Batch */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Course</p>
                <p className="text-sm font-semibold text-slate-900">{evalData.course || '—'}</p>
                {evalData.batch_name && <p className="text-xs text-slate-500 mt-0.5">Batch: {evalData.batch_name}</p>}
              </div>
            </div>

            {/* Record ID */}
            {evalData.name && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Record ID</p>
                  <p className="text-sm font-semibold text-slate-900 font-mono">{evalData.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">Evaluation Summary</h2>
          </div>
          <div className="p-6">
            {evalData.summary ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{evalData.summary}</p>
            ) : (
              <p className="text-sm italic text-slate-400">No summary was provided for this evaluation.</p>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
