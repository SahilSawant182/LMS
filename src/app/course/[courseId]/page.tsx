"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getCourse, getCourseDetails, getChapters, getLessons, getReviews, 
  createChapter, createLesson, getCourseProgress, getCourseProgressBar, parseProgressBarValue, getAssignments, 
  getAssignmentSubmissions, enrollInCourse,
  getCourseReviewList, createCourseReview, deleteCourseReview, LMSCourseReview
} from '@/services/lms.services';
import { getCourseWithEnrollment } from '@/services/payment.services';
import { getImageUrl, getCurrentUserEmail } from '@/services/api.services';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { navigateBack } from '@/utils/navigation';
import {
  PlayCircle, Clock, BookOpen, Users, Award,
  Globe, Tags, ChevronRight, Star, CheckCircle2,
  BookMarked, ArrowLeft, Edit, Plus, Loader2, FileText, CheckCircle,
  MessageSquare, Sparkles, Send, Check, Trash2, Lock, HelpCircle,
  RotateCcw, Trophy
} from 'lucide-react';
import InlineBlockEditor from '@/components/admin/InlineBlockEditor';
import Pagination from '@/components/ui/Pagination';
import { showToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

// Helper to format review creation timestamp nicely (e.g. 'Oct 12, 2026')
const formatReviewDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const cleanStr = dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr;
    const date = new Date(cleanStr);
    if (isNaN(date.getTime())) {
      return dateStr.split(' ')[0] || dateStr;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr.split(' ')[0] || dateStr;
  }
};

// Helper to resolve video embed url for YouTube or video providers
const getEmbedUrl = (link?: string | null) => {
  if (!link) return null;
  const trimmed = link.trim();
  if (!trimmed) return null;
  if (trimmed.includes('youtube.com/embed/')) return trimmed;
  const matchWatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (matchWatch && matchWatch[1]) {
    return `https://www.youtube.com/embed/${matchWatch[1]}`;
  }
  if (/^[a-zA-Z0-9_-]{8,15}$/.test(trimmed)) {
    return `https://www.youtube.com/embed/${trimmed}`;
  }
  return trimmed;
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;

  const [details, setDetails] = useState<any>(null);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [outline, setOutline] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [progressBarData, setProgressBarData] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');

  // Course Review Interactive State
  const [userExistingReview, setUserExistingReview] = useState<LMSCourseReview | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [reviewErrorMsg, setReviewErrorMsg] = useState<string | null>(null);
  const [deleteReviewConfirmName, setDeleteReviewConfirmName] = useState<string | null>(null);

  // Review Pagination State
  const [reviewPage, setReviewPage] = useState<number>(1);
  const REVIEWS_PER_PAGE = 4;
  const totalReviewPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  const paginatedReviews = reviews.slice(
    (reviewPage - 1) * REVIEWS_PER_PAGE,
    reviewPage * REVIEWS_PER_PAGE
  );

  useEffect(() => {
    if (reviewPage > totalReviewPages) {
      setReviewPage(totalReviewPages);
    }
  }, [totalReviewPages, reviewPage]);

  // Video Preview State
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

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
    const checkRoles = () => {
      try {
        const rolesStr = localStorage.getItem("roles") || "";
        const roles = rolesStr.startsWith('[') ? JSON.parse(rolesStr) : rolesStr;
        const hasInstructorRole = Array.isArray(roles)
          ? roles.some((r: string) => ["Instructor", "Administrator", "System Manager"].includes(r))
          : (rolesStr.includes("Instructor") || rolesStr.includes("Administrator") || rolesStr.includes("System Manager"));
        const flag = hasInstructorRole || localStorage.getItem("isInstructor") === "true";
        setIsInstructor(Boolean(flag));
        const email = localStorage.getItem("userEmail") || "";
        const name = localStorage.getItem("fullName") || "";
        setCurrentUserEmail(email);
        setCurrentUserName(name);
      } catch (e) {}
    };
    checkRoles();
    fetchCourseData();

    const handleChapterCreated = () => {
      fetchCourseData();
    };
    window.addEventListener("chapter-created", handleChapterCreated);
    return () => window.removeEventListener("chapter-created", handleChapterCreated);
  }, [courseId]);

  const fetchCourseData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const email = typeof window !== 'undefined' ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "";
      const [detailsRes, outlineRes, reviewsRes, lessonsRes, progressRes, progressBarRes, assignmentsRes, submissionsRes, courseReviewsRes, enrollRes] = await Promise.allSettled([
        getCourse(courseId),
        getChapters({ course: courseId }),
        getReviews({ course: courseId }),
        getLessons({ course: courseId }),
        getCourseProgress(courseId, email),
        getCourseProgressBar({ course: courseId, member: email }),
        getAssignments(),
        getAssignmentSubmissions(),
        getCourseReviewList({ course: courseId }),
        getCourseWithEnrollment(courseId)
      ]);

      let currentIsInstructor = false;
      const rolesStr = typeof window !== 'undefined' ? (localStorage.getItem("roles") || "") : "";
      const roles = rolesStr.startsWith('[') ? JSON.parse(rolesStr) : rolesStr;
      const hasInstructorRole = Array.isArray(roles)
        ? roles.some((r: string) => ["Instructor", "Administrator", "System Manager", "Course Creator"].includes(r))
        : (rolesStr.includes("Instructor") || rolesStr.includes("Administrator") || rolesStr.includes("System Manager"));
      if (hasInstructorRole || (typeof window !== 'undefined' && localStorage.getItem("isInstructor") === "true")) {
        currentIsInstructor = true;
      }

      if (enrollRes.status === 'fulfilled' && enrollRes.value) {
        const enrollData = enrollRes.value;
        setEnrollmentData(enrollData);
        if (enrollData.is_enrolled !== undefined) {
          setIsEnrolled(Boolean(enrollData.is_enrolled));
        }
      }

      if (detailsRes.status === 'fulfilled') {
        const d = detailsRes.value?.data || detailsRes.value?.message?.data || detailsRes.value?.message || detailsRes.value;
        setDetails(d);
        const currentEmail = localStorage.getItem("userEmail") || "";
        if (d?.instructors && Array.isArray(d.instructors) && currentEmail) {
          const isAssignedInstructor = d.instructors.some((i: any) => 
            i.instructor === currentEmail || i.owner === currentEmail || i.name === currentEmail || i.username === currentEmail
          );
          if (isAssignedInstructor) {
            currentIsInstructor = true;
            setIsInstructor(true);
          }
        }
        if (d?.owner && (d.owner === currentEmail || d.owner === "Administrator")) {
          currentIsInstructor = true;
          setIsInstructor(true);
        }
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

      const courseObj = detailsRes.status === 'fulfilled'
        ? (detailsRes.value?.data || detailsRes.value?.message?.data || detailsRes.value?.message || detailsRes.value)
        : null;

      // Prioritize chapters with nested lessons from get_course API
      if (courseObj && Array.isArray(courseObj.chapters) && courseObj.chapters.length > 0) {
        const sortedChapters = [...courseObj.chapters].sort((a: any, b: any) => {
          if (a.idx !== undefined && b.idx !== undefined && a.idx !== b.idx) {
            return a.idx - b.idx;
          }
          return String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''), undefined, { numeric: true });
        });

        const mergedOutline = sortedChapters.map(chapter => {
          let chLessons: any[] = Array.isArray(chapter.lessons) ? chapter.lessons : [];
          if (chLessons.length === 0 && lessonsArray.length > 0) {
            chLessons = lessonsArray.filter((l: any) => l.chapter === chapter.name);
          }

          const sortedLessons = [...chLessons].sort((a: any, b: any) => {
            if (a.idx !== undefined && b.idx !== undefined && a.idx !== b.idx) {
              return a.idx - b.idx;
            }
            return String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''), undefined, { numeric: true });
          });

          return {
            ...chapter,
            lessons: sortedLessons.map(lesson => {
              const fromEnroll = enrollLessonsMap.get(lesson.name);
              return {
                ...lesson,
                is_locked: currentIsInstructor ? false : (fromEnroll?.is_locked !== undefined ? fromEnroll.is_locked : lesson.is_locked),
                include_in_preview: fromEnroll?.include_in_preview !== undefined ? fromEnroll.include_in_preview : lesson.include_in_preview,
              };
            })
          };
        });

        setOutline(mergedOutline);
      } else if (outlineRes.status === 'fulfilled') {
        const rawOutline = outlineRes.value;
        const outlineArray = Array.isArray(rawOutline)
          ? rawOutline
          : (rawOutline?.message?.data || rawOutline?.data?.message || rawOutline?.data || rawOutline?.message || []);

        const safeOutline = Array.isArray(outlineArray) ? outlineArray : [];

        // Merge lessons into their respective chapters
        const mergedOutline = safeOutline.map(chapter => ({
          ...chapter,
          lessons: lessonsArray
            .filter(lesson => lesson.chapter === chapter.name)
            .map(lesson => {
              const fromEnroll = enrollLessonsMap.get(lesson.name);
              return {
                ...lesson,
                is_locked: currentIsInstructor ? false : (fromEnroll?.is_locked !== undefined ? fromEnroll.is_locked : lesson.is_locked),
                include_in_preview: fromEnroll?.include_in_preview !== undefined ? fromEnroll.include_in_preview : lesson.include_in_preview,
              };
            })
        }));

        setOutline(mergedOutline);
      } else {
        setOutline([]);
      }

      // Process course reviews:
      // 1. Primary: lms.lms.stride_lms.get_reviews returns owner_details (username, full_name, user_image), creation, rating, review, owner
      let combinedReviews: any[] = [];
      if (reviewsRes.status === 'fulfilled') {
        const rawReviews = reviewsRes.value?.data || reviewsRes.value;
        const reviewsArray = Array.isArray(rawReviews)
          ? rawReviews
          : (rawReviews?.message?.data || rawReviews?.data?.message || rawReviews?.message || rawReviews?.data || []);
        if (Array.isArray(reviewsArray) && reviewsArray.length > 0) {
          combinedReviews = reviewsArray;
        }
      }

      // 2. Secondary: getCourseReviewList returns document doctype info (with doc `name` for updates)
      let docReviews: any[] = [];
      if (courseReviewsRes.status === 'fulfilled') {
        const val: any = courseReviewsRes.value;
        const listData: any = val?.data || val;
        const unwrappedList = Array.isArray(listData)
          ? listData
          : (listData?.message?.data || listData?.data?.message || listData?.data || listData?.message || []);
        if (Array.isArray(unwrappedList) && unwrappedList.length > 0) {
          docReviews = unwrappedList;
        }
      }

      // Attach doc `name` to matching review if present
      if (combinedReviews.length > 0 && docReviews.length > 0) {
        combinedReviews = combinedReviews.map(r => {
          if (r.name) return r;
          const match = docReviews.find(dr => 
            (dr.owner && r.owner && dr.owner === r.owner) ||
            (dr.review && r.review && dr.review === r.review)
          );
          return match ? { ...r, name: match.name } : r;
        });
      } else if (combinedReviews.length === 0 && docReviews.length > 0) {
        combinedReviews = docReviews;
      }

      setReviews(combinedReviews);

      // Check if current user already submitted a review
      const currentEmail = localStorage.getItem("userEmail") || "";
      const currentName = localStorage.getItem("fullName") || "";
      const existing = combinedReviews.find(
        (r: any) =>
          (currentEmail && (r.owner === currentEmail || r.user === currentEmail || r.owner_details?.username === currentEmail)) ||
          (currentName && (r.owner_details?.full_name === currentName || r.user_name === currentName))
      );
      if (existing) {
        setUserExistingReview(existing);
        setReviewRating(Number(existing.rating) || 5);
        setReviewText(existing.review || existing.content || "");
      } else {
        setUserExistingReview(null);
      }

      if (progressRes.status === 'fulfilled') {
        const rawProgress = progressRes.value;
        setProgress(rawProgress?.message || rawProgress?.data || rawProgress);
      }

      if (progressBarRes.status === 'fulfilled') {
        const rawPB = progressBarRes.value;
        const parsed = parseProgressBarValue(rawPB);
        setProgressBarData(rawPB?.message ?? rawPB?.data ?? rawPB);
        if (parsed.percent > 0 || (parsed.completedLessons || 0) > 0 || parsed.isCompleted) {
          setIsEnrolled(true);
        }
      }

      if (assignmentsRes.status === 'fulfilled') {
        const rawAss = assignmentsRes.value?.data || assignmentsRes.value;
        const assData = rawAss?.message?.data?.assignments || rawAss?.message?.assignments || rawAss?.assignments || rawAss?.data || rawAss?.message || [];
        const finalAss = Array.isArray(assData) ? assData : [];

        let subList: any[] = [];
        if (submissionsRes.status === 'fulfilled') {
          const rawSub: any = (submissionsRes.value as any)?.data || submissionsRes.value;
          if (Array.isArray(rawSub)) {
            subList = rawSub;
          } else if (rawSub && typeof rawSub === 'object') {
            if (Array.isArray(rawSub.submissions)) subList = rawSub.submissions;
            else if (rawSub.data && Array.isArray(rawSub.data.submissions)) subList = rawSub.data.submissions;
            else if (rawSub.message && Array.isArray(rawSub.message.data)) subList = rawSub.message.data;
            else if (rawSub.message && Array.isArray(rawSub.message.submissions)) subList = rawSub.message.submissions;
            else if (Array.isArray(rawSub.data)) subList = rawSub.data;
            else if (Array.isArray(rawSub.message)) subList = rawSub.message;
          }
        }

        const userEmail = getCurrentUserEmail().trim().toLowerCase();

        const courseAssignments = finalAss
          .filter((a: any) => a.course === courseId)
          .map((a: any) => {
            const aName = String(a.name || '').trim().toLowerCase();
            const aTitle = String(a.title || a.assignment_title || '').trim().toLowerCase();

            let hasLocalSub = false;
            if (typeof window !== "undefined") {
              try {
                const keysToCheck = [
                  userEmail ? `lms_submission_${userEmail}_${a.name}` : '',
                  userEmail ? `lms_submission_${userEmail}_${a.title}` : '',
                  userEmail ? `lms_submission_${userEmail}_${aName}` : '',
                  userEmail ? `lms_submission_${userEmail}_${aTitle}` : '',
                  `lms_submission_${a.name}`,
                  `lms_submission_${a.title}`,
                  `lms_submission_${aName}`,
                  `lms_submission_${aTitle}`,
                  `lms_assignment_answer_${a.name}`,
                  `lms_assignment_answer_${a.title}`,
                  `lms_assignment_answer_${aName}`,
                  `lms_assignment_answer_${aTitle}`,
                  userEmail ? `lms_assignment_answer_${userEmail}_${a.name}` : '',
                ].filter(Boolean);

                hasLocalSub = keysToCheck.some(k => Boolean(localStorage.getItem(k)));
              } catch (e) {}
            }

            const sub = subList.find((s: any) => {
              const sAss = String(s.assignment || '').trim().toLowerCase();
              const sTitle = String(s.assignment_title || '').trim().toLowerCase();
              const matches = sAss === aName || (aTitle && sTitle === aTitle);
              if (!matches) return false;
              if (!userEmail) return true;
              const sMember = String(s.member || s.owner || '').trim().toLowerCase();
              return !sMember || sMember.includes(userEmail) || userEmail.includes(sMember);
            });

            const isSub = Boolean(sub || hasLocalSub || (a.status && a.status !== 'Pending') || a.submission_count > 0);
            const resolvedStatus = isSub ? ((sub?.status && sub.status !== 'Pending') ? sub.status : 'Submitted') : (a.status || 'Pending');

            return {
              ...a,
              status: resolvedStatus,
              _is_submitted: isSub
            };
          });

        setAssignments(courseAssignments);
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred loading the course.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnrolled) {
      showToast.warning('You must be enrolled in the course to submit a review.');
      return;
    }
    if (!reviewText.trim()) {
      showToast.warning('Please enter your review text.');
      return;
    }

    setReviewSubmitting(true);
    setReviewErrorMsg(null);
    setReviewSuccessMsg(null);

    try {
      await createCourseReview({
        course: courseId,
        rating: Number(reviewRating),
        review: reviewText.trim()
      });
      showToast.success('Thank you! Your course review has been submitted.');
      setIsReviewModalOpen(false);
      setReviewText('');
      setReviewRating(5);
      await fetchCourseData(true);
    } catch (err: any) {
      console.error('Submit review error:', err);
      let msg = err.message || 'Failed to submit review.';
      if (err.response?.data?._server_messages) {
        try {
          const msgs = JSON.parse(err.response.data._server_messages);
          if (Array.isArray(msgs) && msgs.length > 0) {
            const parsed = typeof msgs[0] === 'string' ? JSON.parse(msgs[0]) : msgs[0];
            if (parsed?.message) {
              msg = parsed.message.replace(/<[^>]*>?/gm, '').trim();
            }
          }
        } catch (e) {}
      } else if (err.response?.data?.message) {
        msg = typeof err.response.data.message === 'string' 
          ? err.response.data.message 
          : err.response.data.message?.message || JSON.stringify(err.response.data.message);
      }
      showToast.error(msg);
      setReviewErrorMsg(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = (reviewName?: string) => {
    let targetName = reviewName || userExistingReview?.name;

    if (!targetName) {
      const match = reviews.find(
        (r: any) =>
          r.name &&
          ((currentUserEmail && (r.owner === currentUserEmail || r.user === currentUserEmail || r.owner_details?.username === currentUserEmail)) ||
          (currentUserName && (r.owner_details?.full_name === currentUserName || r.user_name === currentUserName)))
      );
      if (match?.name) {
        targetName = match.name;
      }
    }

    if (!targetName) {
      showToast.error('Review document identifier not found. Please refresh the page and try again.');
      return;
    }

    setDeleteReviewConfirmName(targetName);
  };

  const executeDeleteReview = async () => {
    if (!deleteReviewConfirmName) return;

    setReviewDeleting(true);
    try {
      await deleteCourseReview(deleteReviewConfirmName);
      showToast.success('Your course review has been deleted successfully.');
      setIsReviewModalOpen(false);
      setUserExistingReview(null);
      setReviewText('');
      setReviewRating(5);
      await fetchCourseData(true);
    } catch (err: any) {
      console.error('Delete review error:', err);
      showToast.error(err.response?.data?.message || err.message || 'Failed to delete review.');
    } finally {
      setReviewDeleting(false);
      setDeleteReviewConfirmName(null);
    }
  };

  const handleEnroll = async () => {
    if (!courseId) return;
    setEnrollLoading(true);
    try {
      await enrollInCourse({ course: courseId });
      showToast.success('Successfully enrolled in this course!');
      setIsEnrolled(true);
      const email = typeof window !== 'undefined' ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "";
      // Refresh progress data to show "Continue Learning"
      const [progressRes, pbRes] = await Promise.allSettled([
        getCourseProgress(courseId, email),
        getCourseProgressBar({ course: courseId, member: email })
      ]);
      if (progressRes.status === 'fulfilled') {
        const rawProgress = progressRes.value;
        setProgress(rawProgress?.message || rawProgress?.data || rawProgress);
      }
      if (pbRes.status === 'fulfilled') {
        const rawPB = pbRes.value;
        setProgressBarData(rawPB?.message ?? rawPB?.data ?? rawPB);
      }
      await fetchCourseData(true);
    } catch (err: any) {
      showToast.error(err.response?.data?.message || err.message || 'Failed to enroll in course');
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
      showToast.success('Chapter created successfully!');
      setNewChapterTitle('');
      setIsAddingChapter(false);
      await fetchCourseData(true);
    } catch (err: any) {
      console.error(err);
      showToast.error(err?.response?.data?.message || err?.message || 'Failed to add chapter');
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
      showToast.success('Lesson created successfully!');
      setNewLessonTitle('');
      setNewLessonBody('');
      setActiveChapterForLesson(null);
      await fetchCourseData(true);
    } catch (err: any) {
      console.error(err);
      showToast.error(err?.response?.data?.message || err?.message || 'Failed to add lesson');
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
            <button onClick={() => navigateBack(router, '/courses')} className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-bold rounded-xl shadow-lg shadow-indigo-200 cursor-pointer">
              Back to Previous Screen
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

  // Normalized progress calculations from backend sources
  const normalizedProgress = progress?.message?.data || progress?.data || progress?.message || progress || {};
  const parsedPB = progressBarData !== null && progressBarData !== undefined ? parseProgressBarValue(progressBarData) : null;
  const allOutlineLessons = Array.isArray(outline) ? outline.flatMap((c: any) => Array.isArray(c?.lessons) ? c.lessons : []) : [];
  const progressRecords = normalizedProgress.records || normalizedProgress.data?.records || [];

  const checkOutlineLessonComplete = (l: any) => {
    const lName = (l.name || '').trim().toLowerCase();
    const lTitle = (l.title || l.lesson_name || '').trim().toLowerCase();
    if (!Array.isArray(progressRecords) || progressRecords.length === 0) return false;
    return progressRecords.some((r: any) => {
      const rLesson = String(r.lesson || '').trim().toLowerCase();
      const rLessonName = String(r.lesson_name || '').trim().toLowerCase();
      const rTitle = String(r.title || '').trim().toLowerCase();
      const isCompleteStatus = r.status === 'Complete' || r.status === 'Completed' || r.completed === 1 || r.completed === '1';
      if (!isCompleteStatus) return false;
      return (
        (lName && (rLesson === lName || rLessonName === lName || rTitle === lName)) ||
        (lTitle && (rLesson === lTitle || rLessonName === lTitle || rTitle === lTitle))
      );
    });
  };

  const actualCompletedOutlineCount = allOutlineLessons.filter(l => checkOutlineLessonComplete(l)).length;
  const isAllOutlineLessonsComplete = allOutlineLessons.length > 0 && allOutlineLessons.every(l => checkOutlineLessonComplete(l));

  const totalLessonsCount = allOutlineLessons.length > 0
    ? allOutlineLessons.length
    : (parsedPB?.totalLessons || Number(normalizedProgress.total_lessons || enrollmentData?.total_lessons || details?.lessons || 0));

  const isCourseComplete = Boolean(
    (allOutlineLessons.length > 0 ? isAllOutlineLessonsComplete : Boolean(parsedPB?.isCompleted)) ||
    enrollmentData?.status === 'Completed'
  );

  const completedLessonsCount = isCourseComplete
    ? totalLessonsCount
    : actualCompletedOutlineCount;

  const progressPercent = totalLessonsCount > 0
    ? (isCourseComplete ? 100 : Math.min(100, Math.round((actualCompletedOutlineCount / totalLessonsCount) * 100)))
    : (parsedPB?.percent ?? 0);

  const isUserEnrolled = Boolean(
    isEnrolled ||
    isCourseComplete ||
    enrollmentData?.is_enrolled ||
    (parsedPB !== null && ((parsedPB.completedLessons || 0) > 0 || (parsedPB.percent || 0) > 0 || parsedPB.isCompleted)) ||
    (Array.isArray(progressRecords) && progressRecords.length > 0) ||
    details?.membership
  );

  const hasCertificate = Boolean(details?.has_certificate || enrollmentData?.has_certificate || enrollmentData?.certificate);

  const gradientMap: Record<string, string> = {
    Blue: "from-blue-950 via-slate-900 to-indigo-950",
    Red: "from-rose-950 via-slate-900 to-red-950",
    Purple: "from-purple-950 via-slate-900 to-indigo-950",
    Green: "from-emerald-950 via-slate-900 to-teal-950",
    Orange: "from-amber-950 via-slate-900 to-orange-950",
    Emerald: "from-emerald-950 via-slate-900 to-teal-950",
    Amber: "from-amber-950 via-slate-900 to-yellow-950",
    Indigo: "from-indigo-950 via-slate-900 to-slate-950",
    Teal: "from-teal-950 via-slate-900 to-slate-950",
    Violet: "from-violet-950 via-slate-900 to-purple-950",
    Cyan: "from-cyan-950 via-slate-900 to-blue-950",
    Pink: "from-pink-950 via-slate-900 to-rose-950",
    Yellow: "from-yellow-950 via-slate-900 to-amber-950",
    Gray: "from-slate-900 via-gray-900 to-slate-950",
  };
  const heroGradientClass = ((details?.card_gradient || details?.color) && (gradientMap[details?.card_gradient] || gradientMap[details?.color]))
    ? (gradientMap[details?.card_gradient] || gradientMap[details?.color])
    : "from-slate-900 via-indigo-950 to-slate-900";

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Modern Hero Section */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${heroGradientClass} text-white pt-6 pb-12 transition-all duration-300`}>
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-10 -left-20 w-60 h-60 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/courses"
              onClick={(e) => {
                e.preventDefault();
                navigateBack(router, "/courses");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-200 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>

            {isInstructor && (
              <Link
                href={`/course/${courseId}/edit`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-all"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Course
              </Link>
            )}
          </div>
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {isCourseComplete && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold tracking-wide text-emerald-300 uppercase bg-emerald-900/60 border border-emerald-500/50 rounded-md backdrop-blur-sm shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Course Completed
                </span>
              )}
              {details.category && (
                <span className="inline-block px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-indigo-300 uppercase bg-indigo-900/50 border border-indigo-700/50 rounded-md backdrop-blur-sm">
                  {details.category}
                </span>
              )}
              {details.tags && typeof details.tags === 'string' && (
                details.tags.split(',').map((tag: string, idx: number) => {
                  const clean = tag.trim();
                  if (!clean) return null;
                  return (
                    <span key={idx} className="inline-block px-2 py-0.5 text-[11px] font-medium text-indigo-200/90 bg-white/10 border border-white/10 rounded-md backdrop-blur-sm">
                      #{clean}
                    </span>
                  );
                })
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold mb-1.5 leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              {details.title || details.course_name || courseId}
            </h1>
            <p className="text-sm md:text-base text-indigo-100/80 mb-3 max-w-2xl font-light">
              {details.short_introduction || 'Learn the skills you need for your career with comprehensive lessons and expert guidance.'}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium">
              {details.rating && Number(details.rating) > 0 && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded border border-white/10">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{Number(details.rating).toFixed(1)} Rating</span>
                </div>
              )}
              {details.enrollments !== undefined && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded border border-white/10">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>{details.enrollments} Learners</span>
                </div>
              )}
              {details.level && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded border border-white/10">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>{details.level}</span>
                </div>
              )}
              {details.duration && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>{details.duration}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded border border-white/10">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>{details.lessons || 0} Lessons</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-8 w-full -mt-6 relative z-20">

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
                            const isLocked = !isInstructor && !isUserEnrolled && isPaid && !isFree && (lesson.is_locked === true || (!lesson.include_in_preview && lesson.include_in_preview !== 1));
                            const isPreview = !isInstructor && !isUserEnrolled && Boolean(lesson.include_in_preview === 1 || lesson.include_in_preview === true);
                            const isLessonCompleted = isUserEnrolled && (isCourseComplete || progressRecords.some((r: any) => 
                              (r.lesson === lesson.name || r.lesson === lesson.title || r.lesson === lesson.lesson_name) && 
                              (r.status === 'Complete' || r.status === 'Completed' || r.completed === 1)
                            ));

                            return (
                              <li key={lesson.name || lIndex} className="py-3 flex justify-between items-center group/lesson">
                                <div className="flex items-center gap-2.5">
                                  {isLocked ? (
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                      <Lock className="w-3 h-3" />
                                    </div>
                                  ) : isLessonCompleted ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : (
                                    <PlayCircle className="w-4 h-4 text-slate-300 group-hover/lesson:text-indigo-500 transition-colors shrink-0" />
                                  )}
                                  <span className={`text-sm font-medium transition-colors ${isLocked ? "text-slate-500" : isLessonCompleted ? "text-slate-800 font-semibold" : "text-slate-700 group-hover/lesson:text-slate-900"}`}>
                                    {lesson.title || lesson.lesson_name || lesson.name}
                                  </span>
                                  {isLessonCompleted && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full ml-1.5 shadow-2xs">
                                      Completed
                                    </span>
                                  )}
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
                                    {isInstructor ? "Start Lesson" : (isPreview ? "Preview" : "Start")} <ChevronRight className="w-3 h-3" />
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
                        <div className="mt-3 mb-2 flex items-center justify-between">
                          <Link
                            href={`/course/${courseId}/${encodeURIComponent(chapter.name)}/create-lesson`}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors bg-indigo-50/60 px-2.5 py-1.5 rounded-lg border border-indigo-100/60"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Lesson to Chapter
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

          {/* Student Reviews Section */}
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  Course Reviews & Ratings
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isInstructor 
                    ? "Instructor View: Monitor learner feedback and course satisfaction." 
                    : "Share your experience and help fellow students choose."}
                </p>
              </div>

              {/* Student Review Action Button */}
              {!isInstructor && (
                <div>
                  {userExistingReview ? (
                    <button
                      onClick={() => handleDeleteReview(userExistingReview.name)}
                      disabled={reviewDeleting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      {reviewDeleting ? 'Deleting Review...' : 'Delete Your Review'}
                    </button>
                  ) : isUserEnrolled ? (
                    <button
                      onClick={() => {
                        setReviewRating(5);
                        setReviewText('');
                        setReviewErrorMsg(null);
                        setReviewSuccessMsg(null);
                        setIsReviewModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02]"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      Write a Review
                    </button>
                  ) : (
                    <span 
                      title="You must be enrolled in the course to submit a review"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200 cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Enroll to Review
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Average Rating Summary Banner */}
            {reviews.length > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-black text-slate-900 leading-none">
                    {(
                      reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) / reviews.length
                    ).toFixed(1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const avg = reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) / reviews.length;
                        return (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Based on {reviews.length} learner {reviews.length === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                </div>

                {isInstructor && (
                  <span className="self-start sm:self-auto text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Instructor Review Dashboard
                  </span>
                )}
              </div>
            )}

            {/* Reviews Grid */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {paginatedReviews.map((review: any, index: number) => {
                  const authorName = review.owner_details?.full_name || review.owner_details?.username || review.user_name || review.owner || 'Student';
                  const authorUsername = review.owner_details?.username || (review.owner && review.owner.includes('@') ? review.owner.split('@')[0] : null);
                  const authorImage = review.owner_details?.user_image ? getImageUrl(review.owner_details.user_image) : null;
                  const creationDate = formatReviewDate(review.creation);
                  const initialChar = (authorName.trim() || 'S')[0].toUpperCase();

                  const isCurrentUsers = (currentUserEmail && (review.owner === currentUserEmail || review.user === currentUserEmail || review.owner_details?.username === currentUserEmail)) ||
                    (currentUserName && (review.owner_details?.full_name === currentUserName || review.user_name === currentUserName));

                  return (
                    <div 
                      key={review.name || `${review.owner}-${index}`} 
                      className={`p-5 rounded-2xl border transition-all duration-200 relative flex flex-col justify-between shadow-2xs ${
                        isCurrentUsers 
                          ? 'bg-indigo-50/40 border-indigo-200/90 shadow-xs' 
                          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      <div>
                        {/* Rating header & Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3.5 h-3.5 ${i < Math.round(Number(review.rating) || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-slate-800 ml-1 px-1.5 py-0.5 bg-amber-50 rounded-md border border-amber-200/60 text-amber-900">
                              {(Number(review.rating) || 5).toFixed(1)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {creationDate && (
                              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {creationDate}
                              </span>
                            )}
                            {isCurrentUsers && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                                Your Review
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Review Content */}
                        <p className="text-slate-700 text-xs sm:text-sm mb-4 leading-relaxed whitespace-pre-wrap font-normal">
                          "{review.review || review.content}"
                        </p>
                      </div>

                      {/* Author Info footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-auto">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {authorImage ? (
                            <img
                              src={authorImage}
                              alt={authorName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {initialChar}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate text-xs">
                              {authorName}
                            </p>
                            {authorUsername && authorUsername !== authorName && (
                              <p className="text-[10px] text-slate-400 truncate">
                                @{authorUsername}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons (Delete for student's own review, or Instructor) */}
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {(isCurrentUsers || isInstructor) && (
                            <button
                              onClick={() => handleDeleteReview(review.name)}
                              disabled={reviewDeleting}
                              title="Delete review"
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50 flex items-center justify-center disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

                {/* Course Reviews Pagination */}
                <Pagination
                  currentPage={reviewPage}
                  totalPages={totalReviewPages}
                  onPageChange={setReviewPage}
                  totalItems={reviews.length}
                  pageSize={REVIEWS_PER_PAGE}
                  itemName="reviews"
                  hideOnSinglePage={true}
                />
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No reviews yet for this course</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  {isInstructor 
                    ? "As learners complete lessons and engage with the curriculum, their reviews will appear here." 
                    : "Be the first student to review this course and help others learn!"}
                </p>
                {!isInstructor && (
                  isUserEnrolled ? (
                    <button
                      onClick={() => {
                        setReviewRating(5);
                        setReviewText('');
                        setReviewErrorMsg(null);
                        setReviewSuccessMsg(null);
                        setIsReviewModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" /> Write the First Review
                    </button>
                  ) : (
                    <p className="text-xs text-amber-700 font-medium bg-amber-50 py-1.5 px-3 rounded-lg inline-block border border-amber-200">
                      Enroll in this course to be the first to submit a review!
                    </p>
                  )
                )}
              </div>
            )}
          </section>

          {/* Student Review Modal (Create / Update) */}
          {isReviewModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-fade-in-up">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Student Feedback
                      </span>
                      <h3 className="text-lg font-bold mt-1">
                        Rate & Review Course
                      </h3>
                      <p className="text-xs text-indigo-200 mt-0.5 line-clamp-1">
                        {details?.title || courseId}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsReviewModalOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleReviewSubmit} className="p-6 space-y-5">
                  {/* Rating Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Your Rating (1 to 5 Stars)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setReviewRating(star)}
                          className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= (hoverRating || reviewRating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-bold text-slate-800">
                        {hoverRating || reviewRating} / 5
                      </span>
                    </div>
                  </div>

                  {/* Review Text Area */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Your Review & Thoughts
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share what you liked, what you learned, or tips for future students..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-xs font-medium text-slate-800 transition-all"
                    />
                  </div>

                  {/* Success & Error Messages */}
                  {reviewSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{reviewSuccessMsg}</span>
                    </div>
                  )}

                  {reviewErrorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <span className="font-bold">Error:</span>
                      <span>{reviewErrorMsg}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsReviewModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reviewSubmitting || reviewDeleting || !reviewText.trim()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {reviewSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Submitting Review...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Submit Review
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
                                {isSubmitted ? (assignment.status && assignment.status !== 'Pending' ? assignment.status : 'Submitted') : 'Pending'}
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

              {/* Course Thumbnail & Video Preview */}
              {details.image ? (
                <div 
                  onClick={() => {
                    if (details.video_link) setIsVideoModalOpen(true);
                  }}
                  className={`w-full h-48 rounded-xl overflow-hidden mb-5 relative shadow-inner bg-slate-950 flex items-center justify-center group ${details.video_link ? 'cursor-pointer' : ''}`}
                >
                  <img src={getImageUrl(details.image)} alt="" className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-110 pointer-events-none" />
                  <img src={getImageUrl(details.image)} alt="Course Thumbnail" className="relative z-10 max-h-full max-w-full object-contain p-1 group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                  {details.video_link ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:scale-110 transition-all shadow-lg">
                        <PlayCircle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : null}
                  {details.video_link && (
                    <div className="absolute bottom-2.5 left-3 text-[11px] font-bold text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                      <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
                      Watch Preview Video
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  onClick={() => {
                    if (details.video_link) setIsVideoModalOpen(true);
                  }}
                  className={`w-full h-36 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl mb-5 flex items-center justify-center shadow-inner relative group ${details.video_link ? 'cursor-pointer' : ''}`}
                >
                  <BookOpen className="w-10 h-10 text-indigo-300" />
                  {details.video_link && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <PlayCircle className="w-6 h-6" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Price & CTA */}
              <div className="mb-6">
                {isUserEnrolled ? (
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

                {isUserEnrolled && (
                  <div className="mt-4 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        {isCourseComplete ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Course Completed</span>
                          </>
                        ) : (
                          "Your Progress"
                        )}
                      </span>
                      <span className={`text-xs font-bold ${isCourseComplete ? "text-emerald-600" : "text-indigo-600"}`}>
                        {isCourseComplete ? "100%" : `${progressPercent}%`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                          isCourseComplete
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-gradient-to-r from-indigo-500 to-violet-500"
                        }`} 
                        style={{ width: `${isCourseComplete ? 100 : progressPercent}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500 text-center">
                      {isCourseComplete 
                        ? `All ${allOutlineLessons.length || totalLessonsCount || completedLessonsCount} lessons completed` 
                        : `${completedLessonsCount} of ${totalLessonsCount || details.lessons || allOutlineLessons.length || 0} lessons completed`}
                    </p>
                  </div>
                )}

                {isCourseComplete ? (
                  <div className="space-y-2.5 mt-3">
                    <div className="w-full py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Status: Course Completed
                    </div>
                    {hasCertificate && (
                      <Link
                        href="/certificates"
                        className="w-full font-bold py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm transition-all flex justify-center items-center gap-2 text-xs cursor-pointer active:scale-95"
                      >
                        <Award className="w-4 h-4" />
                        View Certificate
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        const firstChapter = outline?.find(c => c.lessons && c.lessons.length > 0) || outline?.[0];
                        const firstLesson = firstChapter?.lessons?.[0];
                        if (firstChapter && firstLesson) {
                          router.push(`/course/${courseId}/${encodeURIComponent(firstChapter.name)}/${encodeURIComponent(firstLesson.name)}`);
                        }
                      }}
                      className="w-full font-semibold py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Review Course Lessons
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (isUserEnrolled) {
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
                    className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 mt-3 flex justify-center items-center gap-2 text-sm disabled:opacity-50 active:scale-95 cursor-pointer ${isUserEnrolled
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-200"
                        : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-200"
                      }`}
                  >
                    {enrollLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isUserEnrolled
                      ? 'Continue Learning'
                      : isPaid && !isFree
                        ? `Buy Now for ${currencySymbol} ${currentPrice.toLocaleString("en-IN")}`
                        : (enrollLoading ? 'Enrolling...' : 'Enroll for Free')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                {isInstructor && (
                  <Link
                    href={`/course/${courseId}/edit`}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-lg transition-all mt-3 flex justify-center items-center gap-2 text-sm border border-slate-200"
                  >
                    <Edit className="w-4 h-4" /> Manage / Edit Course
                  </Link>
                )}
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
                      {details.instructors.map((instructor: any, i: number) => {
                        const instrName = instructor.full_name || instructor.instructor_name || instructor.instructor || instructor.name || 'Instructor';
                        const initial = (instructor.first_name || instrName).charAt(0).toUpperCase();
                        return (
                          <div key={instructor.name || i} className="flex items-center gap-2.5">
                            {instructor.user_image ? (
                              <img src={getImageUrl(instructor.user_image)} alt={instrName} className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm text-xs">
                                {initial}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm leading-tight truncate">{instrName}</p>
                              <p className="text-[11px] text-slate-500">Instructor</p>
                            </div>
                          </div>
                        );
                      })}
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

      {/* Video Preview Modal */}
      {isVideoModalOpen && details.video_link && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-700 animate-fade-in-up">
            <div className="p-4 flex items-center justify-between border-b border-slate-800 text-white">
              <h3 className="font-bold text-sm flex items-center gap-2 truncate">
                <PlayCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>Course Preview: {details.title}</span>
              </h3>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="relative pt-[56.25%] w-full bg-black">
              <iframe
                src={getEmbedUrl(details.video_link) || ''}
                title="Course Preview Video"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-300 py-12 text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium">© 2026 Stridenex Inc. All rights reserved.</p>
        </div>
      </footer>

      {/* Delete Review Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteReviewConfirmName)}
        title="Delete Course Review"
        message="Are you sure you want to delete your course review? This action cannot be undone."
        confirmLabel="Delete Review"
        confirmVariant="danger"
        isLoading={reviewDeleting}
        onConfirm={executeDeleteReview}
        onCancel={() => setDeleteReviewConfirmName(null)}
      />
    </div>
  );
}
