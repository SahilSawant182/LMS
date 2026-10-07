"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLesson, getCourseOutline, getCourseProgress } from '@/services/lms.services';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, ChevronRight } from 'lucide-react';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  
  const courseId = decodeURIComponent(params?.courseId as string);
  const chapterId = decodeURIComponent(params?.chapterId as string);
  const lessonId = decodeURIComponent(params?.lessonId as string);

  const [lessonData, setLessonData] = useState<any>(null);
  const [outline, setOutline] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !chapterId || !lessonId) return;

    const fetchLesson = async () => {
      setLoading(true);
      try {
        const [lessonRes, outlineRes, progressRes] = await Promise.allSettled([
          getLesson({ course: courseId, chapter: chapterId, name: lessonId }),
          getCourseOutline({ course: courseId }),
          getCourseProgress(courseId)
        ]);

        if (lessonRes.status === 'fulfilled') {
          setLessonData(lessonRes.value?.data || lessonRes.value?.message || lessonRes.value);
        } else {
          throw new Error('Failed to load lesson content');
        }

        if (outlineRes.status === 'fulfilled') {
          setOutline(Array.isArray(outlineRes.value) ? outlineRes.value : (outlineRes.value?.data || outlineRes.value?.message || []));
        }

        if (progressRes.status === 'fulfilled') {
          const rawProgress = progressRes.value;
          setProgress(rawProgress?.message || rawProgress?.data || rawProgress);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load the lesson.');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [courseId, chapterId, lessonId]);

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

  if (error || !lessonData) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-grow flex flex-col justify-center items-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Lesson Error</h2>
          <p className="text-gray-600">{error || 'Lesson not found.'}</p>
          <button onClick={() => router.push(`/course/${courseId}`)} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full">Back to Course</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      <Navbar />

      <div className="flex-grow flex overflow-hidden h-[calc(100vh-80px)]">
        {/* Professional Dark Sidebar */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 overflow-y-auto hidden md:flex flex-col shadow-xl z-10 relative">
          <div className="p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-20">
            <Link href={`/course/${courseId}`} className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-4">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Course
            </Link>
            <h2 className="font-extrabold text-lg text-white leading-tight line-clamp-2" title={courseId}>{courseId.replace(/-/g, ' ')}</h2>
            
            {/* Progress bar */}
            {progress && (
              <div className="mt-5">
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                  <span>Course Progress</span>
                  <span className="text-indigo-400">{progress.progress || 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${progress.progress || 0}%` }}></div>
                </div>
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
                    return (
                      <li key={l.name || lIndex}>
                        <Link 
                          href={`/course/${courseId}/${encodeURIComponent(chapter.name)}/${encodeURIComponent(l.name)}`}
                          className={`flex items-start px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative ${
                            isActive 
                              ? 'bg-indigo-500/10 text-white font-semibold' 
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium'
                          }`}
                        >
                          {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-md shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
                          <CheckCircle className={`w-4 h-4 mt-0.5 mr-3 flex-shrink-0 transition-colors ${
                            l.completed 
                              ? 'text-emerald-500' 
                              : isActive ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-500'
                          }`} />
                          <span className="line-clamp-2 leading-snug">{lIndex + 1}. {l.title || l.lesson_name || l.name}</span>
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
        <main className="flex-grow overflow-y-auto bg-slate-50 relative flex flex-col">
          
          {/* Header Banner */}
          <div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md border border-indigo-100">{chapterId}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {lessonData.title || lessonData.lesson_name || lessonData.name || `Lesson ${lessonId}`}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 font-semibold text-sm transition-all shadow-sm">
                Previous
              </button>
              <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm transition-all shadow-sm shadow-indigo-200 flex items-center gap-2">
                Next Lesson <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto p-6 md:p-10 w-full flex-grow flex flex-col">
            
            {lessonData.description && (
              <div className="mb-8 p-6 bg-indigo-50 border border-indigo-100 rounded-xl">
                <p className="text-lg text-indigo-900 font-medium leading-relaxed">
                  {lessonData.description}
                </p>
              </div>
            )}

            {/* Video Player Box */}
            {lessonData.video_url && (
              <div className="relative rounded-xl overflow-hidden bg-black shadow-xl mb-10 ring-1 ring-slate-900/10">
                <div className="aspect-w-16 aspect-h-9">
                  <iframe 
                    src={lessonData.video_url} 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="w-full h-[400px] md:h-[600px]"
                  ></iframe>
                </div>
              </div>
            )}

            {/* Lesson Body HTML */}
            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 flex-grow">
              <div className="prose prose-lg prose-indigo max-w-none text-slate-700 marker:text-indigo-500" dangerouslySetInnerHTML={{ __html: lessonData.body || lessonData.content || `
                <div class="text-center py-16">
                  <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                    <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  </div>
                  <h3 class="text-lg font-bold text-slate-900 mb-2">No Text Content Available</h3>
                  <p class="text-slate-500">This lesson does not contain any readable material.</p>
                </div>
              ` }} />
            </div>

            {/* Bottom Action */}
            <div className="mt-10 flex justify-end">
              <button className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 font-bold transition-all flex items-center gap-2 transform hover:-translate-y-0.5">
                <CheckCircle className="w-5 h-5" />
                Mark as Complete
              </button>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
