"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { BookOpen, Trophy, Clock, CheckCircle } from 'lucide-react';
import { getCourseCompletionData } from '@/services/lms.services';
import { getImageUrl } from '@/services/api.services';

export default function DashboardPage() {
  const [completionData, setCompletionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompletionData = async () => {
      setLoading(true);
      try {
        const response = await getCourseCompletionData();
        const data = Array.isArray(response) ? response : (response?.data || response?.message || []);
        setCompletionData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch course completion data');
      } finally {
        setLoading(false);
      }
    };

    fetchCompletionData();
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <h1 className="text-3xl font-extrabold mb-2">My Dashboard</h1>
          <p className="text-indigo-200">Track your progress and continue learning.</p>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-8 relative z-20">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Enrolled Courses</p>
              <p className="text-2xl font-bold text-slate-900">{completionData.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Completed Courses</p>
              <p className="text-2xl font-bold text-slate-900">
                {completionData.filter(c => c.progress === 100).length || 0}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Certificates Earned</p>
              <p className="text-2xl font-bold text-slate-900">0</p>
            </div>
          </div>
        </div>

        {/* Enrolled Courses */}
        <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-6 text-slate-900">In Progress</h2>

          {error ? (
            <div className="text-center py-6 bg-red-50 text-red-600 rounded-lg">
              <p>{error}</p>
            </div>
          ) : completionData.length > 0 ? (
            <div className="space-y-6">
              {completionData.map((course: any, idx: number) => (
                <div key={course.course || idx} className="flex flex-col md:flex-row gap-6 p-4 border border-slate-100 rounded-lg hover:border-indigo-100 transition-colors">
                  <div className="w-full md:w-48 h-32 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                    {course.image ? (
                      <img src={getImageUrl(course.image)} alt="Course" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-indigo-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{course.course_title || course.course || 'Course Name'}</h3>
                    
                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                        <span>{course.progress || 0}% Complete</span>
                        <span>{course.completed_lessons || 0} / {course.total_lessons || 0} Lessons</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                          style={{ width: `${course.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-3">
                      <Link 
                        href={`/course/${course.course || ''}`} 
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Continue Learning
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">You are not enrolled in any courses yet.</p>
              <Link href="/courses" className="mt-4 inline-block text-indigo-600 hover:underline font-medium">Browse Courses</Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
