"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLesson, getChapters, getLessons, getCourseProgress, getCourseProgressBar, parseProgressBarValue, createCourseProgress, getCourse, getCourseOutline, getQuizSubmissions, createStudentCertificate, downloadCertificatePdf, getCertificatePdfUrl } from '@/services/lms.services';
import { compareCurriculumItems } from '@/utils/curriculum';
import { getCourseWithEnrollment } from '@/services/payment.services';
import { getImageUrl, getCurrentUserEmail } from '@/services/api.services';
import { isAuthorizedInstructor } from '@/services/auth.services';
import { CourseWithEnrollment } from '@/types/payment.types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { navigateBack } from '@/utils/navigation';
import { showToast } from '@/components/ui/Toast';
import InlineHighlightMenu from '@/components/notes/InlineHighlightMenu';
import LessonNotesTab from '@/components/notes/LessonNotesTab';
import { getLessonNotes, saveLessonNote, deleteLessonHighlight } from '@/services/notes.services';
import { applyHighlightToDOM, removeHighlightFromDOM } from '@/utils/lessonHighlight';
import { LessonNote, LessonNotesResponse, NoteColor } from '@/types/notes.types';
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
  RotateCcw,
  StickyNote,
  MessageSquare,
  AlertCircle
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

function getLessonQuizIds(lesson: any): string[] {
  if (!lesson) return [];
  const quizIds = new Set<string>();

  if (lesson.quiz && typeof lesson.quiz === 'string' && lesson.quiz.trim()) {
    quizIds.add(lesson.quiz.trim());
  } else if (lesson.quiz && typeof lesson.quiz === 'object' && (lesson.quiz.name || lesson.quiz.id)) {
    quizIds.add(String(lesson.quiz.name || lesson.quiz.id).trim());
  }
  if (lesson.quiz_id && typeof lesson.quiz_id === 'string' && lesson.quiz_id.trim()) {
    quizIds.add(lesson.quiz_id.trim());
  }
  if (lesson.lms_quiz && typeof lesson.lms_quiz === 'string' && lesson.lms_quiz.trim()) {
    quizIds.add(lesson.lms_quiz.trim());
  }

  const rawBlocks = parseBlocks(lesson.content || lesson.body);
  rawBlocks.forEach((b: any) => {
    if (b.type === 'quiz') {
      const qId = b.data?.quiz || b.data?.id || b.data?.name || b.content || b.data?.content;
      if (qId && typeof qId === 'string' && qId.trim()) {
        quizIds.add(qId.trim());
      }
    }
  });

  const textToSearch = `${typeof lesson.content === 'string' ? lesson.content : ''} ${typeof lesson.body === 'string' ? lesson.body : ''}`;
  const regex1 = /class(?:Name)?=["'][^"']*quiz-block[^"']*["'][^>]*data-id=["']([^"']+)["']/gi;
  const regex2 = /data-id=["']([^"']+)["'][^>]*class(?:Name)?=["'][^"']*quiz-block/gi;
  let match;
  while ((match = regex1.exec(textToSearch)) !== null) {
    if (match[1]?.trim()) quizIds.add(match[1].trim());
  }
  while ((match = regex2.exec(textToSearch)) !== null) {
    if (match[1]?.trim()) quizIds.add(match[1].trim());
  }

  return Array.from(quizIds);
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

function EditorBlockRenderer({
  block,
  isInstructor,
  isQuizCompleted,
  courseId,
  chapterId,
  lessonId
}: {
  block: EditorBlock;
  isInstructor: boolean;
  isQuizCompleted?: (quizId: string) => boolean;
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
}) {
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
      const isDone = isQuizCompleted ? isQuizCompleted(quizId) : false;
      const returnParams = courseId && chapterId && lessonId
        ? `?courseId=${encodeURIComponent(courseId)}&chapterId=${encodeURIComponent(chapterId)}&lessonId=${encodeURIComponent(lessonId)}`
        : '';
      return (
        <div id="lesson-quiz-section" className="my-6 p-5 md:p-6 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 rounded-2xl border border-indigo-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-xl ${isDone ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-indigo-600 shadow-indigo-600/20'} text-white flex items-center justify-center shrink-0 shadow-md`}>
              {isDone ? <CheckCircle2 className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Lesson Quiz
                </span>
                {!isInstructor && (
                  isDone ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                      <AlertCircle className="w-3 h-3 text-amber-600" /> Quiz Required
                    </span>
                  )
                )}
                <h4 className="text-base font-bold text-slate-900">
                  {quizId}
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isDone ? "You have completed this quiz!" : "You must complete and submit this quiz to complete the lesson."}
              </p>
            </div>
          </div>
          <Link
            href={`/quizzes/${encodeURIComponent(quizId)}${returnParams}`}
            className={`w-full sm:w-auto px-5 py-2.5 ${isDone ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'} rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0`}
          >
            <Award className="w-4 h-4" />
            {isInstructor ? "Manage Quiz" : isDone ? "Review Quiz" : "Start Quiz"}
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

  // Certificate generation state for student after course completion
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

      const certName = certData?.name || (typeof certData === 'string' ? certData : '') || courseData?.certificate || '';
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

  const handleOpenExistingCertificate = (certName: string, format?: string) => {
    const url = getCertificatePdfUrl(certName, format || 'StrideNEX Creative Pathways');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Lesson & quiz tracking state
  const [allLessonsList, setAllLessonsList] = useState<any[]>([]);
  const [userQuizSubmissions, setUserQuizSubmissions] = useState<any[]>([]);

  // ── LMS Lesson Notes state ──────────────────────────────────────────────
  const [lessonNotesData, setLessonNotesData] = useState<LessonNotesResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'discussion'>('notes');
  const [highlightMenu, setHighlightMenu] = useState<{
    rect: DOMRect;
    selectedText: string;
    existingNoteId: string | null;
  } | null>(null);
  const readingContainerRef = useRef<HTMLElement | null>(null);
  // ────────────────────────────────────────────────────────────────────────

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
    const currentEmail = getCurrentUserEmail() || localStorage.getItem('userEmail') || localStorage.getItem('user') || localStorage.getItem('user_email') || '';
    setUserEmail(currentEmail);
    // Initialize instructor state conservatively to false to prevent premature instructor flash
    setIsInstructor(false);
    
    if (!courseId || !chapterId || !lessonId) return;

    const fetchLesson = async () => {
      setLoading(true);
      setError(null);
      setIsPaywallLocked(false);
      try {
        const [lessonRes, chaptersRes, lessonsRes, progressRes, progressBarRes, courseEnrollRes, courseRes, outlineRes, quizSubsRes] = await Promise.allSettled([
          getLesson({ course: courseId, chapter: chapterId, name: lessonId }),
          getChapters({ course: courseId }),
          getLessons({ course: courseId }),
          getCourseProgress(courseId, currentEmail),
          getCourseProgressBar({ course: courseId, member: currentEmail }),
          getCourseWithEnrollment(courseId),
          getCourse(courseId),
          getCourseOutline({ course: courseId }),
          getQuizSubmissions({ member: currentEmail })
        ]);

        if (quizSubsRes.status === 'fulfilled' && Array.isArray(quizSubsRes.value)) {
          setUserQuizSubmissions(quizSubsRes.value);
        }

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

          if (cData && Array.isArray((cData as any).chapters) && (cData as any).chapters.length > 0) {
            fallbackLesson = searchChapters((cData as any).chapters);
          }
          if (!fallbackLesson && courseObj && Array.isArray(courseObj.chapters)) {
            fallbackLesson = searchChapters(courseObj.chapters);
          }
          if (!fallbackLesson && outlineChapters && Array.isArray(outlineChapters) && outlineChapters.length > 0) {
            fallbackLesson = searchChapters(outlineChapters);
          }
          if (lessonsRes.status === 'fulfilled') {
            const rawLe = lessonsRes.value;
            const leArray = Array.isArray(rawLe) ? rawLe : (rawLe?.message?.data || rawLe?.data || rawLe?.message || []);
            if (Array.isArray(leArray)) {
              setAllLessonsList(leArray);
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
                if (l.name) enrollLessonsMap.set(String(l.name).trim().toLowerCase(), l);
                if (l.title) enrollLessonsMap.set(String(l.title).trim().toLowerCase(), l);
                if (l.lesson_name) enrollLessonsMap.set(String(l.lesson_name).trim().toLowerCase(), l);
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
        if (hasLessons(enrollChaptersList)) {
          baseChapters = enrollChaptersList;
        } else if (hasLessons(courseChaptersList)) {
          baseChapters = courseChaptersList;
        } else if (hasLessons(outlineChaptersList)) {
          baseChapters = outlineChaptersList;
        } else if (enrollChaptersList.length > 0) {
          baseChapters = enrollChaptersList;
        } else if (courseChaptersList.length > 0) {
          baseChapters = courseChaptersList;
        } else if (outlineChaptersList.length > 0) {
          baseChapters = outlineChaptersList;
        } else {
          baseChapters = listChapters;
        }

        // Sort chapters consistently using sequence numbers, creation timestamp, and title numbering
        const sortedChArray = [...baseChapters].sort(compareCurriculumItems);

        const allSourceChapters = [...enrollChaptersList, ...courseChaptersList, ...outlineChaptersList];

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
              const lKey = String(l.name || '').trim().toLowerCase();
              const lTitleKey = String(l.title || l.lesson_name || '').trim().toLowerCase();
              const fromEnroll = enrollLessonsMap.get(lKey) || (lTitleKey ? enrollLessonsMap.get(lTitleKey) : null);
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

  // ── Sync quiz submissions and local state on window focus or storage event ──
  useEffect(() => {
    const syncQuizStatus = async () => {
      const email = userEmail || (typeof window !== 'undefined' ? (localStorage.getItem('userEmail') || localStorage.getItem('user') || '') : '');
      if (!email) return;
      try {
        const subs = await getQuizSubmissions({ member: email });
        if (Array.isArray(subs)) {
          setUserQuizSubmissions(subs);
        }
      } catch (e) {}
    };

    const handleFocus = () => syncQuizStatus();
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes('quiz')) syncQuizStatus();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [userEmail]);

  // ── Fetch + rehydrate highlights when lessonData resolves ────────────────
  useEffect(() => {
    if (!lessonData?.name) return;
    let cancelled = false;
    const load = async () => {
      const data = await getLessonNotes(lessonData.name);
      if (cancelled) return;
      setLessonNotesData(data);
      // Apply highlights to DOM after content renders
      if (data.highlights.length > 0) {
        // Wait one tick for the DOM to be ready
        setTimeout(() => {
          const container = readingContainerRef.current;
          if (!container) return;
          data.highlights.forEach((h) => applyHighlightToDOM(h, container as HTMLElement));
        }, 200);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [lessonData?.name]);

  // ── Text selection handler for inline highlight menu ─────────────────────
  const handleReadingMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setHighlightMenu(null);
      return;
    }
    const text = selection.toString().trim();
    if (!text || text.length < 3) {
      setHighlightMenu(null);
      return;
    }
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // Detect if selection sits inside an existing highlight
      const anchor = selection.anchorNode;
      const markEl = (anchor instanceof Element ? anchor : anchor?.parentElement)?.closest?.('[data-note-id]') as HTMLElement | null;
      const existingNoteId = markEl?.dataset.noteId || null;
      setHighlightMenu({ rect, selectedText: text, existingNoteId });
    } catch {
      setHighlightMenu(null);
    }
  }, []);

  const handleHighlightColor = useCallback(async (color: NoteColor) => {
    if (!highlightMenu || !lessonData?.name) return;
    const { selectedText, existingNoteId } = highlightMenu;
    setHighlightMenu(null);
    window.getSelection()?.removeAllRanges();
    try {
      const saved = await saveLessonNote({
        lesson: lessonData.name,
        highlighted_text: selectedText,
        color,
      });
      if (saved) {
        const container = readingContainerRef.current;
        if (container) applyHighlightToDOM(saved as LessonNote, container as HTMLElement);
        setLessonNotesData((prev) => prev
          ? { ...prev, highlights: [...prev.highlights, saved as LessonNote] }
          : prev
        );
        showToast.success('Text highlighted!');
      }
    } catch {
      showToast.error('Could not save highlight.');
    }
  }, [highlightMenu, lessonData?.name]);

  const handleAddToNotes = useCallback(() => {
    if (!highlightMenu) return;
    const { selectedText } = highlightMenu;
    setHighlightMenu(null);
    window.getSelection()?.removeAllRanges();

    // Decode entities and format as clean Markdown quote block
    const clean = selectedText
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    const quoteLines = clean
      .split('\n')
      .map((line) => (line.trim() ? `> ${line.trim()}` : '>'))
      .join('\n');
    const quoteBlock = `${quoteLines}\n\n`;

    // Dispatch event to LessonNotesTab to append quote
    window.dispatchEvent(new CustomEvent('lms-append-note', { detail: { text: quoteBlock } }));
    setActiveTab('notes');
    showToast.success('Added to your notes!');
  }, [highlightMenu]);

  const handleRemoveHighlight = useCallback(async () => {
    if (!highlightMenu?.existingNoteId || !lessonData?.name) return;
    const { existingNoteId, selectedText } = highlightMenu;
    setHighlightMenu(null);
    window.getSelection()?.removeAllRanges();
    const container = readingContainerRef.current;
    if (container) removeHighlightFromDOM(existingNoteId, container as HTMLElement);
    await deleteLessonHighlight(lessonData.name, selectedText);
    setLessonNotesData((prev) => prev
      ? { ...prev, highlights: prev.highlights.filter((h) => h.name !== existingNoteId) }
      : prev
    );
    showToast.success('Highlight removed.');
  }, [highlightMenu, lessonData?.name]);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Quiz Completion Checking Helpers ─────────────────────────────────────
  const isQuizCompleted = useCallback((quizId: string): boolean => {
    if (!quizId) return true;
    const cleanId = String(quizId).trim().toLowerCase();

    // 1. Check local storage
    if (typeof window !== 'undefined') {
      const email = (userEmail || localStorage.getItem('userEmail') || localStorage.getItem('user') || '').trim().toLowerCase();
      if (email) {
        if (
          localStorage.getItem(`lms_quiz_completed_${email}_${quizId}`) === 'true' ||
          localStorage.getItem(`lms_quiz_${email}_${quizId}_completed`) === 'true' ||
          localStorage.getItem(`lms_quiz_completed_${email}_${cleanId}`) === 'true' ||
          localStorage.getItem(`lms_quiz_${email}_${cleanId}_completed`) === 'true'
        ) {
          return true;
        }
      }
      if (
        localStorage.getItem(`lms_quiz_completed_${quizId}`) === 'true' ||
        localStorage.getItem(`lms_quiz_${quizId}_completed`) === 'true' ||
        localStorage.getItem(`lms_quiz_completed_${cleanId}`) === 'true' ||
        localStorage.getItem(`lms_quiz_${cleanId}_completed`) === 'true'
      ) {
        return true;
      }
    }

    // 2. Check loaded user quiz submissions
    if (Array.isArray(userQuizSubmissions) && userQuizSubmissions.length > 0) {
      const hasValidSub = userQuizSubmissions.some((s: any) => {
        const sQuiz = String(s.quiz || s.quiz_title || s.name || '').trim().toLowerCase();
        if (sQuiz !== cleanId && sQuiz !== String(quizId).trim().toLowerCase()) return false;
        const status = String(s.status || '').toLowerCase();
        if (status === 'fail' || status === 'failed') return false;
        return true;
      });
      if (hasValidSub) return true;
    }

    return false;
  }, [userEmail, userQuizSubmissions]);

  const currentLessonQuizIds = useMemo(() => {
    return getLessonQuizIds(lessonData);
  }, [lessonData]);

  const hasUncompletedQuizInCurrentLesson = useMemo(() => {
    if (isInstructor) return false;
    if (!currentLessonQuizIds || currentLessonQuizIds.length === 0) return false;
    return currentLessonQuizIds.some(qId => !isQuizCompleted(qId));
  }, [currentLessonQuizIds, isInstructor, isQuizCompleted]);

  const isCurrentLessonQuizCompleted = useMemo(() => {
    if (!currentLessonQuizIds || currentLessonQuizIds.length === 0) return true;
    return currentLessonQuizIds.every(qId => isQuizCompleted(qId));
  }, [currentLessonQuizIds, isQuizCompleted]);

  const isLessonQuizComplete = useCallback((lessonItem: any): boolean => {
    if (isInstructor) return true;
    const qIds = getLessonQuizIds(lessonItem);
    if (qIds.length === 0) return true;
    return qIds.every(qId => isQuizCompleted(qId));
  }, [isInstructor, isQuizCompleted]);

  // Derive flat lessons for navigation and quiz verification
  const flatLessons = useMemo(() => {
    return outline.flatMap(c => (c.lessons || []).map((l: any) => {
      const lName = String(l?.name || '').trim().toLowerCase();
      const lTitle = String(l?.title || l?.lesson_name || '').trim().toLowerCase();
      const fullLe = allLessonsList.find((item: any) => {
        const iName = String(item?.name || '').trim().toLowerCase();
        const iTitle = String(item?.title || item?.lesson_name || '').trim().toLowerCase();
        return (lName && iName === lName) || (lTitle && iTitle === lTitle);
      });
      const mergedLesson = { ...(fullLe || {}), ...l };
      const isEnrolledStudent = Boolean(
        isInstructor ||
        courseData?.is_enrolled ||
        (courseData as any)?.membership
      );
      return {
        ...mergedLesson,
        chapterName: c.name, 
        chapterTitle: c.title || c.chapter_name || c.name,
        lessonName: l.name,
        title: l.title || l.lesson_name || l.name,
        isLocked: isInstructor ? false : (isEnrolledStudent ? false : Boolean(l.is_locked)),
        isPreview: Number(l.include_in_preview) === 1
      };
    }));
  }, [outline, allLessonsList, isInstructor, courseData]);

  const hasIncompleteQuizzesInCourse = useMemo(() => {
    if (isInstructor) return false;
    return flatLessons.some(l => !isLessonQuizComplete(l));
  }, [flatLessons, isInstructor, isLessonQuizComplete]);

  // Clean up any stale course completion flags in localStorage if incomplete quizzes exist
  useEffect(() => {
    if (typeof window !== 'undefined' && userEmail) {
      if (hasIncompleteQuizzesInCourse) {
        localStorage.removeItem(`lms_course_completed_${userEmail}_${courseId}`);
        localStorage.removeItem(`lms_course_completed_${courseId}`);
        localStorage.setItem(`lms_course_has_incomplete_quizzes_${courseId}`, 'true');
      } else {
        localStorage.removeItem(`lms_course_has_incomplete_quizzes_${courseId}`);
      }
    }
  }, [hasIncompleteQuizzesInCourse, userEmail, courseId]);

  const handleMarkComplete = async () => {
    if (!lessonData) return;
    if (!isInstructor && hasUncompletedQuizInCurrentLesson) {
      showToast.error("Please complete the quiz inside this lesson before marking it as complete.");
      const qElem = document.getElementById('lesson-quiz-section') || document.querySelector('.quiz-block');
      if (qElem) qElem.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setUpdatingProgress(true);
    try {
      const activeMember = getCurrentUserEmail() || userEmail || (typeof window !== 'undefined' ? (localStorage.getItem('userEmail') || localStorage.getItem('user') || '') : '');
      await createCourseProgress({
        member: activeMember,
        lesson: lessonData.name || lessonId,
        status: "Complete"
      });
      setIsCompletedLocally(true);

      const allEmails = [
        getCurrentUserEmail(),
        userEmail,
        typeof window !== 'undefined' ? localStorage.getItem('userEmail') : '',
        typeof window !== 'undefined' ? localStorage.getItem('user') : '',
        typeof window !== 'undefined' ? localStorage.getItem('email') : '',
        typeof window !== 'undefined' ? localStorage.getItem('user_email') : '',
      ].filter(Boolean).map(e => String(e).trim());

      const normLesson = lessonData.name || lessonId;
      const lessonTitle = lessonData.title || lessonData.lesson_name || '';

      const idsToSave = Array.from(new Set([
        normLesson,
        lessonId,
        lessonTitle,
        String(normLesson).toLowerCase(),
        String(lessonId).toLowerCase(),
        String(lessonTitle).toLowerCase(),
        String(normLesson).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        String(lessonId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        String(lessonTitle).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      ].filter(Boolean)));

      if (typeof window !== "undefined") {
        // Save generic keys
        idsToSave.forEach(id => {
          localStorage.setItem(`lms_lesson_${id}_completed`, 'true');
          localStorage.setItem(`lms_lesson_${courseId}_${id}_completed`, 'true');
        });

        // Save email-scoped keys for all email variants
        allEmails.forEach(em => {
          const cleanEm = em.toLowerCase();
          idsToSave.forEach(id => {
            localStorage.setItem(`lms_lesson_${em}_${id}_completed`, 'true');
            localStorage.setItem(`lms_lesson_${em}_${courseId}_${id}_completed`, 'true');
            localStorage.setItem(`lms_lesson_${cleanEm}_${id}_completed`, 'true');
            localStorage.setItem(`lms_lesson_${cleanEm}_${courseId}_${id}_completed`, 'true');
          });
        });

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('lesson-completed', { detail: { lessonId: normLesson, courseId } }));
      }

      const [progressRes, pbRes] = await Promise.allSettled([
        getCourseProgress(courseId, activeMember),
        getCourseProgressBar({ course: courseId, member: activeMember })
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
        if (checkLessonRecordedComplete(l)) {
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

      const shouldCompleteCourse = allOutlineLessonsDone && !hasIncompleteQuizzesInCourse;

      if (shouldCompleteCourse) {
        setIsCourseCompletedLocally(true);
        if (typeof window !== "undefined") {
          localStorage.setItem(`lms_course_completed_${courseId}`, 'true');
          allEmails.forEach(em => {
            localStorage.setItem(`lms_course_completed_${em}_${courseId}`, 'true');
            localStorage.setItem(`lms_course_completed_${em.toLowerCase()}_${courseId}`, 'true');
          });
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

    if (!isInstructor) {
      if (hasUncompletedQuizInCurrentLesson) {
        showToast.error("Please complete the quiz inside this lesson before completing the course.");
        const qElem = document.getElementById('lesson-quiz-section') || document.querySelector('.quiz-block');
        if (qElem) qElem.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (hasIncompleteQuizzesInCourse) {
        showToast.error("Please complete all quizzes across the course before completing the course.");
        return;
      }
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
    if (!hasIncompleteQuizzesInCourse) {
      setIsCourseCompletedLocally(true);
      if (typeof window !== "undefined" && userEmail) {
        localStorage.setItem(`lms_course_completed_${userEmail}_${courseId}`, 'true');
      }
      setShowCompletionModal(true);
    }
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



  const currentTargetId = lessonData?.name || lessonId;
  const targetChapter = chapterId ? decodeURIComponent(chapterId).toLowerCase().trim() : '';
  const targetLesson = currentTargetId ? decodeURIComponent(currentTargetId).toLowerCase().trim() : '';
  const altLesson = lessonId ? decodeURIComponent(lessonId).toLowerCase().trim() : '';

  const exactIdx = flatLessons.findIndex(l => {
    const lCh = decodeURIComponent(l.chapterName || '').toLowerCase().trim();
    const lChTitle = decodeURIComponent((l as any).chapterTitle || '').toLowerCase().trim();
    const lName = decodeURIComponent(l.lessonName || '').toLowerCase().trim();
    const lTitle = decodeURIComponent(l.title || '').toLowerCase().trim();
    const isChMatch = !targetChapter || lCh === targetChapter || lChTitle === targetChapter || (targetChapter && (lCh.includes(targetChapter) || targetChapter.includes(lCh)));
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

  const courseLevelComplete = Boolean(
    !hasIncompleteQuizzesInCourse && (isCourseCompletedLocally || pbIsComplete || enrollIsComplete || localIsComplete)
  );

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
    add(userEmail);
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
      const lName = String(lesson.name || lesson.lessonName || '').trim().toLowerCase();
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

  const checkLessonRecordedComplete = (lessonItem: { lessonName?: string; name?: string; title?: string; lesson_name?: string }) => {
    if (!lessonItem) return false;

    // 0. A student cannot have a completed lesson if its quiz is not completed
    if (!isInstructor && !isLessonQuizComplete(lessonItem)) {
      return false;
    }

    // 1. If course is completed at course-level, all lessons are complete
    if (courseLevelComplete) {
      return true;
    }

    // 2. Direct completion properties on lesson item if present
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

    const identifiers = getLessonAllIdentifiers(lessonItem, allLessonsList);
    const currentTId = (currentTargetId || '').trim().toLowerCase();
    const currLId = (lessonId || '').trim().toLowerCase();

    if (isCompletedLocally && (identifiers.includes(currentTId) || identifiers.includes(currLId))) {
      return true;
    }

    // 3. Check localStorage for local completion flag across all permutations
    if (typeof window !== 'undefined') {
      // 3a. Check generic keys (no email required)
      const genericMatch = identifiers.some(id =>
        localStorage.getItem(`lms_lesson_${id}_completed`) === 'true' ||
        localStorage.getItem(`lms_lesson_${courseId}_${id}_completed`) === 'true'
      );
      if (genericMatch) return true;

      // 3b. Check email-scoped keys across all user identifiers
      const userEmails = getAllUserIdentifiers();
      for (const em of userEmails) {
        const emailMatch = identifiers.some(id =>
          localStorage.getItem(`lms_lesson_${em}_${id}_completed`) === 'true' ||
          localStorage.getItem(`lms_lesson_${em}_${courseId}_${id}_completed`) === 'true'
        );
        if (emailMatch) return true;
      }

      // 3c. Scan localStorage keys
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

    // 4. Check progress records returned by API
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

    // 5. Sequential completed count fallback from backend progress bar or enrollment
    const backendCompleted = Math.max(
      parsedPB?.completedLessons || 0,
      Number((courseData as any)?.completed_lessons || 0),
      Number(normalizedProgress?.completed_lessons || 0)
    );
    const backendPercent = Math.max(
      parsedPB?.percent || 0,
      Number((courseData as any)?.progress || 0),
      Number(normalizedProgress?.progress || 0)
    );
    const percentCount = flatLessons.length > 0 && backendPercent > 0
      ? Math.floor((backendPercent / 100) * flatLessons.length)
      : 0;
    const effectiveCompletedCount = Math.max(backendCompleted, percentCount);

    if (effectiveCompletedCount > 0 && flatLessons.length > 0) {
      const lessonIdx = flatLessons.findIndex((fl: any) => {
        const flIds = getLessonAllIdentifiers(fl, allLessonsList);
        return identifiers.some(id => flIds.includes(id));
      });
      if (lessonIdx >= 0 && lessonIdx < effectiveCompletedCount) {
        return true;
      }
    }

    return false;
  };

  // Accurate outline lesson calculation
  const totalLessonsInOutline = flatLessons.length;
  const actualCompletedLessonsCount = courseLevelComplete && totalLessonsInOutline > 0
    ? totalLessonsInOutline
    : flatLessons.filter(l => checkLessonRecordedComplete(l)).length;

  const totalLessonsCount = totalLessonsInOutline > 0
    ? totalLessonsInOutline
    : (parsedPB?.totalLessons || Number(normalizedProgress.total_lessons || courseData?.total_lessons || 0));

  // Course is strictly complete only if all syllabus outline lessons are recorded as complete and all quizzes are done
  const areAllLessonsCompleted = totalLessonsInOutline > 0
    ? (courseLevelComplete || (flatLessons.every(l => checkLessonRecordedComplete(l)) && !hasIncompleteQuizzesInCourse))
    : Boolean(parsedPB?.isCompleted || (parsedPB?.pendingLessons === 0 && (parsedPB?.totalLessons || 0) > 0 && !hasIncompleteQuizzesInCourse));

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
    : Math.min(99, Math.max(calculatedPercent, pbPercent, enrollPercent));

  const isLessonComplete = (lessonItem: { lessonName?: string; name?: string; title?: string; lesson_name?: string }) => {
    return checkLessonRecordedComplete(lessonItem);
  };

  const currentLessonIsCompleted = (!isInstructor && hasUncompletedQuizInCurrentLesson)
    ? false
    : Boolean(isCompletedLocally || checkLessonRecordedComplete({ lessonName: currentTargetId, title: lessonData?.title || lessonData?.lesson_name || '' }));

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

  const canCompleteCourse = isLastLesson && allOtherLessonsCompleted && isLessonQuizComplete(flatLessons[currentIndex]);

  const firstIncompleteLesson = flatLessons.find(l => !checkLessonRecordedComplete(l)) || flatLessons[0];

  // Find current lesson title from outline if lessonData is null
  const currentLessonFromOutline = flatLessons.find(l => l.lessonName === currentTargetId || l.lessonName === lessonId);
  const lessonDisplayTitle = lessonData?.title || lessonData?.lesson_name || lessonData?.name || currentLessonFromOutline?.title || `Lesson ${lessonId}`;
  
  // Pricing and preview info
  const coursePrice = courseData?.course_price ?? 0;
  const currencySymbol = courseData?.currency === "INR" || !courseData?.currency ? "₹" : courseData.currency;
  const previewLesson = flatLessons.find(l => l.isPreview);

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
                    const isEnrolledStudent = Boolean(
                      isInstructor ||
                      courseData?.is_enrolled ||
                      (courseData as any)?.membership
                    );
                    const isLessonLocked = isInstructor ? false : (isEnrolledStudent ? isSequentialLocked : (Boolean(l.is_locked) || isSequentialLocked));
                    const isLessonPreview = Number(l.include_in_preview) === 1;
                    const lessonQuizIds = getLessonQuizIds(l);
                    const hasQuiz = lessonQuizIds.length > 0;
                    const isQuizDone = hasQuiz ? lessonQuizIds.every(qId => isQuizCompleted(qId)) : true;
                    const isCompleted = isLessonComplete({
                      lessonName: l.name,
                      title: l.title || l.lesson_name
                    }) || (isCompletedLocally && isActive && (isInstructor || isQuizDone));

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

                            {hasQuiz && !isInstructor && (
                              <span className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 flex-shrink-0 ${
                                isQuizDone 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {isQuizDone ? 'Quiz ✓' : 'Quiz'}
                              </span>
                            )}

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
                !isInstructor && hasUncompletedQuizInCurrentLesson ? (
                  <button
                    onClick={() => {
                      const quizBlock = document.getElementById('lesson-quiz-section') || document.querySelector('.quiz-block') || document.querySelector('[data-quiz-section]');
                      if (quizBlock) {
                        quizBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      } else {
                        const qId = currentLessonQuizIds[0];
                        if (qId) {
                          router.push(`/quizzes/${encodeURIComponent(qId)}?courseId=${encodeURIComponent(courseId)}&chapterId=${encodeURIComponent(chapterId)}&lessonId=${encodeURIComponent(currentTargetId)}`);
                        }
                      }
                      showToast.error('Please complete the quiz inside this lesson before marking it as complete.');
                    }}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-lg shadow-sm shadow-amber-200 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Quiz Required
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <div
                id="lesson-reading-content"
                ref={readingContainerRef as React.RefObject<HTMLDivElement>}
                onMouseUp={handleReadingMouseUp}
                className="bg-white p-6 md:p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 flex-grow relative overflow-hidden"
              >
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
                        isQuizCompleted={isQuizCompleted}
                        courseId={courseId}
                        chapterId={chapterId}
                        lessonId={currentTargetId}
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
                              isQuizCompleted={isQuizCompleted}
                              courseId={courseId}
                              chapterId={chapterId}
                              lessonId={currentTargetId}
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
                    <div 
                      id="lesson-quiz-section" 
                      className={`p-5 md:p-6 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isCurrentLessonQuizCompleted 
                          ? 'bg-emerald-50/60 border-emerald-200' 
                          : 'bg-gradient-to-br from-amber-50/70 via-white to-indigo-50/40 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 shadow-md ${
                          isCurrentLessonQuizCompleted ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-amber-500 shadow-amber-500/20'
                        }`}>
                          {isCurrentLessonQuizCompleted ? <CheckCircle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isCurrentLessonQuizCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {isCurrentLessonQuizCompleted ? 'Quiz Completed' : 'Quiz Required'}
                            </span>
                            <h4 className="text-base font-bold text-slate-900">
                              {attachedQuizId}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {isCurrentLessonQuizCompleted 
                              ? 'You have passed/submitted this quiz! You can now mark this lesson as complete.' 
                              : 'You must complete and submit this quiz before this lesson can be marked as complete.'}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/quizzes/${encodeURIComponent(attachedQuizId)}?courseId=${encodeURIComponent(courseId)}&chapterId=${encodeURIComponent(chapterId)}&lessonId=${encodeURIComponent(currentTargetId)}`}
                        className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 ${
                          isCurrentLessonQuizCompleted
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                        }`}
                      >
                        <Award className="w-4 h-4" />
                        {isInstructor ? "Manage Quiz" : isCurrentLessonQuizCompleted ? "Review Quiz" : "Start Quiz"}
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

              {/* ── Inline Highlight Menu Portal ─────────────────────────────────── */}
              {highlightMenu && (
                <InlineHighlightMenu
                  rect={highlightMenu.rect}
                  selectedText={highlightMenu.selectedText}
                  existingNoteId={highlightMenu.existingNoteId}
                  onHighlight={handleHighlightColor}
                  onAddToNotes={handleAddToNotes}
                  onRemoveHighlight={highlightMenu.existingNoteId ? handleRemoveHighlight : undefined}
                  onClose={() => setHighlightMenu(null)}
                />
              )}

              {/* ── Tab Section (Notes + Discussion) ─────────────────────────────── */}
              {!isInstructor && (
                <div className="mt-8">
                  {/* Tab Nav */}
                  <div className="flex gap-1 mb-5 border-b border-slate-200">
                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-colors cursor-pointer ${
                        activeTab === 'notes'
                          ? 'bg-white border border-b-white border-slate-200 text-indigo-700 -mb-px'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <StickyNote className="w-4 h-4" />
                      My Notes
                      {(lessonNotesData?.highlights.length || 0) > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-600">
                          {lessonNotesData!.highlights.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('discussion')}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-colors cursor-pointer ${
                        activeTab === 'discussion'
                          ? 'bg-white border border-b-white border-slate-200 text-indigo-700 -mb-px'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Discussion
                    </button>
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'notes' && (
                    <LessonNotesTab
                      lessonName={lessonData?.name || lessonId}
                      initialNotebook={lessonNotesData?.notebook || null}
                      highlights={lessonNotesData?.highlights || []}
                      readingContainerRef={readingContainerRef}
                      onHighlightDeleted={(noteId) => {
                        setLessonNotesData((prev) =>
                          prev ? { ...prev, highlights: prev.highlights.filter((h) => h.name !== noteId) } : prev
                        );
                        const container = readingContainerRef.current;
                        if (container) removeHighlightFromDOM(noteId, container as HTMLElement);
                      }}
                    />
                  )}

                  {activeTab === 'discussion' && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <MessageSquare className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">Community Discussion</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">Course-level Q&amp;A and peer discussions will appear here.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quiz requirement warning callout before completion bar */}
              {!isInstructor && hasUncompletedQuizInCurrentLesson && !currentLessonIsCompleted && (
                <div className="mt-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">Quiz Completion Required</h4>
                      <p className="text-xs text-amber-700">Please complete and submit the quiz inside this lesson before marking it as complete.</p>
                    </div>
                  </div>
                  {currentLessonQuizIds[0] && (
                    <Link
                      href={`/quizzes/${encodeURIComponent(currentLessonQuizIds[0])}?courseId=${encodeURIComponent(courseId)}&chapterId=${encodeURIComponent(chapterId)}&lessonId=${encodeURIComponent(currentTargetId)}`}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-sm transition-all"
                    >
                      Go to Quiz
                    </Link>
                  )}
                </div>
              )}

              {/* Bottom Action: Dynamic Lesson & Course Completion */}
              <div className="mt-8 p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                      {Boolean(createdCertificate || courseData?.has_certificate || courseData?.certificate) ? (
                        <button
                          type="button"
                          onClick={() => {
                            const cName = createdCertificate?.name || courseData?.certificate || '';
                            const cFormat = createdCertificate?.template || createdCertificate?.format || 'StrideNEX Creative Pathways';
                            if (cName) {
                              handleOpenExistingCertificate(cName, cFormat);
                            } else {
                              setShowCertificateModal(true);
                            }
                          }}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Award className="w-4 h-4" /> View Certificate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerateCertificate}
                          disabled={generatingCertificate}
                          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                          {generatingCertificate ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Award className="w-4 h-4" />
                              <span>Generate Certificate</span>
                            </>
                          )}
                        </button>
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
                  ) : !isInstructor && hasUncompletedQuizInCurrentLesson ? (
                    <button
                      onClick={() => {
                        const quizElem = document.getElementById('lesson-quiz-section') || document.querySelector('.quiz-block') || document.querySelector('[data-quiz-section]');
                        if (quizElem) {
                          quizElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else if (currentLessonQuizIds[0]) {
                          router.push(`/quizzes/${encodeURIComponent(currentLessonQuizIds[0])}?courseId=${encodeURIComponent(courseId)}&chapterId=${encodeURIComponent(chapterId)}&lessonId=${encodeURIComponent(currentTargetId)}`);
                        }
                        showToast.error('Please complete the quiz inside this lesson before marking it as complete.');
                      }}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-sm shadow-amber-200 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Complete Quiz First
                    </button>
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
                  {Boolean(createdCertificate || courseData?.has_certificate || courseData?.certificate) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const cName = createdCertificate?.name || courseData?.certificate || '';
                        const cFormat = createdCertificate?.template || createdCertificate?.format || 'StrideNEX Creative Pathways';
                        if (cName) {
                          handleOpenExistingCertificate(cName, cFormat);
                        } else {
                          setShowCertificateModal(true);
                        }
                      }}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Award className="w-4 h-4" /> View Certificate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateCertificate}
                      disabled={generatingCertificate}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
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
                        {courseData?.title || courseId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {certPdfBlobUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          const certName = createdCertificate?.name || courseData?.certificate || courseId;
                          const certFormat = createdCertificate?.template || createdCertificate?.format || 'StrideNEX Creative Pathways';
                          try {
                            const blob = await downloadCertificatePdf(certName, certFormat);
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${courseData?.title || courseId}-certificate.pdf`;
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
        </main>
      </div>
    </div>
  );
}
