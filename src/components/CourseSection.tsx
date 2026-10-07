"use client";

import React, { useEffect, useState } from 'react';
import CourseCard from './CourseCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCourses, Course, deleteCourse } from '../services/lms.services';
import { getImageUrl } from '../services/api.services';
import { Plus } from 'lucide-react';

export default function CourseSection() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);

  const fetchCourses = async () => {
    try {
      const response = await getCourses();
      const data = Array.isArray(response) ? response : (response as any)?.data || (response as any)?.message || [];
      setCourses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch courses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    const checkRoles = () => {
      try {
        const rolesStr = localStorage.getItem("roles");
        if (rolesStr) {
          const roles = JSON.parse(rolesStr);
          setIsInstructor(roles.includes("Instructor"));
        }
      } catch (e) {}
    };
    checkRoles();
  }, []);

  const handleEdit = (courseId: string) => {
    router.push(`/course/${courseId}/edit`);
  };

  const handleDelete = async (courseId: string) => {
    if (confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteCourse(courseId);
        alert('Course deleted successfully!');
        fetchCourses();
      } catch (err) {
        alert('Failed to delete course');
      }
    }
  };

  return (
    <section className="bg-slate-50 pt-12 pb-24 relative overflow-hidden">
      {/* Decorative element */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-100 blur-3xl opacity-50"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Most Popular Courses</h2>
            <p className="text-slate-500 text-lg font-light leading-relaxed">Explore our most popular programs, get job-ready for an in-demand career with top-tier education.</p>
          </div>
          {isInstructor && (
            <Link href="/course/create" className="hidden md:flex text-white bg-indigo-600 hover:bg-indigo-700 font-bold px-5 py-2.5 rounded-full transition-all items-center gap-2 shadow-sm">
              <Plus className="w-5 h-5" />
              Create Course
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10 bg-red-50 rounded-xl">
            <p>{error}</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-slate-100 rounded-xl">
            <p>No courses found at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {courses.map((course, index) => (
              <div key={course.name || index} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.15}s` }}>
                <Link href={`/course/${course.name}`} className="block h-full transition-transform hover:-translate-y-1 duration-300">
                  <CourseCard 
                    image={getImageUrl(course.image)}
                    providerLogo={getImageUrl(course.instructors?.[0]?.user_image)}
                    providerName={course.instructors?.[0]?.full_name}
                    title={course.title || course.name}
                    rating={course.rating}
                    enrollments={course.enrollments}
                    category={course.category || undefined}
                    lessons={course.lessons}
                    status={course.status || undefined}
                    cardGradient={course.card_gradient || undefined}
                    description={course.short_introduction || course.description || undefined}
                    price={course.paid_course ? `${course.currency || '$'} ${course.course_price || 0}` : 'Free'}
                    onEdit={isInstructor ? () => handleEdit(course.name) : undefined}
                    onDelete={isInstructor ? () => handleDelete(course.name) : undefined}
                  />
                </Link>
              </div>
            ))}
          </div>
        )}
        
        {isInstructor && (
          <div className="mt-12 md:hidden flex justify-center">
            <Link href="/course/create" className="text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-full px-8 py-3 w-full text-center transition-colors flex justify-center items-center gap-2">
              <Plus className="w-5 h-5" /> Create Course
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
