"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourseDetails, getChapters, getLessons, getReviews, createChapter, createLesson, getCourseProgress, getAssignments, getAssignmentSubmissions, enrollInCourse } from '@/services/lms.services';
import { getCourseWithEnrollment } from '@/services/payment.services';
import { getImageUrl } from '@/services/api.services';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  PlayCircle, Clock, BookOpen, Users, Award,
  Globe, Tags, ChevronRight, Star, CheckCircle2,
  BookMarked, ArrowLeft, Edit, Plus, Loader2, FileText, CheckCircle, Lock
} from 'lucide-react';
import InlineBlockEditor from '@/components/admin/InlineBlockEditor';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;

  const [details, setDetails] = useState<any>(null);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [outline, setOutline] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);

  // Curriculum Management State
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [activeChapterForLesson, setActiveChapterForLesson] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonBody, setNewLessonBody] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    fetchCourseData();
    const checkRoles = () => {
      try {
        const rolesStr = localStorage.getItem("roles");
        if (rolesStr) {
          const roles = JSON.parse(rolesStr);
          setIsInstructor(roles.includes("Instructor"));
        }
      } catch (e) { }
    };
    checkRoles();
  }, [courseId]);

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const [detailsRes, outlineRes, reviewsRes, lessonsRes, progressRes, assignmentsRes, submissionsRes, enrollRes] = await Promise.allSettled([
        getCourseDetails({ course: courseId }),
        getChapters({ course: courseId }),
        getReviews({ course: courseId }),
        getLessons({ course: courseId }),
        getCourseProgress(courseId),
        getAssignments(),
        getAssignmentSubmissions(),
        getCourseWithEnrollment(courseId)
      ]);

      if (enrollRes.status === 'fulfilled' && enrollRes.value) {
        const enrollData = enrollRes.value;
        setEnrollmentData(enrollData);
        if (enrollData.is_enrolled !== undefined) {
          setIsEnrolled(Boolean(enrollData.is_enrolled));
        }
      }

      if (detailsRes.status === 'fulfilled') {
        const d = detailsRes.value?.data || detailsRes.value?.message || detailsRes.value;
        setDetails(d);
        if (enrollRes.status !== 'fulfilled' || !enrollRes.value) {
          if (d && d.membership) {
            setIsEnrolled(true);
          } else {
            setIsEnrolled(false);
          }
        }
      } else {
        throw new Error('Failed to fetch course details');
      }

      let lessonsArray: any[] = [];
      if (lessonsRes.status === 'fulfilled') {
        const rawLessons = lessonsRes.value;
        const unwrapped = Array.isArray(rawLessons)
          ? rawLessons
          : (rawLessons?.message?.data || rawLessons?.data?.message || rawLessons?.data || rawLessons?.message || []);
        lessonsArray = Array.isArray(unwrapped) ? unwrapped : [];
      }

      if (outlineRes.status === 'fulfilled') {
        const rawOutline = outlineRes.value;
        const outlineArray = Array.isArray(rawOutline)
          ? rawOutline
          : (rawOutline?.message?.data || rawOutline?.data?.message || rawOutline?.data || rawOutline?.message || []);

        const safeOutline = Array.isArray(outlineArray) ? outlineArray : [];

        const enrollLessonsMap = new Map<string, any>();
        if (enrollRes.status === 'fulfilled' && enrollRes.value) {
          const eChapters = (enrollRes.value as any).chapters || [];
          if (Array.isArray(eChapters)) {
            eChapters.forEach((ch: any) => {
              if (Array.isArray(ch.lessons)) {
                ch.lessons.forEach((l: any) => {
                  if (l.name) enrollLessonsMap.set(l.name, l);
                });
              }
            });
          }
        }

        // Merge lessons into their respective chapters
        const mergedOutline = safeOutline.map(chapter => ({
          ...chapter,
          lessons: lessonsArray
            .filter(lesson => lesson.chapter === chapter.name)
            .map(lesson => {
              const fromEnroll = enrollLessonsMap.get(lesson.name);
              return {
                ...lesson,
                is_locked: fromEnroll?.is_locked !== undefined ? fromEnroll.is_locked : lesson.is_locked,
                include_in_preview: fromEnroll?.include_in_preview !== undefined ? fromEnroll.include_in_preview : lesson.include_in_preview,
              };
            })
        }));

        setOutline(mergedOutline);
      }

      if (reviewsRes.status === 'fulfilled') {
        const rawReviews = reviewsRes.value;
        const reviewsArray = Array.isArray(rawReviews)
          ? rawReviews
          : (rawReviews?.message?.data || rawReviews?.data?.message || rawReviews?.data || rawReviews?.message || []);
        setReviews(Array.isArray(reviewsArray) ? reviewsArray : []);
      }

      if (progressRes.status === 'fulfilled') {
        const rawProgress = progressRes.value;
        setProgress(rawProgress?.message || rawProgress?.data || rawProgress);
      }

      if (assignmentsRes.status === 'fulfilled') {
        const rawAss = assignmentsRes.value?.data || assignmentsRes.value;
        const assData = rawAss?.message?.data?.assignments || rawAss?.message?.assignments || rawAss?.assignments || rawAss?.data || rawAss?.message || [];
        const finalAss = Array.isArray(assData) ? assData : [];

        let subList: any[] = [];
        if (submissionsRes.status === 'fulfilled') {
          const rawSub = submissionsRes.value?.data || submissionsRes.value;
          const subData = rawSub?.message?.data || rawSub?.data || rawSub?.message || [];
          subList = Array.isArray(subData) ? subData : [];
        }

        const courseAssignments = finalAss
          .filter((a: any) => a.course === courseId)
          .map((a: any) => ({
            ...a,
            _is_submitted: subList.some((s: any) => s.assignment === a.name || s.assignment_title === a.title)
          }));

        setAssignments(courseAssignments);
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred loading the course.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!courseId) return;
    setEnrollLoading(true);
    try {
      await enrollInCourse({ course: courseId });
      alert('Successfully enrolled!');
      setIsEnrolled(true);
      // Refresh progress data to show "Continue Learning"
      const progressRes = await getCourseProgress(courseId);
      setProgress(progressRes?.message || progressRes?.data || progressRes);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to enroll in course');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle) return;
    setActionLoading(true);
    try {
      const fd = new FormData();
      fd.append('course', courseId);
      fd.append('title', newChapterTitle);
      await createChapter(fd);
      alert('Chapter created successfully');
      setNewChapterTitle('');
      setIsAddingChapter(false);
      await fetchCourseData();
    } catch (err) {
      console.error(err);
      alert('Failed to add chapter');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddLesson = async (e: React.FormEvent, chapterName: string) => {
    e.preventDefault();
    if (!newLessonTitle) return;
    setActionLoading(true);
    try {
      const fd = new FormData();
      fd.append('course', courseId);
      fd.append('chapter', chapterName);
      fd.append('title', newLessonTitle);
      fd.append('body', `<p>${newLessonBody}</p>`);
      await createLesson(fd);
      alert('Lesson created successfully');
      setNewLessonTitle('');
      setNewLessonBody('');
      setActiveChapterForLesson(null);
      await fetchCourseData();
    } catch (err) {
      console.error(err);
      alert('Failed to add lesson');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-gray-50">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-dashed rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent border-solid rounded-full animate-spin absolute inset-0"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-gray-50">
        <Navbar />
        <div className="flex-grow flex flex-col justify-center items-center p-8 text-center">
          <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Oops!</h2>
            <p className="text-gray-500 mb-8">{error || 'Course not found'}</p>
            <button onClick={() => router.push('/')} className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-bold rounded-xl shadow-lg shadow-indigo-200">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = enrollmentData?.is_paid !== undefined
    ? Boolean(enrollmentData.is_paid)
    : Boolean(details?.paid_course && Number(details?.course_price) > 0);
  const currentPrice = enrollmentData?.course_price !== undefined
    ? Number(enrollmentData.course_price)
    : Number(details?.course_price || details?.amount_usd || 0);
  const currencySymbol = (enrollmentData?.currency === "INR" || details?.currency === "INR")
    ? "₹"
    : (enrollmentData?.currency || details?.currency || "₹");
  const isFree = !isPaid || currentPrice === 0;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Modern Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 text-white pt-10 pb-20">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-200 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Courses
            </Link>

            {isInstructor && (
              <Link
                href={`/course/${courseId}/edit`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg backdrop-blur-sm transition-all"
              >
                <Edit className="w-4 h-4" />
                Edit Course
              </Link>
            )}
          </div>
          <div className="max-w-3xl">
            {details.category && (
              <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wide text-indigo-300 uppercase bg-indigo-900/50 border border-indigo-700/50 rounded-md backdrop-blur-sm">
                {details.category}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              {details.title || details.course_name || courseId}
            </h1>
            <p className="text-base md:text-lg text-indigo-100/80 mb-5 max-w-2xl font-light">
              {details.short_introduction || 'Learn the skills you need for your career with comprehensive lessons and expert guidance.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
              {details.level && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span>{details.level}</span>
                </div>
              )}
              {details.duration && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span>{details.duration}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>{details.lessons || 0} Lessons</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 w-full -mt-10 relative z-20">

        {/* Left Column - Main Content */}
        <div className="lg:w-2/3 space-y-8">

          {/* About Section */}
          <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
              <BookMarked className="w-5 h-5 text-indigo-600" />
              About this course
            </h2>
            <div
              className="prose prose-indigo max-w-none text-sm text-slate-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: details.about || details.description || '<p>No description available.</p>' }}
            />
          </section>

          {/* Course Outline */}
          <section id="curriculum" className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <PlayCircle className="w-5 h-5 text-indigo-600" />
                Course Curriculum
              </h2>
              {isInstructor && (
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                    {outline.length} Chapters
                  </span>
                  <button
                    onClick={() => setIsAddingChapter(!isAddingChapter)}
                    className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Chapter
                  </button>
                </div>
              )}
              {!isInstructor && (
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                    {outline.length} Chapters
                  </span>
                </div>
              )}
            </div>

            {isAddingChapter && (
              <form onSubmit={handleAddChapter} className="mb-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex gap-3">
                <input
                  type="text"
                  placeholder="Chapter Title"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Chapter'}
                </button>
              </form>
            )}

            {outline.length > 0 ? (
              <div className="space-y-3">
                {outline.map((chapter: any, index: number) => (
                  <div key={chapter.name || index} className="border border-slate-200 rounded-lg overflow-hidden transition-all hover:border-indigo-200 group">
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 group-hover:bg-indigo-50/50 transition-colors">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded bg-indigo-100 text-indigo-700 text-xs">
                          {index + 1}
                        </span>
                        {chapter.title || chapter.chapter_name || chapter.name}
                      </h3>
                    </div>
                    <div className="px-5 py-1 bg-white">
                      {chapter.lessons && chapter.lessons.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                          {chapter.lessons.map((lesson: any, lIndex: number) => {
                            const isLocked = !isEnrolled && isPaid && !isFree && (lesson.is_locked === true || (!lesson.include_in_preview && lesson.include_in_preview !== 1));
                            const isPreview = !isEnrolled && Boolean(lesson.include_in_preview === 1 || lesson.include_in_preview === true);

                            return (
                              <li key={lesson.name || lIndex} className="py-3 flex justify-between items-center group/lesson">
                                <div className="flex items-center gap-2.5">
                                  {isLocked ? (
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                      <Lock className="w-3 h-3" />
                                    </div>
                                  ) : (
                                    <PlayCircle className="w-4 h-4 text-slate-300 group-hover/lesson:text-indigo-500 transition-colors shrink-0" />
                                  )}
                                  <span className={`text-sm font-medium transition-colors ${isLocked ? "text-slate-500" : "text-slate-700 group-hover/lesson:text-slate-900"}`}>
                                    {lesson.title || lesson.lesson_name || lesson.name}
                                  </span>
                                  {isPreview && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full ml-1.5 shadow-xs">
                                      Free Preview
                                    </span>
                                  )}
                                  {isLocked && (
                                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-1.5 hidden sm:inline-flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" /> Locked
                                    </span>
                                  )}
                                </div>

                                {isLocked ? (
                                  <button
                                    onClick={() => router.push(`/checkout?item_type=course&item_id=${encodeURIComponent(courseId)}`)}
                                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-all px-2.5 py-1 rounded-md hover:bg-indigo-50 cursor-pointer"
                                    title="Unlock course to access this lesson"
                                  >
                                    <Lock className="w-3 h-3" /> Unlock
                                  </button>
                                ) : (
                                  <Link
                                    href={`/course/${courseId}/${encodeURIComponent(chapter.name)}/${encodeURIComponent(lesson.name)}`}
                                    className="flex items-center gap-1 text-indigo-600 text-xs font-bold opacity-0 group-hover/lesson:opacity-100 transition-all -translate-x-2 group-hover/lesson:translate-x-0"
                                  >
                                    {isPreview ? "Preview" : "Start"} <ChevronRight className="w-3 h-3" />
                                  </Link>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 py-3 italic">No lessons in this chapter.</p>
                      )}

                      {/* Add Lesson UI */}
                      {isInstructor && (
                        <div className="mt-2 mb-3">
                          <Link
                            href={`/course/${courseId}/${encodeURIComponent(chapter.name)}/create-lesson`}
                            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Lesson
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">Curriculum is being updated.</p>
              </div>
            )}
          </section>

          {/* Student Reviews */}
          <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              Student Reviews
            </h2>
            {reviews.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((review: any, index: number) => (
                  <div key={index} className="bg-slate-50 p-5 rounded-lg border border-slate-100 relative">
                    <div className="flex items-center gap-1 text-amber-400 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(review.rating || 5) ? 'fill-current' : 'text-slate-300'}`} />
                      ))}
                    </div>
                    <p className="text-slate-600 text-xs mb-3 italic leading-relaxed">"{review.review || review.content}"</p>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        {(review.user_name || review.owner || 'U')[0].toUpperCase()}
                      </div>
                      {review.user_name || review.owner}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-sm text-slate-500 font-medium">Be the first to review this course!</p>
              </div>
            )}
          </section>

          {/* Course Assignments */}
          <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <FileText className="w-5 h-5 text-indigo-600" />
                Course Assignments
              </h2>
              {isInstructor && (
                <Link
                  href={`/assignments/create?course=${courseId}`}
                  className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Assignment
                </Link>
              )}
            </div>
            {assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.map((assignment: any) => {
                  const isSubmitted = (assignment.status && assignment.status !== 'Pending') || assignment.submission_count > 0 || assignment._is_submitted;
                  return (
                    <div
                      key={assignment.name}
                      onClick={() => router.push(`/assignments/${assignment.name}`)}
                      className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1 bg-indigo-50 p-2.5 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-700 transition-colors">
                              {assignment.title}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                              <span>Type: {assignment.type || 'Standard'}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 sm:pl-4 sm:border-l border-slate-100">
                          <div className="flex flex-col sm:items-end">
                            <span className="text-xs text-slate-400 font-medium">{isInstructor ? 'Action' : 'Status'}</span>
                            {isInstructor ? (
                              <span className="text-sm font-medium flex items-center gap-1 text-indigo-600 mt-1">
                                <Users className="w-3.5 h-3.5" />
                                View Submissions
                              </span>
                            ) : (
                              <span className={`text-sm font-medium flex items-center gap-1 mt-1 ${isSubmitted ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {isSubmitted ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                {isSubmitted ? 'Submitted' : 'Pending'}
                              </span>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">No assignments available for this course yet.</p>
              </div>
            )}
          </section>

        </div>

        {/* Right Column - Floating Sidebar */}
        <div className="lg:w-1/3">
          <div className="sticky top-6 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-xl p-1 shadow-lg shadow-indigo-900/5">
            <div className="bg-white rounded-lg p-5 md:p-6">

              {/* Course Thumbnail */}
              {details.image ? (
                <div className="w-full h-40 rounded-lg overflow-hidden mb-5 relative shadow-inner">
                  <img src={getImageUrl(details.image)} alt="Course Thumbnail" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer hover:bg-white/40 transition-colors">
                      <PlayCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg mb-5 flex items-center justify-center shadow-inner">
                  <BookOpen className="w-10 h-10 text-indigo-300" />
                </div>
              )}

              {/* Price & CTA */}
              <div className="mb-6">
                {isEnrolled ? (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Purchased & Enrolled
                    </span>
                  </div>
                ) : (
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {isFree ? 'Free' : `${currencySymbol} ${currentPrice.toLocaleString("en-IN")}`}
                    </span>
                    {!isFree && (
                      <span className="text-slate-400 line-through text-sm font-medium mb-1">
                        {currencySymbol} {Math.round(currentPrice * 1.5).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                )}

                {isEnrolled && progress && (
                  <div className="mt-4 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Progress</span>
                      <span className="text-xs font-bold text-indigo-600">{progress.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress.progress || 0}%` }}></div>
                    </div>
                    {(progress.completed_lessons !== undefined || progress.total_lessons !== undefined) && (
                      <p className="text-[11px] text-slate-500 text-center">
                        {progress.completed_lessons || 0} of {progress.total_lessons || details.lessons || 0} lessons completed
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    if (isEnrolled) {
                      const firstChapter = outline?.find(c => c.lessons && c.lessons.length > 0) || outline?.[0];
                      const firstLesson = firstChapter?.lessons?.[0];
                      if (firstChapter && firstLesson) {
                        router.push(`/course/${courseId}/${encodeURIComponent(firstChapter.name)}/${encodeURIComponent(firstLesson.name)}`);
                      } else {
                        const elem = document.getElementById("curriculum");
                        if (elem) elem.scrollIntoView({ behavior: "smooth" });
                      }
                    } else if (isPaid && !isFree) {
                      router.push(`/checkout?item_type=course&item_id=${encodeURIComponent(courseId)}`);
                    } else {
                      handleEnroll();
                    }
                  }}
                  disabled={enrollLoading}
                  className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 mt-3 flex justify-center items-center gap-2 text-sm disabled:opacity-50 active:scale-95 cursor-pointer ${isEnrolled
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-200"
                      : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-200"
                    }`}
                >
                  {enrollLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isEnrolled
                    ? 'Continue Learning'
                    : isPaid && !isFree
                      ? `Buy Now for ${currencySymbol} ${currentPrice.toLocaleString("en-IN")}`
                      : (enrollLoading ? 'Enrolling...' : 'Enroll for Free')}
                  <ChevronRight className="w-4 h-4" />
                </button>
                {isInstructor && (
                  <Link
                    href={`/course/${courseId}/edit`}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-lg transition-all mt-3 flex justify-center items-center gap-2 text-sm border border-slate-200"
                  >
                    <Edit className="w-4 h-4" /> Manage / Edit Course
                  </Link>
                )}

                {/* Quizzes & Questions moved here from Navbar */}
                <Link
                  href={`/quizzes`}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-lg transition-all mt-3 flex justify-center items-center gap-2 text-sm border border-indigo-100"
                >
                  <Award className="w-4 h-4" /> Course Quizzes
                </Link>
                <Link
                  href={`/questions`}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-lg transition-all mt-3 flex justify-center items-center gap-2 text-sm border border-slate-200"
                >
                  <BookOpen className="w-4 h-4" /> Practice Questions
                </Link>
                <p className="text-center text-[11px] text-slate-500 mt-3 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 30-Day Money-Back Guarantee
                </p>
              </div>

              <hr className="border-slate-100 mb-6" />

              {/* Metadata List */}
              <div className="space-y-4">

                {details.instructors && details.instructors.length > 0 && (
                  <div className="mb-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 block">Taught by</span>
                    <div className="space-y-2.5">
                      {details.instructors.map((instructor: any, i: number) => (
                        <div key={i} className="flex items-center gap-2.5">
                          {instructor.user_image ? (
                            <img src={getImageUrl(instructor.user_image)} alt={instructor.full_name} className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm text-xs">
                              {instructor.first_name ? instructor.first_name.charAt(0) : 'I'}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight">{instructor.full_name}</p>
                            <p className="text-[11px] text-slate-500">Instructor</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-slate-600">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <div className="flex-1 border-b border-slate-100 pb-2 flex justify-between">
                    <span className="font-medium text-xs">Language</span>
                    <span className="font-bold text-slate-900 text-xs">{details.language || 'English'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <Tags className="w-4 h-4 text-indigo-400" />
                  <div className="flex-1 border-b border-slate-100 pb-2 flex justify-between">
                    <span className="font-medium text-xs">Category</span>
                    <span className="font-bold text-slate-900 text-xs">{details.category || 'General'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <div className="flex-1 border-b border-slate-100 pb-2 flex justify-between">
                    <span className="font-medium text-xs">Certificate</span>
                    <span className="font-bold text-slate-900 text-xs">{(details.enable_certification || details.paid_certificate) ? 'Included' : 'No'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <div className="flex-1 border-b border-slate-100 pb-2 flex justify-between">
                    <span className="font-medium text-xs">Lessons</span>
                    <span className="font-bold text-slate-900 text-xs">{details.lessons || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <div className="flex-1 pb-1 flex justify-between">
                    <span className="font-medium text-xs">Enrollments</span>
                    <span className="font-bold text-slate-900 text-xs">{details.enrollments || 0}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-12 text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium">© 2026 Stridenex Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
