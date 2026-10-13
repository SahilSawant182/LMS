"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  Trophy,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Receipt,
  PlayCircle,
  Video,
  Layers,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Plus,
  Edit2,
  Tag,
  Star,
  Eye,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  Wallet
} from "lucide-react";
import {
  getStudentDashboard,
  getInstructorDashboard,
  getCoursesWithEnrollment,
  getBatchesWithEnrollment,
  StudentDashboardData,
  InstructorDashboardData
} from "@/services/payment.services";
import { getImageUrl } from "@/services/api.services";
import { formatDate } from "@/utils/formatters";
import InstructorPayoutsTab from "@/components/instructor/InstructorPayoutsTab";

type StudentTab = "courses" | "batches" | "programs";
type InstructorTab = "courses" | "batches" | "sales" | "payouts";

export default function DashboardPage() {
  const router = useRouter();
  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null);
  const [instructorData, setInstructorData] = useState<InstructorDashboardData | null>(null);
  const [isInstructorRole, setIsInstructorRole] = useState(false);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<"student" | "instructor">("student");
  const [studentTab, setStudentTab] = useState<StudentTab>("courses");
  const [instructorTab, setInstructorTab] = useState<InstructorTab>("courses");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("apiKey");
      const apiSecret = localStorage.getItem("apiSecret");
      const email = localStorage.getItem("userEmail") || "";
      setUserEmail(email);

      if (
        !apiKey ||
        !apiSecret ||
        apiKey === "undefined" ||
        apiKey === "null" ||
        apiSecret === "undefined" ||
        apiSecret === "null"
      ) {
        localStorage.removeItem("apiKey");
        localStorage.removeItem("apiSecret");
        window.dispatchEvent(new Event("auth-changed"));
        router.push("/login");
        return;
      }

      // Check roles from localStorage
      try {
        const rolesStr = localStorage.getItem("roles");
        if (rolesStr) {
          const roles = JSON.parse(rolesStr);
          const hasRole = roles.some((r: string) =>
            ["Instructor", "Course Creator", "Moderator", "Administrator", "System Manager"].includes(r)
          );
          if (hasRole) {
            setIsInstructorRole(true);
            setDashboardMode("instructor"); // Default to Instructor Studio for instructors!
          }
          const isAdmin = roles.some((r: string) =>
            ["Administrator", "System Manager"].includes(r)
          );
          setIsAdminRole(isAdmin);
        }
      } catch (e) { }
    }

    const handleAuthError = (err: any) => {
      const isAuthErr =
        err?.status === 401 ||
        err?.response?.status === 401 ||
        err?.message?.includes("AuthenticationError") ||
        err?.message?.includes("Authentication required") ||
        err?.response?.data?.message?.status === 401;

      if (isAuthErr) {
        localStorage.removeItem("apiKey");
        localStorage.removeItem("apiSecret");
        window.dispatchEvent(new Event("auth-changed"));
        router.push("/login");
        return true;
      }
      return false;
    };

    const fetchAllDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch student dashboard
        let sData: any = null;
        try {
          sData = await getStudentDashboard();
        } catch (e: any) {
          if (handleAuthError(e)) return;
          console.warn("Student dashboard fetch error:", e);
        }

        const unwrappedS = sData && typeof sData === "object"
          ? (sData.courses || sData.batches ? sData : (sData.message || sData.data || sData))
          : sData;

        let enrolledCourses = unwrappedS?.courses || (Array.isArray(unwrappedS) ? unwrappedS : []);
        let enrolledBatches = unwrappedS?.batches || [];
        let enrolledPrograms = unwrappedS?.programs || [];
        let dashboardStats = unwrappedS?.stats || null;

        // Fallback for student courses/batches if empty
        if (!enrolledCourses.length || !enrolledBatches.length) {
          try {
            const [coursesRes, batchesRes] = await Promise.allSettled([
              getCoursesWithEnrollment(),
              getBatchesWithEnrollment()
            ]);
            if (!enrolledCourses.length && coursesRes.status === "fulfilled" && Array.isArray(coursesRes.value)) {
              enrolledCourses = coursesRes.value.filter((c: any) => c.is_enrolled);
            }
            if (!enrolledBatches.length && batchesRes.status === "fulfilled" && Array.isArray(batchesRes.value)) {
              enrolledBatches = batchesRes.value.filter((b: any) => b.is_enrolled);
            }
          } catch (e) { }
        }

        if (!dashboardStats) {
          dashboardStats = {
            enrolled_courses: enrolledCourses.length,
            completed_courses: enrolledCourses.filter((c: any) => (c.progress || 0) >= 100).length,
            enrolled_batches: enrolledBatches.length,
            enrolled_programs: enrolledPrograms.length,
            certificates_earned: 0,
          };
        }

        setStudentData({
          courses: enrolledCourses,
          batches: enrolledBatches,
          programs: enrolledPrograms,
          stats: dashboardStats,
        });

        // Fetch instructor dashboard
        try {
          const iData = await getInstructorDashboard();
          if (iData && iData.is_instructor) {
            setInstructorData(iData);
            setIsInstructorRole(true);
            setDashboardMode("instructor");
          }
        } catch (iErr: any) {
          if (handleAuthError(iErr)) return;
          console.warn("Instructor dashboard fetch error:", iErr);
        }

      } catch (err: any) {
        if (handleAuthError(err)) return;
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAllDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
        <Navbar />
        <div className="flex-grow flex flex-col justify-center items-center py-24">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-indigo-200 border-dashed rounded-full animate-spin"></div>
            <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const studentCourses = studentData?.courses || [];
  const studentBatches = studentData?.batches || [];
  const studentPrograms = studentData?.programs || [];
  const sStats = studentData?.stats || {
    enrolled_courses: studentCourses.length,
    completed_courses: studentCourses.filter((c) => (c.progress || 0) >= 100).length,
    enrolled_batches: studentBatches.length,
    enrolled_programs: studentPrograms.length,
    certificates_earned: 0,
  };

  const iStats = instructorData?.stats || {
    total_revenue: 0,
    total_students: 0,
    total_courses: 0,
    published_courses: 0,
    draft_courses: 0,
    total_batches: 0,
  };
  const instructorCourses = instructorData?.courses || [];
  const instructorBatches = instructorData?.batches || [];
  const recentSales = instructorData?.recent_sales || [];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* ── Modern Hero Header ── */}
      <div className="bg-slate-900 text-white pt-6 pb-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {isInstructorRole && dashboardMode === "instructor" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Briefcase className="w-3 h-3" />
                    Instructor Sales Studio
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Sparkles className="w-3 h-3" />
                    Student Learning Portal
                  </span>
                )}
                {isInstructorRole && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified Instructor
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {isInstructorRole && dashboardMode === "instructor"
                  ? "Instructor & Sales Dashboard"
                  : `Welcome back${userEmail ? `, ${userEmail.split("@")[0]}` : ""}!`}
              </h1>
              <p className="text-indigo-200/80 mt-1 text-xs sm:text-sm max-w-2xl font-light">
                {isInstructorRole && dashboardMode === "instructor"
                  ? "Manage your authored courses, track enrollment metrics, monitor sales revenue, and launch cohorts."
                  : "Track your enrolled courses, continue learning, and manage your certificates."}
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {isInstructorRole && dashboardMode === "instructor" ? (
                <>
                  <Link
                    href="/course/create"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Course</span>
                  </Link>
                  <Link
                    href="/batch/create"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-sm border border-white/15 transition-all shadow-sm"
                  >
                    <Users className="w-4 h-4 text-emerald-300" />
                    <span>Create Cohort</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/my-payments"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-sm border border-white/15 transition-all shadow-sm"
                  >
                    <Receipt className="w-4 h-4 text-indigo-300" />
                    <span>Billing & Receipts</span>
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Explore Courses</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ── Mode Toggle for Instructors (Instructor Studio vs Student View) ── */}
          {isInstructorRole && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 backdrop-blur-md">
                <button
                  onClick={() => setDashboardMode("instructor")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${dashboardMode === "instructor"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-300 hover:text-white"
                    }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Instructor Sales Studio</span>
                </button>
                <button
                  onClick={() => setDashboardMode("student")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${dashboardMode === "student"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-300 hover:text-white"
                    }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Student View (My Learning)</span>
                </button>
              </div>

              <div className="text-xs text-indigo-200/70 font-medium">
                Viewing as: <span className="font-bold text-white">{dashboardMode === "instructor" ? "Course Instructor / Creator" : "Enrolled Learner"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Dashboard Content ── */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-10 relative z-20">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            VIEW A: INSTRUCTOR SALES & CREATOR STUDIO
        ══════════════════════════════════════════════════════ */}
        {isInstructorRole && dashboardMode === "instructor" ? (
          <div>
            {/* 4 Instructor KPI Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {/* Total Revenue */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-emerald-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Sales Revenue</span>
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    ₹ {Number(iStats.total_revenue || 0).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> From Course & Batch sales
                  </p>
                </div>
              </div>

              {/* Total Enrolled Students */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-indigo-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</span>
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{iStats.total_students}</p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">Unique enrolled learners</p>
                </div>
              </div>

              {/* Authored Courses */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-purple-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Courses</span>
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{iStats.total_courses}</p>
                  <p className="text-[11px] font-semibold text-purple-600 mt-1">
                    {iStats.published_courses} Published • {iStats.draft_courses} Drafts
                  </p>
                </div>
              </div>

              {/* Cohorts / Batches */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-sky-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Cohorts</span>
                  <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                    <Video className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{iStats.total_batches}</p>
                  <p className="text-[11px] font-semibold text-sky-600 mt-1">Cohort batches instructed</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Creator Shortcuts:</span>
                <Link
                  href="/course/create"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> New Course
                </Link>
                <Link
                  href="/batch/create"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> New Cohort
                </Link>
                <Link
                  href="/coupons/create"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5" /> Promo Coupon
                </Link>
              </div>

              <Link
                href="/enrollments"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
              >
                <span>View Full Student Roster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Instructor Tabs Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-1 mb-6 flex flex-wrap sm:flex-nowrap gap-1 max-w-3xl">
              <button
                onClick={() => setInstructorTab("courses")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${instructorTab === "courses"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>My Courses ({instructorCourses.length})</span>
              </button>

              <button
                onClick={() => setInstructorTab("batches")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${instructorTab === "batches"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <Users className="w-4 h-4" />
                <span>Cohorts ({instructorBatches.length})</span>
              </button>

              <button
                onClick={() => setInstructorTab("sales")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${instructorTab === "sales"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Recent Sales ({recentSales.length})</span>
              </button>

              <button
                onClick={() => setInstructorTab("payouts")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  instructorTab === "payouts"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Payouts & Commission</span>
              </button>
            </div>

            {/* ── SUBTAB 1: INSTRUCTOR COURSES & SALES PERFORMANCE ── */}
            {instructorTab === "courses" && (
              <div>
                {instructorCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {instructorCourses.map((c) => (
                      <div
                        key={c.name}
                        className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Image & Status header */}
                          <div className="h-40 bg-slate-100 relative overflow-hidden">
                            {c.image ? (
                              <img
                                src={getImageUrl(c.image)}
                                alt={c.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-teal-500/20 flex items-center justify-center">
                                <BookOpen className="w-10 h-10 text-indigo-400" />
                              </div>
                            )}

                            <div className="absolute top-3 left-3 flex gap-1.5">
                              {c.published ? (
                                <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-sm">
                                  ● Live
                                </span>
                              ) : (
                                <span className="bg-amber-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                                  Draft
                                </span>
                              )}
                              {c.paid_course ? (
                                <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                  ₹ {c.price.toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="bg-indigo-900/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                  Free
                                </span>
                              )}
                            </div>

                            {c.category && (
                              <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-indigo-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                                {c.category}
                              </span>
                            )}
                          </div>

                          <div className="p-5">
                            <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                              {c.title}
                            </h3>

                            {c.short_introduction && (
                              <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                                {c.short_introduction.replace(/<[^>]*>?/gm, "")}
                              </p>
                            )}

                            {/* Sales & Enrollment Stats Box */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs mb-4">
                              <div>
                                <span className="text-slate-500 block text-[11px]">Enrolled Students</span>
                                <span className="font-bold text-slate-900 text-sm flex items-center gap-1 mt-0.5">
                                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                                  {c.enrollments_count}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[11px]">Revenue Earned</span>
                                <span className="font-bold text-emerald-700 text-sm flex items-center gap-1 mt-0.5">
                                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                  ₹ {c.revenue.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="px-5 pb-5 pt-0 flex gap-2">
                          <Link
                            href={`/course/${encodeURIComponent(c.name)}/edit`}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Course</span>
                          </Link>
                          <Link
                            href={`/course/${encodeURIComponent(c.name)}`}
                            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                            title="View Course Page"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-900 mb-1">No Courses Created Yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                      Create your first curriculum, set pricing, upload lessons, and start selling.
                    </p>
                    <Link
                      href="/course/create"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Course
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ── SUBTAB 2: INSTRUCTOR COHORTS / BATCHES ── */}
            {instructorTab === "batches" && (
              <div>
                {instructorBatches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {instructorBatches.map((b) => (
                      <div
                        key={b.name}
                        className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <Video className="w-3.5 h-3.5 text-sky-600" />
                              {b.medium || "Live Cohort"}
                            </span>
                            <span className="font-bold text-emerald-700 text-sm">
                              {b.paid_batch ? `₹ ${b.amount.toLocaleString("en-IN")}` : "Free"}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 mb-2">{b.title}</h3>

                          {b.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                              {b.description.replace(/<[^>]*>?/gm, "")}
                            </p>
                          )}

                          {/* Cohort Details Box */}
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 mb-4 text-xs text-slate-700">
                            {b.start_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span>
                                  <strong>Schedule:</strong> {formatDate(b.start_date)}{" "}
                                  {b.end_date ? `to ${formatDate(b.end_date)}` : ""}
                                </span>
                              </div>
                            )}
                            {b.start_time && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                                <span>
                                  <strong>Timings:</strong> {b.start_time} - {b.end_time || ""}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                              <span>
                                <strong>Seats Filled:</strong> {b.enrolled_count} / {b.seat_count || "Unlimited"}
                              </span>
                              <span className="font-bold text-emerald-700">
                                Total Revenue: ₹ {b.revenue.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Link
                            href={`/batch/${encodeURIComponent(b.name)}/edit`}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Cohort</span>
                          </Link>
                          <Link
                            href={`/batch/${encodeURIComponent(b.name)}`}
                            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-900 mb-1">No Active Cohort Batches</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                      Launch a live cohort batch to teach students with live classes and scheduled curriculum.
                    </p>
                    <Link
                      href="/batch/create"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Cohort Batch
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ── SUBTAB 3: RECENT STUDENT SALES & ACTIVITY FEED ── */}
            {instructorTab === "sales" && (
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Recent Student Purchases & Enrollments</h3>
                  <span className="text-xs font-medium text-slate-500">{recentSales.length} Transactions</span>
                </div>

                {recentSales.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-5">Student</th>
                          <th className="py-3 px-5">Item Purchased</th>
                          <th className="py-3 px-5">Amount Paid</th>
                          <th className="py-3 px-5">Date</th>
                          <th className="py-3 px-5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {recentSales.map((sale, idx) => (
                          <tr key={sale.payment_name || idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-5">
                              <p className="font-bold text-slate-900">{sale.student_name}</p>
                              <p className="text-[11px] text-slate-400">{sale.member}</p>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mr-1.5">
                                {sale.item_type}
                              </span>
                              <span className="font-medium text-slate-800">{sale.item_name}</span>
                            </td>
                            <td className="py-3.5 px-5 font-bold text-emerald-700">
                              ₹ {sale.amount.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 px-5 text-slate-500">
                              {formatDate(sale.created_at)}
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Paid & Active
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500">
                    <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold">No transactions recorded yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── SUBTAB 4: INSTRUCTOR PAYOUTS & COMMISSIONS ── */}
            {instructorTab === "payouts" && (
              <InstructorPayoutsTab isAdmin={isAdminRole} instructorEmail={userEmail} />
            )}
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════
              VIEW B: STUDENT LEARNING PORTAL
          ══════════════════════════════════════════════════════ */
          <div>
            {/* 4 Student Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4 hover:border-indigo-200 transition-all">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled Courses</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{sStats.enrolled_courses}</p>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4 hover:border-emerald-200 transition-all">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cohort Batches</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{sStats.enrolled_batches}</p>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4 hover:border-purple-200 transition-all">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{sStats.completed_courses}</p>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4 hover:border-amber-200 transition-all">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificates</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{sStats.certificates_earned}</p>
                </div>
              </div>
            </div>

            {/* Student Tabs Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-1 mb-6 flex gap-1 max-w-xl">
              <button
                onClick={() => setStudentTab("courses")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${studentTab === "courses"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>My Courses</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${studentTab === "courses" ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {studentCourses.length}
                </span>
              </button>

              <button
                onClick={() => setStudentTab("batches")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${studentTab === "batches"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <Users className="w-4 h-4" />
                <span>My Cohorts</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${studentTab === "batches" ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {studentBatches.length}
                </span>
              </button>

              <button
                onClick={() => setStudentTab("programs")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${studentTab === "programs"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <Layers className="w-4 h-4" />
                <span>Learning Paths</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${studentTab === "programs" ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {studentPrograms.length}
                </span>
              </button>
            </div>

            {/* TAB 1: Enrolled Courses */}
            {studentTab === "courses" && (
              <div>
                {studentCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studentCourses.map((course, idx) => (
                      <div
                        key={course.course || idx}
                        className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col group"
                      >
                        <div className="h-40 bg-slate-100 relative overflow-hidden">
                          {course.image ? (
                            <img
                              src={getImageUrl(course.image)}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-teal-500/20 flex items-center justify-center">
                              <BookOpen className="w-10 h-10 text-indigo-400" />
                            </div>
                          )}

                          <div className="absolute top-3 left-3 flex gap-2">
                            <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-sm">
                              <CheckCircle2 className="w-3 h-3" /> Enrolled
                            </span>
                            {course.enrollment_from_batch && (
                              <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                Cohort Course
                              </span>
                            )}
                          </div>

                          {course.category && (
                            <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-indigo-700 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                              {course.category}
                            </span>
                          )}
                        </div>

                        <div className="p-5 flex-grow flex flex-col justify-between">
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors mb-2">
                              {course.title || course.course_title || course.course}
                            </h3>

                            {course.short_introduction && (
                              <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                                {course.short_introduction.replace(/<[^>]*>?/gm, "")}
                              </p>
                            )}
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                              <span className="text-slate-600">Progress</span>
                              <span className="text-indigo-600 font-bold">{Math.round(course.progress || 0)}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(course.progress || 0, 100)}%` }}
                              ></div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                              <span>
                                {course.completed_lessons || 0} of {course.total_lessons || 0} Lessons
                              </span>
                              {course.instructors?.[0]?.full_name && (
                                <span className="truncate max-w-[120px]">By {course.instructors[0].full_name}</span>
                              )}
                            </div>

                            <Link
                              href={`/course/${encodeURIComponent(course.course)}`}
                              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 group/btn"
                            >
                              <span>Continue Learning</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No Enrolled Courses Yet</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                      Explore our comprehensive catalog of industry-ready courses and start learning today.
                    </p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Browse All Courses</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Enrolled Batches */}
            {studentTab === "batches" && (
              <div>
                {studentBatches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {studentBatches.map((batch, idx) => (
                      <div
                        key={batch.batch || idx}
                        className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active Cohort
                            </span>
                            {batch.medium && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                                <Video className="w-3.5 h-3.5 text-sky-500" />
                                <span>{batch.medium}</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {batch.title || batch.batch}
                          </h3>

                          {batch.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                              {batch.description.replace(/<[^>]*>?/gm, "")}
                            </p>
                          )}

                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 mb-4 text-xs text-slate-700">
                            {batch.start_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span>
                                  <strong>Duration:</strong> {formatDate(batch.start_date)}{" "}
                                  {batch.end_date ? `to ${formatDate(batch.end_date)}` : ""}
                                </span>
                              </div>
                            )}
                            {batch.start_time && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                                <span>
                                  <strong>Timings:</strong> {batch.start_time} - {batch.end_time || ""}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>
                                <strong>Curriculum:</strong> {batch.courses_count || batch.courses?.length || 0} Courses included in cohort
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Link
                            href={`/batch/${encodeURIComponent(batch.batch)}`}
                            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                          >
                            <span>Open Cohort & View Classes</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                    <Users className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No Active Cohorts</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                      Join mentor-led cohort batches with interactive live classes, scheduled assignments, and peer learning.
                    </p>
                    <Link
                      href="/batches"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
                    >
                      <Users className="w-4 h-4" />
                      <span>Explore Cohort Batches</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Enrolled Programs */}
            {studentTab === "programs" && (
              <div>
                {studentPrograms.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studentPrograms.map((prog, idx) => (
                      <div
                        key={prog.program || idx}
                        className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <GraduationCap className="w-3.5 h-3.5" /> Learning Path
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              {prog.courses_count || 0} Courses
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {prog.title || prog.program}
                          </h3>

                          <div className="mt-4 mb-4">
                            <div className="flex justify-between items-center text-xs font-semibold mb-1">
                              <span className="text-slate-600">Overall Progress</span>
                              <span className="text-indigo-600 font-bold">{Math.round(prog.progress || 0)}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(prog.progress || 0, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Link
                            href={`/programs/${encodeURIComponent(prog.program)}`}
                            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                          >
                            <span>Continue Learning Path</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                    <GraduationCap className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No Learning Paths Enrolled</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                      Follow structured sequences of courses to master end-to-end skills and earn certificates.
                    </p>
                    <Link
                      href="/programs"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Browse Learning Paths</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
