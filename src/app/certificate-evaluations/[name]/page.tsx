"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { getCertificateEvaluation } from '@/services/lms.services';
import { 
  User, BookOpen, Calendar, Clock, Star, 
  ArrowLeft, FileText, CheckCircle, XCircle 
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !evalData) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <XCircle className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Evaluation Not Found</h2>
          <p className="text-slate-500 mb-6">{error || 'Could not locate the requested evaluation record.'}</p>
          <Link
            href="/certificate-evaluations"
            onClick={(e) => {
              e.preventDefault();
              navigateBack(router, "/certificate-evaluations");
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Go Back to List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />
      
      <div className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-start gap-4">
          <Link
            href="/certificate-evaluations"
            onClick={(e) => {
              e.preventDefault();
              navigateBack(router, "/certificate-evaluations");
            }}
            className="flex items-center gap-2 text-indigo-300 hover:text-white transition-colors text-sm font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Evaluations
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Evaluation: {evalData?.member_name || evalData?.member || 'Student'}</h1>
            <p className="text-indigo-200">Detailed report for this certificate evaluation.</p>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Evaluation Report
            </h2>
            <span className={`px-4 py-1.5 text-sm font-bold rounded-full ${
              evalData.status === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 
              evalData.status === 'Fail' ? 'bg-red-100 text-red-700' : 
              'bg-amber-100 text-amber-700'
            }`}>
              {evalData.status || 'Pending'}
            </span>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* Grid of basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Member / Student</p>
                  <p className="text-base font-semibold text-slate-900">{evalData.member_name || evalData.member || 'Unknown'}</p>
                  {evalData.member_name && <p className="text-sm text-slate-500">{evalData.member}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Course & Batch</p>
                  <p className="text-base font-semibold text-slate-900">{evalData.course || 'No Course'}</p>
                  {evalData.batch_name && <p className="text-sm text-slate-500">{evalData.batch_name}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-base font-semibold text-slate-900">{evalData.date || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-base font-semibold text-slate-900">
                    {evalData.start_time || '--'} to {evalData.end_time || '--'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rating</p>
                  <div className="flex items-center gap-1 mt-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < (evalData.rating || 0) ? 'fill-current' : 'text-slate-200'}`} />
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Summary Block */}
            <div className="pt-8 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                Evaluation Summary
              </h3>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-700 leading-relaxed text-sm">
                {evalData.summary ? (
                  <p className="whitespace-pre-wrap">{evalData.summary}</p>
                ) : (
                  <p className="italic text-slate-400">No summary was provided for this evaluation.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
