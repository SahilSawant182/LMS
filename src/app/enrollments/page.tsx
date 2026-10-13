"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { getEnrollments, getCourseProgressFiltered } from '@/services/lms.services';
import { BookOpen, User, Users, Calendar, BookOpenCheck, ArrowRight, TrendingUp, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailedProgress, setDetailedProgress] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  const handleToggleDetails = async (enrollment: any) => {
    const id = enrollment.name;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(id);
    setProgressLoading(true);
    setDetailedProgress([]);
    
    try {
      const res = await getCourseProgressFiltered({ 
        member: enrollment.member, 
        course: enrollment.course 
      });
      const data = res?.data?.records || res?.records || res?.message?.data?.records || res?.message?.records || res?.message?.data || res?.data || [];
      setDetailedProgress(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch detailed progress', err);
    } finally {
      setProgressLoading(false);
    }
  };

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const res = await getEnrollments();
        const data = Array.isArray(res) ? res : (res?.data || res?.message?.data || []);
        if (data) {
          setEnrollments(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch enrollments');
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollments();
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 text-white pt-8 pb-14">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-60 h-60 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="inline-block px-2.5 py-0.5 mb-2 text-[11px] font-semibold tracking-wide text-indigo-300 uppercase bg-indigo-900/50 border border-indigo-700/50 rounded-md backdrop-blur-sm">
            Administration
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-1.5 tracking-tight text-white">
            Course Enrollments
          </h1>
          <p className="text-xs md:text-sm text-indigo-100/80 max-w-2xl mx-auto font-light">
            Monitor and manage active student enrollments across all courses.
          </p>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20">
        {loading ? (
          <div className="flex justify-center items-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold mb-2">Error Loading Enrollments</h2>
            <p className="text-sm">{error}</p>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-400 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No enrollments found</h3>
            <p className="text-slate-500">There are currently no active enrollments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((enrollment, index) => (
              <div 
                key={enrollment.name || index} 
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow hover:border-indigo-200 overflow-hidden flex flex-col group"
              >
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {enrollment.member_name ? enrollment.member_name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{enrollment.member_name || enrollment.member}</h3>
                        <p className="text-xs text-slate-500">@{enrollment.member_username || 'student'}</p>
                      </div>
                    </div>
                    {enrollment.member_type && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 whitespace-nowrap">
                        {enrollment.member_type}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-start gap-2.5">
                      <BookOpen className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Course</p>
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1">{enrollment.course}</p>
                      </div>
                    </div>
                    {enrollment.enrollment_from_batch && (
                      <div className="flex items-start gap-2.5">
                        <BookOpenCheck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Batch</p>
                          <p className="text-sm font-semibold text-slate-800 line-clamp-1">{enrollment.enrollment_from_batch}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                        Course Progress
                      </span>
                      <span className="text-indigo-600">{Math.round(enrollment.progress || 0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-in-out" 
                        style={{ width: `${Math.round(enrollment.progress || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    Enrolled {formatDate(enrollment.creation.split(' ')[0])}
                  </div>
                  <button 
                    onClick={() => handleToggleDetails(enrollment)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                  >
                    {expandedId === enrollment.name ? (
                      <>Hide Details <ChevronUp className="w-3.5 h-3.5" /></>
                    ) : (
                      <>View Details <ChevronDown className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </div>
                
                {/* Expanded Progress Section */}
                {expandedId === enrollment.name && (
                  <div className="bg-white px-6 py-4 border-t border-slate-100 max-h-64 overflow-y-auto">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Completed Lessons</h4>
                    {progressLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : detailedProgress.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500 italic bg-slate-50 rounded-lg">
                        No lessons completed yet.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {detailedProgress.map((prog, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100/50">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 line-clamp-1">{prog.lesson}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                                  {prog.status}
                                </span>
                                {prog.modified && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(prog.modified.split(' ')[0])}
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
