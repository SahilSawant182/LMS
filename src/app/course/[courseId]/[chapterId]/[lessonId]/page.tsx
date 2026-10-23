"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLesson, getChapters, getLessons, getCourseProgress, getCourseProgressBar, parseProgressBarValue, createCourseProgress, getCourse, getCourseOutline } from '@/services/lms.services';
import { compareCurriculumItems } from '@/utils/curriculum';
import { getCourseWithEnrollment } from '@/services/payment.services';
import { getImageUrl } from '@/services/api.services';
import { isAuthorizedInstructor } from '@/services/auth.services';
import { CourseWithEnrollment } from '@/types/payment.types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { navigateBack } from '@/utils/navigation';
import { showToast } from '@/components/ui/Toast';
import { 
  ArrowLeft, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Lock, 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  Award, 
  ArrowRight, 
  Play, 
  Loader2,
  PanelLeft,
  HelpCircle,
  Plus,
  Video,
  Code,
  Copy,
  Check,
  FileText,
  Download,
  Trophy,
  X,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

interface EditorBlock {
  id?: string;
  type: string;
  data: any;
}

function extractLessonData(val: any): any {
  if (!val) return null;
  // If val.data contains the lesson fields
  if (val.data && typeof val.data === 'object' && (val.data.name || val.data.content !== undefined || val.data.title)) {
    return val.data;
  }
  // If val.message.data contains the lesson fields
  if (val.message?.data && typeof val.message.data === 'object' && (val.message.data.name || val.message.data.content !== undefined || val.message.data.title)) {
    return val.message.data;
  }
  // If val.message is the lesson object
  if (val.message && typeof val.message === 'object' && (val.message.name || val.message.content !== undefined || val.message.title)) {
    return val.message;
  }
  // If val is the lesson object directly
  return val;
}

function parseBlocks(rawContent: any): EditorBlock[] {
  if (!rawContent) return [];

  let parsed = rawContent;
  if (typeof rawContent === 'string') {
    const trimmed = rawContent.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        return [{ id: 'fallback-text', type: 'markdown', data: { text: rawContent } }];
      }
    } else {
      return [{ id: 'fallback-html', type: 'raw', data: { html: rawContent } }];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && Array.isArray(parsed.blocks)) {
    return parsed.blocks;
  }

  return [];
}

function formatSimpleMarkdown(text: string): string {
  if (!text) return '';
  if (!/<[a-z][\s\S]*>/i.test(text)) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-600 font-mono text-xs">$1</code>')
      .replace(/\n/g, '<br />');
  }
  return text;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-6 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/60 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="font-mono uppercase font-semibold tracking-wider text-[11px] text-slate-400 pl-1">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition-all text-xs font-medium cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-4 md:p-5 overflow-x-auto text-sm font-mono leading-relaxed text-slate-100">
        <pre><code>{code}</code></pre>
      </div>
    </div>
  );
}

function ListBlock({ data }: { data: any }) {
  const isOrdered = data?.style === 'ordered';
  const rawItems = Array.isArray(data?.items) ? data.items : [];
  
  if (rawItems.length === 0) return null;

  const renderItemContent = (item: any): string => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      return item.content || item.text || '';
    }
    return String(item || '');
  };

  const Tag = isOrdered ? 'ol' : 'ul';
  const listClass = isOrdered 
    ? 'list-decimal pl-6 space-y-2 text-slate-700 my-4 text-base' 
    : 'list-disc pl-6 space-y-2 text-slate-700 my-4 text-base marker:text-indigo-500';

  return (
    <Tag className={listClass}>
      {rawItems.map((item: any, idx: number) => {
        const itemHtml = renderItemContent(item);
        const subItems = item && typeof item === 'object' && Array.isArray(item.items) ? item.items : [];
        return (
          <li key={idx}>
            <span dangerouslySetInnerHTML={{ __html: itemHtml }} />
            {subItems.length > 0 && (
              <ListBlock data={{ style: data?.style, items: subItems }} />
            )}
          </li>
        );
      })}
    </Tag>
  );
}

function TableBlock({ data }: { data: any }) {
  const content = Array.isArray(data?.content) ? data.content : [];
  if (content.length === 0) return null;

  const withHeadings = Boolean(data?.withHeadings);
  const headRow = withHeadings ? content[0] : null;
  const bodyRows = withHeadings ? content.slice(1) : content;

  return (
    <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200 shadow-xs bg-white">
      <table className="w-full text-sm text-left border-collapse">
        {headRow && Array.isArray(headRow) && (
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200">
              {headRow.map((cell: any, idx: number) => (
                <th
                  key={idx}
                  className="px-4 py-3 font-semibold text-slate-800 border-r last:border-r-0 border-slate-200"
                  dangerouslySetInnerHTML={{ __html: typeof cell === 'string' ? cell : JSON.stringify(cell) }}
                />
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {bodyRows.map((row: any, rIdx: number) => (
            <tr key={rIdx} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50/60 transition-colors">
              {Array.isArray(row) ? (
                row.map((cell: any, cIdx: number) => (
                  <td
                    key={cIdx}
                    className="px-4 py-3 text-slate-700 border-r last:border-r-0 border-slate-100"
                    dangerouslySetInnerHTML={{ __html: typeof cell === 'string' ? cell : JSON.stringify(cell) }}
                  />
                ))
              ) : (
                <td className="px-4 py-3 text-slate-700">{JSON.stringify(row)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditorBlockRenderer({ block, isInstructor }: { block: EditorBlock; isInstructor: boolean }) {
  if (!block || !block.type) return null;

  switch (block.type) {
    case 'header': {
      const level = block.data?.level || 2;
      const text = block.data?.text || '';
      if (level === 1) {
        return <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-8 mb-4" dangerouslySetInnerHTML={{ __html: text }} />;
      }
      if (level === 2) {
        return <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-6 mb-3" dangerouslySetInnerHTML={{ __html: text }} />;
      }
      if (level === 3) {
        return <h3 className="text-xl font-bold text-slate-800 tracking-tight mt-5 mb-2.5" dangerouslySetInnerHTML={{ __html: text }} />;
      }
      return <h4 className="text-lg font-semibold text-slate-800 tracking-tight mt-4 mb-2" dangerouslySetInnerHTML={{ __html: text }} />;
    }

    case 'paragraph': {
      const text = block.data?.text || '';
      return <p className="text-slate-700 leading-relaxed text-base my-3.5" dangerouslySetInnerHTML={{ __html: text }} />;
    }

    case 'markdown': {
      const text = block.data?.text || '';
      return (
        <div 
          className="text-slate-700 leading-relaxed text-base my-3.5"
          dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(text) }} 
        />
      );
    }

    case 'list': {
      return <ListBlock data={block.data} />;
    }

    case 'upload': {
      const fileUrl = block.data?.file_url || block.data?.url || '';
      const fileType = block.data?.file_type || '';
      if (!fileUrl) return null;
      const fullUrl = getImageUrl(fileUrl) || fileUrl;

      const isVideo = Boolean(
        fileType?.toUpperCase() === 'MP4' ||
        fileType?.toUpperCase() === 'WEBM' ||
        fileType?.toUpperCase() === 'VIDEO' ||
        fileUrl.match(/\.(mp4|webm|ogg|mov|mkv)$/i)
      );
      const isImage = Boolean(
        fileType?.toUpperCase() === 'IMAGE' ||
        fileType?.toUpperCase() === 'PNG' ||
        fileType?.toUpperCase() === 'JPG' ||
        fileType?.toUpperCase() === 'JPEG' ||
        fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
      );
      const isAudio = Boolean(
        fileType?.toUpperCase() === 'AUDIO' ||
        fileType?.toUpperCase() === 'MP3' ||
        fileUrl.match(/\.(mp3|wav|ogg|aac|m4a)$/i)
      );

      if (isVideo) {
        return (
          <div className="my-6 rounded-2xl overflow-hidden bg-black shadow-xl ring-1 ring-slate-900/10">
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <video
                controls
                playsInline
                className="w-full h-full object-contain max-h-[600px]"
                src={fullUrl}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        );
      }

      if (isImage) {
        return (
          <div className="my-6 text-center">
            <img
              src={fullUrl}
              alt={block.data?.caption || 'Uploaded file'}
              className="mx-auto rounded-2xl shadow-md border border-slate-200/80 max-h-[560px] object-contain"
            />
            {block.data?.caption && (
              <p className="mt-2 text-xs text-slate-500 italic text-center" dangerouslySetInnerHTML={{ __html: block.data.caption }} />
            )}
          </div>
        );
      }

      if (isAudio) {
        return (
          <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <audio controls className="w-full" src={fullUrl}>
              Your browser does not support audio playback.
            </audio>
          </div>
        );
      }

      return (
        <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {fileUrl.split('/').pop() || 'Lesson Resource'}
              </p>
              <p className="text-xs text-slate-500 uppercase font-mono">{fileType || 'File'}</p>
            </div>
          </div>
          <a
            href={fullUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Download className="w-4 h-4" /> Download
          </a>
        </div>
      );
    }

    case 'table': {
      return <TableBlock data={block.data} />;
    }

    case 'quiz': {
      const quizId = block.data?.quiz || block.data?.id || '';
      if (!quizId) return null;
      return (
        <div className="my-6 p-5 md:p-6 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 rounded-2xl border border-indigo-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Lesson Quiz
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  {quizId}
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Reinforce your understanding with interactive quiz questions.
              </p>
            </div>
          </div>
          <Link
            href={`/quizzes/${encodeURIComponent(quizId)}`}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Award className="w-4 h-4" />
            {isInstructor ? "Manage Quiz" : "Start Quiz"}
          </Link>
        </div>
      );
    }

    case 'assignment': {
      const assignmentId = block.data?.assignment || block.data?.id || '';
      if (!assignmentId) return null;
      return (
        <div className="my-6 p-5 md:p-6 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/40 rounded-2xl border border-violet-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-600/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  Assignment
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  {assignmentId}
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Complete and submit your coursework assignment for this lesson.
              </p>
            </div>
          </div>
          <Link
            href={`/assignments/${encodeURIComponent(assignmentId)}`}
            className="w-full sm:w-auto px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-600/20 flex items-center justify-center gap-1.5 shrink-0"
          >
            <FileText className="w-4 h-4" />
            {isInstructor ? "View Submissions" : "Open Assignment"}
          </Link>
        </div>
      );
    }

    case 'programming':
    case 'program': {
      const exerciseId = block.data?.programming_exercise || block.data?.exercise || block.data?.id || '';
      if (!exerciseId) return null;
      return (
        <div className="my-6 p-5 md:p-6 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-2xl border border-emerald-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Coding Exercise
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  {exerciseId}
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Hands-on programming exercise with live test cases.
              </p>
            </div>
          </div>
          <Link
            href={`/programming-exercises?exercise=${encodeURIComponent(exerciseId)}`}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Code className="w-4 h-4" />
            Launch Exercise
          </Link>
        </div>
      );
    }

    case 'codeBox':
    case 'code': {
      const code = block.data?.code || '';
      const language = block.data?.language || block.data?.format || 'code';
      return <CodeBlock code={code} language={language} />;
    }

    case 'image': {
      const url = block.data?.file?.url || block.data?.url || '';
      if (!url) return null;
      const fullUrl = getImageUrl(url) || url;
      return (
        <div className="my-6 text-center">
          <img
            src={fullUrl}
            alt={block.data?.caption || 'Lesson image'}
            className="mx-auto rounded-2xl shadow-md border border-slate-200/80 max-h-[560px] object-contain"
          />
          {block.data?.caption && (
            <p className="mt-2 text-xs text-slate-500 italic text-center" dangerouslySetInnerHTML={{ __html: block.data.caption }} />
          )}
        </div>
      );
    }

    case 'quote': {
      const text = block.data?.text || '';
      const caption = block.data?.caption || '';
      return (
        <blockquote className="my-6 pl-5 border-l-4 border-indigo-500 italic text-slate-700 bg-slate-50/50 py-3 pr-4 rounded-r-xl">
          <div dangerouslySetInnerHTML={{ __html: text }} />
          {caption && <footer className="mt-2 text-xs text-slate-500 font-medium not-italic">— {caption}</footer>}
        </blockquote>
      );
    }

    case 'delimiter': {
      return (
        <div className="my-8 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
        </div>
      );
    }

    case 'embed': {
      const embedUrl = block.data?.embed || block.data?.source || '';
      if (!embedUrl) return null;
      return (
        <div className="my-6 rounded-2xl overflow-hidden bg-black shadow-xl ring-1 ring-slate-900/10">
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          {block.data?.caption && (
            <div className="p-3 bg-slate-900 text-slate-400 text-xs text-center">
              {block.data.caption}
            </div>
          )}
        </div>
      );
    }

    case 'raw': {
      const html = block.data?.html || '';
      return <div className="my-4" dangerouslySetInnerHTML={{ __html: html }} />;
    }

    default: {
      if (block.data?.text) {
        return <p className="text-slate-700 leading-relaxed text-base my-3" dangerouslySetInnerHTML={{ __html: block.data.text }} />;
      }
      return null;
    }
  }
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  
  const courseId = decodeURIComponent(params?.courseId as string);
  const chapterId = decodeURIComponent(params?.chapterId as string);
  const lessonId = decodeURIComponent(params?.lessonId as string);

  const [lessonData, setLessonData] = useState<any>(null);
  const [courseData, setCourseData] = useState<CourseWithEnrollment | null>(null);
  const [outline, setOutline] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [progressBarData, setProgressBarData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Paywall gating state
  const [isPaywallLocked, setIsPaywallLocked] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState<string>("This lesson is part of a paid course");

  const [userEmail, setUserEmail] = useState('');
  const [isInstructor, setIsInstructor] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [isCompletedLocally, setIsCompletedLocally] = useState(false);
  const [isCourseCompletedLocally, setIsCourseCompletedLocally] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isCurriculumSidebarOpen, setIsCurriculumSidebarOpen] = useState(true);

  // Automatically shrink the navigation sidebar when opening a particular lesson
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lms_sidebar_expanded', 'false');
      window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { expanded: false } }));
      document.body.classList.add('has-sidebar');
      document.documentElement.style.setProperty('--sidebar-width', '5rem');
    }
  }, []);

  const checkInstructorRole = (cDataObj?: any, cDetails?: any): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const isAuth = isAuthorizedInstructor();
      if (!isAuth) return false;

      // If user is enrolled as a student in this course, check if they are actually an assigned instructor for it
      const isEnrolled = Boolean(cDataObj?.is_enrolled || cDetails?.membership);
      if (isEnrolled) {
        const currentEmail = (localStorage.getItem('userEmail') || localStorage.getItem('user_email') || '').trim().toLowerCase();
        const instructors = Array.isArray(cDetails?.instructors)
          ? cDetails.instructors
          : Array.isArray(cDataObj?.instructors)
            ? cDataObj.instructors
            : [];
        const isAssigned = instructors.some((inst: any) => {
          const email = String(inst?.instructor || inst?.name || inst?.email || inst?.user || '').trim().toLowerCase();
          return email && email === currentEmail;
        });
        if (!isAssigned) {
          return false;
        }
      }

      return true;
    } catch (e) {}
    return false;
  };

  useEffect(() => {
    const currentEmail = localStorage.getItem('userEmail') || localStorage.getItem('user_email') || '';
    setUserEmail(currentEmail);
    // Initialize instructor state conservatively to false to prevent premature instructor flash
    setIsInstructor(false);
    
    if (!courseId || !chapterId || !lessonId) return;

    const fetchLesson = async () => {
      setLoading(true);
      setError(null);
      setIsPaywallLocked(false);
      try {
        const [lessonRes, chaptersRes, lessonsRes, progressRes, progressBarRes, courseEnrollRes, courseRes, outlineRes] = await Promise.allSettled([
          getLesson({ course: courseId, chapter: chapterId, name: lessonId }),
          getChapters({ course: courseId }),
          getLessons({ course: courseId }),
          getCourseProgress(courseId, currentEmail),
          getCourseProgressBar({ course: courseId, member: currentEmail }),
          getCourseWithEnrollment(courseId),
          getCourse(courseId),
          getCourseOutline({ course: courseId })
        ]);

        let cData: CourseWithEnrollment | null = null;
        if (courseEnrollRes.status === 'fulfilled' && courseEnrollRes.value) {
          cData = courseEnrollRes.value;
          setCourseData(cData);
        }

        const courseObj = courseRes.status === 'fulfilled'
          ? (courseRes.value?.data || courseRes.value?.message?.data || courseRes.value?.message || courseRes.value)
          : null;

        const instructorUser = checkInstructorRole(cData, courseObj);
        setIsInstructor(instructorUser);

        // 1. Check if lesson is paywalled
        let paywalled = false;
        let paywallMsg = "You must purchase this course to access this lesson.";

        if (lessonRes.status === 'rejected') {
          const err = lessonRes.reason;
          const status = err?.status || err?.response?.status || err?.response?.data?.status;
          const requiresPurchase = err?.response?.data?.data?.requires_purchase || err?.response?.data?.requires_purchase;
          const msg = err?.message || err?.response?.data?.message || "";
          
          if (
            status === 403 ||
            requiresPurchase === true ||
            msg.toLowerCase().includes("purchase") ||
            msg.toLowerCase().includes("paid course") ||
            msg.toLowerCase().includes("not enrolled")
          ) {
            paywalled = true;
            if (msg) paywallMsg = msg;
          }
        } else {
          const val = lessonRes.value;
          const raw = extractLessonData(val);
          if (
            val?.status === 403 || 
            raw?.status === 403 || 
            raw?.requires_purchase === true || 
            val?.requires_purchase === true
          ) {
            paywalled = true;
            if (raw?.message) paywallMsg = raw.message;
          }
        }

        // 2. Resolve lesson content with robust fallback from course chapters & lessons list for both students and instructors
        let currentLesson = (lessonRes.status === 'fulfilled' && !paywalled)
          ? extractLessonData(lessonRes.value)
          : null;

        if (!currentLesson) {
          let fallbackLesson: any = null;
          const targetLessonId = (lessonId || '').trim().toLowerCase();
          const targetChapterId = (chapterId || '').trim().toLowerCase();

          const searchChapters = (chaptersList: any[]) => {
            if (!Array.isArray(chaptersList)) return null;
            for (const ch of chaptersList) {
              const chName = String(ch?.name || ch?.title || ch?.chapter_name || '').trim().toLowerCase();
              if (Array.isArray(ch?.lessons)) {
                if (!targetChapterId || chName === targetChapterId) {
                  const match = ch.lessons.find((l: any) => {
                    const lName = String(l?.name || '').trim().toLowerCase();
                    const lTitle = String(l?.title || l?.lesson_name || '').trim().toLowerCase();
                    return lName === targetLessonId || lTitle === targetLessonId;
                  });
                  if (match) return match;
                }
              }
            }
            for (const ch of chaptersList) {
              if (Array.isArray(ch?.lessons)) {
                const match = ch.lessons.find((l: any) => {
                  const lName = String(l?.name || '').trim().toLowerCase();
                  const lTitle = String(l?.title || l?.lesson_name || '').trim().toLowerCase();
                  return lName === targetLessonId || lTitle === targetLessonId;
                });
                if (match) return match;
              }
            }
            return null;
          };

          const rawOutline = outlineRes.status === 'fulfilled' ? outlineRes.value : null;
          const outlineChapters: any[] = Array.isArray(rawOutline)
            ? rawOutline
            : (rawOutline?.message?.data || rawOutline?.data?.message || rawOutline?.data || rawOutline?.message || []);

          if (outlineChapters && Array.isArray(outlineChapters) && outlineChapters.length > 0) {
            fallbackLesson = searchChapters(outlineChapters);
          }
          if (!fallbackLesson && courseObj && Array.isArray(courseObj.chapters)) {
            fallbackLesson = searchChapters(courseObj.chapters);
          }
          if (!fallbackLesson && cData && Array.isArray((cData as any).chapters)) {
            fallbackLesson = searchChapters((cData as any).chapters);
          }
          if (!fallbackLesson && lessonsRes.status === 'fulfilled') {
            const rawLe = lessonsRes.value;
            const leArray = Array.isArray(rawLe) ? rawLe : (rawLe?.message?.data || rawLe?.data || rawLe?.message || []);
            if (Array.isArray(leArray)) {
              fallbackLesson = leArray.find((l: any) => {
                const lName = String(l?.name || '').trim().toLowerCase();
                const lTitle = String(l?.title || l?.lesson_name || '').trim().toLowerCase();
                return lName === targetLessonId || lTitle === targetLessonId;
              });
            }
          }

          if (fallbackLesson) {
            currentLesson = fallbackLesson;
          }
        }

        if (currentLesson) {
          setLessonData((prev: any) => ({ ...currentLesson, ...(prev || {}) }));
          setError(null);
        } else if (!paywalled) {
          setError('Lesson not found.');
        }

        if (instructorUser) {
          paywalled = false;
          setIsPaywallLocked(false);
        } else if (paywalled) {
          setIsPaywallLocked(true);
          setPaywallMessage(paywallMsg);
        } else {
          setIsPaywallLocked(false);
        }

        // 2. Build outline with locked / preview indicators
        const enrollLessonsMap = new Map<string, any>();
        if (cData && Array.isArray((cData as any).chapters)) {
          (cData as any).chapters.forEach((ch: any) => {
            if (Array.isArray(ch.lessons)) {
              ch.lessons.forEach((l: any) => {
                if (l.name) enrollLessonsMap.set(l.name, l);
              });
            }
          });
        }

        const rawOutlineVal = outlineRes.status === 'fulfilled' ? outlineRes.value : null;
        const outlineChaptersList: any[] = Array.isArray(rawOutlineVal)
          ? rawOutlineVal
          : (rawOutlineVal?.message?.data || rawOutlineVal?.data?.message || rawOutlineVal?.data || rawOutlineVal?.message || []);

        const courseChaptersList: any[] = (courseObj && Array.isArray(courseObj.chapters)) ? courseObj.chapters : [];
        const enrollChaptersList: any[] = (cData && Array.isArray((cData as any).chapters)) ? (cData as any).chapters : [];

        const rawChaptersVal = chaptersRes.status === 'fulfilled' ? chaptersRes.value : [];
        const listChapters: any[] = Array.isArray(rawChaptersVal)
          ? rawChaptersVal
          : (rawChaptersVal?.message?.data || rawChaptersVal?.data || rawChaptersVal?.message || []);

        const rawLe = lessonsRes.status === 'fulfilled' ? lessonsRes.value : [];
        const leArray: any[] = Array.isArray(rawLe) ? rawLe : (rawLe?.message?.data || rawLe?.data || rawLe?.message || []);

        const hasLessons = (arr: any[]) => Array.isArray(arr) && arr.some((ch: any) => Array.isArray(ch?.lessons) && ch.lessons.length > 0);

        let baseChapters: any[] = [];
        if (hasLessons(outlineChaptersList)) {
          baseChapters = outlineChaptersList;
        } else if (hasLessons(courseChaptersList)) {
          baseChapters = courseChaptersList;
        } else if (hasLessons(enrollChaptersList)) {
          baseChapters = enrollChaptersList;
        } else if (outlineChaptersList.length > 0) {
          baseChapters = outlineChaptersList;
        } else if (courseChaptersList.length > 0) {
          baseChapters = courseChaptersList;
        } else if (enrollChaptersList.length > 0) {
          baseChapters = enrollChaptersList;
        } else {
          baseChapters = listChapters;
        }

        // Sort chapters consistently using sequence numbers, creation timestamp, and title numbering
        const sortedChArray = [...baseChapters].sort(compareCurriculumItems);

        const allSourceChapters = [...outlineChaptersList, ...courseChaptersList, ...enrollChaptersList];

        const mapped = sortedChArray.map((c: any) => {
          let chLessons: any[] = Array.isArray(c.lessons) && c.lessons.length > 0 ? c.lessons : [];

          if (chLessons.length === 0) {
            const matchCh = allSourceChapters.find((otherCh: any) => {
              if (!otherCh) return false;
              const oName = String(otherCh.name || '').trim().toLowerCase();
              const oTitle = String(otherCh.title || otherCh.chapter_name || '').trim().toLowerCase();
              const cName = String(c.name || '').trim().toLowerCase();
              const cTitle = String(c.title || c.chapter_name || '').trim().toLowerCase();
              return (cName && (oName === cName || oTitle === cName)) || (cTitle && (oName === cTitle || oTitle === cTitle));
            });
            if (matchCh && Array.isArray(matchCh.lessons) && matchCh.lessons.length > 0) {
              chLessons = matchCh.lessons;
            }
          }

          if (chLessons.length === 0 && leArray.length > 0) {
            chLessons = leArray.filter((l: any) => {
              const lCh = String(l?.chapter || '').trim().toLowerCase();
              const cName = String(c?.name || '').trim().toLowerCase();
              const cTitle = String(c?.title || c?.chapter_name || '').trim().toLowerCase();
              return lCh && (lCh === cName || lCh === cTitle);
            });
          }

          // Sort lessons inside this chapter consistently by sequence, creation timestamp, and title numbering
          const sortedChLessons = [...chLessons].sort(compareCurriculumItems);

          return {
            ...c,
            lessons: sortedChLessons.map((l: any) => {
              const fromEnroll = enrollLessonsMap.get(l.name);
              const isLessonLocked = instructorUser
                ? false
                : (fromEnroll?.is_locked !== undefined 
                  ? Boolean(fromEnroll.is_locked)
                  : Boolean(cData?.is_paid && !cData?.is_enrolled && !l.include_in_preview));
              
              return {
                ...l,
                chapter: l.chapter || c.name,
                is_locked: isLessonLocked,
                include_in_preview: fromEnroll?.include_in_preview !== undefined 
                  ? Number(fromEnroll.include_in_preview) 
                  : Number(l.include_in_preview || 0)
              };
            })
          };
        });
        setOutline(mapped);

        if (progressRes.status === 'fulfilled') {
          const rawProgress = progressRes.value;
          setProgress(rawProgress);
        }

        if (progressBarRes.status === 'fulfilled') {
          const rawPB = progressBarRes.value;
          setProgressBarData(rawPB?.message ?? rawPB?.data ?? rawPB);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load the lesson.');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [courseId, chapterId, lessonId]);

  const handleMarkComplete = async () => {
    if (!lessonData) return;
    setUpdatingProgress(true);
    try {
      await createCourseProgress({
        member: userEmail,
        lesson: lessonData.name || lessonId,
        status: "Complete"
      });
      setIsCompletedLocally(true);
      if (typeof window !== "undefined" && userEmail) {
        const normLesson = lessonData.name || lessonId;
        localStorage.setItem(`lms_lesson_${userEmail}_${normLesson}_completed`, 'true');
        localStorage.setItem(`lms_lesson_${userEmail}_${courseId}_${normLesson}_completed`, 'true');
        if (lessonData.title) {
          localStorage.setItem(`lms_lesson_${userEmail}_${lessonData.title}_completed`, 'true');
        }
      }
      const [progressRes, pbRes] = await Promise.allSettled([
        getCourseProgress(courseId, userEmail),
        getCourseProgressBar({ course: courseId, member: userEmail })
      ]);
      const pVal = progressRes.status === 'fulfilled' ? progressRes.value : null;
      const updatedProgress = pVal?.message?.data || pVal?.data || pVal?.message || pVal;
      if (pVal?.message || pVal?.data || pVal) {
        setProgress(pVal);
      }
      let parsedUpdatedPB: any = null;
      if (pbRes.status === 'fulfilled') {
        const rawPB = pbRes.value;
        const pbVal = rawPB?.message ?? rawPB?.data ?? rawPB;
        setProgressBarData(pbVal);
        parsedUpdatedPB = parseProgressBarValue(rawPB);
      }

      // Check if all lessons across all chapters are now completed
      const updatedRecords = updatedProgress?.records || updatedProgress?.data?.records || [];
      const updatedPercent = Number(parsedUpdatedPB?.percent ?? updatedProgress?.progress ?? 0);

      const checkUpdatedLessonDone = (l: any) => {
        const lName = (l.lessonName || l.name || '').trim().toLowerCase();
        const lTitle = (l.title || l.lesson_name || '').trim().toLowerCase();
        const currName = (lessonData.name || lessonId || '').trim().toLowerCase();
        const currTarget = (currentTargetId || '').trim().toLowerCase();

        if (lName === currName || lName === currTarget || lTitle === currName || lTitle === currTarget) {
          return true;
        }
        return updatedRecords.some((r: any) => {
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

      const allOutlineLessonsDone = flatLessons.length > 0
        ? flatLessons.every(l => checkUpdatedLessonDone(l))
        : false;

      const shouldCompleteCourse = allOutlineLessonsDone;

      if (shouldCompleteCourse) {
        setIsCourseCompletedLocally(true);
        if (typeof window !== "undefined" && userEmail) {
          localStorage.setItem(`lms_course_completed_${userEmail}_${courseId}`, 'true');
        }
        setShowCompletionModal(true);
        showToast.success('Course completed successfully! Congratulations!');
      } else {
        showToast.success('Lesson marked as completed!');
      }
    } catch (err: any) {
      showToast.error(err.response?.data?.message || err.message || 'Failed to update progress');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleCompleteCourse = async () => {
    if (isCourseComplete) {
      setShowCompletionModal(true);
      return;
    }

    // Verify all other lessons are completed before completing the course
    const otherLessonsDone = flatLessons.length > 0
      ? flatLessons.filter((_, idx) => idx !== currentIndex).every(l => checkLessonRecordedComplete(l))
      : true;

    if (!otherLessonsDone) {
      showToast.error("Please complete all previous lessons before completing the course.");
      return;
    }

    await handleMarkComplete();
    setIsCourseCompletedLocally(true);
    if (typeof window !== "undefined" && userEmail) {
      localStorage.setItem(`lms_course_completed_${userEmail}_${courseId}`, 'true');
    }
    setShowCompletionModal(true);
  };

  // Parse blocks from lessonData.content and lessonData.instructor_content
  const contentBlocks = useMemo(() => parseBlocks(lessonData?.content), [lessonData?.content]);
  const instructorBlocks = useMemo(() => parseBlocks(lessonData?.instructor_content), [lessonData?.instructor_content]);

  // Check if instructor added quiz, assignment, or programming exercise to this lesson
  const attachedQuizId = useMemo(() => {
    if (lessonData?.quiz) return String(lessonData.quiz);
    const textToSearch = `${typeof lessonData?.content === 'string' ? lessonData.content : ''} ${typeof lessonData?.body === 'string' ? lessonData.body : ''}`;
    const match = textToSearch.match(/class(?:Name)?=["'][^"']*quiz-block[^"']*["'][^>]*data-id=["']([^"']+)["']/i) ||
                  textToSearch.match(/data-id=["']([^"']+)["'][^>]*class(?:Name)?=["'][^"']*quiz-block/i);
    return match ? match[1] : '';
  }, [lessonData]);

  const attachedAssignmentId = useMemo(() => {
    if (lessonData?.assignment) return String(lessonData.assignment);
    const textToSearch = `${typeof lessonData?.content === 'string' ? lessonData.content : ''} ${typeof lessonData?.body === 'string' ? lessonData.body : ''}`;
    const match = textToSearch.match(/class(?:Name)?=["'][^"']*assignment-block[^"']*["'][^>]*data-id=["']([^"']+)["']/i) ||
                  textToSearch.match(/data-id=["']([^"']+)["'][^>]*class(?:Name)?=["'][^"']*assignment-block/i);
    return match ? match[1] : '';
  }, [lessonData]);

  const attachedExerciseId = useMemo(() => {
    if (lessonData?.programming_exercise) return String(lessonData.programming_exercise);
    if (lessonData?.exercise) return String(lessonData.exercise);
    const textToSearch = `${typeof lessonData?.content === 'string' ? lessonData.content : ''} ${typeof lessonData?.body === 'string' ? lessonData.body : ''}`;
    const match = textToSearch.match(/class(?:Name)?=["'][^"']*programming-block[^"']*["'][^>]*data-id=["']([^"']+)["']/i) ||
                  textToSearch.match(/data-id=["']([^"']+)["'][^>]*class(?:Name)?=["'][^"']*programming-block/i);
    return match ? match[1] : '';
  }, [lessonData]);

  const hasQuizInBlocks = useMemo(() => 
    contentBlocks.some((b: any) => b.type === 'quiz' && (b.data?.quiz || b.data?.id)),
    [contentBlocks]
  );
  const hasAssignmentInBlocks = useMemo(() => 
    contentBlocks.some((b: any) => b.type === 'assignment' && (b.data?.assignment || b.data?.id)),
    [contentBlocks]
  );
  const hasExerciseInBlocks = useMemo(() => 
    contentBlocks.some((b: any) => (b.type === 'programming' || b.type === 'program') && (b.data?.programming_exercise || b.data?.exercise || b.data?.id)),
    [contentBlocks]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!isPaywallLocked && (error || !lessonData)) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-grow flex flex-col justify-center items-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Lesson Error</h2>
          <p className="text-gray-600">{error || 'Lesson not found.'}</p>
          <button onClick={() => router.push(`/course/${encodeURIComponent(courseId)}`)} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700 transition-colors">Back to Course</button>
        </div>
      </div>
    );
  }

  // Derive flat lessons for navigation
  const flatLessons = outline.flatMap(c => (c.lessons || []).map((l: any) => ({ 
    chapterName: c.name, 
    lessonName: l.name,
    title: l.title || l.lesson_name || l.name,
    isLocked: isInstructor ? false : Boolean(l.is_locked),
    isPreview: Number(l.include_in_preview) === 1
  })));
  
  const currentTargetId = lessonData?.name || lessonId;
  const targetChapter = chapterId ? decodeURIComponent(chapterId).toLowerCase().trim() : '';
  const targetLesson = currentTargetId ? decodeURIComponent(currentTargetId).toLowerCase().trim() : '';
  const altLesson = lessonId ? decodeURIComponent(lessonId).toLowerCase().trim() : '';

  const exactIdx = flatLessons.findIndex(l => {
    const lCh = decodeURIComponent(l.chapterName || '').toLowerCase().trim();
    const lName = decodeURIComponent(l.lessonName || '').toLowerCase().trim();
    const lTitle = decodeURIComponent(l.title || '').toLowerCase().trim();
    const isChMatch = !targetChapter || lCh === targetChapter;
    const isLMatch = lName === targetLesson || lName === altLesson || lTitle === targetLesson || lTitle === altLesson;
    return isChMatch && isLMatch;
  });

  const fallbackIdx = exactIdx !== -1 ? exactIdx : flatLessons.findIndex(l => {
    const lName = decodeURIComponent(l.lessonName || '').toLowerCase().trim();
    const lTitle = decodeURIComponent(l.title || '').toLowerCase().trim();
    return lName === targetLesson || lName === altLesson || lTitle === targetLesson || lTitle === altLesson;
  });

  const currentIndex = exactIdx !== -1 ? exactIdx : fallbackIdx;
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex !== -1 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;
  const isLastLesson = currentIndex !== -1 && currentIndex === flatLessons.length - 1;
  
  // Dynamic progress calculations from backend sources
  const normalizedProgress = progress?.message?.data || progress?.data || progress?.message || progress || {};
  const parsedPB = progressBarData !== null && progressBarData !== undefined ? parseProgressBarValue(progressBarData) : null;

  const progressRecords = normalizedProgress.records || normalizedProgress.data?.records || [];

  // Course-level completion checks (consistent with Student Dashboard and Course Page)
  const pbIsComplete = Boolean(
    parsedPB?.isCompleted ||
    (parsedPB !== null && (parsedPB.percent || 0) >= 100) ||
    (parsedPB !== null && (parsedPB.totalLessons || 0) > 0 && (parsedPB.completedLessons || 0) >= (parsedPB.totalLessons || 0))
  );

  const enrollIsComplete = Boolean(
    courseData?.status === 'Completed' ||
    courseData?.status === 'Complete' ||
    ((courseData as any)?.progress !== undefined && Number((courseData as any).progress) >= 100) ||
    (Number((courseData as any)?.completed_lessons || 0) > 0 && Number((courseData as any)?.total_lessons || 0) > 0 && Number((courseData as any)?.completed_lessons) >= Number((courseData as any)?.total_lessons)) ||
    normalizedProgress?.status === 'Completed' ||
    normalizedProgress?.status === 'Complete' ||
    (normalizedProgress?.progress !== undefined && Number(normalizedProgress.progress) >= 100) ||
    (normalizedProgress?.progress_percentage !== undefined && Number(normalizedProgress.progress_percentage) >= 100)
  );

  const localIsComplete = typeof window !== 'undefined' && Boolean(
    (userEmail && localStorage.getItem(`lms_course_completed_${userEmail}_${courseId}`) === 'true') ||
    localStorage.getItem(`lms_course_completed_${courseId}`) === 'true'
  );

  const courseLevelComplete = Boolean(isCourseCompletedLocally || pbIsComplete || enrollIsComplete || localIsComplete);

  const checkLessonRecordedComplete = (lessonItem: { lessonName?: string; name?: string; title?: string; lesson_name?: string }) => {
    // 1. If course is completed at course-level, all lessons are complete
    if (courseLevelComplete) {
      return true;
    }

    // Direct completion properties on lesson item if present
    if (
      (lessonItem as any).is_complete === 1 ||
      (lessonItem as any).is_complete === true ||
      (lessonItem as any).completed === 1 ||
      (lessonItem as any).completed === true ||
      (lessonItem as any).status === 'Complete' ||
      (lessonItem as any).status === 'Completed'
    ) {
      return true;
    }

    const lName = (lessonItem.lessonName || lessonItem.name || '').trim().toLowerCase();
    const lTitle = (lessonItem.title || lessonItem.lesson_name || '').trim().toLowerCase();
    const currentTId = (currentTargetId || '').trim().toLowerCase();
    const currLId = (lessonId || '').trim().toLowerCase();

    if (isCompletedLocally && (lName === currentTId || lName === currLId || lTitle === currentTId || lTitle === currLId)) {
      return true;
    }

    // Check localStorage
    if (typeof window !== 'undefined' && userEmail) {
      const lesKey = lessonItem.lessonName || lessonItem.name;
      if (
        (lesKey && localStorage.getItem(`lms_lesson_${userEmail}_${lesKey}_completed`) === 'true') ||
        (lesKey && localStorage.getItem(`lms_lesson_${userEmail}_${courseId}_${lesKey}_completed`) === 'true') ||
        (lessonItem.title && localStorage.getItem(`lms_lesson_${userEmail}_${lessonItem.title}_completed`) === 'true')
      ) {
        return true;
      }
    }

    if (!Array.isArray(progressRecords) || progressRecords.length === 0) return false;

    return progressRecords.some((r: any) => {
      const rLesson = String(r.lesson || '').trim().toLowerCase();
      const rLessonName = String(r.lesson_name || '').trim().toLowerCase();
      const rTitle = String(r.title || '').trim().toLowerCase();
      const isCompleteStatus =
        r.status === 'Complete' ||
        r.status === 'Completed' ||
        r.completed === 1 ||
        r.completed === '1' ||
        r.is_complete === 1 ||
        r.is_complete === true;

      if (!isCompleteStatus) return false;

      return (
        (lName && (rLesson === lName || rLessonName === lName || rTitle === lName)) ||
        (lTitle && (rLesson === lTitle || rLessonName === lTitle || rTitle === lTitle))
      );
    });
  };

  // Accurate outline lesson calculation
  const totalLessonsInOutline = flatLessons.length;
  const actualCompletedLessonsCount = courseLevelComplete && totalLessonsInOutline > 0
    ? totalLessonsInOutline
    : flatLessons.filter(l => checkLessonRecordedComplete(l)).length;

  const totalLessonsCount = totalLessonsInOutline > 0
    ? totalLessonsInOutline
    : (parsedPB?.totalLessons || Number(normalizedProgress.total_lessons || courseData?.total_lessons || 0));

  // Course is strictly complete only if all syllabus outline lessons are recorded as complete
  const areAllLessonsCompleted = totalLessonsInOutline > 0
    ? (courseLevelComplete || flatLessons.every(l => checkLessonRecordedComplete(l)))
    : Boolean(parsedPB?.isCompleted || (parsedPB?.pendingLessons === 0 && (parsedPB?.totalLessons || 0) > 0));

  const isCourseComplete = Boolean(courseLevelComplete || areAllLessonsCompleted);

  const completedLessonsCount = isCourseComplete
    ? (totalLessonsCount > 0 ? totalLessonsCount : Math.max(totalLessonsInOutline, parsedPB?.totalLessons || 0, 1))
    : Math.max(actualCompletedLessonsCount, parsedPB?.completedLessons || 0, Number((courseData as any)?.completed_lessons || 0));

  const calculatedPercent = totalLessonsCount > 0 && actualCompletedLessonsCount > 0
    ? Math.min(100, Math.round((actualCompletedLessonsCount / totalLessonsCount) * 100))
    : 0;
  const pbPercent = parsedPB?.percent ?? 0;
  const enrollPercent = Number((courseData as any)?.progress || normalizedProgress?.progress || normalizedProgress?.progress_percentage || 0);

  const progressPercent = isCourseComplete
    ? 100
    : Math.max(calculatedPercent, pbPercent, enrollPercent);

  const isLessonComplete = (lessonItem: { lessonName?: string; name?: string; title?: string; lesson_name?: string }) => {
    return checkLessonRecordedComplete(lessonItem);
  };

  const currentLessonIsCompleted = isCompletedLocally || checkLessonRecordedComplete({ lessonName: currentTargetId, title: lessonData?.title || lessonData?.lesson_name || '' });

  // Sequential Locking Logic for Students
  const isLessonSequentiallyLocked = (idx: number) => {
    if (isInstructor) return false;
    if (courseLevelComplete) return false;
    if (idx <= 0) return false; // First lesson is always unlocked
    for (let i = 0; i < idx; i++) {
      if (!checkLessonRecordedComplete(flatLessons[i])) {
        return true;
      }
    }
    return false;
  };

  const isCurrentLessonSequentiallyLocked = currentIndex > 0 && isLessonSequentiallyLocked(currentIndex);

  const allOtherLessonsCompleted = flatLessons.length > 0
    ? flatLessons.filter((_, idx) => idx !== currentIndex).every(l => checkLessonRecordedComplete(l))
    : true;

  const canCompleteCourse = isLastLesson && allOtherLessonsCompleted;

  const firstIncompleteLesson = flatLessons.find(l => !checkLessonRecordedComplete(l)) || flatLessons[0];

  // Find current lesson title from outline if lessonData is null
  const currentLessonFromOutline = flatLessons.find(l => l.lessonName === currentTargetId || l.lessonName === lessonId);
  const lessonDisplayTitle = lessonData?.title || lessonData?.lesson_name || lessonData?.name || currentLessonFromOutline?.title || `Lesson ${lessonId}`;
  
  // Pricing and preview info
  const coursePrice = courseData?.course_price ?? 0;
  const currencySymbol = courseData?.currency === "INR" || !courseData?.currency ? "₹" : courseData.currency;
  const previewLesson = flatLessons.find(l => l.isPreview);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      <Navbar />

      <div className="flex-grow flex overflow-hidden h-[calc(100vh-80px)]">
        {/* Professional Dark Sidebar (Curriculum Outline) */}
        <aside className={`${isCurriculumSidebarOpen ? 'w-80' : 'w-0 hidden'} bg-slate-900 border-r border-slate-800 overflow-y-auto hidden md:flex flex-col shadow-xl z-10 relative transition-all duration-300`}>
          <div className="p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-20">
            <Link
              href={`/course/${courseId}`}
              onClick={(e) => {
                e.preventDefault();
                navigateBack(router, `/course/${courseId}`);
              }}
              className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Course
            </Link>
            <h2 className="font-extrabold text-lg text-white leading-tight line-clamp-2" title={courseData?.title || courseId}>
              {courseData?.title || courseId.replace(/-/g, ' ')}
            </h2>
            
            {/* Progress bar */}
            {(progress || progressBarData !== null) && (
              <div className="mt-5">
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                  <span>Course Progress</span>
                  <span className={isCourseComplete ? "text-emerald-400 font-bold" : "text-indigo-400"}>
                    {isCourseComplete ? "100%" : `${progressPercent}%`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isCourseComplete 
                        ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" 
                        : "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    }`} 
                    style={{ width: `${isCourseComplete ? 100 : progressPercent}%` }}
                  ></div>
                </div>

                {isCourseComplete && (
                  <div className="mt-3 w-full flex items-center justify-between p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Course Completed
                    </span>
                    <span className="text-[10px] bg-emerald-500/30 px-2 py-0.5 rounded text-emerald-200">100%</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-4 flex-1 space-y-1">
            {outline.map((chapter: any, cIndex: number) => (
              <div key={chapter.name || cIndex} className="mb-4">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3 pt-2">
                  Chapter {cIndex + 1}: {chapter.title || chapter.chapter_name || chapter.name}
                </h3>
                <ul className="space-y-1">
                  {chapter.lessons?.map((l: any, lIndex: number) => {
                    const lNameLower = decodeURIComponent(l.name || '').toLowerCase().trim();
                    const lesIdLower = decodeURIComponent(lessonId || '').toLowerCase().trim();
                    const chNameLower = decodeURIComponent(chapter.name || '').toLowerCase().trim();
                    const chIdLower = decodeURIComponent(chapterId || '').toLowerCase().trim();
                    const isActive = (l.name === lessonId || lNameLower === lesIdLower) && 
                      (!chapterId || chapter.name === chapterId || chNameLower === chIdLower);

                    const lFlatIndex = flatLessons.findIndex(fl => 
                      (fl.lessonName === l.name || (l.name && fl.lessonName && fl.lessonName.toLowerCase() === l.name.toLowerCase())) &&
                      (fl.chapterName === chapter.name || (chapter.name && fl.chapterName && fl.chapterName.toLowerCase() === chapter.name.toLowerCase()))
                    );
                    const isSequentialLocked = lFlatIndex > 0 && isLessonSequentiallyLocked(lFlatIndex);
                    const isLessonLocked = isInstructor ? false : (Boolean(l.is_locked) || isSequentialLocked);
                    const isLessonPreview = Number(l.include_in_preview) === 1;
                    const isCompleted = isLessonComplete({
                      lessonName: l.name,
                      title: l.title || l.lesson_name
                    }) || (isCompletedLocally && isActive);

                    return (
                      <li key={l.name || lIndex}>
                        {isLessonLocked ? (
                          <div 
                            className="flex items-start px-3 py-2.5 rounded-lg text-sm select-none cursor-not-allowed opacity-60 text-slate-500 font-medium"
                            title="Complete previous lessons to unlock this lesson"
                          >
                            <Lock className="w-4 h-4 mt-0.5 mr-3 flex-shrink-0 text-amber-500/80" />
                            <span className="line-clamp-2 leading-snug flex-1">
                              {lIndex + 1}. {l.title || l.lesson_name || l.name}
                            </span>
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/10 text-amber-400/90 border border-amber-500/20 flex-shrink-0">
                              Locked
                            </span>
                          </div>
                        ) : (
                          <Link 
                            href={`/course/${courseId}/${encodeURIComponent(chapter.name)}/${encodeURIComponent(l.name)}`}
                            className={`flex items-start px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative ${
                              isActive 
                                ? 'bg-indigo-500/15 text-white font-semibold' 
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium'
                            }`}
                          >
                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-md shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
                            
                            <CheckCircle className={`w-4 h-4 mt-0.5 mr-3 flex-shrink-0 transition-colors ${
                              isCompleted 
                                ? 'text-emerald-500' 
                                : isActive ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-500'
                            }`} />

                            <span className="line-clamp-2 leading-snug flex-1">
                              {lIndex + 1}. {l.title || l.lesson_name || l.name}
                            </span>

                            {isLessonPreview && !courseData?.is_enrolled && !isInstructor && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                                Preview
                              </span>
                            )}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow overflow-y-auto bg-[#F8FAFC] relative flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
          {/* Subtle Background Decoration */}
          <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-indigo-50 to-transparent pointer-events-none -z-10" />
          
          {/* Header Banner */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCurriculumSidebarOpen(prev => !prev)}
                className="hidden md:inline-flex items-center gap-1.5 p-2 px-2.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 text-xs font-semibold cursor-pointer shrink-0"
                title={isCurriculumSidebarOpen ? "Collapse Course Outline" : "Expand Course Outline"}
                aria-label="Toggle Course Outline"
              >
                <PanelLeft className="w-4 h-4" />
                <span>{isCurriculumSidebarOpen ? "Collapse Outline" : "Outline"}</span>
              </button>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md border border-indigo-100">
                    {chapterId}
                  </span>
                  {(isPaywallLocked || isCurrentLessonSequentiallyLocked) && !isInstructor && (
                    <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1 font-semibold">
                      <Lock className="w-3 h-3 text-amber-600" /> Locked Lesson
                    </span>
                  )}
                  {isInstructor && (
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1 font-bold">
                      <Sparkles className="w-3 h-3 text-emerald-600" /> Instructor Access
                    </span>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {lessonDisplayTitle}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => prevLesson && router.push(`/course/${courseId}/${encodeURIComponent(prevLesson.chapterName)}/${encodeURIComponent(prevLesson.lessonName)}`)}
                disabled={!prevLesson}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 font-semibold text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              
              {isCourseComplete ? (
                <button
                  onClick={() => setShowCompletionModal(true)}
                  className="px-4 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold text-sm rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Course Completed
                </button>
              ) : isCurrentLessonSequentiallyLocked ? (
                <span className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" /> Lesson Locked
                </span>
              ) : !currentLessonIsCompleted ? (
                canCompleteCourse ? (
                  <button
                    onClick={handleCompleteCourse}
                    disabled={updatingProgress}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm shadow-emerald-200 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    {updatingProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                    Complete Course
                  </button>
                ) : (
                  <button 
                    onClick={handleMarkComplete}
                    disabled={updatingProgress}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 cursor-pointer"
                  >
                    {updatingProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {updatingProgress ? 'Updating...' : 'Mark as Complete'}
                  </button>
                )
              ) : nextLesson ? (
                <button 
                  onClick={() => router.push(`/course/${courseId}/${encodeURIComponent(nextLesson.chapterName)}/${encodeURIComponent(nextLesson.lessonName)}`)}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 cursor-pointer"
                >
                  Next Lesson <ChevronRight className="w-4 h-4" />
                </button>
              ) : canCompleteCourse ? (
                <button
                  onClick={handleCompleteCourse}
                  disabled={updatingProgress}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm shadow-emerald-200 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  {updatingProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                  Complete Course
                </button>
              ) : (
                <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Lesson Completed
                </div>
              )}

              {isCourseComplete && nextLesson && (
                <button 
                  onClick={() => router.push(`/course/${courseId}/${encodeURIComponent(nextLesson.chapterName)}/${encodeURIComponent(nextLesson.lessonName)}`)}
                  className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 font-semibold text-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  Next Lesson <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Conditional Rendering: Sequential Locked Card VS Paywall Card VS Unlocked Content */}
          {isCurrentLessonSequentiallyLocked && !isInstructor ? (
            <div className="max-w-3xl mx-auto p-4 md:p-8 w-full flex-grow flex items-center justify-center">
              <div className="relative w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,112,184,0.08)] border border-slate-200/80 p-8 md:p-12 text-center overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600"></div>

                <div className="relative z-10">
                  <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/10 to-violet-500/20 border border-amber-500/30 flex items-center justify-center mb-6 shadow-[0_0_35px_rgba(245,158,11,0.25)] ring-8 ring-amber-500/5">
                    <Lock className="w-9 h-9 text-amber-500" />
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    Locked Lesson
                  </div>

                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
                    This Lesson is Locked
                  </h2>
                  <p className="text-slate-600 text-sm md:text-base max-w-lg mx-auto mb-8 leading-relaxed">
                    Please complete the previous lessons in this course first. Lessons unlock sequentially as you progress.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    {firstIncompleteLesson && (
                      <button
                        onClick={() => router.push(`/course/${courseId}/${encodeURIComponent(firstIncompleteLesson.chapterName)}/${encodeURIComponent(firstIncompleteLesson.lessonName)}`)}
                        className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm md:text-base rounded-xl shadow-lg shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Go to Current Lesson ({firstIncompleteLesson.title || firstIncompleteLesson.lessonName})
                      </button>
                    )}

                    <Link
                      href={`/course/${encodeURIComponent(courseId)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateBack(router, `/course/${encodeURIComponent(courseId)}`);
                      }}
                      className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Course Overview
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : isPaywallLocked && !isInstructor ? (
            <div className="max-w-3xl mx-auto p-4 md:p-8 w-full flex-grow flex items-center justify-center">
              <div className="relative w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,112,184,0.08)] border border-slate-200/80 p-8 md:p-12 text-center overflow-hidden">
                {/* Top decorative gradient bar */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600"></div>
                
                {/* Subtle radial ambient glow */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-amber-400/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                  {/* Lock icon in a glowing circle */}
                  <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/10 to-violet-500/20 border border-amber-500/30 flex items-center justify-center mb-6 shadow-[0_0_35px_rgba(245,158,11,0.25)] ring-8 ring-amber-500/5">
                    <Lock className="w-9 h-9 text-amber-500" />
                  </div>

                  {/* Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Paid Course Content
                  </div>

                  {/* Heading */}
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
                    This lesson is part of a paid course
                  </h2>
                  <p className="text-slate-600 text-sm md:text-base max-w-lg mx-auto mb-8 leading-relaxed">
                    {paywallMessage}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => router.push(`/checkout?item_type=course&item_id=${encodeURIComponent(courseId)}`)}
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm md:text-base rounded-xl shadow-lg shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-amber-300" />
                      {coursePrice > 0 ? `Unlock Course for ${currencySymbol} ${coursePrice.toLocaleString("en-IN")}` : "Unlock Course"}
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <Link
                      href={`/course/${encodeURIComponent(courseId)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateBack(router, `/course/${encodeURIComponent(courseId)}`);
                      }}
                      className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Course Overview
                    </Link>
                  </div>

                  {/* Free preview helper if preview lessons exist */}
                  {previewLesson && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-2">Want to sample the course first?</p>
                      <Link
                        href={`/course/${courseId}/${encodeURIComponent(previewLesson.chapterName)}/${encodeURIComponent(previewLesson.lessonName)}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        <Play className="w-3.5 h-3.5 text-indigo-600" />
                        Watch Free Preview: {previewLesson.title || previewLesson.lessonName}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto p-4 md:p-8 w-full flex-grow flex flex-col">
              {/* Main Content Card rendered from Editor.js blocks in `content` */}
              <div className="bg-white p-6 md:p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 flex-grow relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>

                {/* Lesson Header Title */}
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                      Lesson {lessonData?.idx !== undefined ? `#${Number(lessonData.idx) + 1}` : ''}
                    </span>
                    {lessonData?.chapter && (
                      <span className="text-xs text-slate-400 font-medium">
                        {lessonData.chapter}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {lessonDisplayTitle}
                  </h1>
                </div>

                {/* Rendered content blocks */}
                {contentBlocks.length > 0 ? (
                  <div className="space-y-4">
                    {contentBlocks.map((block: EditorBlock, idx: number) => (
                      <EditorBlockRenderer 
                        key={block.id || `blk-${idx}`} 
                        block={block} 
                        isInstructor={isInstructor} 
                      />
                    ))}
                  </div>
                ) : lessonData?.body ? (
                  <div 
                    className="prose prose-indigo max-w-none text-slate-700 leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: lessonData.body }} 
                  />
                ) : (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                      <BookOpen className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No Content Available</h3>
                    <p className="text-slate-500 text-sm">This lesson does not contain any readable material.</p>
                  </div>
                )}

                {/* Instructor Exclusive Section */}
                {isInstructor && (instructorBlocks.length > 0 || (lessonData?.instructor_notes && typeof lessonData.instructor_notes === 'string' && lessonData.instructor_notes.trim())) && (
                  <div className="mt-12 pt-8 border-t-2 border-dashed border-amber-200">
                    <div className="p-6 md:p-8 bg-amber-50/50 border border-amber-200/80 rounded-2xl shadow-xs">
                      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-amber-200/60 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm md:text-base font-bold text-amber-950">
                              Instructor Teaching Notes & Materials
                            </h3>
                            <p className="text-xs text-amber-700">
                              Visible only to instructors and course administrators
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300">
                          Instructor Only
                        </span>
                      </div>

                      {/* Instructor Blocks */}
                      {instructorBlocks.length > 0 && (
                        <div className="space-y-4">
                          {instructorBlocks.map((block: EditorBlock, idx: number) => (
                            <EditorBlockRenderer 
                              key={block.id || `inst-${idx}`} 
                              block={block} 
                              isInstructor={true} 
                            />
                          ))}
                        </div>
                      )}

                      {/* Instructor Text Notes */}
                      {lessonData?.instructor_notes && typeof lessonData.instructor_notes === 'string' && lessonData.instructor_notes.trim() !== '' && (
                        <div className="mt-4 p-4 bg-white/90 rounded-xl border border-amber-200 text-sm text-amber-950 whitespace-pre-wrap leading-relaxed">
                          {lessonData.instructor_notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Attached Assessments (Quiz, Assignment, Programming Exercise) - Displayed ONLY when added by the instructor */}
              {((Boolean(attachedQuizId) && !hasQuizInBlocks) ||
                (Boolean(attachedAssignmentId) && !hasAssignmentInBlocks) ||
                (Boolean(attachedExerciseId) && !hasExerciseInBlocks)) && (
                <div className="mt-8 space-y-4">
                  {/* Quiz Option */}
                  {Boolean(attachedQuizId) && !hasQuizInBlocks && (
                    <div className="p-5 md:p-6 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 rounded-2xl border border-indigo-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                          <HelpCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              Lesson Quiz
                            </span>
                            <h4 className="text-base font-bold text-slate-900">
                              {attachedQuizId}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Reinforce your understanding with interactive quiz questions.
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/quizzes/${encodeURIComponent(attachedQuizId)}`}
                        className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Award className="w-4 h-4" />
                        {isInstructor ? "Manage Quiz" : "Start Quiz"}
                      </Link>
                    </div>
                  )}

                  {/* Assignment Option */}
                  {Boolean(attachedAssignmentId) && !hasAssignmentInBlocks && (
                    <div className="p-5 md:p-6 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/40 rounded-2xl border border-violet-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-600/20">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                              Assignment
                            </span>
                            <h4 className="text-base font-bold text-slate-900">
                              {attachedAssignmentId}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Complete and submit your coursework assignment for this lesson.
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/assignments/${encodeURIComponent(attachedAssignmentId)}`}
                        className="w-full sm:w-auto px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-600/20 flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <FileText className="w-4 h-4" />
                        {isInstructor ? "View Submissions" : "Open Assignment"}
                      </Link>
                    </div>
                  )}

                  {/* Programming Exercise Option */}
                  {Boolean(attachedExerciseId) && !hasExerciseInBlocks && (
                    <div className="p-5 md:p-6 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-2xl border border-emerald-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                          <Code className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              Coding Exercise
                            </span>
                            <h4 className="text-base font-bold text-slate-900">
                              {attachedExerciseId}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Hands-on programming exercise with live test cases.
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/programming-exercises?exercise=${encodeURIComponent(attachedExerciseId)}`}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Code className="w-4 h-4" />
                        Launch Exercise
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Action: Dynamic Lesson & Course Completion */}
              <div className="mt-10 p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCourseComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {isCourseComplete ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <BookOpen className="w-5 h-5 text-indigo-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {isCourseComplete ? 'Course Status: Completed' : `Course Progress: ${Math.round(progressPercent)}%`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isCourseComplete 
                        ? `All ${totalLessonsCount || flatLessons.length} lessons completed` 
                        : `${completedLessonsCount} of ${totalLessonsCount || flatLessons.length} lessons completed`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {isCourseComplete ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setShowCompletionModal(true)}
                        className="px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        Course Completed
                      </button>
                      {Boolean(courseData?.has_certificate || courseData?.certificate) && (
                        <Link
                          href="/certificates"
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Award className="w-4 h-4" /> View Certificate
                        </Link>
                      )}
                      <Link
                        href={`/course/${courseId}`}
                        className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" /> Course Overview
                      </Link>
                    </div>
                  ) : currentLessonIsCompleted ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        Lesson Completed
                      </div>

                      {nextLesson ? (
                        <button
                          onClick={() => router.push(`/course/${courseId}/${encodeURIComponent(nextLesson.chapterName)}/${encodeURIComponent(nextLesson.lessonName)}`)}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                          Next Lesson <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : canCompleteCourse ? (
                        <button 
                          onClick={handleCompleteCourse}
                          disabled={updatingProgress}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                          {updatingProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                          Complete Course
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <button 
                      onClick={canCompleteCourse ? handleCompleteCourse : handleMarkComplete}
                      disabled={updatingProgress}
                      className={`px-6 py-2.5 ${canCompleteCourse ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95`}
                    >
                      {updatingProgress ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : canCompleteCourse ? (
                        <Award className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {updatingProgress ? 'Updating...' : canCompleteCourse ? 'Complete Course' : 'Mark as Complete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Course Completion Celebration Modal */}
          {showCompletionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center relative">
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <Award className="w-10 h-10" />
                </div>
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full mb-3 border border-emerald-200">
                  Course 100% Completed!
                </span>
                <h2 className="text-2xl font-black text-slate-900 mb-2">
                  Congratulations!
                </h2>
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                  You have successfully completed all lessons and chapters in <span className="font-semibold text-slate-800">{courseData?.title || courseId}</span>.
                </p>

                <div className="space-y-3">
                  {Boolean(courseData?.has_certificate || courseData?.certificate) && (
                    <Link
                      href="/certificates"
                      className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Award className="w-4 h-4" /> View Certificate
                    </Link>
                  )}
                  <Link
                    href={`/course/${courseId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateBack(router, `/course/${courseId}`);
                    }}
                    className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Course Overview
                  </Link>
                  <button
                    onClick={() => setShowCompletionModal(false)}
                    className="w-full py-2.5 text-slate-400 hover:text-slate-600 font-medium text-xs transition-colors"
                  >
                    Stay on Lesson
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
