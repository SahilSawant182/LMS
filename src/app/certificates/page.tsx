"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Award, Calendar, User, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { getCertificates } from '@/services/lms.services';
import { formatDate } from '@/utils/formatters';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Certificate {
  name: string;
  member_name: string;
  evaluator_name: string;
  issue_date: string;
  expiry_date: string;
  course_title: string;
  batch_title: string;
}

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      setLoading(true);
      try {
        const rawResponse = await getCertificates();
        const certArray = Array.isArray(rawResponse)
          ? rawResponse
          : (rawResponse?.message?.data || rawResponse?.data?.message || rawResponse?.data || rawResponse?.message || []);
        
        const data = Array.isArray(certArray) ? certArray : [];
        setCertificates(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch certificates');
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-slate-900 text-white pt-16 pb-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-yellow-500/10 blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-amber-500/20 rounded-full mb-6 ring-4 ring-amber-500/10">
            <Award className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">Certificates</span>
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-lg mb-8">
            View and manage the certificates you've earned from completing courses and batches.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-12 relative z-20">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8 mb-8 min-h-[400px]">
          
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> 
              Issued Certificates
            </h2>
            <div className="flex items-center gap-4">
              <Link
                href="/certificate-evaluations"
                className="text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors border border-indigo-100"
              >
                Manage Evaluations
              </Link>
              <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {certificates.length} Total
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-red-50 text-red-600 rounded-lg border border-red-100">
              <p>{error}</p>
            </div>
          ) : certificates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <Link 
                  href={`/certificates/${cert.name}`}
                  key={cert.name} 
                  className="block group"
                >
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-amber-300 transition-all flex flex-col h-full">
                    {/* Card Header (Design) */}
                    <div className="h-24 bg-gradient-to-br from-slate-800 to-slate-900 relative">
                      <div className="absolute -bottom-6 left-6 p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                        <div className="bg-amber-100 p-2 rounded-lg">
                          <Award className="w-8 h-8 text-amber-600" />
                        </div>
                      </div>
                      <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-white">Verified</span>
                      </div>
                    </div>
                    
                    {/* Card Body */}
                    <div className="p-6 pt-10 flex-grow flex flex-col">
                      <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                        {cert.course_title}
                      </h3>
                      <p className="text-sm text-indigo-600 font-medium mb-5">{cert.batch_title}</p>
                      
                      <div className="space-y-3 mt-auto">
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Issued To</p>
                            <p className="text-sm font-semibold text-slate-800">{cert.member_name}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Issue Date</p>
                            <p className="text-sm font-medium text-slate-800">{formatDate(cert.issue_date)}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Expiry Date</p>
                            <p className="text-sm font-medium text-slate-800">
                              {cert.expiry_date ? formatDate(cert.expiry_date) : 'No Expiry'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="text-slate-500">ID: <span className="font-mono text-slate-700">{cert.name}</span></span>
                      <span className="text-slate-500 group-hover:text-indigo-600 font-medium transition-colors">View Details &rarr;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Award className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No certificates found</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Complete courses and batches to earn your certificates. They will appear here once issued.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8 text-center mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">© 2026 Stridenex Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
