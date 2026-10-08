"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getBatchDetails, getBatchCourses, getBatchFeedback, enrollStudent, getEnrolledStudents } from '@/services/lms.services';
import { getImageUrl } from '@/services/api.services';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { BookOpen, Users, Calendar, ArrowLeft, Clock, Tag, User, Star, MessageSquare, Quote, Award, FileText, Video, PlayCircle, ClipboardList } from 'lucide-react';
import CourseCard from '@/components/CourseCard';
import { formatDate } from '@/utils/formatters';

export default function BatchDetailsPage() {
  const params = useParams();
  const batchId = params?.batchId as string;

  const [batchData, setBatchData] = useState<any>(null);
  const [batchCourses, setBatchCourses] = useState<any[]>([]);
  const [batchFeedback, setBatchFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);

  useEffect(() => {
    const checkRoles = () => {
      try {
        const rolesStr = localStorage.getItem("roles");
        if (rolesStr) {
          const roles = JSON.parse(rolesStr);
          setIsInstructor(roles.includes("Instructor"));
          setIsStudent(roles.includes("Student"));
        }
        const email = localStorage.getItem("userEmail");
        if (email) {
          setUserEmail(email);
        }
      } catch (e) {}
    };
    checkRoles();
  }, []);

  useEffect(() => {
    if (!batchId) return;

    const fetchBatch = async () => {
      setLoading(true);
      try {
        const [detailsRes, coursesRes, feedbackRes] = await Promise.allSettled([
          getBatchDetails({ batch: batchId }),
          getBatchCourses({ batch: batchId }),
          getBatchFeedback(batchId)
        ]);

        if (detailsRes.status === 'fulfilled') {
          const rawData = detailsRes.value;
          const extracted = rawData?.message?.data || rawData?.data?.message || rawData?.data || rawData?.message || rawData;
          setBatchData(extracted);
        } else {
          throw new Error('Failed to load batch details');
        }

        if (coursesRes.status === 'fulfilled') {
          setBatchCourses(Array.isArray(coursesRes.value) ? coursesRes.value : (coursesRes.value?.data || coursesRes.value?.message || []));
        }

        if (feedbackRes.status === 'fulfilled') {
          const rawData = feedbackRes.value;
          const extracted = rawData?.message?.data || rawData?.data?.message || rawData?.data || rawData?.message || rawData;
          setBatchFeedback(Array.isArray(extracted) ? extracted : []);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load batch data.');
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
  }, [batchId]);

  useEffect(() => {
    if (!isInstructor || !batchId) return;

    const fetchStudents = async () => {
      try {
        const res = await getEnrolledStudents({ batch: batchId });
        const extracted = res?.message?.data || res?.data?.message || res?.data || res?.message || res;
        if (Array.isArray(extracted)) {
          setEnrolledStudents(extracted);
        }
      } catch (err) {
        console.error("Failed to fetch enrolled students:", err);
      }
    };

    fetchStudents();
  }, [isInstructor, batchId]);

  const handleEnroll = async () => {
    if (!userEmail) {
      alert("You must be logged in to enroll.");
      return;
    }
    setEnrolling(true);
    try {
      const response = await enrollStudent({ member: userEmail, batch: batchId });
      
      // Handle Frappe returning 200 OK but with a success: false payload
      if (response && typeof response === 'object') {
        if (response.success === false) {
          throw new Error(typeof response.message === 'string' ? response.message : JSON.stringify(response.message) || "Failed to enroll");
        }
        if (response.message && typeof response.message === 'object' && response.message.success === false) {
          throw new Error(typeof response.message.message === 'string' ? response.message.message : "Failed to enroll");
        }
      }

      setEnrollSuccess(true);
      alert("Successfully enrolled!");
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Failed to enroll";
      
      if (err?.response?.data) {
        const data = err.response.data;
        if (data.message) {
          if (typeof data.message === 'string') {
            errorMsg = data.message;
          } else if (typeof data.message === 'object' && typeof data.message.message === 'string') {
            errorMsg = data.message.message;
          }
        } else if (data._server_messages) {
          try {
            const serverMsgs = JSON.parse(data._server_messages);
            if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
              const parsedMsg = JSON.parse(serverMsgs[0]);
              errorMsg = parsedMsg.message || errorMsg;
            }
          } catch (e) {}
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      
      // Safety net to absolutely prevent [object Object]
      if (typeof errorMsg === 'object') {
        errorMsg = JSON.stringify(errorMsg);
      }
      
      alert(errorMsg);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error || !batchData) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex flex-col justify-center items-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Batch Error</h2>
          <p className="text-slate-600">{error || 'Batch not found.'}</p>
          <Link href="/" className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 text-white pt-16 pb-24">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-6">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-200 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wide text-indigo-300 uppercase bg-indigo-900/50 border border-indigo-700/50 rounded-md backdrop-blur-sm">
                {batchData.category || 'Batch'}
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                {batchData.title || batchData.name || batchId}
              </h1>
              <p className="text-base md:text-lg text-indigo-100/80 mb-6 max-w-2xl font-light">
                {batchData.description || 'Enroll in this batch to access a curated set of courses designed for your career.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                {batchData.start_date && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span>{formatDate(batchData.start_date)} {batchData.end_date ? `to ${formatDate(batchData.end_date)}` : ''}</span>
                  </div>
                )}
                {batchData.start_time && batchData.end_time && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{batchData.start_time.slice(0, 5)} - {batchData.end_time.slice(0, 5)} {batchData.timezone ? `(${batchData.timezone})` : ''}</span>
                  </div>
                )}
                {batchData.medium && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>{batchData.medium}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>{batchCourses.length || batchData.courses?.length || 0} Courses</span>
                </div>
                
                {batchData.enrollment ? (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>{batchData.enrollment.total_enrolled} / {batchData.enrollment.seat_count} Enrolled</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>{batchData.seat_count ? `${batchData.seat_count} Seats` : 'Unlimited Seats'}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                  <Tag className="w-4 h-4 text-rose-400" />
                  <span>{batchData.paid_batch ? `${batchData.currency || '$'} ${batchData.amount}` : 'Free'}</span>
                </div>
                
                {batchData.certification === 1 && (
                  <div className="flex items-center gap-1.5 bg-indigo-500/20 backdrop-blur-sm px-3 py-1.5 rounded border border-indigo-400/30 text-indigo-100">
                    <Award className="w-4 h-4 text-indigo-300" />
                    <span>Certification</span>
                  </div>
                )}
                
                {batchData.evaluation === 1 && (
                  <div className="flex items-center gap-1.5 bg-indigo-500/20 backdrop-blur-sm px-3 py-1.5 rounded border border-indigo-400/30 text-indigo-100">
                    <FileText className="w-4 h-4 text-indigo-300" />
                    <span>Evaluation</span>
                  </div>
                )}
                
                {batchData.conferencing_provider && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
                    <Video className="w-4 h-4 text-sky-400" />
                    <span>{batchData.conferencing_provider}</span>
                  </div>
                )}

                {batchData.feedback && batchData.feedback.total_reviews > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10 text-amber-300">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{batchData.feedback.overall_rating} ({batchData.feedback.total_reviews} reviews)</span>
                  </div>
                )}
              </div>
              {isStudent && (
                <div className="mt-8">
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling || enrollSuccess}
                    className={`px-8 py-3 rounded-lg font-bold shadow-lg transition-all ${
                      enrollSuccess 
                        ? "bg-emerald-500 text-white cursor-default" 
                        : "bg-indigo-500 hover:bg-indigo-400 text-white active:scale-95"
                    }`}
                  >
                    {enrolling ? "Enrolling..." : enrollSuccess ? "Successfully Enrolled!" : "Enroll Now"}
                  </button>
                </div>
              )}
            </div>

            {batchData.instructors && batchData.instructors.length > 0 && (
              <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm shrink-0 w-full lg:w-80">
                <h3 className="text-indigo-200 text-sm font-semibold mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Instructors
                </h3>
                <div className="flex flex-col gap-4">
                  {batchData.instructors.map((inst: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      {inst.user_image ? (
                        <img src={getImageUrl(inst.user_image)} alt={inst.instructor_name} className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-200 font-bold border border-indigo-500/30">
                          {(inst.instructor_name || 'I').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-white text-sm">{inst.instructor_name}</h4>
                        <p className="text-xs text-indigo-200/70">{inst.instructor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-12 relative z-20">
        {false && batchData.video_link && (
          <section className="mb-8 rounded-xl overflow-hidden shadow-sm border border-slate-100 bg-black flex justify-center w-full">
            {(batchData.video_link.endsWith('.mp4') || batchData.video_link.endsWith('.webm') || batchData.video_link.includes('.mp4')) ? (
               <video 
                 controls 
                 preload="metadata"
                 className="w-full h-full max-h-[600px] object-contain aspect-video"
               >
                 <source src={getImageUrl(batchData.video_link)} type="video/mp4" />
                 Your browser does not support the video tag.
               </video>
             ) : (
               <div className="w-full p-6 md:p-12 text-center bg-slate-50 flex flex-col items-center justify-center">
                 <PlayCircle className="w-12 h-12 text-indigo-400 mb-3" />
                 <h3 className="text-lg font-semibold text-slate-800 mb-2">Introductory Video Available</h3>
                 <a href={getImageUrl(batchData.video_link)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                   Watch Video
                 </a>
               </div>
             )}
          </section>
        )}

        {(batchData.batch_details || batchData.description) && (
          <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              About this Batch
            </h2>
            <div 
              className="prose prose-indigo max-w-none text-sm text-slate-600 leading-relaxed" 
              dangerouslySetInnerHTML={{ __html: batchData.batch_details || batchData.description }} 
            />
          </section>
        )}

        {batchData.assessment && batchData.assessment.length > 0 && (
          <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 mb-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              Assessments
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batchData.assessment.map((ass: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50 hover:border-indigo-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{ass.assessment || ass.name || `Assessment ${idx + 1}`}</h3>
                      <p className="text-xs text-slate-500">Required</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Courses in this Batch
          </h2>

          
          {batchCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {batchCourses.map((course: any, index: number) => (
                <Link key={course.name || index} href={`/course/${course.course || course.name}`} className="block h-full transition-transform hover:-translate-y-1 duration-300">
                  <CourseCard 
                    image={getImageUrl(course.image)}
                    providerLogo={getImageUrl(course.instructors?.[0]?.user_image)}
                    providerName={course.instructors?.[0]?.full_name}
                    title={course.title || course.course || course.name}
                    rating={course.rating}
                    enrollments={course.enrollments}
                    category={course.category || undefined}
                    lessons={course.lessons}
                    status={course.status || undefined}
                    cardGradient={course.card_gradient || undefined}
                    description={course.short_introduction || course.description || undefined}
                    price={course.paid_course ? `${course.currency || '$'} ${course.course_price || 0}` : 'Free'}
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-slate-500 font-medium">No courses have been added to this batch yet.</p>
            </div>
          )}
        </section>

        {isInstructor && (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <Users className="w-4 h-4 text-indigo-500" />
                Enrolled Students
              </h2>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                {enrolledStudents.length} Students
              </span>
            </div>

            {enrolledStudents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolledStudents.map((student: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-4 hover:border-indigo-100 hover:shadow-sm transition-all group">
                    <div className="shrink-0 relative">
                      {student.member_image ? (
                        <img 
                          src={getImageUrl(student.member_image)} 
                          alt={student.member_name || 'Student'} 
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-indigo-100 transition-colors"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg border-2 border-white shadow-sm group-hover:border-indigo-100 transition-colors">
                          {(student.member_name || student.member || student.student_name || 'S').charAt(0).toUpperCase()}
                        </div>
                      )}
                      {student.payment && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center" title="Paid">
                          <Tag className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-slate-800 text-sm truncate" title={student.member_name || student.student_name}>
                          {student.member_name || student.student_name || 'Student'}
                        </h4>
                        {student.member_username && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 truncate">
                            @{student.member_username}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate" title={student.member || student.name}>
                        {student.member || student.name}
                      </p>
                      
                      {student.creation && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] text-slate-500 font-medium">
                            Enrolled: {formatDate(student.creation)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No students are currently enrolled in this batch.</p>
              </div>
            )}
          </section>
        )}

        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Student Feedback
            </h2>
            {batchFeedback.length > 0 && (
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                {batchFeedback.length} Reviews
              </span>
            )}
          </div>

          {batchFeedback.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {batchFeedback.map((feedback: any, idx: number) => {
                const avgScore = ((feedback.content || 0) + (feedback.instructors || 0) + (feedback.value || 0)) / 3;
                const rating = avgScore > 0 ? Math.round(avgScore * 5) : 5;

                return (
                  <div key={idx} className="p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 hover:shadow-sm transition-all flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      {feedback.member_image ? (
                        <img 
                          src={getImageUrl(feedback.member_image)} 
                          alt={feedback.member_name || 'Student'} 
                          className="w-10 h-10 rounded-full object-cover border border-slate-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-sm border border-slate-200">
                          {(feedback.member_name || feedback.member || 'A').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm">
                          {feedback.member_name || feedback.member || 'Anonymous'}
                        </h4>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative mt-1">
                      <Quote className="absolute -top-1 -left-1 w-6 h-6 text-slate-100 opacity-50" />
                      <p className="text-slate-600 text-sm leading-relaxed relative z-10 pl-2">
                        {feedback.feedback || 'No comments provided.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-slate-300" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No feedback yet</h3>
              <p className="text-slate-500 text-xs">Be the first to share your thoughts.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
