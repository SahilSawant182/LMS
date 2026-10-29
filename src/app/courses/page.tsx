"use client";

import React, { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import CourseCard from "@/components/CourseCard";
import Pagination from "@/components/ui/Pagination";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCourses, updateCourse } from "@/services/lms.services";
import { getImageUrl } from "@/services/api.services";
import { showToast } from "@/components/ui/Toast";
import {
  Search,
  BookOpen,
  Plus,
  Sparkles,
  Filter,
  AlertCircle,
  Loader2,
  GraduationCap,
  CheckCircle,
  Tag,
  ArrowRight,
} from "lucide-react";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<"All" | "Enrolled" | "Free" | "Paid">("All");

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const COURSES_PER_PAGE = 8;

  const fetchCourses = async (filterType?: string) => {
    setLoading(true);
    setError(null);
    try {
      const activeType = filterType || selectedFilter;
      const catalogRes = await getCourses({ type: activeType });
      const rawList: any[] = Array.isArray(catalogRes)
        ? catalogRes
        : (catalogRes as any)?.data || (catalogRes as any)?.message || [];
      setCourses(rawList);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch courses");
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(selectedFilter);
  }, [selectedFilter]);

  useEffect(() => {
    const checkRoles = () => {
      try {
        const rolesStr = localStorage.getItem("roles");
        if (rolesStr) {
          const roles = JSON.parse(rolesStr);
          setIsInstructor(
            Array.isArray(roles)
              ? roles.some((r: string) =>
                  [
                    "Instructor",
                    "Course Creator",
                    "Administrator",
                    "System Manager",
                  ].includes(r)
                )
              : false
          );
        }
      } catch (e) {}
    };
    checkRoles();
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.category && typeof c.category === "string") {
        set.add(c.category);
      }
    });
    return Array.from(set);
  }, [courses]);

  // Filter courses by search and category (type filter is already applied by get_courses API)
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Hide unpublished draft courses from students (non-instructors)
      if (!isInstructor && (c.published === 0 || c.published === false)) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (c.title || c.name || "").toLowerCase().includes(q);
      const descMatch = (c.short_introduction || c.description || "")
        .toLowerCase()
        .includes(q);
      const catMatch = (c.category || "").toLowerCase().includes(q);
      const matchesSearch = !q || titleMatch || descMatch || catMatch;

      const matchesCat =
        selectedCategory === "all" || c.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [courses, isInstructor, searchQuery, selectedCategory]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCourses.length / COURSES_PER_PAGE)
  );
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * COURSES_PER_PAGE,
    currentPage * COURSES_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedFilter]);

  const handleEdit = (courseId: string) => {
    router.push(`/course/${courseId}/edit`);
  };

  const handlePublish = async (course: any) => {
    const courseId = course.name || course.course || course.course_name;
    if (!courseId) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await updateCourse({
        ...course,
        name: courseId,
        course: courseId,
        course_name: courseId,
        title: course.title || courseId,
        published: 1,
        status: "Approved",
        published_on: course.published_on || todayStr,
      });
      showToast.success(`Course "${course.title || courseId}" published successfully!`);
      setCourses(prev =>
        prev.map(c => ((c.name || c.course) === courseId ? { ...c, published: 1, status: "Approved", published_on: todayStr } : c))
      );
      await fetchCourses();
    } catch (err: any) {
      console.error("Failed to publish course:", err);
      showToast.error(err?.message || "Failed to publish course");
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  Course Catalog
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {courses.length} {courses.length === 1 ? "course" : "courses"} available
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                All Courses
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Explore our catalog of structured courses, master job-ready skills, and earn certified credentials.
              </p>
            </div>

            {isInstructor && (
              <Link
                href="/course/create"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start md:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Course</span>
              </Link>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by course title, topic, or keyword..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedFilter("All")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedFilter === "All"
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter("Enrolled")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedFilter === "Enrolled"
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Enrolled
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter("Free")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedFilter === "Free"
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Free
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter("Paid")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedFilter === "Paid"
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Paid
                </button>
              </div>

              {/* Category dropdown or select */}
              {categories.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading courses...</p>
            <p className="text-xs text-slate-400 mt-1">Retrieving latest course catalog</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-xs">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-red-700 mb-2">{error}</p>
            <button
              type="button"
              onClick={() => fetchCourses()}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No courses found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {searchQuery || selectedCategory !== "all" || selectedFilter !== "All"
                ? "No courses matched your search criteria. Try adjusting or clearing your filters."
                : "No courses have been published yet. Check back soon!"}
            </p>
            {(searchQuery || selectedCategory !== "all" || selectedFilter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedFilter("All");
                }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedCourses.map((course, index) => (
                <div
                  key={course.name || index}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Link
                    href={`/course/${course.name}`}
                    className="block h-full transition-transform hover:-translate-y-1 duration-300"
                  >
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
                          ? "Enrolled"
                          : course.paid_course || course.is_paid
                          ? `${course.currency === "INR" ? "₹" : course.currency || "₹"} ${Number(
                              course.course_price || 0
                            ).toLocaleString("en-IN")}`
                          : "Free"
                      }
                      published={course.published}
                      onPublish={isInstructor && !course.published ? () => handlePublish(course) : undefined}
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
              totalItems={filteredCourses.length}
              pageSize={COURSES_PER_PAGE}
              itemName="courses"
              hideOnSinglePage={true}
            />
          </div>
        )}
      </main>
    </div>
  );
}
