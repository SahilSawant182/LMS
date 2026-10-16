"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import CourseForm from '@/components/admin/CourseForm';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getCourseDetails, normalizeCourseColor } from '@/services/lms.services';

export default function EditCoursePage() {
  const params = useParams();
  const rawCourseName = params.courseId as string;
  const courseName = decodeURIComponent(rawCourseName || '');
  
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await getCourseDetails({ course: courseName });
        // Depending on API structure, it could be response, response.data, or response.message
        const data = (response as any)?.data || (response as any)?.message || response;
        if (data) {
          setInitialData({
            name: data.name || courseName,
            course: data.name || courseName,
            course_name: data.name || courseName,
            title: data.title || '',
            short_introduction: data.short_introduction || '',
            description: data.description || '',
            published: data.published ?? 0,
            video_link: data.video_link || '',
            tags: data.tags || '',
            category: data.category || 'Business',
            image: data.image || '',
            card_gradient: normalizeCourseColor(data.card_gradient || data.color || 'Blue'),
            upcoming: data.upcoming ?? 0,
            featured: data.featured ?? 1,
            disable_self_learning: data.disable_self_learning ?? 0,
            enforce_lesson_completion: data.enforce_lesson_completion ?? 0,
            paid_course: data.paid_course ?? (Number(data.course_price || 0) > 0 ? 1 : 0),
            paid_certificate: data.paid_certificate ?? 0,
            enable_certification: data.enable_certification ?? 1,
            course_price: data.course_price !== undefined ? data.course_price : 0,
            currency: data.currency || 'INR',
            amount_usd: data.amount_usd !== undefined ? data.amount_usd : 0,
          });
        } else {
          setError('Course not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load course details');
      } finally {
        setLoading(false);
      }
    };

    if (courseName) {
      fetchCourse();
    }
  }, [courseName]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Navbar />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full mt-16">
        <div className="mb-6 flex items-center">
          <Link href={`/course/${encodeURIComponent(courseName)}`} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors font-medium">
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Course
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 font-semibold text-xl">
            {error}
          </div>
        ) : (
          <CourseForm key={initialData?.name || courseName} initialData={initialData} isEditing={true} />
        )}
      </main>
      
      <footer className="bg-slate-900 text-slate-300 py-12 text-center mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium">© 2026 Stridenex Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
