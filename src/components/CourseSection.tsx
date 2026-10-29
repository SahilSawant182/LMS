"use client";

import React, { useEffect, useState, useMemo } from 'react';
import CourseCard from './CourseCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCourses, Course } from '../services/lms.services';
import { getCoursesWithEnrollment } from '../services/payment.services';
import { getImageUrl } from '../services/api.services';
import { Plus } from 'lucide-react';
import Pagination from './ui/Pagination';

export default function CourseSection() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const COURSES_PER_PAGE = 8;
  const visibleCourses = useMemo(() => {
    return courses.filter((c) => {
      if (!isInstructor && (c.published === 0 || c.published === false)) {
        return false;
      }
      return true;
    });
  }, [courses, isInstructor]);

  const totalPages = Math.max(1, Math.ceil(visibleCourses.length / COURSES_PER_PAGE));
  const paginatedCourses = visibleCourses.slice(
    (currentPage - 1) * COURSES_PER_PAGE,
    currentPage * COURSES_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const fetchCourses = async () => {
    try {
      const [enrollRes, catalogRes] = await Promise.allSettled([
        getCoursesWithEnrollment(),
        getCourses(),
      ]);

      const enrollList = enrollRes.status === "fulfilled" && Array.isArray(enrollRes.value) ? enrollRes.value : [];
      const catalogList = catalogRes.status === "fulfilled"
        ? (Array.isArray(catalogRes.value) ? catalogRes.value : (catalogRes.value as any)?.data || (catalogRes.value as any)?.message || [])
        : [];

      const courseMap = new Map<string, any>();
      // 1. Index all catalog courses
      catalogList.forEach((c: any) => {
        const id = c.name || c.course || c.course_name;
        if (id) {
          const isEnrolled = Boolean(c.is_enrolled || c.membership);
          courseMap.set(id, { ...c, is_enrolled: isEnrolled });
        }
      });

      // 2. Augment with enrollment data
      enrollList.forEach((e: any) => {
        const id = e.name || e.course || e.course_name;
        if (id) {
          const existing = courseMap.get(id);
          const isEnrolled = Boolean(e.is_enrolled || existing?.is_enrolled || e.membership);
          if (existing) {
            courseMap.set(id, {
              ...existing,
              ...e,
              title: existing.title || e.title,
              published: existing.published !== undefined ? existing.published : e.published,
              is_enrolled: isEnrolled,
            });
          } else {
            courseMap.set(id, { ...e, is_enrolled: isEnrolled });
          }
        }
      });

      const mergedList = Array.from(courseMap.values());
      const data = mergedList.length > 0 ? mergedList : (enrollList.length > 0 ? enrollList : catalogList);
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
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {paginatedCourses.map((course, index) => (
                <div key={course.name || index} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.15}s` }}>
                  <Link href={`/course/${course.name}`} className="block h-full transition-transform hover:-translate-y-1 duration-300">
                    <CourseCard 
                      image={getImageUrl(course.image)}
                      video_link={course.video_link}
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
                      isEnrolled={Boolean(course.is_enrolled)}
                      price={
                        course.is_enrolled
                          ? 'Enrolled'
                          : course.paid_course || course.is_paid
                          ? `${course.currency === 'INR' ? '₹' : (course.currency || '₹')} ${Number(course.course_price || 0).toLocaleString('en-IN')}`
                          : 'Free'
                      }
                      onEdit={isInstructor ? () => handleEdit(course.name) : undefined}
                    />
                  </Link>
                </div>
              ))}
            </div>

            {/* Courses Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={visibleCourses.length}
              pageSize={COURSES_PER_PAGE}
              itemName="courses"
              hideOnSinglePage={true}
            />
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
