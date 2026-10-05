"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Award, Calendar, User, Clock, CheckCircle2, Download, Share2, ArrowLeft } from 'lucide-react';
import { getCertificate } from '@/services/lms.services';
import { formatDate } from '@/utils/formatters';
import Link from 'next/link';

interface CertificateDetail {
  name: string;
  member_name: string;
  evaluator_name: string;
  issue_date: string;
  expiry_date: string;
  course_title: string;
  batch_title: string;
  template: string;
}

export default function CertificateDetailsPage({ params }: { params: Promise<{ name: string }> | { name: string } }) {
  // In Next.js 15+, params is a Promise. We need to unwrap it using React.use().
  // We use a fallback to support both Promise and direct object for backward compatibility.
  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const name = resolvedParams.name;
  
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      setLoading(true);
      try {
        const rawResponse = await getCertificate(name);
        const data = rawResponse?.message?.data || rawResponse?.data?.message || rawResponse?.data || rawResponse?.message;
        if (data) {
          setCertificate(data);
        } else {
          setError('Certificate not found.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch certificate');
      } finally {
        setLoading(false);
      }
    };

    if (name) {
      fetchCertificate();
    }
  }, [name]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        <div className="mb-6">
          <Link href="/certificates" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Certificates
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error || !certificate ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
             <Award className="w-12 h-12 text-slate-300 mb-4" />
             <h3 className="text-xl font-bold text-slate-900 mb-2">Certificate Not Found</h3>
             <p className="text-slate-500 max-w-sm mx-auto">{error || "The certificate you're looking for doesn't exist or you don't have permission to view it."}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col md:flex-row">
            
            {/* Visual Certificate Representation */}
            <div className="w-full md:w-2/3 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 md:p-12 relative flex flex-col items-center justify-center text-center min-h-[500px]">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                <div className="absolute top-10 left-10 w-64 h-64 border border-white/20 rounded-full"></div>
                <div className="absolute -bottom-20 -right-20 w-96 h-96 border border-white/10 rounded-full"></div>
              </div>

              <div className="absolute top-6 right-6 flex gap-3">
                 <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                   <span className="text-sm font-semibold text-white tracking-wide uppercase">Verified</span>
                 </div>
              </div>

              <div className="relative z-10 bg-white p-8 md:p-12 rounded-lg w-full max-w-lg shadow-2xl flex flex-col items-center border-[8px] border-double border-slate-100">
                <div className="mb-6 text-amber-500">
                  <Award className="w-16 h-16 mx-auto" />
                </div>
                <h4 className="text-sm font-bold text-slate-400 tracking-[0.2em] uppercase mb-2">Certificate of Completion</h4>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 mb-6 text-center leading-tight">
                  {certificate.course_title}
                </h2>
                
                <p className="text-slate-500 mb-2 italic">This is to certify that</p>
                <h3 className="text-2xl font-bold text-indigo-700 mb-6">{certificate.member_name}</h3>
                
                <p className="text-slate-500 mb-8 max-w-sm text-center text-sm">
                  Has successfully completed the requirements for <span className="font-semibold text-slate-700">{certificate.batch_title}</span>.
                </p>

                <div className="flex w-full justify-between items-end mt-auto pt-6 border-t border-slate-100">
                  <div className="text-left">
                    <p className="text-xs text-slate-400 font-medium mb-1">Issue Date</p>
                    <p className="text-sm font-bold text-slate-800">{formatDate(certificate.issue_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium mb-1">Evaluator</p>
                    <p className="text-sm font-bold text-slate-800 signature-font">{certificate.evaluator_name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificate Details Sidebar */}
            <div className="w-full md:w-1/3 bg-white p-8 flex flex-col border-l border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Credential Details</h3>
              
              <div className="space-y-6 flex-grow">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Recipient</p>
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <User className="w-4 h-4 text-indigo-500" />
                    {certificate.member_name}
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Course & Batch</p>
                  <p className="text-slate-800 font-medium">{certificate.course_title}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{certificate.batch_title}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Evaluator</p>
                  <p className="text-slate-800 font-medium">{certificate.evaluator_name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Issue Date
                    </p>
                    <p className="text-slate-800 font-medium text-sm">{formatDate(certificate.issue_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Expiry Date
                    </p>
                    <p className="text-slate-800 font-medium text-sm">
                      {certificate.expiry_date ? formatDate(certificate.expiry_date) : 'No Expiry'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Certificate ID</p>
                  <p className="text-slate-600 font-mono text-sm">{certificate.name}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 space-y-3">
                <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-200">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" /> Share Credential
                </button>
              </div>
            </div>

          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8 text-center mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">© 2026 Stridenex Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
