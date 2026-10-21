"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLesson, getChapters, getLessons, getCourseProgress, getCourseProgressBar, parseProgressBarValue, createCourseProgress, getCourse } from '@/services/lms.services';
import { getCourseWithEnrollment } from '@/services/payment.services';
import { getImageUrl } from '@/services/api.services';
import { CourseWithEnrollment } from '@/types/payment.types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { showToast } from '@/components/ui/Toast';
import { 
  ArrowLeft, 
  CheckCircle, 
  ChevronRight, 
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
            href={`/quizzes?quiz=${encodeURIComponent(quizId)}`}
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

    case 'program': {
      const exerciseId = block.data?.exercise || block.data?.id || '';
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
      const rolesStr = localStorage.getItem('roles') || '';
      const roles = rolesStr.startsWith('[') ? JSON.parse(rolesStr) : rolesStr;
      const hasRole = Array.isArray(roles)
        ? roles.some((r: string) => ['Instructor', 'Administrator', 'System Manager', 'Course Creator'].includes(r))
        : ['Instructor', 'Administrator', 'System Manager', 'Course Creator'].some(r => rolesStr.includes(r));
      if (hasRole) return true;
      if (localStorage.getItem('isInstructor') === 'true') return true;
      
      const email = localStorage.getItem('userEmail') || localStorage.getItem('user_email') || '';
      if (email) {
        if (cDataObj?.owner === email || cDataObj?.owner === 'Administrator') return true;
        if (cDetails?.owner === email || cDetails?.owner === 'Administrator') return true;
        if (Array.isArray(cDataObj?.instructors) && cDataObj.instructors.some((i: any) => 
          i.instructor === email || i.owner === email || i.name === email || i.username === email
        )) return true;
        if (Array.isArray(cDetails?.instructors) && cDetails.instructors.some((i: any) => 
          i.instructor === email || i.owner === email || i.name === email || i.username === email
        )) return true;
      }
    } catch (e) {}
    return false;
  };

  useEffect(() => {
    const currentEmail = localStorage.getItem('userEmail') || localStorage.getItem('user_email') || '';
    setUserEmail(currentEmail);
    const initialInstructor = checkInstructorRole();
    setIsInstructor(initialInstructor);
    
    if (!courseId || !chapterId || !lessonId) return;

    const fetchLesson = async () => {
      setLoading(true);
      setError(null);
      setIsPaywallLocked(false);
      try {
        const [lessonRes, chaptersRes, lessonsRes, progressRes, progressBarRes, courseEnrollRes, courseRes] = await Promise.allSettled([
          getLesson({ course: courseId, chapter: chapterId, name: lessonId }),
          getChapters({ course: courseId }),
          getLessons({ course: courseId }),
          getCourseProgress(courseId, currentEmail),
          getCourseProgressBar({ course: courseId, member: currentEmail }),
          getCourseWithEnrollment(courseId),
          getCourse(courseId)
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
          } else {
            if (!instructorUser) {
              throw new Error(err?.message || 'Failed to load lesson content');
            }
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
          } else {
            setLessonData(raw);
          }
        }

        // For instructor, lessons CANNOT be locked. Lessons can be locked ONLY for student!
        if (instructorUser) {
          paywalled = false;
          setIsPaywallLocked(false);

          // If lessonRes failed with 403 / enrollment required, recover lesson content from courseObj or lessonsRes
          let fallbackLesson: any = null;
          if (courseObj && Array.isArray(courseObj.chapters)) {
            for (const ch of courseObj.chapters) {
              if (Array.isArray(ch.lessons)) {
                const found = ch.lessons.find((l: any) => l.name === lessonId || l.title === lessonId);
                if (found) {
                  fallbackLesson = found;
                  break;
                }
              }
            }
          }
          if (!fallbackLesson && cData && Array.isArray((cData as any).chapters)) {
            for (const ch of (cData as any).chapters) {
              if (Array.isArray(ch.lessons)) {
                const found = ch.lessons.find((l: any) => l.name === lessonId || l.title === lessonId);
                if (found) {
                  fallbackLesson = found;
                  break;
                }
              }
            }
          }
          if (!fallbackLesson && lessonsRes.status === 'fulfilled') {
            const rawLe = lessonsRes.value;
            const leArray = Array.isArray(rawLe) ? rawLe : (rawLe?.message?.data || rawLe?.data || rawLe?.message || []);
            if (Array.isArray(leArray)) {
              fallbackLesson = leArray.find((l: any) => l.name === lessonId || l.title === lessonId);
            }
          }

          if (fallbackLesson) {
            setLessonData((prev: any) => ({ ...fallbackLesson, ...(prev || {}) }));
            setError(null);
          }
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

        const rawCh = (courseObj && Array.isArray(courseObj.chapters) && courseObj.chapters.length > 0)
          ? courseObj.chapters
          : (chaptersRes.status === 'fulfilled' ? chaptersRes.value : []);
        const rawLe = lessonsRes.status === 'fulfilled' ? lessonsRes.value : [];
        const chArray = Array.isArray(rawCh) ? rawCh : (rawCh?.message?.data || rawCh?.data || rawCh?.message || []);
        const leArray = Array.isArray(rawLe) ? rawLe : (rawLe?.message?.data || rawLe?.data || rawLe?.message || []);

        const mapped = chArray.map((c: any) => {
          let chLessons: any[] = Array.isArray(c.lessons) ? c.lessons : [];
          if (chLessons.length === 0 && leArray.length > 0) {
            chLessons = leArray.filter((l: any) => l.chapter === c.name);
          }

          return {
            ...c,
            lessons: chLessons.map((l: any) => {
              const fromEnroll = enrollLessonsMap.get(l.name);
              const isLessonLocked = instructorUser
                ? false
                : (fromEnroll?.is_locked !== undefined 
                  ? Boolean(fromEnroll.is_locked)
                  : Boolean(cData?.is_paid && !cData?.is_enrolled && !l.include_in_preview));
              
              return {
                ...l,
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
      const [progressRes, pbRes] = await Promise.allSettled([
        getCourseProgress(courseId, userEmail),
        getCourseProgressBar({ course: courseId, member: userEmail })
      ]);
      const pVal = progressRes.status === 'fulfilled' ? progressRes.value : null;
      const updatedProgress = pVal?.message?.data || pVal?.data || pVal?.message || pVal;
      if (pVal?.message || pVal?.data || pVal) {
        setProgress(pVal);
      }
      if (pbRes.status === 'fulfilled') {
        const rawPB = pbRes.value;
        setProgressBarData(rawPB?.message ?? rawPB?.data ?? rawPB);
      }

      // Check if all lessons across all chapters are now completed
      const updatedRecords = updatedProgress?.records || updatedProgress?.data?.records || [];
      const updatedPercent = Number(updatedProgress?.progress || 0);
      const allDone = updatedPercent >= 100 || (flatLessons.length > 0 && flatLessons.every(l => {
        const lName = l.lessonName || l.name;
        const lTitle = l.title || l.lesson_name;
        if (lName === (lessonData.name || lessonId)) return true;
        return updatedRecords.some((r: any) => 
          (r.lesson === lName || (lTitle && r.lesson === lTitle)) && 
          (r.status === 'Complete' || r.status === 'Completed' || r.completed === 1)
        );
      }));

      if (allDone) {
        showToast.success('Course completed successfully!');
      } else {
        showToast.success('Lesson marked as completed!');
      }
    } catch (err: any) {
      showToast.error(err.response?.data?.message || err.message || 'Failed to update progress');
    } finally {
      setUpdatingProgress(false);
    }
  };

  // Parse blocks from lessonData.content and lessonData.instructor_content
  const contentBlocks = useMemo(() => parseBlocks(lessonData?.content), [lessonData?.content]);
  const instructorBlocks = useMemo(() => parseBlocks(lessonData?.instructor_content), [lessonData?.instructor_content]);

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
          <button onClick={() => router.push(`/course/${courseId}`)} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full cursor-pointer">Back to Course</button>
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
  const currentIndex = flatLessons.findIndex(l => l.chapterName === chapterId && l.lessonName === currentTargetId);
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex !== -1 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;
  const isLastLesson = currentIndex !== -1 && currentIndex === flatLessons.length - 1;
  
  // Dynamic progress calculations from backend sources
  const normalizedProgress = progress?.message?.data || progress?.data || progress?.message || progress || {};
  const parsedPB = progressBarData !== null && progressBarData !== undefined ? parseProgressBarValue(progressBarData) : null;

  const progressPercent = parsedPB !== null
    ? parsedPB.percent
    : (typeof normalizedProgress.progress === 'number'
        ? normalizedProgress.progress
        : typeof courseData?.progress === 'number'
          ? courseData.progress
          : Number(normalizedProgress.progress || courseData?.progress || 0));

  const completedLessonsCount = (parsedPB?.completedLessons !== undefined)
    ? parsedPB.completedLessons
    : (typeof normalizedProgress.completed_lessons === 'number'
        ? normalizedProgress.completed_lessons
        : typeof courseData?.completed_lessons === 'number'
          ? courseData.completed_lessons
          : Number(normalizedProgress.completed_lessons || courseData?.completed_lessons || 0));

  const totalLessonsCount = (parsedPB?.totalLessons !== undefined)
    ? parsedPB.totalLessons
    : (typeof normalizedProgress.total_lessons === 'number'
        ? normalizedProgress.total_lessons
        : typeof courseData?.total_lessons === 'number'
          ? courseData.total_lessons
          : Number(normalizedProgress.total_lessons || courseData?.total_lessons || flatLessons.length || 0));

  const progressRecords = normalizedProgress.records || normalizedProgress.data?.records || [];

  const isLessonComplete = (lessonItem: { lessonName?: string; name?: string; title?: string; lesson_name?: string }) => {
    const lName = lessonItem.lessonName || lessonItem.name || '';
    const lTitle = lessonItem.title || lessonItem.lesson_name || '';
    if (isCompletedLocally && (lName === currentTargetId || lName === lessonId)) {
      return true;
    }
    if (!Array.isArray(progressRecords)) return false;
    return progressRecords.some((r: any) => 
      (r.lesson === lName || (lTitle && r.lesson === lTitle)) && 
      (r.status === 'Complete' || r.status === 'Completed' || r.completed === 1)
    );
  };

  const currentLessonIsCompleted = isCompletedLocally || isLessonComplete({ lessonName: currentTargetId, title: lessonData?.title || lessonData?.lesson_name || '' });

  const isCourseComplete = Boolean(
    progressPercent >= 100 ||
    (totalLessonsCount > 0 && completedLessonsCount >= totalLessonsCount) ||
    (flatLessons.length > 0 && flatLessons.every(l => isLessonComplete(l))) ||
    courseData?.status === 'Completed'
  );

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
            <Link href={`/course/${courseId}`} className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-4">
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
                    const isActive = l.name === lessonId && chapter.name === chapterId;
                    const isLessonLocked = isInstructor ? false : Boolean(l.is_locked);
                    const isLessonPreview = Number(l.include_in_preview) === 1;
                    const isCompleted = isLessonComplete({
                      lessonName: l.name,
                      title: l.title || l.lesson_name
                    }) || (isCompletedLocally && isActive);

                    return (
                      <li key={l.name || lIndex}>
                        <Link 
                          href={`/course/${courseId}/${encodeURIComponent(chapter.name)}/${encodeURIComponent(l.name)}`}
                          className={`flex items-start px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative ${
                            isActive 
                              ? 'bg-indigo-500/15 text-white font-semibold' 
                              : isLessonLocked
                              ? 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300 font-medium'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium'
                          }`}
                        >
                          {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-md shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
                          
                          {isLessonLocked ? (
                            <Lock className="w-4 h-4 mt-0.5 mr-3 flex-shrink-0 text-amber-500/80" />
                          ) : (
                            <CheckCircle className={`w-4 h-4 mt-0.5 mr-3 flex-shrink-0 transition-colors ${
                              isCompleted 
                                ? 'text-emerald-500' 
                                : isActive ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-500'
                            }`} />
                          )}

                          <span className="line-clamp-2 leading-snug flex-1">
                            {lIndex + 1}. {l.title || l.lesson_name || l.name}
                          </span>

                          {isLessonPreview && !courseData?.is_enrolled && !isInstructor && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                              Preview
                            </span>
                          )}

                          {isLessonLocked && !isInstructor && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/10 text-amber-400/90 border border-amber-500/20 flex-shrink-0">
                              Locked
                            </span>
                          )}
                        </Link>
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
                  {isPaywallLocked && !isInstructor && (
                    <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1">
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
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 font-semibold text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              
              {nextLesson ? (
                <button 
                  onClick={() => router.push(`/course/${courseId}/${encodeURIComponent(nextLesson.chapterName)}/${encodeURIComponent(nextLesson.lessonName)}`)}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 cursor-pointer"
                >
                  Next Lesson <ChevronRight className="w-4 h-4" />
                </button>
              ) : isCourseComplete ? (
                <span className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Course Completed
                </span>
              ) : (
                <button
                  onClick={handleMarkComplete}
                  disabled={updatingProgress}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm shadow-indigo-200 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  {updatingProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Complete Course
                </button>
              )}
            </div>
          </div>

          {/* Conditional Rendering: Paywall Card VS Unlocked Content */}
          {isPaywallLocked && !isInstructor ? (
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
                      className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
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

              {/* Lesson Quiz & Knowledge Check */}
              <div className="mt-8 p-6 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 rounded-2xl border border-indigo-100/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Lesson Quiz & Knowledge Check</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        Lesson Test
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Reinforce your understanding of the topics taught in this lesson.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  {isInstructor ? (
                    <>
                      <Link
                        href={`/quizzes/create-question?course=${encodeURIComponent(courseId)}&chapter=${encodeURIComponent(chapterId)}&lesson=${encodeURIComponent(lessonId)}`}
                        className="flex-1 md:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Lesson Quiz
                      </Link>
                      <Link
                        href="/quizzes"
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center"
                      >
                        Manage Quizzes
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/quizzes"
                      className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                      <Award className="w-3.5 h-3.5" /> Take Lesson Quiz
                    </Link>
                  )}
                </div>
              </div>

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
                      {completedLessonsCount} of {totalLessonsCount} lessons completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {isCourseComplete ? (
                    <div className="flex items-center gap-3">
                      {Boolean(courseData?.has_certificate || courseData?.certificate) && (
                        <Link
                          href="/certificates"
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <Award className="w-4 h-4" /> Certificate
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
                    <div className="px-6 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Lesson Completed
                    </div>
                  ) : (
                    <button 
                      onClick={handleMarkComplete}
                      disabled={updatingProgress}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {updatingProgress ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {updatingProgress ? 'Updating...' : isLastLesson ? 'Complete Course' : 'Mark as Complete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
