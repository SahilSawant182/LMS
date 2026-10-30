"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getCourse, getCourseDetails, getChapters, getLessons, getReviews, 
  createChapter, createLesson, getCourseProgress, getCourseProgressBar, parseProgressBarValue, getAssignments, 
  getAssignmentSubmissions, enrollInCourse, updateCourse,
  getCourseReviewList, createCourseReview, deleteCourseReview, LMSCourseReview,
  getQuizSubmissions, createStudentCertificate, downloadCertificatePdf, getCertificatePdfUrl
} from '@/services/lms.services';
import { getCourseWithEnrollment } from '@/services/payment.services';
import { getImageUrl, getCurrentUserEmail } from '@/services/api.services';
import { isAuthorizedInstructor, isCourseInstructorOrOwner } from '@/services/auth.services';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { navigateBack } from '@/utils/navigation';
import { compareCurriculumItems } from '@/utils/curriculum';
import {
  PlayCircle, Clock, BookOpen, Users, Award,
  Globe, Tags, ChevronRight, Star, CheckCircle2,
  BookMarked, ArrowLeft, Edit, Plus, Loader2, FileText, CheckCircle,
  MessageSquare, Sparkles, Send, Check, Trash2, Lock, HelpCircle,
  RotateCcw, Trophy, AlertCircle, Download, X
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
  const idMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  );
  if (idMatch && idMatch[1]) {
    return `https://www.youtube.com/embed/${idMatch[1]}?autoplay=1&enablejsapi=1&rel=0`;
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/embed/${trimmed}?autoplay=1&enablejsapi=1&rel=0`;
  }
  return trimmed;
};

const getYouTubeVideoId = (input?: string | null): string | null => {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();
  const urlMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  );
  if (urlMatch) return urlMatch[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
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
  const [allLessonsList, setAllLessonsList] = useState<any[]>([]);
  const [userQuizSubmissions, setUserQuizSubmissions] = useState<any[]>([]);
  const [publishingLoading, setPublishingLoading] = useState(false);

  const handleTogglePublish = async (newPublishedStatus: boolean) => {
    if (!details) return;
    setPublishingLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        ...details,
        name: details.name || courseId,
        course: details.name || courseId,
        course_name: details.name || courseId,
        title: details.title || '',
        published: newPublishedStatus ? 1 : 0,
        status: newPublishedStatus ? "Approved" : "In Progress",
        published_on: newPublishedStatus ? (details.published_on || todayStr) : null,
      };
      await updateCourse(payload);
      setDetails((prev: any) => ({
        ...prev,
        published: newPublishedStatus ? 1 : 0,
        status: newPublishedStatus ? "Approved" : "In Progress",
        published_on: newPublishedStatus ? (details.published_on || todayStr) : null,
      }));
      if (newPublishedStatus) {
        showToast.success("Course published successfully! It is now live in the course catalog.");
      } else {
        showToast.info("Course reverted to draft mode. It is hidden from students.");
      }
      router.refresh();
    } catch (err: any) {
      console.error("Failed to toggle publish status:", err);
      showToast.error(err?.message || "Failed to update course status. Please try again.");
    } finally {
      setPublishingLoading(false);
    }
  };

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

  // Certificate Generation State for Student Role
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [createdCertificate, setCreatedCertificate] = useState<any>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certPdfBlobUrl, setCertPdfBlobUrl] = useState<string | null>(null);
  const [certPdfLoading, setCertPdfLoading] = useState(false);

  const handleGenerateCertificate = async () => {
    setGeneratingCertificate(true);
    try {
      const res = await createStudentCertificate({
        course: courseId,
      });
      const certData = res?.message?.data || res?.data?.message || res?.data || res?.message || res;
      setCreatedCertificate(certData);
      showToast.success('Certificate generated successfully!');

      const certName = certData?.name || (typeof certData === 'string' ? certData : '') || details?.certificate || '';
      const certTemplate = certData?.template || certData?.format || 'StrideNEX Creative Pathways';
      if (certName) {
        const url = getCertificatePdfUrl(certName, certTemplate);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      console.error('Failed to generate certificate:', err);
      const errMsg =
        err?.response?.data?.message?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to generate certificate.';
      showToast.error(errMsg);
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const handleOpenCertificate = (certName: string, format?: string) => {
    const url = getCertificatePdfUrl(certName, format || 'StrideNEX Creative Pathways');
    window.open(url, '_blank', 'noopener,noreferrer');
  };
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
        const isAuth = isAuthorizedInstructor();
        setIsInstructor(isAuth);
        const email = getCurrentUserEmail() || localStorage.getItem("userEmail") || "";
        const name = localStorage.getItem("fullName") || "";
        setCurrentUserEmail(email);
        setCurrentUserName(name);
      } catch (e) {}
    };
    checkRoles();
    fetchCourseData();

    const handleDataChanged = () => {
      fetchCourseData(true);
    };
    window.addEventListener("chapter-created", handleDataChanged);
    window.addEventListener("lesson-completed", handleDataChanged);
    window.addEventListener("storage", handleDataChanged);

    const refreshQuizzes = async () => {
      const email = getCurrentUserEmail() || (typeof window !== 'undefined' ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "");
      try {
        const subs: any = await getQuizSubmissions({ member: email });
        const raw = Array.isArray(subs) ? subs : (subs?.message?.data || subs?.data?.message || subs?.data || subs?.message || []);
        if (Array.isArray(raw)) {
          setUserQuizSubmissions(raw);
        }
      } catch (err) {
        console.warn("Could not refresh quiz submissions on focus/storage:", err);
      }
    };
    window.addEventListener('focus', refreshQuizzes);

    return () => {
      window.removeEventListener("chapter-created", handleDataChanged);
      window.removeEventListener("lesson-completed", handleDataChanged);
      window.removeEventListener("storage", handleDataChanged);
      window.removeEventListener('focus', refreshQuizzes);
    };
  }, [courseId]);

  const fetchCourseData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const email = typeof window !== 'undefined' ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "";
      const [detailsRes, outlineRes, reviewsRes, lessonsRes, progressRes, progressBarRes, assignmentsRes, submissionsRes, courseReviewsRes, enrollRes, quizSubmissionsRes] = await Promise.allSettled([
        getCourse(courseId),
        getChapters({ course: courseId }),
        getReviews({ course: courseId }),
        getLessons({ course: courseId }),
        getCourseProgress(courseId, email),
        getCourseProgressBar({ course: courseId, member: email }),
        getAssignments(),
        getAssignmentSubmissions(),
        getCourseReviewList({ course: courseId }),
        getCourseWithEnrollment(courseId),
        getQuizSubmissions({ member: email })
      ]);

      const currentIsInstructor = isAuthorizedInstructor();
      setIsInstructor(currentIsInstructor);

      if (quizSubmissionsRes.status === 'fulfilled' && quizSubmissionsRes.value) {
        const rawSubs: any = quizSubmissionsRes.value;
        const unwrappedSubs = Array.isArray(rawSubs)
          ? rawSubs
          : (rawSubs?.message?.data || rawSubs?.data?.message || rawSubs?.data || rawSubs?.message || []);
        setUserQuizSubmissions(Array.isArray(unwrappedSubs) ? unwrappedSubs : []);
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
        
        let userIsEnrolled = false;
        if (enrollRes.status === 'fulfilled' && enrollRes.value) {
          userIsEnrolled = Boolean(enrollRes.value.is_enrolled);
        } else if (d && d.membership) {
          userIsEnrolled = true;
        }

        // Ensure student cannot receive instructor permissions
        if (!currentIsInstructor) {
          setIsInstructor(false);
        } else if (userIsEnrolled) {
          const currentEmail = (email || '').trim().toLowerCase();
          const instructors = Array.isArray(d?.instructors) ? d.instructors : [];
          const isAssigned = instructors.some((inst: any) => {
            const iEmail = String(inst?.instructor || inst?.name || inst?.email || inst?.user || '').trim().toLowerCase();
            return iEmail && iEmail === currentEmail;
          });
          setIsInstructor(isAssigned);
        } else {
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
        setAllLessonsList(lessonsArray);
      }

      const enrollLessonsMap = new Map<string, any>();
      if (enrollRes.status === 'fulfilled' && enrollRes.value) {
        const eChapters = (enrollRes.value as any).chapters || [];
        if (Array.isArray(eChapters)) {
          eChapters.forEach((ch: any) => {
            if (Array.isArray(ch.lessons)) {
              ch.lessons.forEach((l: any) => {
                if (l.name) enrollLessonsMap.set(String(l.name).trim().toLowerCase(), l);
                if (l.title) enrollLessonsMap.set(String(l.title).trim().toLowerCase(), l);
                if (l.lesson_name) enrollLessonsMap.set(String(l.lesson_name).trim().toLowerCase(), l);
              });
            }
          });
        }
      }

      const courseObj = detailsRes.status === 'fulfilled'
        ? (detailsRes.value?.data || detailsRes.value?.message?.data || detailsRes.value?.message || detailsRes.value)
        : null;

      const rawOutline = outlineRes.status === 'fulfilled' ? outlineRes.value : null;
      const outlineChapters: any[] = Array.isArray(rawOutline)
        ? rawOutline
        : (rawOutline?.message?.data || rawOutline?.data?.message || rawOutline?.data || rawOutline?.message || []);

      const courseChapters: any[] = (courseObj && Array.isArray(courseObj.chapters)) ? courseObj.chapters : [];
      const enrollChapters: any[] = (enrollRes.status === 'fulfilled' && enrollRes.value && Array.isArray((enrollRes.value as any).chapters))
        ? (enrollRes.value as any).chapters
        : [];

      const hasLessons = (arr: any[]) => Array.isArray(arr) && arr.some((ch: any) => Array.isArray(ch?.lessons) && ch.lessons.length > 0);

      let baseChapters: any[] = [];
      if (hasLessons(enrollChapters)) {
        baseChapters = enrollChapters;
      } else if (hasLessons(courseChapters)) {
        baseChapters = courseChapters;
      } else if (hasLessons(outlineChapters)) {
        baseChapters = outlineChapters;
      } else if (enrollChapters.length > 0) {
        baseChapters = enrollChapters;
      } else if (courseChapters.length > 0) {
        baseChapters = courseChapters;
      } else if (outlineChapters.length > 0) {
        baseChapters = outlineChapters;
      }

      if (baseChapters.length > 0) {
        // Sort chapters consistently using sequence numbers, creation timestamp, and title numbering
        const sortedChapters = [...baseChapters].sort(compareCurriculumItems);
        const allSourceChapters = [...enrollChapters, ...courseChapters, ...outlineChapters];

        const mergedOutline = sortedChapters.map(chapter => {
          let chLessons: any[] = Array.isArray(chapter.lessons) && chapter.lessons.length > 0 ? chapter.lessons : [];

          if (chLessons.length === 0) {
            const matchCh = allSourceChapters.find((otherCh: any) => {
              if (!otherCh) return false;
              const oName = String(otherCh.name || '').trim().toLowerCase();
              const oTitle = String(otherCh.title || otherCh.chapter_name || '').trim().toLowerCase();
              const cName = String(chapter.name || '').trim().toLowerCase();
              const cTitle = String(chapter.title || chapter.chapter_name || '').trim().toLowerCase();
              return (cName && (oName === cName || oTitle === cName)) || (cTitle && (oName === cTitle || oTitle === cTitle));
            });
            if (matchCh && Array.isArray(matchCh.lessons) && matchCh.lessons.length > 0) {
              chLessons = matchCh.lessons;
            }
          }

          if (chLessons.length === 0 && lessonsArray.length > 0) {
            chLessons = lessonsArray.filter((l: any) => {
              const lCh = String(l?.chapter || '').trim().toLowerCase();
              const cName = String(chapter?.name || '').trim().toLowerCase();
              const cTitle = String(chapter?.title || chapter?.chapter_name || '').trim().toLowerCase();
              return lCh && (lCh === cName || lCh === cTitle);
            });
          }

          // Sort lessons inside this chapter consistently by sequence, creation timestamp, and title numbering
          const sortedLessons = [...chLessons].sort(compareCurriculumItems);

          return {
            ...chapter,
            lessons: sortedLessons.map(lesson => {
              const lKey = String(lesson.name || '').trim().toLowerCase();
              const lTitleKey = String(lesson.title || lesson.lesson_name || '').trim().toLowerCase();
              const fromEnroll = enrollLessonsMap.get(lKey) || (lTitleKey ? enrollLessonsMap.get(lTitleKey) : null);
              const lFull = lessonsArray.find((la: any) => {
                const laName = String(la?.name || '').trim().toLowerCase();
                const laTitle = String(la?.title || la?.lesson_name || '').trim().toLowerCase();
                return (lKey && (laName === lKey || laTitle === lKey)) || (lTitleKey && (laName === lTitleKey || laTitle === lTitleKey));
              });
              const isComp = Boolean(
                (fromEnroll && (fromEnroll.is_complete === 1 || fromEnroll.is_complete === true || fromEnroll.completed === 1 || fromEnroll.completed === true || fromEnroll.status === 'Complete' || fromEnroll.status === 'Completed')) ||
                (lesson && (lesson.is_complete === 1 || lesson.is_complete === true || lesson.completed === 1 || lesson.completed === true || lesson.status === 'Complete' || lesson.status === 'Completed')) ||
                (lFull && (lFull.is_complete === 1 || lFull.is_complete === true || lFull.completed === 1 || lFull.completed === true || lFull.status === 'Complete' || lFull.status === 'Completed'))
              );
              return {
                ...lesson,
                ...(lFull || {}),
                chapter: lesson.chapter || chapter.name,
                is_locked: currentIsInstructor ? false : (fromEnroll?.is_locked !== undefined ? fromEnroll.is_locked : lesson.is_locked),
                include_in_preview: fromEnroll?.include_in_preview !== undefined ? fromEnroll.include_in_preview : lesson.include_in_preview,
                is_complete: isComp ? 1 : (fromEnroll?.is_complete !== undefined ? fromEnroll.is_complete : (lesson.is_complete !== undefined ? lesson.is_complete : 0)),
                completed: isComp ? 1 : (fromEnroll?.completed !== undefined ? fromEnroll.completed : (lesson.completed !== undefined ? lesson.completed : 0)),
                status: isComp ? 'Complete' : (fromEnroll?.status || lesson.status),
              };
            })
          };
        });

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
            if (typeof window !== "undefined" && userEmail) {
              try {
                const userKeys = [
                  `lms_submission_${userEmail}_${a.name}`,
                  `lms_submission_${userEmail}_${a.title}`,
                  `lms_submission_${userEmail}_${aName}`,
                  `lms_submission_${userEmail}_${aTitle}`,
                ].filter(Boolean);

                hasLocalSub = userKeys.some(k => {
                  const raw = localStorage.getItem(k);
                  if (!raw) return false;
                  try {
                    const parsed = JSON.parse(raw);
                    return Boolean(parsed?.status === 'Submitted' || parsed?.status === 'Graded' || parsed?.submitted_at || parsed?._is_submitted);
                  } catch {
                    return false;
                  }
                });
              } catch (e) {}
            }

            const sub = subList.find((s: any) => {
              const sAss = String(s.assignment || '').trim().toLowerCase();
              const sTitle = String(s.assignment_title || '').trim().toLowerCase();
              const matches = sAss === aName || (aTitle && sTitle === aTitle);
              if (!matches) return false;
              if (!userEmail) return false;
              const sMember = String(s.member || s.owner || s.member_name || s.user || '').trim().toLowerCase();
              return Boolean(sMember && (sMember === userEmail || sMember.includes(userEmail) || userEmail.includes(sMember)));
            });

            const isSub = Boolean(sub || hasLocalSub);
            const resolvedStatus = isSub ? ((sub?.status && sub.status !== 'Pending') ? sub.status : 'Submitted') : 'Pending';

            return {
              ...a,
              status: resolvedStatus,
              _is_submitted: isSub,
              submission_name: sub?.name
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
  const progressRecords = Array.isArray(normalizedProgress)
    ? normalizedProgress
    : (Array.isArray(normalizedProgress?.records)
        ? normalizedProgress.records
        : (Array.isArray(normalizedProgress?.data?.records)
            ? normalizedProgress.data.records
            : (Array.isArray(progress?.data)
                ? progress.data
                : (Array.isArray(progress?.message) ? progress.message : []))));

  // High-confidence course-level completion checks (consistent with Student Dashboard and Frappe LMS)
  const pbIsComplete = Boolean(
    parsedPB?.isCompleted ||
    (parsedPB !== null && (parsedPB.percent || 0) >= 100) ||
    (parsedPB !== null && (parsedPB.totalLessons || 0) > 0 && (parsedPB.completedLessons || 0) >= (parsedPB.totalLessons || 0))
  );

  const enrollIsComplete = Boolean(
    enrollmentData?.status === 'Completed' ||
    enrollmentData?.status === 'Complete' ||
    (enrollmentData?.progress !== undefined && Number(enrollmentData.progress) >= 100) ||
    (Number(enrollmentData?.completed_lessons || 0) > 0 && Number(enrollmentData?.total_lessons || 0) > 0 && Number(enrollmentData?.completed_lessons) >= Number(enrollmentData?.total_lessons)) ||
    details?.membership?.status === 'Completed' ||
    details?.membership?.status === 'Complete' ||
    (details?.membership?.progress !== undefined && Number(details.membership.progress) >= 100) ||
    normalizedProgress?.status === 'Completed' ||
    normalizedProgress?.status === 'Complete' ||
    (normalizedProgress?.progress !== undefined && Number(normalizedProgress.progress) >= 100) ||
    (normalizedProgress?.progress_percentage !== undefined && Number(normalizedProgress.progress_percentage) >= 100)
  );

  const localIsComplete = typeof window !== 'undefined' && Boolean(
    (currentUserEmail && localStorage.getItem(`lms_course_completed_${currentUserEmail}_${courseId}`) === 'true') ||
    localStorage.getItem(`lms_course_completed_${courseId}`) === 'true'
  );

  const getLessonQuizIds = (lesson: any): string[] => {
    if (!lesson) return [];
    const ids = new Set<string>();

    const directQuiz = lesson.quiz || lesson.quiz_id || lesson.lms_quiz || (lesson as any).quiz_name;
    if (directQuiz && typeof directQuiz === 'string' && directQuiz.trim()) {
      ids.add(directQuiz.trim());
    }

    let content = lesson.content;
    if (!content && Array.isArray(allLessonsList) && allLessonsList.length > 0) {
      const lName = String(lesson.name || '').trim().toLowerCase();
      const lTitle = String(lesson.title || lesson.lesson_name || '').trim().toLowerCase();
      const matched = allLessonsList.find((al: any) => {
        const alName = String(al?.name || '').trim().toLowerCase();
        const alTitle = String(al?.title || al?.lesson_name || '').trim().toLowerCase();
        return (lName && (alName === lName || alTitle === lName)) || (lTitle && (alName === lTitle || alTitle === lTitle));
      });
      if (matched) {
        if (!directQuiz && (matched.quiz || matched.quiz_id || matched.lms_quiz)) {
          ids.add(String(matched.quiz || matched.quiz_id || matched.lms_quiz).trim());
        }
        content = matched.content;
      }
    }

    if (content) {
      let parsedContent: any = null;
      if (typeof content === 'string') {
        try {
          parsedContent = JSON.parse(content);
        } catch {
          parsedContent = null;
        }
      } else if (typeof content === 'object') {
        parsedContent = content;
      }

      if (parsedContent && Array.isArray(parsedContent.blocks)) {
        parsedContent.blocks.forEach((b: any) => {
          if (b && (b.type === 'quiz' || b.type === 'Quiz')) {
            const qId = b.data?.quiz || b.data?.quiz_id || b.data?.id || b.data?.name;
            if (qId && typeof qId === 'string' && qId.trim()) {
              ids.add(qId.trim());
            }
          }
        });
      }

      if (typeof content === 'string') {
        const matchQuizBlock = content.match(/class=["'][^"']*quiz-block[^"']*["'][^>]*data-id=["']([^"']+)["']/i);
        if (matchQuizBlock && matchQuizBlock[1]) {
          ids.add(matchQuizBlock[1].trim());
        }
      }
    }

    return Array.from(ids);
  };

  const isQuizCompleted = (quizId: string) => {
    if (!quizId) return false;
    const cleanQId = String(quizId).trim().toLowerCase();
    const email = (currentUserEmail || (typeof window !== 'undefined' ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "")).trim().toLowerCase();

    if (typeof window !== 'undefined' && email) {
      if (
        localStorage.getItem(`lms_quiz_completed_${email}_${cleanQId}`) === 'true' ||
        localStorage.getItem(`lms_quiz_${email}_${cleanQId}_completed`) === 'true' ||
        localStorage.getItem(`lms_quiz_completed_${cleanQId}`) === 'true'
      ) {
        return true;
      }
    }

    if (Array.isArray(userQuizSubmissions) && userQuizSubmissions.length > 0) {
      return userQuizSubmissions.some((sub: any) => {
        const subQuiz = String(sub?.quiz || sub?.quiz_id || sub?.name || '').trim().toLowerCase();
        const subStatus = String(sub?.status || '').trim().toLowerCase();
        const subScore = Number(sub?.score ?? sub?.percentage ?? 0);
        const subPassing = Number(sub?.passing_percentage ?? 0);
        const isPassed = subStatus === 'passed' || subStatus === 'completed' || subStatus === 'submitted' || (subScore >= subPassing && subScore > 0);
        return subQuiz === cleanQId && isPassed;
      });
    }

    return false;
  };

  const isLessonQuizComplete = (lessonItem: any): boolean => {
    if (!lessonItem) return true;
    const quizIds = getLessonQuizIds(lessonItem);
    if (quizIds.length === 0) return true;
    return quizIds.every(qId => isQuizCompleted(qId));
  };

  const hasIncompleteQuizzesInCourse = !isInstructor && allOutlineLessons.some(l => !isLessonQuizComplete(l));

  useEffect(() => {
    if (hasIncompleteQuizzesInCourse && typeof window !== 'undefined') {
      const email = currentUserEmail || localStorage.getItem("userEmail") || "";
      if (email) {
        localStorage.removeItem(`lms_course_completed_${email}_${courseId}`);
      }
      localStorage.removeItem(`lms_course_completed_${courseId}`);
      try {
        localStorage.setItem(`lms_course_has_incomplete_quizzes_${courseId}`, 'true');
      } catch {}
    } else if (!hasIncompleteQuizzesInCourse && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`lms_course_has_incomplete_quizzes_${courseId}`);
      } catch {}
    }
  }, [hasIncompleteQuizzesInCourse, currentUserEmail, courseId]);

  const courseLevelComplete = !hasIncompleteQuizzesInCourse && (pbIsComplete || enrollIsComplete || localIsComplete);

  const enrollLessonsLookupMap = (() => {
    const map = new Map<string, any>();
    const eChapters = (enrollmentData as any)?.chapters || [];
    if (Array.isArray(eChapters)) {
      eChapters.forEach((ch: any) => {
        if (Array.isArray(ch?.lessons)) {
          ch.lessons.forEach((l: any) => {
            if (l?.name) map.set(String(l.name).trim().toLowerCase(), l);
            if (l?.title) map.set(String(l.title).trim().toLowerCase(), l);
            if (l?.lesson_name) map.set(String(l.lesson_name).trim().toLowerCase(), l);
          });
        }
      });
    }
    return map;
  })();

  const getAllUserIdentifiers = (): string[] => {
    if (typeof window === 'undefined') return [];
    const list = new Set<string>();
    const add = (val: any) => {
      if (!val || typeof val !== 'string') return;
      const s = val.trim();
      if (!s) return;
      list.add(s);
      list.add(s.toLowerCase());
    };
    add(getCurrentUserEmail());
    add(currentUserEmail);
    add(localStorage.getItem("userEmail"));
    add(localStorage.getItem("user"));
    add(localStorage.getItem("email"));
    add(localStorage.getItem("user_email"));
    add(sessionStorage.getItem("userEmail"));
    add(sessionStorage.getItem("user"));
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser && rawUser.startsWith("{")) {
        const parsed = JSON.parse(rawUser);
        add(parsed.email);
        add(parsed.name);
        add(parsed.username);
      }
    } catch {}
    return Array.from(list);
  };

  const getLessonAllIdentifiers = (lesson: any, allLessons: any[] = []): string[] => {
    if (!lesson) return [];
    const set = new Set<string>();
    const add = (val: any) => {
      if (!val || typeof val !== 'string') return;
      const s = val.trim();
      if (!s) return;
      set.add(s);
      set.add(s.toLowerCase());
      const slug = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (slug) set.add(slug);
    };

    add(lesson.name);
    add(lesson.title);
    add(lesson.lesson_name);
    add(lesson.id);
    add(lesson.lessonName);

    if (Array.isArray(allLessons) && allLessons.length > 0) {
      const lName = String(lesson.name || '').trim().toLowerCase();
      const lTitle = String(lesson.title || lesson.lesson_name || '').trim().toLowerCase();
      const full = allLessons.find((item: any) => {
        const iName = String(item?.name || '').trim().toLowerCase();
        const iTitle = String(item?.title || item?.lesson_name || '').trim().toLowerCase();
        return (lName && (iName === lName || iTitle === lName)) ||
               (lTitle && (iName === lTitle || iTitle === lTitle));
      });
      if (full) {
        add(full.name);
        add(full.title);
        add(full.lesson_name);
        add(full.id);
      }
    }
    return Array.from(set);
  };

  const checkOutlineLessonComplete = (l: any) => {
    if (!l) return false;
    // 0. A student cannot complete a lesson if its quiz is not completed
    if (!isInstructor && !isLessonQuizComplete(l)) {
      return false;
    }

    // 1. If course is complete at course-level, every syllabus lesson is completed
    if (courseLevelComplete) return true;

    // 2. Direct property flags on lesson object
    if (
      l.is_complete === 1 ||
      l.is_complete === true ||
      l.completed === 1 ||
      l.completed === true ||
      l.status === 'Complete' ||
      l.status === 'Completed'
    ) {
      return true;
    }

    const identifiers = getLessonAllIdentifiers(l, allLessonsList);
    const lName = String(l.name || '').trim().toLowerCase();
    const lTitle = String(l.title || l.lesson_name || '').trim().toLowerCase();

    // 3. Check enrollment data lessons lookup map
    const fromMap = (lName ? enrollLessonsLookupMap.get(lName) : null) || (lTitle ? enrollLessonsLookupMap.get(lTitle) : null);
    if (
      fromMap &&
      (fromMap.is_complete === 1 ||
        fromMap.is_complete === true ||
        fromMap.completed === 1 ||
        fromMap.completed === true ||
        fromMap.status === 'Complete' ||
        fromMap.status === 'Completed')
    ) {
      return true;
    }

    // 4. Check localStorage for local completion flag across all identifier & email permutations
    if (typeof window !== 'undefined') {
      // 4a. Check generic keys (no email required)
      const genericMatch = identifiers.some(id => 
        localStorage.getItem(`lms_lesson_${id}_completed`) === 'true' ||
        localStorage.getItem(`lms_lesson_${courseId}_${id}_completed`) === 'true'
      );
      if (genericMatch) return true;

      // 4b. Check email-scoped keys across all user identifiers
      const userEmails = getAllUserIdentifiers();
      for (const em of userEmails) {
        const emailMatch = identifiers.some(id =>
          localStorage.getItem(`lms_lesson_${em}_${id}_completed`) === 'true' ||
          localStorage.getItem(`lms_lesson_${em}_${courseId}_${id}_completed`) === 'true'
        );
        if (emailMatch) return true;
      }

      // 4c. Scan localStorage keys for any lesson completion match
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('lms_lesson_') && k.endsWith('_completed')) {
            if (localStorage.getItem(k) === 'true') {
              const kLower = k.toLowerCase();
              if (identifiers.some(id => id.length > 2 && kLower.includes(id))) {
                return true;
              }
            }
          }
        }
      } catch {}
    }

    // 5. Check progress records returned by API
    if (Array.isArray(progressRecords) && progressRecords.length > 0) {
      const recordMatch = progressRecords.some((r: any) => {
        if (!r) return false;
        if (typeof r === 'string') {
          const rStr = r.trim().toLowerCase();
          return identifiers.includes(rStr);
        }
        const isCompleteStatus =
          r.status === 'Complete' ||
          r.status === 'Completed' ||
          r.completed === 1 ||
          r.completed === '1' ||
          r.is_complete === 1 ||
          r.is_complete === true ||
          r.is_completed === 1 ||
          !r.status;
        if (!isCompleteStatus) return false;

        const rIds = [
          String(r.lesson || '').trim().toLowerCase(),
          String(r.lesson_name || '').trim().toLowerCase(),
          String(r.title || '').trim().toLowerCase(),
          String(r.name || '').trim().toLowerCase(),
          String(r.id || '').trim().toLowerCase(),
          String(r.lesson_title || '').trim().toLowerCase(),
        ].filter(Boolean);

        return identifiers.some(id => rIds.includes(id));
      });
      if (recordMatch) return true;
    }

    // 6. Sequential completed count fallback from backend progress bar or enrollment
    const backendCompleted = Math.max(
      parsedPB?.completedLessons || 0,
      Number(enrollmentData?.completed_lessons || 0),
      Number(details?.membership?.completed_lessons || 0),
      Number(normalizedProgress?.completed_lessons || 0)
    );
    const backendPercent = Math.max(
      parsedPB?.percent || 0,
      Number(enrollmentData?.progress || 0),
      Number(details?.membership?.progress || 0),
      Number(normalizedProgress?.progress || 0)
    );
    const percentCount = allOutlineLessons.length > 0 && backendPercent > 0
      ? Math.floor((backendPercent / 100) * allOutlineLessons.length)
      : 0;
    const effectiveCompletedCount = Math.max(backendCompleted, percentCount);

    if (effectiveCompletedCount > 0 && allOutlineLessons.length > 0) {
      const lessonIdx = allOutlineLessons.findIndex((ol: any) => {
        const olIds = getLessonAllIdentifiers(ol, allLessonsList);
        return identifiers.some(id => olIds.includes(id));
      });
      if (lessonIdx >= 0 && lessonIdx < effectiveCompletedCount) {
        return true;
      }
    }

    return false;
  };

  // Helper to determine the appropriate starting point for "Continue Learning"
  const getContinueLearningTarget = () => {
    const chaptersSource = (outline && outline.length > 0)
      ? outline
      : (details && Array.isArray(details.chapters) && details.chapters.length > 0)
        ? details.chapters
        : (enrollmentData && Array.isArray((enrollmentData as any).chapters) && (enrollmentData as any).chapters.length > 0)
          ? (enrollmentData as any).chapters
          : [];

    if (!chaptersSource || chaptersSource.length === 0) return null;

    // Flatten all lessons across chapters in exact curriculum sequence
    const flatOutline: { chapter: any; lesson: any }[] = [];
    for (const chapter of chaptersSource) {
      if (Array.isArray(chapter.lessons)) {
        for (const lesson of chapter.lessons) {
          flatOutline.push({ chapter, lesson });
        }
      }
    }

    if (flatOutline.length === 0) return null;

    // 1. Check if backend explicitly indicates resume/current lesson in membership or progress
    const backendLessonId = 
      details?.membership?.current_lesson ||
      enrollmentData?.current_lesson ||
      normalizedProgress?.current_lesson ||
      normalizedProgress?.next_lesson;

    if (backendLessonId) {
      const foundIdx = flatOutline.findIndex(item => 
        item.lesson.name === backendLessonId || 
        item.lesson.title === backendLessonId ||
        item.lesson.lesson_name === backendLessonId
      );
      if (foundIdx !== -1) {
        // Verify all preceding lessons are completed so student is never sent to a locked lesson
        const allPrecedingDone = flatOutline.slice(0, foundIdx).every(item => checkOutlineLessonComplete(item.lesson));
        if (allPrecedingDone) {
          const foundItem = flatOutline[foundIdx];
          if (!checkOutlineLessonComplete(foundItem.lesson)) {
            return foundItem;
          }
          if (foundIdx < flatOutline.length - 1 && checkOutlineLessonComplete(foundItem.lesson)) {
            return flatOutline[foundIdx + 1];
          }
        }
      }
    }

    // 2. Find the FIRST uncompleted lesson in curriculum sequence (the appropriate unlocked starting point)
    const firstUncompleted = flatOutline.find(item => !checkOutlineLessonComplete(item.lesson));
    if (firstUncompleted) {
      return firstUncompleted;
    }

    // 3. If all lessons are completed, start at the first lesson for review
    return flatOutline[0];
  };

  const actualCompletedOutlineCount = courseLevelComplete && allOutlineLessons.length > 0
    ? allOutlineLessons.length
    : allOutlineLessons.filter(l => checkOutlineLessonComplete(l)).length;

  const isAllOutlineLessonsComplete = allOutlineLessons.length > 0 && !hasIncompleteQuizzesInCourse && (courseLevelComplete || allOutlineLessons.every(l => checkOutlineLessonComplete(l)));

  const isCourseComplete = Boolean(courseLevelComplete || isAllOutlineLessonsComplete);

  const totalLessonsCount = allOutlineLessons.length > 0
    ? allOutlineLessons.length
    : (parsedPB?.totalLessons || Number(normalizedProgress.total_lessons || enrollmentData?.total_lessons || details?.lessons || 0));

  const completedLessonsCount = isCourseComplete
    ? (totalLessonsCount > 0 ? totalLessonsCount : Math.max(allOutlineLessons.length, parsedPB?.totalLessons || 0, 1))
    : Math.max(actualCompletedOutlineCount, parsedPB?.completedLessons || 0, Number(enrollmentData?.completed_lessons || 0));

  const calculatedPercent = totalLessonsCount > 0 && actualCompletedOutlineCount > 0
    ? Math.min(100, Math.round((actualCompletedOutlineCount / totalLessonsCount) * 100))
    : 0;
  const pbPercent = parsedPB?.percent ?? 0;
  const enrollPercent = Number(enrollmentData?.progress || details?.membership?.progress || normalizedProgress?.progress || normalizedProgress?.progress_percentage || 0);

  const progressPercent = isCourseComplete
    ? 100
    : Math.min(99, Math.max(calculatedPercent, pbPercent, enrollPercent));

  const isUserEnrolled = Boolean(
    isEnrolled ||
    isCourseComplete ||
    enrollmentData?.is_enrolled ||
    (parsedPB !== null && ((parsedPB.completedLessons || 0) > 0 || (parsedPB.percent || 0) > 0 || parsedPB.isCompleted)) ||
    (Array.isArray(progressRecords) && progressRecords.length > 0) ||
    details?.membership
  );

  const canManageCourse = isInstructor && isCourseInstructorOrOwner(details, currentUserEmail);

  // Helper to check if a lesson is locked sequentially for students
  const isLessonSequentiallyLocked = (lessonItem: any) => {
    if (isInstructor) return false;
    if (isCourseComplete) return false;
    if (!isUserEnrolled) return false; // Non-enrolled users are handled by preview/paywall logic

    const itemIds = getLessonAllIdentifiers(lessonItem, allLessonsList);
    const lessonIdx = allOutlineLessons.findIndex((ol: any) => {
      const olIds = getLessonAllIdentifiers(ol, allLessonsList);
      return itemIds.some(id => olIds.includes(id));
    });

    if (lessonIdx <= 0) return false; // First lesson is always unlocked

    for (let i = 0; i < lessonIdx; i++) {
      if (!checkOutlineLessonComplete(allOutlineLessons[i])) {
        return true;
      }
    }
    return false;
  };

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

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Draft Course Notice & Quick Publish Banner */}
      {canManageCourse && details && !details.published && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white shadow-md border-b border-amber-600/40 relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/25 text-white flex items-center gap-1 shadow-xs shrink-0">
                <Lock className="w-3 h-3" /> Draft Course
              </span>
              <p className="text-xs sm:text-sm font-semibold text-amber-50">
                This course is currently saved as a draft and is hidden from students. Click publish to make it live in the catalog.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => handleTogglePublish(true)}
                disabled={publishingLoading}
                className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-amber-50 text-amber-950 font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {publishingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-900" /> : <Globe className="w-3.5 h-3.5 text-emerald-600" />}
                <span>Publish Course Now</span>
              </button>
              <Link
                href={`/course/${courseId}/edit`}
                className="px-3 py-2 bg-amber-700/60 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Link>
            </div>
          </div>
        </div>
      )}

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

            {canManageCourse && Boolean(details?.published) ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold tracking-wide text-emerald-200 uppercase bg-emerald-900/60 border border-emerald-500/50 rounded-lg backdrop-blur-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Published
                </span>
                <Link
                  href={`/course/${courseId}/edit`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-all"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Course
                </Link>
              </div>
            ) : null}
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
              {canManageCourse ? (
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
              ) : (
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
                            const isPaywallLocked = !isInstructor && !isUserEnrolled && isPaid && !isFree && (lesson.is_locked === true || (!lesson.include_in_preview && lesson.include_in_preview !== 1));
                            const isSequentialLocked = isLessonSequentiallyLocked(lesson);
                            const isLocked = isPaywallLocked || isSequentialLocked;
                            const isPreview = !isInstructor && !isUserEnrolled && Boolean(lesson.include_in_preview === 1 || lesson.include_in_preview === true);
                            const isLessonQuizDone = isLessonQuizComplete(lesson);
                            const isLessonCompleted = isUserEnrolled && (isInstructor || isLessonQuizDone) && (isCourseComplete || checkOutlineLessonComplete(lesson));
                            const lessonQuizIds = getLessonQuizIds(lesson);
                            const hasQuiz = lessonQuizIds.length > 0;

                            const lessonHref = `/course/${courseId}/${encodeURIComponent(chapter.name)}/${encodeURIComponent(lesson.name)}`;

                            return (
                              <li key={lesson.name || lIndex} className="py-3 flex justify-between items-center group/lesson">
                                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                                  {isLocked ? (
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                      <Lock className="w-3 h-3 text-slate-400" />
                                    </div>
                                  ) : isLessonCompleted ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : (
                                    <PlayCircle className="w-4 h-4 text-slate-300 group-hover/lesson:text-indigo-500 transition-colors shrink-0" />
                                  )}
                                  {isLocked ? (
                                    <span className="text-sm font-medium text-slate-400 cursor-not-allowed truncate">
                                      {lesson.title || lesson.lesson_name || lesson.name}
                                    </span>
                                  ) : (
                                    <Link
                                      href={lessonHref}
                                      className={`text-sm font-medium transition-colors truncate hover:text-indigo-600 ${isLessonCompleted ? "text-slate-800 font-semibold" : "text-slate-700 hover:text-slate-900"}`}
                                    >
                                      {lesson.title || lesson.lesson_name || lesson.name}
                                    </Link>
                                  )}
                                  {isLessonCompleted && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full ml-1.5 shrink-0 shadow-2xs">
                                      Completed
                                    </span>
                                  )}
                                  {hasQuiz && !isInstructor && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-1.5 shrink-0 flex items-center gap-1 ${
                                      isLessonQuizDone 
                                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80 shadow-2xs' 
                                        : 'text-amber-700 bg-amber-50 border border-amber-200/80 shadow-2xs'
                                    }`}>
                                      {isLessonQuizDone ? 'Quiz ✓' : 'Quiz Required'}
                                    </span>
                                  )}
                                  {isPreview && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full ml-1.5 shrink-0 shadow-xs">
                                      Free Preview
                                    </span>
                                  )}
                                </div>

                                {isPaywallLocked ? (
                                  <button
                                    onClick={() => router.push(`/checkout?item_type=course&item_id=${encodeURIComponent(courseId)}`)}
                                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-all px-2.5 py-1 rounded-md hover:bg-indigo-50 cursor-pointer shrink-0"
                                    title="Unlock course to access this lesson"
                                  >
                                    <Lock className="w-3 h-3" /> Unlock
                                  </button>
                                ) : isSequentialLocked ? (
                                  <div
                                    className="flex items-center gap-1 text-slate-400 text-xs font-semibold px-2.5 py-1 rounded-md select-none cursor-not-allowed shrink-0"
                                    title="Complete the previous lesson to unlock this lesson"
                                  >
                                    <Lock className="w-3 h-3 text-slate-400" /> Locked
                                  </div>
                                ) : (
                                  <Link
                                    href={lessonHref}
                                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-all px-2.5 py-1 rounded-md hover:bg-indigo-50 shrink-0"
                                  >
                                    {isInstructor ? "Start Lesson" : (isPreview ? "Preview" : (isLessonCompleted ? "Review" : "Start"))} <ChevronRight className="w-3 h-3" />
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
                      {canManageCourse && (
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

                {canManageCourse && (
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
                          {(isCurrentUsers || canManageCourse) && (
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
              {canManageCourse && (
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
                  const isSubmitted = Boolean(assignment._is_submitted);
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
                            <span className="text-xs text-slate-400 font-medium">{canManageCourse ? 'Action' : 'Status'}</span>
                            {canManageCourse ? (
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
              {(() => {
                const youtubeId = getYouTubeVideoId(details.video_link);
                const videoThumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;
                const effectiveCover = details.image ? getImageUrl(details.image) : videoThumbnail;

                if (effectiveCover) {
                  return (
                    <div 
                      onClick={() => {
                        if (details.video_link) setIsVideoModalOpen(true);
                      }}
                      className={`w-full h-48 rounded-xl overflow-hidden mb-5 relative shadow-inner bg-slate-950 flex items-center justify-center group ${details.video_link ? 'cursor-pointer' : ''}`}
                    >
                      <img src={effectiveCover} alt="" className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-110 pointer-events-none" />
                      <img src={effectiveCover} alt="Course Thumbnail" className="relative z-10 max-h-full max-w-full object-contain p-1 group-hover:scale-105 transition-transform duration-300" />
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
                  );
                }

                return (
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
                );
              })()}

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
                    {Boolean(createdCertificate || hasCertificate) ? (
                      <button
                        type="button"
                        onClick={() => {
                          const cName = createdCertificate?.name || details?.certificate || enrollmentData?.certificate || '';
                          const cFormat = createdCertificate?.template || createdCertificate?.format || 'StrideNEX Creative Pathways';
                          if (cName) {
                            handleOpenCertificate(cName, cFormat);
                          } else {
                            setShowCertificateModal(true);
                          }
                        }}
                        className="w-full font-bold py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm transition-all flex justify-center items-center gap-2 text-xs cursor-pointer active:scale-95"
                      >
                        <Award className="w-4 h-4" />
                        View Certificate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateCertificate}
                        disabled={generatingCertificate}
                        className="w-full font-bold py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm transition-all flex justify-center items-center gap-2 text-xs cursor-pointer active:scale-95"
                      >
                        {generatingCertificate ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating Certificate...</span>
                          </>
                        ) : (
                          <>
                            <Award className="w-4 h-4" />
                            <span>Generate Certificate</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const firstChapter = outline?.find(c => Array.isArray(c.lessons) && c.lessons.length > 0) || outline?.[0];
                        const firstLesson = firstChapter?.lessons?.[0];
                        if (firstChapter && firstLesson) {
                          const chapterParam = firstChapter.name || firstChapter.chapter || firstChapter.title;
                          const lessonParam = firstLesson.name || firstLesson.lesson_name || firstLesson.title;
                          router.push(`/course/${courseId}/${encodeURIComponent(chapterParam)}/${encodeURIComponent(lessonParam)}`);
                        } else {
                          const elem = document.getElementById("curriculum");
                          if (elem) elem.scrollIntoView({ behavior: "smooth" });
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
                        const target = getContinueLearningTarget();
                        if (target && target.chapter && target.lesson) {
                          const chapterParam = target.chapter.name || target.chapter.chapter || target.chapter.title;
                          const lessonParam = target.lesson.name || target.lesson.lesson_name || target.lesson.title;
                          router.push(`/course/${courseId}/${encodeURIComponent(chapterParam)}/${encodeURIComponent(lessonParam)}`);
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
                {canManageCourse && (
                  <div className="mt-3 space-y-2">
                    {!details.published && (
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(true)}
                        disabled={publishingLoading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-emerald-600/25 transition-all flex justify-center items-center gap-2 text-sm cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {publishingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                        <span>Publish Course Now</span>
                      </button>
                    )}
                    <Link
                      href={`/course/${courseId}/edit`}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-all flex justify-center items-center gap-2 text-sm border border-slate-200"
                    >
                      <Edit className="w-4 h-4" /> Manage / Edit Course
                    </Link>
                  </div>
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
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Certificate PDF Viewer Modal */}
      {showCertificateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowCertificateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                    Course Completion Certificate
                  </h3>
                  <p className="text-xs text-slate-500">
                    {details?.title || courseId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {certPdfBlobUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      const certName = createdCertificate?.name || details?.certificate || courseId;
                      const certFormat = createdCertificate?.template || createdCertificate?.format || 'StrideNEX Creative Pathways';
                      try {
                        const blob = await downloadCertificatePdf(certName, certFormat);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${details?.title || courseId}-certificate.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showToast.success('Certificate downloaded successfully!');
                      } catch {
                        const directUrl = getCertificatePdfUrl(certName, certFormat);
                        window.open(directUrl, '_blank');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: PDF Preview */}
            <div className="flex-1 p-4 bg-slate-100 flex items-center justify-center min-h-[450px] overflow-hidden">
              {certPdfLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Loading Certificate PDF...</p>
                  <p className="text-xs text-slate-400 mt-1">Rendering official certificate from server</p>
                </div>
              ) : certPdfBlobUrl ? (
                <iframe
                  src={certPdfBlobUrl}
                  title="Certificate PDF Preview"
                  className="w-full h-[550px] md:h-[650px] rounded-xl border border-slate-200 bg-white shadow-sm"
                />
              ) : (
                <div className="text-center py-20">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">Your certificate has been issued!</p>
                  <Link
                    href="/certificates"
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    <Award className="w-4 h-4" /> Go to Certificates Page
                  </Link>
                </div>
              )}
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
