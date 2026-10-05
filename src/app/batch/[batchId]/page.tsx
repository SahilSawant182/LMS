"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getBatchDetails, getBatchCourses } from '@/services/lms.services';
import { getImageUrl } from '@/services/api.services';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { BookOpen, Users, Calendar, ArrowLeft, Clock, Tag, User } from 'lucide-react';
import CourseCard from '@/components/CourseCard';
import { formatDate } from '@/utils/formatters';

export default function BatchDetailsPage() {
  const params = useParams();
  const batchId = params?.batchId as string;

  const [batchData, setBatchData] = useState<any>(null);
  const [batchCourses, setBatchCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;

    const fetchBatch = async () => {
      setLoading(true);
      try {
        const [detailsRes, coursesRes] = await Promise.allSettled([
          getBatchDetails({ batch: batchId }),
          getBatchCourses({ batch: batchId })
        ]);

        if (detailsRes.status === 'fulfilled') {
          const rawData = detailsRes.value;
          const extracted = rawData?.message?.data || rawData?.data?.message || rawData?.data || rawData?.message || rawData;
          setBatchData(extracted);
        } else {
          throw new Error('Failed to load batch details');
        }

        if (coursesRes.status === 'fulfilled') {
          setBatchCourses(Array.isArray(coursesRes.value) ? coursesRes.value : (coursesRes.value?.data || coursesRes.value?.message || []));
        }
      } catch (err: any) {
        setError(err.message || 'Could not load batch data.');
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
  }, [batchId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error || !batchData) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex flex-col justify-center items-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Batch Error</h2>
          <p className="text-slate-600">{error || 'Batch not found.'}</p>
          <Link href="/" className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 text-white pt-16 pb-24">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-6">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-200 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wide text-indigo-300 uppercase bg-indigo-900/50 border border-indigo-700/50 rounded-md backdrop-blur-sm">
              {batchData.category || 'Batch'}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              {batchData.title || batchData.name || batchId}
            </h1>
            <p className="text-base md:text-lg text-indigo-100/80 mb-6 max-w-2xl font-light">
              {batchData.description || 'Enroll in this batch to access a curated set of courses designed for your career.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
              {batchData.start_date && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>{formatDate(batchData.start_date)} {batchData.end_date ? `to ${formatDate(batchData.end_date)}` : ''}</span>
                </div>
              )}
              {batchData.start_time && batchData.end_time && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{batchData.start_time.slice(0, 5)} - {batchData.end_time.slice(0, 5)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>{batchCourses.length} Courses</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                <Users className="w-4 h-4 text-purple-400" />
                <span>{batchData.seat_count ? `${batchData.seat_count} Seats` : 'Unlimited Seats'}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                <Tag className="w-4 h-4 text-rose-400" />
                <span>{batchData.paid_batch ? `${batchData.currency || '$'} ${batchData.amount}` : 'Free'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-12 relative z-20">
        {(batchData.batch_details || batchData.description) && (
          <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              About this Batch
            </h2>
            <div 
              className="prose prose-indigo max-w-none text-sm text-slate-600 leading-relaxed" 
              dangerouslySetInnerHTML={{ __html: batchData.batch_details || batchData.description }} 
            />
          </section>
        )}

        <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Courses in this Batch
          </h2>

          
          {batchCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {batchCourses.map((course: any, index: number) => (
                <Link key={course.name || index} href={`/course/${course.course || course.name}`} className="block h-full transition-transform hover:-translate-y-1 duration-300">
                  <CourseCard 
                    image={getImageUrl(course.image)}
                    providerLogo={getImageUrl(course.instructors?.[0]?.user_image)}
                    providerName={course.instructors?.[0]?.full_name}
                    title={course.title || course.course || course.name}
                    rating={course.rating}
                    enrollments={course.enrollments}
                    category={course.category || undefined}
                    lessons={course.lessons}
                    status={course.status || undefined}
                    cardGradient={course.card_gradient || undefined}
                    description={course.short_introduction || course.description || undefined}
                    price={course.paid_course ? `${course.currency || '$'} ${course.course_price || 0}` : 'Free'}
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-slate-500 font-medium">No courses have been added to this batch yet.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
