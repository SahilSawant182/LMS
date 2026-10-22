"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  ChevronDown,
  ChevronUp,
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
  BarChart3,
  ArrowUpRight,
  Activity,
  Flame,
  Info,
  ClipboardCheck,
  Award,
  ExternalLink,
  Loader2,
  Globe
} from "lucide-react";
import {
  getStudentDashboard,
  getInstructorDashboard,
  getCoursesWithEnrollment,
  getBatchesWithEnrollment,
  StudentDashboardData,
  InstructorDashboardData
} from "@/services/payment.services";
import { getInstructorSalesReport } from "@/services/billing.services";
import { getCourseProgressBar, parseProgressBarValue, updateCourse } from "@/services/lms.services";
import { showToast } from "@/components/ui/Toast";
import { MonthlyBreakdownItem } from "@/types/billing.types";
import { getImageUrl } from "@/services/api.services";
import { formatDate } from "@/utils/formatters";
import { getMyLiveClasses, getAdminLiveClasses, recordLiveClassJoin } from "@/services/live_class.services";
import { LMSLiveClass } from "@/types/live_class.types";

type StudentTab = "courses" | "batches" | "programs";

export function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null);
  const [instructorData, setInstructorData] = useState<InstructorDashboardData | null>(null);
  const [isInstructorRole, setIsInstructorRole] = useState(false);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [studentTab, setStudentTab] = useState<StudentTab>("courses");
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyBreakdownItem[]>([]);
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyBreakdownItem | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyBreakdownItem | null>(null);
  const [showTableBreakdown, setShowTableBreakdown] = useState(false);
  const [leaderboardMetric, setLeaderboardMetric] = useState<"revenue" | "enrollments">("revenue");
  const [hoveredVelocityPoint, setHoveredVelocityPoint] = useState<{
    month: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [myLiveClasses, setMyLiveClasses] = useState<LMSLiveClass[]>([]);
  const [adminLiveClasses, setAdminLiveClasses] = useState<LMSLiveClass[]>([]);
  const [loadingLiveClasses, setLoadingLiveClasses] = useState(false);
  const [joiningClassId, setJoiningClassId] = useState<string | null>(null);
  const [publishingCourseId, setPublishingCourseId] = useState<string | null>(null);

  const handlePublishDashboardCourse = async (course: any) => {
    const courseId = course.name || course.course;
    if (!courseId) return;
    setPublishingCourseId(courseId);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await updateCourse({
        ...course,
        name: courseId,
        course: courseId,
        course_name: courseId,
        title: course.title || courseId,
        published: 1,
        status: "Approved",
        published_on: course.published_on || todayStr,
      });
      setInstructorData((prev: any) => {
        if (!prev) return prev;
        const updatedCourses = (prev.courses || []).map((c: any) => {
          if ((c.name || c.course) === courseId) {
            return { ...c, published: 1, status: "Approved", published_on: todayStr };
          }
          return c;
        });
        return { ...prev, courses: updatedCourses };
      });
      showToast.success(`Course "${course.title || courseId}" published successfully!`);
    } catch (err: any) {
      console.error("Failed to publish course from dashboard:", err);
      showToast.error(err?.message || "Failed to publish course");
    } finally {
      setPublishingCourseId(null);
    }
  };

  const handleStudentJoinSession = async (cls: LMSLiveClass) => {
    setJoiningClassId(cls.name);
    let targetUrl = cls.join_url;
    try {
      const res = await recordLiveClassJoin(cls.name);
      if (res?.join_url) {
        targetUrl = res.join_url;
      }
    } catch (e: any) {
      console.warn("Check-in record error, falling back to join_url:", e);
    } finally {
      setJoiningClassId(null);
      if (targetUrl) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  // Sync active tab redirects from URL query params (e.g., /dashboard?tab=payouts)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "payouts" || tabParam === "commission" || tabParam === "payout") {
      router.replace("/sales-earnings?tab=payouts");
    } else if (tabParam === "reports" || tabParam === "sales-report" || tabParam === "analytics") {
      router.replace("/sales-earnings?tab=reports");
    } else if (tabParam === "sales" || tabParam === "transactions") {
      router.replace("/sales-earnings?tab=sales");
    }
  }, [searchParams, router]);

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
            completed_courses: enrolledCourses.filter((c: any) => (c.progress || 0) >= 100 || (c.completed_lessons > 0 && c.total_lessons > 0 && c.completed_lessons >= c.total_lessons)).length,
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

        // Dynamically fetch accurate real-time course progress for each enrolled course
        const studentEmail = typeof window !== 'undefined' ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "";
        if (enrolledCourses.length > 0) {
          try {
            const dynamicCourses = await Promise.all(
              enrolledCourses.map(async (c: any) => {
                const courseId = c.course || c.name || c.course_title;
                if (!courseId) return c;
                try {
                  const pbRes = await getCourseProgressBar({ course: courseId, member: studentEmail });
                  const parsed = parseProgressBarValue(pbRes);
                  const isCompleted = Boolean(
                    parsed.isCompleted ||
                    (parsed.percent >= 100) ||
                    (parsed.totalLessons !== undefined && parsed.completedLessons !== undefined && parsed.totalLessons > 0 && parsed.completedLessons >= parsed.totalLessons)
                  );
                  if (isCompleted && studentEmail && courseId && typeof window !== 'undefined') {
                    localStorage.setItem(`lms_course_completed_${studentEmail}_${courseId}`, 'true');
                  }
                  return {
                    ...c,
                    progress: isCompleted ? 100 : parsed.percent,
                    completed_lessons: isCompleted && parsed.totalLessons ? parsed.totalLessons : (parsed.completedLessons !== undefined ? parsed.completedLessons : c.completed_lessons),
                    total_lessons: parsed.totalLessons !== undefined ? parsed.totalLessons : c.total_lessons,
                    pending_lessons: isCompleted ? 0 : (parsed.pendingLessons !== undefined ? parsed.pendingLessons : c.pending_lessons),
                    progress_status: isCompleted ? 'Completed' : (parsed.progressStatus || c.progress_status)
                  };
                } catch (e) {
                  return c;
                }
              })
            );

            const updatedStats = {
              ...dashboardStats,
              completed_courses: dynamicCourses.filter((c: any) => (c.progress || 0) >= 100 || (c.completed_lessons > 0 && c.total_lessons > 0 && c.completed_lessons >= c.total_lessons)).length,
            };

            setStudentData((prev: any) => ({
              ...prev,
              courses: dynamicCourses,
              stats: updatedStats
            }));
          } catch (pErr) {
            console.warn("Failed to dynamically update dashboard course progress:", pErr);
          }
        }

        // Fetch instructor dashboard
        try {
          const iData = await getInstructorDashboard();
          if (iData && iData.is_instructor) {
            setInstructorData(iData);
            setIsInstructorRole(true);
          }
        } catch (iErr: any) {
          if (handleAuthError(iErr)) return;
          console.warn("Instructor dashboard fetch error:", iErr);
        }

        // Fetch monthly sales report for revenue breakdown
        try {
          const reportRes = await getInstructorSalesReport({ period: "this_year" });
          if (reportRes && Array.isArray(reportRes.monthly_breakdown) && reportRes.monthly_breakdown.length > 0) {
            setMonthlyRevenue(reportRes.monthly_breakdown);
          }
        } catch (rErr: any) {
          console.warn("Instructor sales report fetch error:", rErr);
        }

        // Fetch live classes for students and instructors
        try {
          setLoadingLiveClasses(true);
          const [myClassesRes, adminClassesRes] = await Promise.allSettled([
            getMyLiveClasses(4),
            getAdminLiveClasses(4),
          ]);
          if (myClassesRes.status === "fulfilled" && Array.isArray(myClassesRes.value)) {
            setMyLiveClasses(myClassesRes.value);
          }
          if (adminClassesRes.status === "fulfilled" && Array.isArray(adminClassesRes.value)) {
            setAdminLiveClasses(adminClassesRes.value);
          }
        } catch (lcErr) {
          console.warn("Live classes fetch error:", lcErr);
        } finally {
          setLoadingLiveClasses(false);
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

  const studentCourses = studentData?.courses || [];
  const studentBatches = studentData?.batches || [];
  const studentPrograms = studentData?.programs || [];
  const sStats = studentData?.stats || {
    enrolled_courses: studentCourses.length,
    completed_courses: studentCourses.filter((c) => (c.progress || 0) >= 100 || (c.completed_lessons > 0 && c.total_lessons > 0 && c.completed_lessons >= c.total_lessons)).length,
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

  // Course status counts: active, inactive, and published
  const publishedCoursesCount =
    iStats.published_courses || instructorCourses.filter((c) => Boolean(c.published)).length;

  // Active courses: courses that are published and actively active
  const activeCoursesCount = instructorCourses.filter((c: any) => {
    if (c.is_active !== undefined) return Boolean(c.is_active);
    if (c.status) return c.status.toLowerCase() === "active";
    return Boolean(c.published) && (c.enrollments_count > 0 || c.published);
  }).length;

  // Inactive courses: draft or unpublished courses
  const inactiveCoursesCount = instructorCourses.filter((c: any) => {
    if (c.is_active === false) return true;
    if (c.status) return c.status.toLowerCase() === "inactive" || c.status.toLowerCase() === "draft";
    return !c.published;
  }).length || iStats.draft_courses || 0;

  // Generate 12-month series for current year
  const monthlyData = useMemo<MonthlyBreakdownItem[]>(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const currentYear = now.getFullYear();

    const revMap: Record<string, MonthlyBreakdownItem> = {};
    if (monthlyRevenue && monthlyRevenue.length > 0) {
      for (const item of monthlyRevenue) {
        revMap[item.month_key] = item;
      }
    }

    // Fallback: populate from recent_sales if monthlyRevenue API was empty
    if (Object.keys(revMap).length === 0 && instructorData?.recent_sales?.length) {
      for (const sale of instructorData.recent_sales) {
        if (!sale.created_at) continue;
        const d = new Date(sale.created_at);
        if (isNaN(d.getTime())) continue;
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!revMap[mKey]) {
          revMap[mKey] = {
            month_key: mKey,
            month_label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
            sales_count: 0,
            gross_revenue: 0,
            courses_sold: 0,
            batches_sold: 0,
            unique_students: 0,
          };
        }
        revMap[mKey].gross_revenue += Number(sale.amount || 0);
        revMap[mKey].sales_count += 1;
        if (sale.item_type === "Course") revMap[mKey].courses_sold += 1;
        if (sale.item_type === "Batch") revMap[mKey].batches_sold += 1;
      }
    }

    // Build complete 12 months for current year
    const result: MonthlyBreakdownItem[] = [];
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const mKey = `${currentYear}-${String(monthIdx + 1).padStart(2, "0")}`;
      if (revMap[mKey]) {
        result.push(revMap[mKey]);
      } else {
        result.push({
          month_key: mKey,
          month_label: `${monthNames[monthIdx]} ${currentYear}`,
          sales_count: 0,
          gross_revenue: 0,
          courses_sold: 0,
          batches_sold: 0,
          unique_students: 0,
        });
      }
    }
    return result;
  }, [monthlyRevenue, instructorData]);

  const currentMonthIdx = new Date().getMonth();

  const totalYearRevenue = useMemo(() => {
    return monthlyData.reduce((acc, m) => acc + Number(m.gross_revenue || 0), 0);
  }, [monthlyData]);

  const totalYearSalesCount = useMemo(() => {
    return monthlyData.reduce((acc, m) => acc + Number(m.sales_count || 0), 0);
  }, [monthlyData]);

  const totalCoursesSold = useMemo(() => {
    return monthlyData.reduce((acc, m) => acc + Number(m.courses_sold || 0), 0);
  }, [monthlyData]);

  const totalBatchesSold = useMemo(() => {
    return monthlyData.reduce((acc, m) => acc + Number(m.batches_sold || 0), 0);
  }, [monthlyData]);

  const maxMonthlyRevenue = useMemo(() => {
    const maxVal = Math.max(...monthlyData.map((m) => Number(m.gross_revenue || 0)), 0);
    if (maxVal === 0) return 50000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil(maxVal / magnitude) * magnitude;
  }, [monthlyData]);

  const peakMonth = useMemo(() => {
    let peak = monthlyData[0];
    for (const m of monthlyData) {
      if (Number(m.gross_revenue || 0) > Number(peak?.gross_revenue || 0)) {
        peak = m;
      }
    }
    return peak && Number(peak.gross_revenue || 0) > 0 ? peak : null;
  }, [monthlyData]);

  const avgMonthlyRevenue = useMemo(() => {
    const passedMonths = Math.max(currentMonthIdx + 1, 1);
    return Math.round(totalYearRevenue / passedMonths);
  }, [totalYearRevenue, currentMonthIdx]);

  const formatTick = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
    return `₹${val}`;
  };

  // Top 5 Performing Courses Leaderboard
  const topCourses = useMemo(() => {
    const list = [...instructorCourses];
    list.sort((a, b) => {
      if (leaderboardMetric === "revenue") {
        return Number(b.revenue || 0) - Number(a.revenue || 0);
      }
      return Number(b.enrollments_count || 0) - Number(a.enrollments_count || 0);
    });
    return list.slice(0, 5);
  }, [instructorCourses, leaderboardMetric]);

  const maxLeaderboardVal = useMemo(() => {
    if (topCourses.length === 0) return 1;
    const top = topCourses[0];
    const val =
      leaderboardMetric === "revenue"
        ? Number(top.revenue || 0)
        : Number(top.enrollments_count || 0);
    return Math.max(val, 1);
  }, [topCourses, leaderboardMetric]);

  // Student Enrollment Velocity
  const velocityData = useMemo(() => {
    return monthlyData.map((m) => {
      const count = Number(m.unique_students || m.sales_count || 0);
      return {
        month_key: m.month_key,
        month_label: m.month_label,
        count: count,
      };
    });
  }, [monthlyData]);

  const totalNewStudentsYear = useMemo(() => {
    const sum = velocityData.reduce((acc, m) => acc + m.count, 0);
    return sum > 0 ? sum : Number(iStats.total_students || 0);
  }, [velocityData, iStats.total_students]);

  const currentMonthAdditions = useMemo(() => {
    return velocityData[currentMonthIdx]?.count || 0;
  }, [velocityData, currentMonthIdx]);

  const lastMonthAdditions = useMemo(() => {
    return currentMonthIdx > 0 ? (velocityData[currentMonthIdx - 1]?.count || 0) : 0;
  }, [velocityData, currentMonthIdx]);

  const velocityMoMChange = useMemo(() => {
    if (lastMonthAdditions === 0) {
      return currentMonthAdditions > 0 ? 100 : 0;
    }
    return Math.round(((currentMonthAdditions - lastMonthAdditions) / lastMonthAdditions) * 100);
  }, [currentMonthAdditions, lastMonthAdditions]);

  const maxVelocityVal = useMemo(() => {
    const maxVal = Math.max(...velocityData.map((d) => d.count), 0);
    if (maxVal === 0) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil(maxVal / magnitude) * magnitude;
  }, [velocityData]);

  const velocitySvgPoints = useMemo(() => {
    const width = 500;
    const height = 180;
    const pLeft = 25;
    const pRight = 25;
    const pTop = 20;
    const pBottom = 25;
    const usableWidth = width - pLeft - pRight;
    const usableHeight = height - pTop - pBottom;

    const points = velocityData.map((d, i) => {
      const x = pLeft + (i / Math.max(velocityData.length - 1, 1)) * usableWidth;
      const ratio = maxVelocityVal > 0 ? d.count / maxVelocityVal : 0;
      const y = height - pBottom - ratio * usableHeight;
      return { x, y, month: d.month_label.split(" ")[0], count: d.count, fullMonth: d.month_label };
    });

    if (points.length === 0) return { linePath: "", areaPath: "", points: [] };

    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      line += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const baselineY = height - pBottom;
    const area = `${line} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    return { linePath: line, areaPath: area, points };
  }, [velocityData, maxVelocityVal]);

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
                {isInstructorRole ? (
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
                {isInstructorRole
                  ? "Instructor & Sales Dashboard"
                  : `Welcome back${userEmail ? `, ${userEmail.split("@")[0]}` : ""}!`}
              </h1>
              <p className="text-indigo-200/80 mt-1 text-xs sm:text-sm max-w-2xl font-light">
                {isInstructorRole
                  ? "Manage your authored courses, track enrollment metrics, monitor sales revenue, and launch batches."
                  : "Track your enrolled courses, continue learning, and manage your certificates."}
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {isInstructorRole ? (
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
                    <span>Create Batch</span>
                  </Link>
                  <Link
                    href="/sales-earnings"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold backdrop-blur-sm border border-emerald-500/30 transition-all shadow-sm"
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Sales & Earnings</span>
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
                    href="/courses"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Explore Courses</span>
                  </Link>
                </>
              )}
            </div>
          </div>
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
        {isInstructorRole ? (
          <div>
            {/* ── COURSE STATUS BREAKDOWN METRICS: ACTIVE, INACTIVE, AND PUBLISHED ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {/* Active Courses */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Courses</span>
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">{activeCoursesCount}</p>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                      Live & Active
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1.5">
                    Live courses actively enrolled and open to learners
                  </p>
                </div>
              </div>

              {/* Inactive / Draft Courses */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-amber-300 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inactive Courses</span>
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">{inactiveCoursesCount}</p>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                      Draft / Inactive
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1.5">
                    Unpublished drafts or hidden from student catalog
                  </p>
                </div>
              </div>

              {/* Published Courses */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Published Courses</span>
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">{publishedCoursesCount}</p>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">
                      Catalog Ready
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1.5">
                    Published and discoverable on platform catalog
                  </p>
                </div>
              </div>

              {/* Total Learners & Offerings */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:border-purple-300 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Learners & Batches</span>
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">{iStats.total_students}</p>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-full">
                      {iStats.total_batches} Batches
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1.5">
                    Unique learners enrolled across courses and live batches
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions / Creator Shortcuts Row */}
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
                  <Plus className="w-3.5 h-3.5" /> New Batch
                </Link>
                <Link
                  href="/coupons/create"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5" /> Promo Coupon
                </Link>
                <Link
                  href="/sales-earnings"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Sales & Earnings
                </Link>
                <Link
                  href="/certificate-evaluations"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors flex items-center gap-1.5"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" /> Evaluations
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

            {/* ── SECTION: UPCOMING COHORT SESSIONS TO HOST (INSTRUCTOR VIEW) ── */}
            {adminLiveClasses.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-7 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                          Upcoming Cohort Sessions to Host
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {adminLiveClasses.length} Scheduled
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage and launch your scheduled live classes across your cohorts.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {adminLiveClasses.map((cls) => {
                    const isLive = cls.status === "live" || cls.is_live;
                    const providerBg =
                      cls.conferencing_provider === "Zoom"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : cls.conferencing_provider === "Google Meet"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-purple-50 text-purple-700 border-purple-200";

                    return (
                      <div
                        key={cls.name}
                        className="bg-slate-50/60 rounded-2xl border border-slate-200/90 p-4.5 flex flex-col justify-between hover:border-indigo-300 hover:bg-white hover:shadow-sm transition-all"
                      >
                        <div>
                          {/* Badges */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                LIVE NOW
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                UPCOMING
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${providerBg}`}
                            >
                              {cls.conferencing_provider}
                            </span>
                          </div>

                          {/* Batch Title */}
                          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider line-clamp-1 mb-1">
                            {cls.batch_title || cls.batch_name}
                          </p>

                          {/* Class Title */}
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-3 leading-snug">
                            {cls.title}
                          </h3>

                          {/* Date & Time */}
                          <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-white/80 rounded-xl p-2.5 border border-slate-100">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-700">
                                {cls.formatted_date || cls.date}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {cls.formatted_time || cls.time}{" "}
                                <span className="text-slate-400">({cls.duration} mins)</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => window.open(cls.start_url || cls.join_url, "_blank")}
                            className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <PlayCircle className="w-4 h-4" />
                            <span>Start Class</span>
                          </button>
                          <Link
                            href={`/batch/${encodeURIComponent(cls.batch_name)}#classes`}
                            className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-1 transition-all"
                          >
                            <span>Manage in Batch</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SECTION 2: MONTHLY REVENUE BREAKDOWN GRAPH ── */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
              {/* Graph Card Header */}
              <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                      Sales Analytics
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      Year {new Date().getFullYear()} Overview
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Monthly Revenue Breakdown
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-light mt-0.5">
                    Gross sales revenue, unit volume, and earnings performance by month.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/sales-earnings?tab=reports"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold backdrop-blur-sm border border-white/15 transition-all shadow-sm"
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Detailed Sales Hub</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>

              {/* Top KPI Metrics Strip inside Graph Card */}
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50/70 border-b border-slate-100">
                <div className="p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Period Revenue</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    ₹ {totalYearRevenue.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <DollarSign className="w-3 h-3" /> Annual gross earnings
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Average / Month</span>
                  <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
                    ₹ {avgMonthlyRevenue.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    Monthly run rate
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Peak Month</span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                    {peakMonth ? peakMonth.month_label.split(" ")[0] : "—"}
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    {peakMonth ? `₹ ${Number(peakMonth.gross_revenue).toLocaleString("en-IN")}` : "No sales recorded yet"}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Units Sold</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {totalYearSalesCount}
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    {totalCoursesSold} courses • {totalBatchesSold} batches
                  </span>
                </div>
              </div>

              {/* Interactive Chart Body */}
              <div className="p-6 sm:p-8">
                <div className="relative">
                  {/* Y-Axis Gridlines & Reference Labels */}
                  <div className="h-64 sm:h-72 w-full relative flex flex-col justify-between pointer-events-none pb-8 pr-2">
                    {[1, 0.75, 0.5, 0.25, 0].map((ratio) => {
                      const val = Math.round(maxMonthlyRevenue * ratio);
                      return (
                        <div key={ratio} className="w-full flex items-center gap-3">
                          <span className="text-[11px] font-bold text-slate-400 w-12 text-right shrink-0">
                            {formatTick(val)}
                          </span>
                          <div className="w-full border-b border-slate-100"></div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bar Columns Container (Absolute over gridlines) */}
                  <div className="absolute inset-0 pl-16 pb-8 flex items-end justify-between gap-1 sm:gap-2">
                    {monthlyData.map((m, idx) => {
                      const isCurrent = idx === currentMonthIdx;
                      const rev = Number(m.gross_revenue || 0);
                      const heightPercent = maxMonthlyRevenue > 0 ? (rev / maxMonthlyRevenue) * 100 : 0;
                      const isHovered = hoveredMonth?.month_key === m.month_key;
                      const isSelected = selectedMonth?.month_key === m.month_key;

                      return (
                        <div
                          key={m.month_key}
                          onMouseEnter={() => setHoveredMonth(m)}
                          onMouseLeave={() => setHoveredMonth(null)}
                          onClick={() => setSelectedMonth(isSelected ? null : m)}
                          className="relative flex-1 h-full flex flex-col items-center justify-end group cursor-pointer"
                        >
                          {/* Floating Tooltip */}
                          {isHovered && (
                            <div className="absolute bottom-full mb-3 z-30 pointer-events-none animate-in fade-in duration-200">
                              <div className="bg-slate-900 text-white rounded-xl shadow-xl px-3 py-2 text-xs w-44 border border-slate-700">
                                <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between">
                                  <span>{m.month_label}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-semibold">
                                      Current
                                    </span>
                                  )}
                                </p>
                                <p className="text-emerald-400 font-extrabold text-sm mb-1">
                                  ₹ {rev.toLocaleString("en-IN")}
                                </p>
                                <div className="text-[10px] text-slate-400 space-y-0.5">
                                  <div className="flex justify-between">
                                    <span>Total Orders:</span>
                                    <span className="font-semibold text-slate-200">{m.sales_count}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Courses:</span>
                                    <span className="font-semibold text-slate-200">{m.courses_sold}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Batches:</span>
                                    <span className="font-semibold text-slate-200">{m.batches_sold}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Tooltip Arrow */}
                              <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700"></div>
                            </div>
                          )}

                          {/* Bar Column Track */}
                          <div className="w-full max-w-[42px] h-full flex items-end justify-center rounded-xl transition-all">
                            {/* The Filled Bar */}
                            <div
                              style={{
                                height: rev > 0 ? `${Math.max(heightPercent, 6)}%` : "4px",
                              }}
                              className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 relative ${
                                rev > 0
                                  ? isHovered || isSelected
                                    ? "bg-gradient-to-t from-indigo-700 via-indigo-600 to-emerald-400 shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400 scale-[1.03]"
                                    : "bg-gradient-to-t from-indigo-600 to-emerald-500 opacity-90 group-hover:opacity-100"
                                  : isHovered || isSelected
                                  ? "bg-slate-300"
                                  : "bg-slate-200/80"
                              }`}
                            >
                              {/* Top value indicator on hover */}
                              {rev > 0 && (
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-slate-700 whitespace-nowrap pointer-events-none">
                                  {formatTick(rev)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Month Label */}
                          <div className="absolute -bottom-7 flex flex-col items-center">
                            <span
                              className={`text-[11px] sm:text-xs font-semibold tracking-tight transition-colors ${
                                isSelected
                                  ? "text-indigo-600 font-extrabold"
                                  : isCurrent
                                  ? "text-slate-900 font-bold"
                                  : "text-slate-500 group-hover:text-slate-900"
                              }`}
                            >
                              {m.month_label.split(" ")[0]}
                            </span>
                            {isCurrent && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-0.5"></span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart Footer / Legend & Selected Details */}
                <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-md bg-gradient-to-t from-indigo-600 to-emerald-500"></div>
                      <span className="font-semibold">Gross Revenue (INR)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                      <span className="text-[11px] text-slate-500">Current Month</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
                      <Info className="w-3.5 h-3.5" />
                      <span>Hover or click any bar to inspect month details</span>
                    </div>
                  </div>

                  {/* Toggle raw tabular breakdown */}
                  <button
                    type="button"
                    onClick={() => setShowTableBreakdown(!showTableBreakdown)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{showTableBreakdown ? "Hide Monthly Table" : "View Monthly Breakdown Table"}</span>
                    {showTableBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Selected Month Inspector Card */}
                {selectedMonth && (
                  <div className="mt-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                        {selectedMonth.month_label.split(" ")[0]}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          {selectedMonth.month_label} Performance
                        </h4>
                        <p className="text-xs text-indigo-700 font-medium">
                          Gross Revenue: <strong>₹ {Number(selectedMonth.gross_revenue).toLocaleString("en-IN")}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-slate-700">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Units Sold</span>
                        <span className="font-bold text-slate-900">{selectedMonth.sales_count} orders</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Courses</span>
                        <span className="font-bold text-slate-900">{selectedMonth.courses_sold} sold</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Batches</span>
                        <span className="font-bold text-slate-900">{selectedMonth.batches_sold} sold</span>
                      </div>
                      <button
                        onClick={() => setSelectedMonth(null)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Expandable Tabular Breakdown */}
                {showTableBreakdown && (
                  <div className="mt-5 border border-slate-200 rounded-2xl overflow-hidden animate-in fade-in duration-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Month</th>
                            <th className="py-3 px-4">Gross Revenue</th>
                            <th className="py-3 px-4">Total Orders</th>
                            <th className="py-3 px-4">Courses Sold</th>
                            <th className="py-3 px-4">Batches Sold</th>
                            <th className="py-3 px-4 text-right">Share of Annual Sales</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthlyData.map((m) => {
                            const rev = Number(m.gross_revenue || 0);
                            const share = totalYearRevenue > 0 ? ((rev / totalYearRevenue) * 100).toFixed(1) : "0.0";
                            return (
                              <tr key={m.month_key} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                  {m.month_label}
                                </td>
                                <td className="py-3 px-4 font-extrabold text-slate-900">
                                  ₹ {rev.toLocaleString("en-IN")}
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-700">
                                  {m.sales_count}
                                </td>
                                <td className="py-3 px-4 text-slate-600">
                                  {m.courses_sold}
                                </td>
                                <td className="py-3 px-4 text-slate-600">
                                  {m.batches_sold}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-slate-700">
                                  {share}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── SECTION 3: 60/40 SPLIT — TOP 5 LEADERBOARD (60%) + ENROLLMENT VELOCITY (40%) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-8">
              {/* ── LEFT (60% / col-span-7): TOP 5 PERFORMING COURSES LEADERBOARD ── */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  {/* Leaderboard Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 border border-amber-500/25">
                          <Trophy className="w-3.5 h-3.5 text-amber-600" />
                          Course Performance
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        Top 5 Performing Courses
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ranked by gross sales revenue or student enrollment volume.
                      </p>
                    </div>

                    {/* Metric Switcher Toggle */}
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 self-start sm:self-auto border border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => setLeaderboardMetric("revenue")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          leaderboardMetric === "revenue"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        By Revenue
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaderboardMetric("enrollments")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          leaderboardMetric === "enrollments"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        By Learners
                      </button>
                    </div>
                  </div>

                  {/* Top 5 Course Rows */}
                  {topCourses.length > 0 ? (
                    <div className="divide-y divide-slate-100 mt-2">
                      {topCourses.map((c, idx) => {
                        const rank = idx + 1;
                        const isFirst = rank === 1;
                        const primaryVal =
                          leaderboardMetric === "revenue" ? Number(c.revenue || 0) : Number(c.enrollments_count || 0);
                        const progressWidth =
                          maxLeaderboardVal > 0 ? (primaryVal / maxLeaderboardVal) * 100 : 0;

                        return (
                          <div
                            key={c.name}
                            className="py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/50 rounded-2xl px-2 transition-colors"
                          >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                              {/* Rank Badge */}
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                                  isFirst
                                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-500/25 ring-2 ring-amber-200"
                                    : rank === 2
                                    ? "bg-slate-200 text-slate-800 font-extrabold"
                                    : rank === 3
                                    ? "bg-amber-100 text-amber-900 font-extrabold"
                                    : "bg-slate-100 text-slate-600 font-bold"
                                }`}
                              >
                                {isFirst ? <Trophy className="w-4 h-4" /> : `#${rank}`}
                              </div>

                              {/* Thumbnail */}
                              <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80 relative">
                                {c.image ? (
                                  <img
                                    src={getImageUrl(c.image)}
                                    alt={c.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                                    <BookOpen className="w-5 h-5 text-indigo-400" />
                                  </div>
                                )}
                              </div>

                              {/* Title & Horizontal Fill Bar */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Link
                                    href={`/course/${encodeURIComponent(c.name)}`}
                                    className="font-extrabold text-sm text-slate-900 hover:text-indigo-600 transition-colors truncate block"
                                    title={c.title}
                                  >
                                    {c.title}
                                  </Link>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {!c.published ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        Draft
                                      </span>
                                    ) : (
                                      <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Published
                                      </span>
                                    )}
                                    {c.category && (
                                      <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                        {c.category}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Proportional Fill Bar */}
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                                  <div
                                    style={{ width: `${Math.max(progressWidth, 5)}%` }}
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isFirst
                                        ? "bg-gradient-to-r from-amber-500 via-amber-400 to-indigo-500"
                                        : "bg-gradient-to-r from-indigo-600 to-sky-400"
                                    }`}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            {/* Value & Actions */}
                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-0">
                              <div className="text-left sm:text-right">
                                {leaderboardMetric === "revenue" ? (
                                  <>
                                    <p className="font-black text-sm text-slate-900">
                                      ₹ {Number(c.revenue || 0).toLocaleString("en-IN")}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-500">
                                      {c.enrollments_count} enrolled
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-black text-sm text-slate-900">
                                      {c.enrollments_count} <span className="text-xs font-semibold text-slate-500">learners</span>
                                    </p>
                                    <p className="text-[11px] font-medium text-emerald-600">
                                      ₹ {Number(c.revenue || 0).toLocaleString("en-IN")}
                                    </p>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                {!c.published && (
                                  <button
                                    type="button"
                                    onClick={() => handlePublishDashboardCourse(c)}
                                    disabled={publishingCourseId === c.name}
                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                    title="Publish this course directly"
                                  >
                                    {publishingCourseId === c.name ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Globe className="w-3.5 h-3.5" />
                                    )}
                                    <span>Publish</span>
                                  </button>
                                )}
                                <Link
                                  href={`/course/${encodeURIComponent(c.name)}/edit`}
                                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                                  title="Edit Course"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Link>
                                <Link
                                  href={`/course/${encodeURIComponent(c.name)}`}
                                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                                  title="View Course Page"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p>No courses created yet.</p>
                      <Link
                        href="/course/create"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create your first course
                      </Link>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing top {topCourses.length} of {instructorCourses.length} authored courses
                  </span>
                  <Link
                    href="/sales-earnings?tab=reports"
                    className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                  >
                    <span>Full Analytics</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* ── RIGHT (40% / col-span-5): STUDENT ENROLLMENT VELOCITY (AREA TREND) ── */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  {/* Velocity Header */}
                  <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-700 border border-sky-500/25">
                          <Flame className="w-3.5 h-3.5 text-sky-600" />
                          Adoption Trend
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        Enrollment Velocity
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        New student additions month-over-month.
                      </p>
                    </div>

                    {/* MoM Badge */}
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          velocityMoMChange >= 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        {velocityMoMChange >= 0 ? `+${velocityMoMChange}%` : `${velocityMoMChange}%`}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">vs last month</span>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-3 gap-2 py-4 my-2 bg-slate-50/70 rounded-2xl border border-slate-100 px-3 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        New This Year
                      </span>
                      <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                        {totalNewStudentsYear}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        This Month
                      </span>
                      <p className="text-base sm:text-lg font-black text-indigo-600 mt-0.5">
                        +{currentMonthAdditions}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Monthly Avg
                      </span>
                      <p className="text-base sm:text-lg font-black text-sky-600 mt-0.5">
                        ~{Math.round(totalNewStudentsYear / Math.max(currentMonthIdx + 1, 1))}
                      </p>
                    </div>
                  </div>

                  {/* SVG Area Line Trend Chart */}
                  <div className="relative mt-4 pt-4">
                    {/* Floating Hover Tooltip */}
                    {hoveredVelocityPoint && (
                      <div
                        style={{
                          left: `${(hoveredVelocityPoint.x / 500) * 100}%`,
                          top: "-15px",
                        }}
                        className="absolute -translate-x-1/2 -translate-y-full z-20 pointer-events-none transition-all duration-150"
                      >
                        <div className="bg-slate-900 text-white rounded-xl shadow-xl px-2.5 py-1 text-[11px] whitespace-nowrap border border-slate-700 text-center">
                          <p className="font-bold text-indigo-300">{hoveredVelocityPoint.month}</p>
                          <p className="font-extrabold text-white text-xs">
                            +{hoveredVelocityPoint.value} learners
                          </p>
                        </div>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700"></div>
                      </div>
                    )}

                    <div className="h-44 sm:h-48 w-full relative">
                      <svg
                        viewBox="0 0 500 180"
                        preserveAspectRatio="none"
                        className="w-full h-full overflow-visible"
                      >
                        <defs>
                          <linearGradient id="velocityAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                          </linearGradient>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4f46e5" floodOpacity="0.3" />
                          </filter>
                        </defs>

                        {/* Subtle Horizontal Reference Gridlines */}
                        <line x1="25" y1="20" x2="475" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="25" y1="87" x2="475" y2="87" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="25" y1="155" x2="475" y2="155" stroke="#e2e8f0" strokeWidth="1.5" />

                        {/* Area Path */}
                        {velocitySvgPoints.areaPath && (
                          <path
                            d={velocitySvgPoints.areaPath}
                            fill="url(#velocityAreaGradient)"
                            className="transition-all duration-500"
                          />
                        )}

                        {/* Line Path */}
                        {velocitySvgPoints.linePath && (
                          <path
                            d={velocitySvgPoints.linePath}
                            fill="none"
                            stroke="#4f46e5"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#glow)"
                            className="transition-all duration-500"
                          />
                        )}

                        {/* Interactive Data Point Circles */}
                        {velocitySvgPoints.points.map((pt, i) => {
                          const isHovered = hoveredVelocityPoint?.month === pt.fullMonth;
                          const isCurrent = i === currentMonthIdx;

                          return (
                            <g key={i}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isHovered ? 6 : isCurrent ? 5 : 3.5}
                                fill={isHovered ? "#4f46e5" : isCurrent ? "#06b6d4" : "#ffffff"}
                                stroke="#4f46e5"
                                strokeWidth={isHovered ? 2.5 : 2}
                                className="transition-all duration-150 cursor-pointer"
                                onMouseEnter={() =>
                                  setHoveredVelocityPoint({
                                    month: pt.fullMonth,
                                    value: pt.count,
                                    x: pt.x,
                                    y: pt.y,
                                  })
                                }
                                onMouseLeave={() => setHoveredVelocityPoint(null)}
                              />
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* X-Axis Month Labels */}
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-2 px-1">
                      {monthlyData.map((m, i) => (
                        <span
                          key={m.month_key}
                          className={`${
                            i === currentMonthIdx ? "text-indigo-600 font-extrabold" : "text-slate-400"
                          }`}
                        >
                          {m.month_label.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Steady subscriber acquisition
                  </span>
                  <Link
                    href="/enrollments"
                    className="font-bold text-sky-600 hover:text-sky-800 transition-colors flex items-center gap-1"
                  >
                    <span>Full Student Roster</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
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
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Batches</p>
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

            {/* ── UPCOMING LIVE CLASSES WIDGET (STUDENT VIEW) ── */}
            {myLiveClasses.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-7 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                          Upcoming Live Classes
                        </h2>
                        {myLiveClasses.some((c) => c.status === "live" || c.is_live) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            Live In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Interactive cohort sessions, workshops, and mentor Q&A calls for your enrolled batches.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {myLiveClasses.map((cls) => {
                    const isLive = cls.status === "live" || cls.is_live;
                    const canJoin = cls.can_join || isLive;
                    const providerBg =
                      cls.conferencing_provider === "Zoom"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : cls.conferencing_provider === "Google Meet"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-purple-50 text-purple-700 border-purple-200";

                    return (
                      <div
                        key={cls.name}
                        className={`bg-slate-50/60 rounded-2xl border p-4.5 flex flex-col justify-between transition-all hover:bg-white hover:shadow-sm ${
                          isLive
                            ? "border-red-200 bg-red-50/20"
                            : "border-slate-200/90 hover:border-indigo-300"
                        }`}
                      >
                        <div>
                          {/* Badges */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                                LIVE NOW
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                UPCOMING
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${providerBg}`}
                            >
                              {cls.conferencing_provider}
                            </span>
                          </div>

                          {/* Batch Title */}
                          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider line-clamp-1 mb-1">
                            {cls.batch_title || cls.batch_name}
                          </p>

                          {/* Class Title */}
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-3 leading-snug">
                            {cls.title}
                          </h3>

                          {/* Date & Time */}
                          <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-white/80 rounded-xl p-2.5 border border-slate-100">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-700">
                                {cls.formatted_date || cls.date}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {cls.formatted_time || cls.time}{" "}
                                <span className="text-slate-400">({cls.duration} mins)</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          {canJoin ? (
                            <button
                              onClick={() => handleStudentJoinSession(cls)}
                              disabled={joiningClassId === cls.name}
                              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-75"
                            >
                              {joiningClassId === cls.name ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Joining...</span>
                                </>
                              ) : (
                                <>
                                  <Video className="w-4 h-4 animate-pulse" />
                                  <span>Join Session</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <Link
                              href={`/batch/${encodeURIComponent(cls.batch_name)}#classes`}
                              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center gap-1.5 transition-all"
                            >
                              <span>View in Batch</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                <span>My Batches</span>
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
                    {studentCourses.map((course, idx) => {
                      const isCourseComplete = (course.progress || 0) >= 100 || 
                        (course.completed_lessons > 0 && course.total_lessons > 0 && course.completed_lessons >= course.total_lessons);

                      return (
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
                            {isCourseComplete ? (
                              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-sm">
                                <CheckCircle2 className="w-3 h-3" /> Completed
                              </span>
                            ) : (
                              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-sm">
                                <CheckCircle2 className="w-3 h-3" /> Enrolled
                              </span>
                            )}
                            {course.enrollment_from_batch && (
                              <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                Batch Course
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

                            {isCourseComplete ? (
                              <div className="flex gap-2">
                                <Link
                                  href={`/course/${encodeURIComponent(course.course)}`}
                                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs"
                                >
                                  <span>Review Course</span>
                                </Link>
                                {Boolean((course as any).has_certificate || (course as any).certificate) && (
                                  <Link
                                    href="/certificates"
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    <span>Certificate</span>
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <Link
                                href={`/course/${encodeURIComponent(course.course)}`}
                                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 group/btn"
                              >
                                <span>Continue Learning</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No Enrolled Courses Yet</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                      Explore our comprehensive catalog of industry-ready courses and start learning today.
                    </p>
                    <Link
                      href="/courses"
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
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active Batch
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
                                <strong>Curriculum:</strong> {batch.courses_count || batch.courses?.length || 0} Courses included in batch
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Link
                            href={`/batch/${encodeURIComponent(batch.batch)}`}
                            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                          >
                            <span>Open Batch & View Classes</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                    <Users className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No Active Batches</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                      Join mentor-led live batches with interactive live classes, scheduled assignments, and peer learning.
                    </p>
                    <Link
                      href="/batches"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
                    >
                      <Users className="w-4 h-4" />
                      <span>Explore Batches</span>
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

function DashboardLoading() {
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
