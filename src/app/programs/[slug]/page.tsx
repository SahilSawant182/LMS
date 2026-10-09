"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  Users,
  Lock,
  Unlock,
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  GraduationCap,
  BarChart3,
  AlertCircle,
  Edit2,
  Trash2,
} from 'lucide-react';
import { getProgramDetail, deleteProgram, Program, ProgramCourse } from '@/services/lms.services';
import { getImageUrl } from '@/services/api.services';

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const programTitle = rawSlug ? decodeURIComponent(rawSlug) : '';

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMember, setUserMember] = useState<any>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!programTitle) return;

    const fetchProgram = async () => {
      setLoading(true);
      try {
        const rawResponse = await getProgramDetail(programTitle);
        const data: Program =
          (rawResponse as any)?.data ||
          (rawResponse as any)?.message ||
          rawResponse;
        setProgram(data);

        // Check if current logged-in user is a member
        const email = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
        if (email && data.program_members) {
          const member = data.program_members.find((m) => m.member === email);
          setUserMember(member || null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load program details');
      } finally {
        setLoading(false);
      }
    };

    fetchProgram();
    
    // Check instructor role
    try {
      const rolesStr = localStorage.getItem('roles');
      if (rolesStr) {
        const roles = JSON.parse(rolesStr);
        setIsInstructor(
          roles.includes('Instructor') ||
          roles.includes('LMS Admin') ||
          roles.includes('System Manager')
        );
      }
    } catch {}
  }, [programTitle]);

  const handleDelete = async () => {
    if (!program || !program.name) return;
    if (!window.confirm("Are you sure you want to delete this program?")) return;
    
    setIsDeleting(true);
    try {
      await deleteProgram(program.name);
      router.push('/programs');
    } catch (err: any) {
      alert(err.message || "Failed to delete program");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center gap-4 text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-bold text-slate-700">Program Not Found</h2>
          <p className="text-slate-500 max-w-md">{error || 'This program does not exist or has been removed.'}</p>
          <Link href="/programs" className="mt-2 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Programs
          </Link>
        </div>
      </div>
    );
  }

  const courses: ProgramCourse[] = Array.isArray(program.program_courses)
    ? [...program.program_courses].sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0))
    : [];
  const totalCourses = courses.length;
  const memberCount = program.member_count ?? 0;
  const isEnrolled = !!userMember;
  const userProgress = userMember?.progress ?? 0;
  const imageUrl = getImageUrl(program.image);

  return (
    <>
      {/* SEO */}
      <title>{program.title} | Learning Paths | StrideNex LMS</title>
      <meta
        name="description"
        content={program.short_introduction || `Explore the ${program.title} learning path on StrideNex. Follow ${totalCourses} structured courses.`}
      />

      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />

        {/* Hero */}
        <div className="bg-slate-900 text-white relative overflow-hidden">
          {/* Background Image if present */}
          {imageUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-10"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-slate-900/90 to-violet-900/60 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 relative z-10">
            {/* Breadcrumb */}
            <nav className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Link
                href="/programs"
                className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                All Learning Paths
              </Link>
              
              {isInstructor && (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/programs/${rawSlug}/edit`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 hover:text-white border border-indigo-500/30 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white border border-red-500/30 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-red-200 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
                  </button>
                </div>
              )}
            </nav>

            <div className="flex flex-col lg:flex-row gap-10">
              {/* Left: Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 mb-4">
                  {program.enforce_course_order === 1 ? (
                    <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-full">
                      <Lock className="w-3 h-3" /> Ordered Path
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full">
                      <Unlock className="w-3 h-3" /> Flexible Order
                    </span>
                  )}
                  {program.published === 1 && (
                    <span className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold px-3 py-1 rounded-full">
                      Published
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
                  {program.title}
                </h1>

                {program.short_introduction && (
                  <p className="text-indigo-200 text-lg mb-6 leading-relaxed">
                    {program.short_introduction}
                  </p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span><strong className="text-white">{totalCourses}</strong> Courses</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span><strong className="text-white">{memberCount}</strong> Learners enrolled</span>
                  </div>
                </div>
              </div>

              {/* Right: Enrollment Card */}
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-white text-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                  {/* Card Thumbnail */}
                  <div className="h-40 bg-gradient-to-br from-indigo-500 to-violet-600 relative">
                    {imageUrl ? (
                      <img src={imageUrl} alt={program.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap className="w-16 h-16 text-white/30" />
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    {isEnrolled ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                          <CheckCircle className="w-5 h-5" /> You are enrolled
                        </div>
                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
                            <span>Your Progress</span>
                            <span className="font-bold text-indigo-600">{userProgress}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                              style={{ width: `${userProgress}%` }}
                            />
                          </div>
                        </div>
                        {courses[0] && (
                          <Link
                            href={`/course/${courses[0].course}`}
                            className="block w-full text-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
                          >
                            Continue Learning
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-slate-600 text-sm">
                          Start this learning path and follow{' '}
                          <strong>{totalCourses} courses</strong> in sequence.
                        </p>
                        {courses[0] && (
                          <Link
                            href={`/course/${courses[0].course}`}
                            className="block w-full text-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
                          >
                            Start Learning
                          </Link>
                        )}
                        <p className="text-xs text-center text-slate-400">
                          Free to join • {memberCount} already enrolled
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Body */}
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course Sequence */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-extrabold text-slate-900">Course Sequence</h2>
                {program.enforce_course_order === 1 && (
                  <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Complete in order
                  </span>
                )}
              </div>

              {courses.length > 0 ? (
                <div className="space-y-3">
                  {courses.map((course, index) => (
                    <CourseStep
                      key={course.name}
                      course={course}
                      index={index}
                      isLocked={
                        program.enforce_course_order === 1 && index > 0 && userProgress < (index / totalCourses) * 100
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No courses added to this program yet.</p>
                </div>
              )}
            </div>

            {/* Sidebar: About & Members */}
            <div className="space-y-6">
              {/* About */}
              {program.description && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">About this Path</h3>
                  <div
                    className="text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: program.description }}
                  />
                </div>
              )}

              {/* Stats */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Path Overview</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-500"><BookOpen className="w-4 h-4 text-indigo-400" /> Total Courses</span>
                    <span className="font-bold text-slate-900">{totalCourses}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-500"><Users className="w-4 h-4 text-indigo-400" /> Enrolled Learners</span>
                    <span className="font-bold text-slate-900">{memberCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-500">
                      {program.enforce_course_order ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                      Course Order
                    </span>
                    <span className="font-bold text-slate-900">
                      {program.enforce_course_order === 1 ? 'Enforced' : 'Flexible'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Members */}
              {program.program_members && program.program_members.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" /> Learner Progress
                  </h3>
                  <div className="space-y-3">
                    {program.program_members.slice(0, 5).map((member) => (
                      <div key={member.name} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {(member.full_name || member.member || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{member.full_name || member.member}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-400 rounded-full"
                                style={{ width: `${member.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 font-medium flex-shrink-0">{member.progress || 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="bg-slate-900 text-slate-300 py-8 text-center mt-auto">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-sm">© 2026 Stridenex Inc. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}

function CourseStep({
  course,
  index,
  isLocked,
}: {
  course: ProgramCourse;
  index: number;
  isLocked: boolean;
}) {
  const card = (
    <div
      className={`flex items-center gap-4 bg-white border rounded-xl p-4 transition-all duration-200 ${
        isLocked
          ? 'opacity-60 cursor-not-allowed border-slate-200'
          : 'border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer group'
      }`}
    >
      {/* Step Number */}
      <div
        className={`w-10 h-10 rounded-full font-extrabold text-sm flex items-center justify-center flex-shrink-0 ${
          isLocked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-700'
        }`}
      >
        {isLocked ? <Lock className="w-4 h-4" /> : index + 1}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">
          Course {index + 1}
        </p>
        <h3 className={`font-bold text-sm leading-snug truncate ${isLocked ? 'text-slate-400' : 'text-slate-900 group-hover:text-indigo-600 transition-colors'}`}>
          {course.course_title || course.course}
        </h3>
      </div>

      {/* Arrow */}
      {!isLocked && (
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
      )}
    </div>
  );

  if (isLocked) return card;
  return <Link href={`/course/${course.course}`}>{card}</Link>;
}
