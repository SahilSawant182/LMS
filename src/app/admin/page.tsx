"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  LayoutDashboard,
  BookOpen,
  Users,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Briefcase,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  UserCheck,
  Award,
  Lock,
  X,
  FileSpreadsheet,
  Mail,
  Hash,
  User,
  Clock,
} from "lucide-react";
import {
  AdminUserData,
  AdminCourseData,
  StudentEnrolledCourseData,
  CourseEnrollmentStudentData,
  getStudentInstructorUsers,
  getAdminCourseList,
  getStudentEnrolledCourses,
  getCourseEnrollmentStudents,
  verifyAdminInstructorAccess,
} from "@/services/admin.services";
import { isAdminInstructor } from "@/services/auth.services";
import Navbar from "@/components/Navbar";

type TabKey = "overview" | "courses" | "users" | "reports";

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Authentication & Authorization state
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");

  // Navigation tab
  const tabParam = (searchParams.get("tab") as TabKey) || "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(
    ["overview", "courses", "users", "reports"].includes(tabParam)
      ? tabParam
      : "overview"
  );

  // Sync tab with URL
  useEffect(() => {
    if (tabParam && ["overview", "courses", "users", "reports"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    router.replace(`/admin?tab=${tab}`);
  };

  // Data states
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<
    "all" | "student" | "instructor" | "active" | "disabled"
  >("all");

  // Courses state
  const [courses, setCourses] = useState<AdminCourseData[]>([]);
  const [coursesTotal, setCoursesTotal] = useState(0);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState<
    "All" | "Published" | "Draft"
  >("All");
  const [coursePaymentFilter, setCoursePaymentFilter] = useState<
    "All" | "Paid" | "Free"
  >("All");
  const [courseOwnerFilter, setCourseOwnerFilter] = useState("All");
  const [courseSortBy, setCourseSortBy] = useState<
    "newest" | "most_enrolled" | "highest_completion" | "title"
  >("newest");
  const [coursePage, setCoursePage] = useState(1);
  const courseLimit = 20;

  // Student Enrolled Courses Drawer/Modal state
  const [selectedStudent, setSelectedStudent] = useState<AdminUserData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<StudentEnrolledCourseData[]>([]);
  const [drawerSearch, setDrawerSearch] = useState("");

  // Course Enrolled Students Drawer/Modal state
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState<AdminCourseData | null>(null);
  const [isCourseDrawerOpen, setIsCourseDrawerOpen] = useState(false);
  const [loadingCourseStudents, setLoadingCourseStudents] = useState(false);
  const [courseStudents, setCourseStudents] = useState<CourseEnrollmentStudentData[]>([]);
  const [courseStudentSearch, setCourseStudentSearch] = useState("");
  const [courseStudentProgressFilter, setCourseStudentProgressFilter] = useState<
    "all" | "completed" | "in_progress" | "not_started"
  >("all");

  // Close drawers on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDrawerOpen) setIsDrawerOpen(false);
        if (isCourseDrawerOpen) setIsCourseDrawerOpen(false);
      }
    };
    if (isDrawerOpen || isCourseDrawerOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen, isCourseDrawerOpen]);

  // Filtered enrolled courses for student drawer
  const filteredEnrolledCourses = useMemo(() => {
    if (!drawerSearch.trim()) return enrolledCourses;
    const q = drawerSearch.toLowerCase();
    return enrolledCourses.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const courseId = (item.course || "").toLowerCase();
      const owner = (item.owner || "").toLowerCase();
      const enrollment = (item.enrollment || "").toLowerCase();
      const intro = (item.short_introduction || "").toLowerCase();
      return (
        title.includes(q) ||
        courseId.includes(q) ||
        owner.includes(q) ||
        enrollment.includes(q) ||
        intro.includes(q)
      );
    });
  }, [enrolledCourses, drawerSearch]);

  // Filtered enrolled students for course drawer
  const filteredCourseStudents = useMemo(() => {
    let list = courseStudents;
    if (courseStudentProgressFilter === "completed") {
      list = list.filter((s) => Number(s.progress || 0) >= 100);
    } else if (courseStudentProgressFilter === "in_progress") {
      list = list.filter((s) => Number(s.progress || 0) > 0 && Number(s.progress || 0) < 100);
    } else if (courseStudentProgressFilter === "not_started") {
      list = list.filter((s) => !s.progress || Number(s.progress || 0) === 0);
    }

    if (!courseStudentSearch.trim()) return list;
    const q = courseStudentSearch.toLowerCase();
    return list.filter((s) => {
      const name = (s.full_name || "").toLowerCase();
      const email = (s.email || s.member || "").toLowerCase();
      const enr = (s.enrollment || "").toLowerCase();
      return name.includes(q) || email.includes(q) || enr.includes(q);
    });
  }, [courseStudents, courseStudentSearch, courseStudentProgressFilter]);

  // Aggregated metrics for course students
  const courseStudentsMetrics = useMemo(() => {
    const total = courseStudents.length;
    if (total === 0) return { total: 0, completed: 0, inProgress: 0, notStarted: 0, avgProgress: 0 };
    const completed = courseStudents.filter((s) => Number(s.progress || 0) >= 100).length;
    const inProgress = courseStudents.filter(
      (s) => Number(s.progress || 0) > 0 && Number(s.progress || 0) < 100
    ).length;
    const notStarted = courseStudents.filter((s) => !s.progress || Number(s.progress || 0) === 0).length;
    const totalProgress = courseStudents.reduce((sum, s) => sum + (Number(s.progress) || 0), 0);
    const avgProgress = Math.round(totalProgress / total);
    return { total, completed, inProgress, notStarted, avgProgress };
  }, [courseStudents]);

  // 1. Initial Permission Verification
  useEffect(() => {
    let isMounted = true;
    const checkAccess = async () => {
      setIsVerifying(true);
      if (typeof window !== "undefined") {
        const email =
          localStorage.getItem("userEmail") ||
          localStorage.getItem("user") ||
          "Admin";
        setCurrentEmail(email);
      }

      const hasAccess = await verifyAdminInstructorAccess();
      if (!isMounted) return;

      setIsAuthorized(hasAccess);
      setIsVerifying(false);

      if (hasAccess) {
        fetchAllAdminData();
      }
    };

    checkAccess();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch All Data
  const fetchAllAdminData = useCallback(async () => {
    setLoadingData(true);
    setErrorMsg(null);
    try {
      const [usersRes, coursesRes] = await Promise.allSettled([
        getStudentInstructorUsers(),
        getAdminCourseList({
          limit: 100, // get a comprehensive set for overview aggregation
          start: 0,
        }),
      ]);

      if (usersRes.status === "fulfilled") {
        setUsers(usersRes.value.data || []);
      } else {
        console.warn("Failed to fetch admin users:", usersRes.reason);
      }

      if (coursesRes.status === "fulfilled") {
        setCourses(coursesRes.value.data || []);
        setCoursesTotal(coursesRes.value.total || coursesRes.value.data.length);
      } else {
        console.warn("Failed to fetch admin courses:", coursesRes.reason);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load admin data");
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllAdminData();
  };

  // 3. Open Student Enrolled Courses Modal
  const handleViewStudentEnrollments = async (student: AdminUserData) => {
    setSelectedStudent(student);
    setDrawerSearch("");
    setIsDrawerOpen(true);
    setLoadingEnrolled(true);
    setEnrolledCourses([]);
    try {
      const res = await getStudentEnrolledCourses(student.user || student.email);
      setEnrolledCourses(res.data || []);
    } catch (err) {
      console.error("Failed to load student enrolled courses:", err);
    } finally {
      setLoadingEnrolled(false);
    }
  };

  // 4. Open Course Enrolled Students Modal
  const handleViewCourseStudents = async (course: AdminCourseData) => {
    setSelectedCourseForStudents(course);
    setCourseStudentSearch("");
    setCourseStudentProgressFilter("all");
    setIsCourseDrawerOpen(true);
    setLoadingCourseStudents(true);
    setCourseStudents([]);
    try {
      const res = await getCourseEnrollmentStudents(course.name || course.title);
      setCourseStudents(res.data || []);
    } catch (err) {
      console.error("Failed to load course enrolled students:", err);
    } finally {
      setLoadingCourseStudents(false);
    }
  };

  // Quick jump: inspect student from course drawer
  const handleInspectStudentFromCourse = (memberEmail: string) => {
    const existingUser = users.find(
      (u) => u.email === memberEmail || u.user === memberEmail
    ) || {
      user: memberEmail,
      email: memberEmail,
      full_name: memberEmail,
      enabled: 1,
    };
    setIsCourseDrawerOpen(false);
    handleViewStudentEnrollments(existingUser);
  };

  // Download course students CSV
  const downloadCourseStudentsCSV = () => {
    if (!selectedCourseForStudents) return;
    const headers = [
      "Enrollment ID",
      "Full Name",
      "Email",
      "Course Slug",
      "Progress (%)",
      "Account Status",
      "Enrolled Date",
    ];
    const rows = filteredCourseStudents.map((s) => [
      `"${s.enrollment || ""}"`,
      `"${(s.full_name || "").replace(/"/g, '""')}"`,
      `"${s.email || s.member || ""}"`,
      `"${s.course || selectedCourseForStudents.name || ""}"`,
      `${Number(s.progress || 0).toFixed(1)}%`,
      Number(s.enabled) === 1 ? "Active" : "Disabled",
      `"${s.creation || ""}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `course_students_${selectedCourseForStudents.name || "course"}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregated Overview Metrics
  const metrics = useMemo(() => {
    const totalCourses = coursesTotal || courses.length;
    const publishedCourses = courses.filter((c) => Number(c.published) === 1).length;
    const draftCourses = courses.filter((c) => Number(c.published) === 0).length;
    const paidCourses = courses.filter(
      (c) => Number(c.paid_certificate) === 1
    ).length;

    const totalUsers = users.length;
    const activeUsers = users.filter((u) => Number(u.enabled) === 1).length;
    const instructors = users.filter((u) => {
      const roles = Array.isArray(u.roles) ? u.roles.join(",") : String(u.roles || "");
      return roles.includes("Instructor");
    });
    const studentsOnly = users.filter((u) => {
      const roles = Array.isArray(u.roles) ? u.roles.join(",") : String(u.roles || "");
      return roles.includes("Student") && !roles.includes("Instructor");
    });

    // Instructor Course Distribution
    const instructorCourseMap = new Map<string, number>();
    courses.forEach((c) => {
      const owner = c.owner || "Unassigned";
      instructorCourseMap.set(owner, (instructorCourseMap.get(owner) || 0) + 1);
    });
    const instructorLeaderboard = Array.from(instructorCourseMap.entries())
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count);

    // Enrollment and completion analytics
    const totalEnrollments = courses.reduce((sum, c) => sum + (Number(c.enrollment_count) || 0), 0);
    const coursesWithEnrollment = courses.filter((c) => (Number(c.enrollment_count) || 0) > 0);
    const totalCompletionSum = coursesWithEnrollment.reduce(
      (sum, c) => sum + (Number(c.completion_rate) || 0),
      0
    );
    const avgPlatformCompletion =
      coursesWithEnrollment.length > 0
        ? Math.round((totalCompletionSum / coursesWithEnrollment.length) * 10) / 10
        : 0;

    // Top Courses by Enrollments
    const topEnrolledCourses = [...courses]
      .filter((c) => (Number(c.enrollment_count) || 0) > 0)
      .sort((a, b) => (Number(b.enrollment_count) || 0) - (Number(a.enrollment_count) || 0))
      .slice(0, 8);

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      paidCourses,
      freeCourses: totalCourses - paidCourses,
      totalUsers,
      activeUsers,
      instructorCount: instructors.length,
      studentCount: studentsOnly.length,
      instructorLeaderboard,
      totalEnrollments,
      avgPlatformCompletion,
      topEnrolledCourses,
    };
  }, [courses, coursesTotal, users]);

  // Unique instructors list for dropdown filter
  const uniqueInstructors = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.owner) set.add(c.owner);
    });
    return Array.from(set).sort();
  }, [courses]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (userSearch.trim()) {
        const q = userSearch.toLowerCase().trim();
        const email = (u.email || u.user || "").toLowerCase();
        const name = (u.full_name || `${u.first_name || ""} ${u.last_name || ""}`).toLowerCase();
        if (!email.includes(q) && !name.includes(q)) return false;
      }
      // Role
      const roles = Array.isArray(u.roles) ? u.roles.join(",") : String(u.roles || "");
      if (userRoleFilter === "instructor" && !roles.includes("Instructor")) return false;
      if (userRoleFilter === "student" && !roles.includes("Student")) return false;
      if (userRoleFilter === "active" && Number(u.enabled) !== 1) return false;
      if (userRoleFilter === "disabled" && Number(u.enabled) === 1) return false;
      return true;
    });
  }, [users, userSearch, userRoleFilter]);

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    let list = courses.filter((c) => {
      // Search
      if (courseSearch.trim()) {
        const q = courseSearch.toLowerCase().trim();
        const title = (c.title || "").toLowerCase();
        const slug = (c.name || "").toLowerCase();
        const owner = (c.owner || "").toLowerCase();
        const desc = (c.short_introduction || "").toLowerCase();
        if (!title.includes(q) && !slug.includes(q) && !owner.includes(q) && !desc.includes(q)) {
          return false;
        }
      }
      // Status
      if (courseStatusFilter === "Published" && Number(c.published) !== 1) return false;
      if (courseStatusFilter === "Draft" && Number(c.published) !== 0) return false;

      // Payment
      if (coursePaymentFilter === "Paid" && Number(c.paid_certificate) !== 1) return false;
      if (coursePaymentFilter === "Free" && Number(c.paid_certificate) !== 0) return false;

      // Owner
      if (courseOwnerFilter !== "All" && c.owner !== courseOwnerFilter) return false;

      return true;
    });

    // Sort order
    return [...list].sort((a, b) => {
      if (courseSortBy === "most_enrolled") {
        return (Number(b.enrollment_count) || 0) - (Number(a.enrollment_count) || 0);
      }
      if (courseSortBy === "highest_completion") {
        return (Number(b.completion_rate) || 0) - (Number(a.completion_rate) || 0);
      }
      if (courseSortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      // default: newest
      return new Date(b.creation || 0).getTime() - new Date(a.creation || 0).getTime();
    });
  }, [courses, courseSearch, courseStatusFilter, coursePaymentFilter, courseOwnerFilter, courseSortBy]);

  // Paginated Courses
  const paginatedCourses = useMemo(() => {
    const start = (coursePage - 1) * courseLimit;
    return filteredCourses.slice(start, start + courseLimit);
  }, [filteredCourses, coursePage]);

  const totalCoursePages = Math.ceil(filteredCourses.length / courseLimit) || 1;

  // CSV Exporters
  const downloadCoursesCSV = () => {
    const headers = [
      "Title",
      "Slug",
      "Owner / Instructor",
      "Published",
      "Paid Certificate",
      "Enrollments",
      "Completion Rate (%)",
      "Created",
      "Modified",
    ];
    const rows = filteredCourses.map((c) => [
      `"${(c.title || "").replace(/"/g, '""')}"`,
      `"${c.name || ""}"`,
      `"${c.owner || ""}"`,
      Number(c.published) === 1 ? "Published" : "Draft",
      Number(c.paid_certificate) === 1 ? "Paid" : "Free",
      c.enrollment_count ?? 0,
      `${Number(c.completion_rate || 0).toFixed(1)}%`,
      `"${c.creation || ""}"`,
      `"${c.modified || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lms_courses_admin_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadUsersCSV = () => {
    const headers = ["Full Name", "Email / User", "Roles", "Status"];
    const rows = filteredUsers.map((u) => [
      `"${(u.full_name || `${u.first_name || ""} ${u.last_name || ""}`).trim().replace(/"/g, '""')}"`,
      `"${u.email || u.user || ""}"`,
      `"${Array.isArray(u.roles) ? u.roles.join(", ") : u.roles || ""}"`,
      Number(u.enabled) === 1 ? "Enabled" : "Disabled",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lms_users_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render: Loading verification screen
  if (isVerifying) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Verifying Admin Permissions</h2>
            <p className="text-sm text-slate-500 mt-1">
              Validating administrator role and instructor credentials...
            </p>
            <div className="mt-6 flex justify-center">
              <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render: Access Denied if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 max-w-lg w-full text-center">
            <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-5 shadow-inner border border-red-100">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-100 text-red-700 mb-3">
              Admin Access Restricted
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Instructor Admin Role Required</h1>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              The Admin Dashboard and system-wide reports are protected. Only instructors assigned the
              <span className="font-semibold text-slate-800"> Administrator</span>,
              <span className="font-semibold text-slate-800"> System Manager</span>, or
              <span className="font-semibold text-slate-800"> Instructor Admin</span> role in the Frappe backend can view this portal.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 mt-6 border border-slate-100 text-left text-xs text-slate-500 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Current User:</span>
                <span className="font-mono font-medium text-slate-700">{currentEmail || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Required Roles:</span>
                <span className="font-medium text-purple-700">Administrator, Instructor Admin</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors shadow-sm"
              >
                Return to My Dashboard
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Re-check Permissions
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800 pb-16">
      <Navbar />

      {/* Top Admin Header Strip */}
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    Admin Portal & Reports
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                    Administrator
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform-wide management of LMS courses, instructors, students, and enrollment metrics
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRefresh}
                disabled={refreshing || loadingData}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                title="Refresh API Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>

              <Link
                href="/course/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Course</span>
              </Link>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleTabChange("overview")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Overview</span>
            </button>

            <button
              onClick={() => handleTabChange("courses")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "courses"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>All Courses</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "courses"
                    ? "bg-purple-500 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {metrics.totalCourses}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("users")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "users"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Directory</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "users"
                    ? "bg-purple-500 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {metrics.totalUsers}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("reports")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "reports"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Reports & Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: comes down cleanly below the header strip with generous spacing */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between text-red-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Card 1: Total Courses */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Courses
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {metrics.totalCourses}
                  </span>
                  <span className="text-xs text-slate-500">catalog items</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {metrics.publishedCourses} Published
                  </span>
                  <span className="text-amber-600 font-semibold">
                    {metrics.draftCourses} Drafts
                  </span>
                </div>
              </div>

              {/* Card 2: Total Course Enrollments (NEW) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Course Enrollments
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-purple-700">
                    {metrics.totalEnrollments}
                  </span>
                  <span className="text-xs text-slate-500">total enrollments</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-slate-600 font-medium">Avg Completion:</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {metrics.avgPlatformCompletion}%
                  </span>
                </div>
              </div>

              {/* Card 3: Platform Users */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Users
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {metrics.totalUsers}
                  </span>
                  <span className="text-xs text-slate-500">registered</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-indigo-600 font-semibold">
                    {metrics.instructorCount} Instructors
                  </span>
                  <span className="text-slate-600 font-semibold">
                    {metrics.studentCount} Students
                  </span>
                </div>
              </div>

              {/* Card 4: Active Accounts */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Active Accounts
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-600">
                    {metrics.activeUsers}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({metrics.totalUsers > 0 ? Math.round((metrics.activeUsers / metrics.totalUsers) * 100) : 0}% active)
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Enabled in Frappe</span>
                  <span className="text-slate-400">
                    {metrics.totalUsers - metrics.activeUsers} Disabled
                  </span>
                </div>
              </div>

              {/* Card 5: Monetization */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Paid Certifications
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-amber-600">
                    {metrics.paidCourses}
                  </span>
                  <span className="text-xs text-slate-500">paid cert courses</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Free Certificates</span>
                  <span className="text-slate-600 font-semibold">
                    {metrics.freeCourses}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Section: Recent Courses & Instructor Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Courses List (2 Columns) */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Recently Modified Courses</h2>
                    <p className="text-xs text-slate-500">Latest active curriculum across all instructors</p>
                  </div>
                  <button
                    onClick={() => handleTabChange("courses")}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 overflow-hidden">
                  {courses.slice(0, 6).map((course) => (
                    <div
                      key={course.name}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/60 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          {course.image ? (
                            <img
                              src={course.image}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs bg-slate-100">
                              {course.title?.charAt(0) || "C"}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/course/${course.name}`}
                            className="text-sm font-semibold text-slate-900 hover:text-purple-600 truncate block"
                          >
                            {course.title}
                          </Link>
                          <p className="text-xs text-slate-500 truncate">
                            Owner: <span className="font-mono text-slate-600">{course.owner}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Enrollment Count Pill */}
                        <button
                          onClick={() => handleViewCourseStudents(course)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition cursor-pointer"
                          title="Enrolled Learners"
                        >
                          <Users className="w-3 h-3 text-purple-600" />
                          <span>{course.enrollment_count ?? 0}</span>
                        </button>

                        {/* Completion Rate Pill */}
                        {Number(course.completion_rate || 0) > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {Number(course.completion_rate).toFixed(0)}%
                          </span>
                        )}

                        {Number(course.published) === 1 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Draft
                          </span>
                        )}
                        <Link
                          href={`/course/${course.name}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          title="Preview Course"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructor Course Distribution (1 Column) */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Instructor Distribution</h2>
                    <p className="text-xs text-slate-500">Course creators by volume</p>
                  </div>
                  <button
                    onClick={() => handleTabChange("users")}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>All Users</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
                  {metrics.instructorLeaderboard.slice(0, 8).map((inst, idx) => {
                    const percentage =
                      metrics.totalCourses > 0
                        ? Math.round((inst.count / metrics.totalCourses) * 100)
                        : 0;
                    return (
                      <div key={inst.owner} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-slate-800 truncate max-w-[170px]" title={inst.owner}>
                            {inst.owner}
                          </span>
                          <span className="font-bold text-purple-700 shrink-0">
                            {inst.count} {inst.count === 1 ? "course" : "courses"}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-purple-600 h-1.5 rounded-full"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: COURSES MANAGEMENT & DIRECTORY */}
        {/* ======================================================== */}
        {activeTab === "courses" && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => {
                    setCourseSearch(e.target.value);
                    setCoursePage(1);
                  }}
                  placeholder="Search course title, slug, or instructor email..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                />
                {courseSearch && (
                  <button
                    onClick={() => setCourseSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <select
                  value={courseStatusFilter}
                  onChange={(e) => {
                    setCourseStatusFilter(e.target.value as any);
                    setCoursePage(1);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="All">All Statuses</option>
                  <option value="Published">Published Only</option>
                  <option value="Draft">Drafts Only</option>
                </select>

                {/* Payment Filter */}
                <select
                  value={coursePaymentFilter}
                  onChange={(e) => {
                    setCoursePaymentFilter(e.target.value as any);
                    setCoursePage(1);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="All">All Payments</option>
                  <option value="Paid">Paid Certificate</option>
                  <option value="Free">Free Certificate</option>
                </select>

                {/* Owner Filter */}
                <select
                  value={courseOwnerFilter}
                  onChange={(e) => {
                    setCourseOwnerFilter(e.target.value);
                    setCoursePage(1);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 max-w-[150px] truncate"
                >
                  <option value="All">All Instructors</option>
                  {uniqueInstructors.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>

                {/* Sort Filter (NEW) */}
                <select
                  value={courseSortBy}
                  onChange={(e) => {
                    setCourseSortBy(e.target.value as any);
                    setCoursePage(1);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="newest">Newest First</option>
                  <option value="most_enrolled">Most Enrolled</option>
                  <option value="highest_completion">Highest Completion</option>
                  <option value="title">Title (A-Z)</option>
                </select>

                {/* CSV Export */}
                <button
                  onClick={downloadCoursesCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                  title="Export filtered courses to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Courses Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Instructor / Owner</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Certification</th>
                      <th className="py-3 px-4 text-center">Enrollments</th>
                      <th className="py-3 px-4">Completion</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCourses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-semibold">No courses match the criteria</p>
                          <p className="text-xs text-slate-400 mt-1">Try resetting your filters or search keywords</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedCourses.map((c) => (
                        <tr key={c.name} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 max-w-sm">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                {c.image ? (
                                  <img
                                    src={c.image}
                                    alt={c.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                    {c.title?.charAt(0) || "C"}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/course/${c.name}`}
                                  className="font-bold text-slate-900 hover:text-purple-600 truncate block text-sm"
                                >
                                  {c.title}
                                </Link>
                                <span className="text-[11px] font-mono text-slate-400 truncate block">
                                  {c.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-medium text-slate-700 truncate max-w-[180px] block" title={c.owner}>
                              {c.owner}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {Number(c.published) === 1 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Draft
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {Number(c.paid_certificate) === 1 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Paid Certificate
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Free
                              </span>
                            )}
                          </td>
                          {/* Enrollments Column (NEW) */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleViewCourseStudents(c)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 font-bold text-xs transition cursor-pointer shadow-2xs group"
                              title="Click to view enrolled students"
                            >
                              <Users className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                              <span>{c.enrollment_count ?? 0}</span>
                            </button>
                          </td>
                          {/* Completion Rate Column (NEW) */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 min-w-[95px]">
                              <span
                                className={`text-[11px] font-bold ${
                                  Number(c.completion_rate || 0) > 0 ? "text-emerald-700" : "text-slate-500"
                                }`}
                              >
                                {Number(c.completion_rate || 0).toFixed(1)}%
                              </span>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    Number(c.completion_rate || 0) >= 50
                                      ? "bg-emerald-500"
                                      : Number(c.completion_rate || 0) > 0
                                      ? "bg-indigo-500"
                                      : "bg-slate-300"
                                  }`}
                                  style={{ width: `${Math.min(Math.max(Number(c.completion_rate || 0), 0), 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {c.creation ? new Date(c.creation).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                              <button
                                onClick={() => handleViewCourseStudents(c)}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
                                title="View Enrolled Students & Completion"
                              >
                                <Users className="w-3.5 h-3.5 text-purple-600" />
                                <span>Students</span>
                              </button>
                              <Link
                                href={`/course/${c.name}`}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs inline-flex items-center gap-1 transition"
                                title="Preview Course Page"
                              >
                                <span>Preview</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                              <Link
                                href={`/course/${c.name}/edit`}
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs transition"
                                title="Edit Course"
                              >
                                Edit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalCoursePages > 1 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{(coursePage - 1) * courseLimit + 1}</span> to{" "}
                    <span className="font-semibold text-slate-700">
                      {Math.min(coursePage * courseLimit, filteredCourses.length)}
                    </span>{" "}
                    of <span className="font-semibold text-slate-700">{filteredCourses.length}</span> courses
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCoursePage((p) => Math.max(p - 1, 1))}
                      disabled={coursePage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-xs font-semibold text-slate-700">
                      Page {coursePage} of {totalCoursePages}
                    </span>
                    <button
                      onClick={() => setCoursePage((p) => Math.min(p + 1, totalCoursePages))}
                      disabled={coursePage === totalCoursePages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: USERS & DIRECTORY (STUDENTS & INSTRUCTORS) */}
        {/* ======================================================== */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by full name, email, or username..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                />
                {userSearch && (
                  <button
                    onClick={() => setUserSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role filter buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: "all", label: "All Users" },
                  { key: "instructor", label: "Instructors" },
                  { key: "student", label: "Students" },
                  { key: "active", label: "Active" },
                  { key: "disabled", label: "Disabled" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setUserRoleFilter(item.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      userRoleFilter === item.key
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                {/* CSV Export */}
                <button
                  onClick={downloadUsersCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer ml-1"
                  title="Export filtered users to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">User / Name</th>
                      <th className="py-3 px-4">Email ID</th>
                      <th className="py-3 px-4">Assigned Roles</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Student Enrolled Courses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-semibold">No users found</p>
                          <p className="text-xs text-slate-400 mt-1">Try another search or reset role filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const rolesStr = Array.isArray(u.roles)
                          ? u.roles.join(", ")
                          : String(u.roles || "Student");
                        const isInst = rolesStr.includes("Instructor");
                        const isStudent = rolesStr.includes("Student");

                        return (
                          <tr key={u.user || u.email} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                  {u.first_name
                                    ? u.first_name.charAt(0).toUpperCase()
                                    : (u.full_name || u.email || "U").charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 truncate">
                                    {u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email}
                                  </p>
                                  <span className="text-[11px] font-mono text-slate-400 block truncate">
                                    {u.user}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-700">
                              {u.email}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {isInst && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                    Instructor
                                  </span>
                                )}
                                {isStudent && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    Student
                                  </span>
                                )}
                                {!isInst && !isStudent && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                    {rolesStr || "User"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {Number(u.enabled) === 1 ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Enabled
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Disabled
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleViewStudentEnrollments(u)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs transition cursor-pointer shadow-2xs"
                              >
                                <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                                <span>Inspect Enrollments</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: REPORTS & ANALYTICS */}
        {/* ======================================================== */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            {/* Top Report Highlights */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-purple-600/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 uppercase tracking-wider backdrop-blur-xs">
                    Comprehensive LMS Intelligence
                  </span>
                  <h2 className="text-2xl font-extrabold mt-2 tracking-tight">
                    Executive Platform Analytics Report
                  </h2>
                  <p className="text-purple-100 text-xs sm:text-sm mt-1 max-w-2xl">
                    High-level insights into content generation rate, published course readiness, instructor productivity, and learner enrollment volume.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadCoursesCSV}
                    className="px-4 py-2.5 rounded-xl bg-white text-purple-900 font-bold text-xs hover:bg-purple-50 transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-purple-700" />
                    <span>Download Courses Report</span>
                  </button>
                  <button
                    onClick={downloadUsersCSV}
                    className="px-4 py-2.5 rounded-xl bg-purple-900/60 border border-purple-400/30 text-white font-bold text-xs hover:bg-purple-900/80 transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Users Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Report 1: Course Publication Status */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Curriculum Publication Ratio</h3>
                    <p className="text-xs text-slate-500">Live published courses vs drafts in development</p>
                  </div>
                  <BookOpen className="w-5 h-5 text-purple-500" />
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-emerald-700">Published ({metrics.publishedCourses})</span>
                      <span className="text-slate-500">
                        {metrics.totalCourses > 0
                          ? Math.round((metrics.publishedCourses / metrics.totalCourses) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-3 rounded-full transition-all"
                        style={{
                          width: `${metrics.totalCourses > 0 ? (metrics.publishedCourses / metrics.totalCourses) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-amber-700">Drafts ({metrics.draftCourses})</span>
                      <span className="text-slate-500">
                        {metrics.totalCourses > 0
                          ? Math.round((metrics.draftCourses / metrics.totalCourses) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-amber-400 h-3 rounded-full transition-all"
                        style={{
                          width: `${metrics.totalCourses > 0 ? (metrics.draftCourses / metrics.totalCourses) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-purple-700">Paid Certificates ({metrics.paidCourses})</span>
                      <span className="text-slate-500">
                        {metrics.totalCourses > 0
                          ? Math.round((metrics.paidCourses / metrics.totalCourses) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-purple-600 h-3 rounded-full transition-all"
                        style={{
                          width: `${metrics.totalCourses > 0 ? (metrics.paidCourses / metrics.totalCourses) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Report 2: User Demographics */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">User Demographic Breakdown</h3>
                    <p className="text-xs text-slate-500">Registered learners vs certified instructors</p>
                  </div>
                  <Users className="w-5 h-5 text-indigo-500" />
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Students / Learners</p>
                        <p className="text-[11px] text-slate-500">Registered learning accounts</p>
                      </div>
                    </div>
                    <span className="text-lg font-extrabold text-slate-800">
                      {metrics.studentCount}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Instructors & Creators</p>
                        <p className="text-[11px] text-slate-500">Authorized curriculum authors</p>
                      </div>
                    </div>
                    <span className="text-lg font-extrabold text-slate-800">
                      {metrics.instructorCount}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">System Activity Rate</p>
                        <p className="text-[11px] text-slate-500">Enabled status in Frappe</p>
                      </div>
                    </div>
                    <span className="text-lg font-extrabold text-emerald-600">
                      {metrics.totalUsers > 0
                        ? Math.round((metrics.activeUsers / metrics.totalUsers) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Instructor Course Portfolio Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Instructor Course Creation Audit</h3>
              <p className="text-xs text-slate-500 mb-4">Complete breakdown of courses authored per instructor</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Instructor Email</th>
                      <th className="py-2.5 px-4">Total Created</th>
                      <th className="py-2.5 px-4">Published Count</th>
                      <th className="py-2.5 px-4">Draft Count</th>
                      <th className="py-2.5 px-4">Catalog Share</th>
                      <th className="py-2.5 px-4 text-right">Quick Filter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.instructorLeaderboard.map((item) => {
                      const instCourses = courses.filter((c) => c.owner === item.owner);
                      const pub = instCourses.filter((c) => Number(c.published) === 1).length;
                      const draft = instCourses.filter((c) => Number(c.published) === 0).length;
                      const share =
                        metrics.totalCourses > 0
                          ? Math.round((item.count / metrics.totalCourses) * 100)
                          : 0;

                      return (
                        <tr key={item.owner} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            {item.owner}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">{item.count}</td>
                          <td className="py-3 px-4 text-emerald-600 font-semibold">{pub}</td>
                          <td className="py-3 px-4 text-amber-600 font-semibold">{draft}</td>
                          <td className="py-3 px-4 text-slate-500">{share}%</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setCourseOwnerFilter(item.owner);
                                handleTabChange("courses");
                              }}
                              className="px-2.5 py-1 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 font-semibold text-[11px] cursor-pointer"
                            >
                              Filter Courses
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Course Engagement & Enrollment Leaderboard Table (NEW) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Course Enrollment & Completion Audit</h3>
                  <p className="text-xs text-slate-500">Most popular courses ranked by learner enrollments and progress rate</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Total Enrolled: <strong className="text-purple-700">{metrics.totalEnrollments}</strong>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Course</th>
                      <th className="py-2.5 px-4">Instructor</th>
                      <th className="py-2.5 px-4 text-center">Enrollments</th>
                      <th className="py-2.5 px-4">Completion Rate</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Roster</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.topEnrolledCourses.map((c) => (
                      <tr key={c.name} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <Link href={`/course/${c.name}`} className="hover:text-purple-600 truncate block max-w-xs">
                            {c.title}
                          </Link>
                          <span className="font-mono text-[10px] text-slate-400 block">{c.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{c.owner}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Users className="w-3 h-3 text-purple-600" />
                            {c.enrollment_count ?? 0}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 min-w-[100px]">
                            <span className={`text-[11px] font-bold ${Number(c.completion_rate || 0) > 0 ? "text-emerald-700" : "text-slate-500"}`}>
                              {Number(c.completion_rate || 0).toFixed(1)}%
                            </span>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  Number(c.completion_rate || 0) >= 50
                                    ? "bg-emerald-500"
                                    : Number(c.completion_rate || 0) > 0
                                    ? "bg-indigo-500"
                                    : "bg-slate-300"
                                }`}
                                style={{ width: `${Math.min(Math.max(Number(c.completion_rate || 0), 0), 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {Number(c.published) === 1 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Published
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleViewCourseStudents(c)}
                            className="px-2.5 py-1 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Users className="w-3 h-3" />
                            <span>View Students</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* STUDENT ENROLLED COURSES MODAL / SLIDE-OVER DRAWER */}
      {/* ======================================================== */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-50 w-full sm:max-w-xl md:max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 transform transition-transform animate-in slide-in-from-right duration-300"
          >
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-slate-200/90 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      Student Course Enrollments
                    </h3>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wide">
                      Admin Audit
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    Detailed record of enrolled courses and registration timestamps
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Close Drawer (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Profile Identity Card */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 text-white p-5 sm:p-6 shadow-inner shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-xl font-black text-white shrink-0 shadow-md">
                    {(selectedStudent?.full_name || selectedStudent?.user || "S").charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-bold text-white truncate">
                        {selectedStudent?.full_name || selectedStudent?.user || "Student Account"}
                      </h4>
                      {Number(selectedStudent?.enabled) === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Disabled
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 text-xs text-purple-200/80 flex-wrap">
                      {selectedStudent?.email && (
                        <div className="flex items-center gap-1.5 truncate max-w-[220px] sm:max-w-none">
                          <Mail className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                          <span className="truncate">{selectedStudent.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 font-mono text-[11px] text-purple-300">
                        <Hash className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>{selectedStudent?.user}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2 rounded-xl">
                  <div className="text-xl font-extrabold text-white">
                    {enrolledCourses.length}
                  </div>
                  <div className="text-[10px] font-medium text-purple-200 uppercase tracking-wider">
                    {enrolledCourses.length === 1 ? "Course" : "Courses"}
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-header Filter & Count Strip */}
            <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter courses by title, owner, or enrollment ID..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="w-full pl-8.5 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                />
                {drawerSearch && (
                  <button
                    onClick={() => setDrawerSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 whitespace-nowrap">
                Showing <span className="font-bold text-slate-900">{filteredEnrolledCourses.length}</span> of{" "}
                <span className="font-semibold text-slate-700">{enrolledCourses.length}</span>
              </div>
            </div>

            {/* Drawer Body - Scrollable Course List */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5">
              {loadingEnrolled ? (
                <div className="space-y-3.5">
                  <div className="py-6 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 text-purple-600 animate-spin" />
                    <p className="text-xs font-semibold text-slate-600">Loading student enrolled courses...</p>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-4 bg-white rounded-2xl border border-slate-200/80 animate-pulse flex flex-col sm:flex-row gap-4"
                    >
                      <div className="w-full sm:w-32 h-24 bg-slate-200 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2.5 py-1">
                        <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                        <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                        <div className="h-3 bg-slate-200 rounded-md w-full" />
                        <div className="h-3 bg-slate-200 rounded-md w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : enrolledCourses.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs p-6">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-7 h-7 text-purple-500" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Course Enrollments Found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    This student has not enrolled in any published courses yet. New enrollments will appear here automatically.
                  </p>
                </div>
              ) : filteredEnrolledCourses.length === 0 ? (
                <div className="py-14 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs p-6">
                  <Search className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <h4 className="text-sm font-bold text-slate-800">No Matching Courses</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    No enrolled courses matched &ldquo;{drawerSearch}&rdquo;.
                  </p>
                  <button
                    onClick={() => setDrawerSearch("")}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                filteredEnrolledCourses.map((item) => (
                  <div
                    key={item.enrollment}
                    className="group p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-purple-300 hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 relative"
                  >
                    {/* Course Thumbnail */}
                    <div className="relative w-full sm:w-32 h-28 sm:h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 shadow-2xs">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title || item.course}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl group-hover:scale-105 transition-transform duration-300">
                          {(item.title || item.course).charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Status Pill Overlay */}
                      <div className="absolute top-2 left-2">
                        {Number(item.published) === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/85 text-emerald-300 backdrop-blur-xs border border-emerald-500/30 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/85 text-amber-300 backdrop-blur-xs border border-amber-500/30 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Draft
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Course Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        {/* Title and external link */}
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/course/${item.course}`}
                            className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-purple-600 line-clamp-1 transition"
                            title={item.title || item.course}
                          >
                            {item.title || item.course}
                          </Link>

                          <Link
                            href={`/course/${item.course}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition shrink-0"
                            title="View Course Page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>

                        {/* Instructor */}
                        {item.owner && (
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                            <span className="text-slate-400">Instructor:</span>
                            <span className="font-semibold text-slate-700 truncate">{item.owner}</span>
                          </p>
                        )}

                        {/* Short Introduction */}
                        {item.short_introduction && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                            {item.short_introduction}
                          </p>
                        )}
                      </div>

                      {/* Card Footer / Meta */}
                      <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold border border-slate-200/60">
                            {item.enrollment}
                          </span>
                          {item.enrollment_status && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium text-[10px] border border-purple-100">
                              {item.enrollment_status}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {item.creation
                              ? new Date(item.creation).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Enrolled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 px-6 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                Total Enrolled: <span className="font-bold text-slate-900">{enrolledCourses.length}</span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COURSE ENROLLED STUDENTS MODAL / SLIDE-OVER DRAWER */}
      {/* ======================================================== */}
      {isCourseDrawerOpen && (
        <div
          onClick={() => setIsCourseDrawerOpen(false)}
          className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-50 w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl h-full shadow-2xl flex flex-col border-l border-slate-200 transform transition-transform animate-in slide-in-from-right duration-300"
          >
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-slate-200/90 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      Course Enrolled Students
                    </h3>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wide">
                      Admin Roster
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    Learner enrollment details, lesson completion, and account status
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCourseDrawerOpen(false)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Close Drawer (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Course Identity Hero Card */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 text-white p-5 sm:p-6 shadow-inner shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Course Thumbnail */}
                  <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-xl overflow-hidden bg-white/10 backdrop-blur-xs border border-white/20 shrink-0 shadow-md">
                    {selectedCourseForStudents?.image ? (
                      <img
                        src={selectedCourseForStudents.image}
                        alt={selectedCourseForStudents.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-black text-white bg-gradient-to-br from-indigo-500 to-purple-600">
                        {(selectedCourseForStudents?.title || "C").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-bold text-white truncate max-w-md">
                        {selectedCourseForStudents?.title || selectedCourseForStudents?.name}
                      </h4>
                      {Number(selectedCourseForStudents?.published) === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/85 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/85 text-amber-300 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 text-xs text-purple-200/80 flex-wrap">
                      {selectedCourseForStudents?.owner && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                          <span>
                            Instructor:{" "}
                            <strong className="text-white font-medium">
                              {selectedCourseForStudents.owner}
                            </strong>
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 font-mono text-[11px] text-purple-300">
                        <Hash className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>{selectedCourseForStudents?.name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right KPI Badges */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-2 rounded-xl">
                    <div className="text-lg sm:text-xl font-extrabold text-white">
                      {courseStudentsMetrics.total}
                    </div>
                    <div className="text-[10px] font-medium text-purple-200 uppercase tracking-wider">
                      Learners
                    </div>
                  </div>
                  <div className="text-right bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-2 rounded-xl hidden sm:block">
                    <div className="text-lg sm:text-xl font-extrabold text-emerald-400">
                      {courseStudentsMetrics.avgProgress}%
                    </div>
                    <div className="text-[10px] font-medium text-purple-200 uppercase tracking-wider">
                      Avg Progress
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter, Search & Export Bar */}
            <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students by name, email, or enrollment ID..."
                  value={courseStudentSearch}
                  onChange={(e) => setCourseStudentSearch(e.target.value)}
                  className="w-full pl-8.5 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                />
                {courseStudentSearch && (
                  <button
                    onClick={() => setCourseStudentSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Progress Filter Pills & Export */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold text-slate-600 shrink-0">
                  <button
                    onClick={() => setCourseStudentProgressFilter("all")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      courseStudentProgressFilter === "all"
                        ? "bg-white text-purple-700 shadow-2xs font-bold"
                        : "hover:text-slate-900"
                    }`}
                  >
                    All ({courseStudents.length})
                  </button>
                  <button
                    onClick={() => setCourseStudentProgressFilter("completed")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      courseStudentProgressFilter === "completed"
                        ? "bg-white text-emerald-700 shadow-2xs font-bold"
                        : "hover:text-slate-900"
                    }`}
                  >
                    Completed ({courseStudentsMetrics.completed})
                  </button>
                  <button
                    onClick={() => setCourseStudentProgressFilter("in_progress")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      courseStudentProgressFilter === "in_progress"
                        ? "bg-white text-indigo-700 shadow-2xs font-bold"
                        : "hover:text-slate-900"
                    }`}
                  >
                    In Progress ({courseStudentsMetrics.inProgress})
                  </button>
                </div>

                {courseStudents.length > 0 && (
                  <button
                    onClick={downloadCourseStudentsCSV}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    title="Export Enrolled Students CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Body - Scrollable Enrolled Students List */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5">
              {loadingCourseStudents ? (
                <div className="space-y-3.5">
                  <div className="py-6 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 text-purple-600 animate-spin" />
                    <p className="text-xs font-semibold text-slate-600">Loading course enrolled students...</p>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-4 bg-white rounded-2xl border border-slate-200/80 animate-pulse flex flex-col sm:flex-row gap-4"
                    >
                      <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2.5 py-1">
                        <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                        <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                        <div className="h-2 bg-slate-200 rounded-full w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : courseStudents.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs p-6">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-7 h-7 text-purple-500" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Enrolled Students</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    No learners have enrolled in this course yet. When students register or are enrolled, their progress and details will be audited here.
                  </p>
                </div>
              ) : filteredCourseStudents.length === 0 ? (
                <div className="py-14 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs p-6">
                  <Search className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <h4 className="text-sm font-bold text-slate-800">No Matching Students</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    No enrolled students match your active filter criteria.
                  </p>
                  <button
                    onClick={() => {
                      setCourseStudentSearch("");
                      setCourseStudentProgressFilter("all");
                    }}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                filteredCourseStudents.map((student) => {
                  const progressVal = Number(student.progress || 0);
                  const isCompleted = progressVal >= 100;
                  const isStarted = progressVal > 0;

                  return (
                    <div
                      key={student.enrollment}
                      className="group p-4.5 rounded-2xl border border-slate-200/90 bg-white hover:border-purple-300 hover:shadow-md transition-all flex flex-col gap-3"
                    >
                      {/* Top Row: Avatar, Identity, Status, and Action */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Student Initials Avatar */}
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-800 font-extrabold text-sm flex items-center justify-center shrink-0 border border-purple-200/60 shadow-2xs">
                            {(student.full_name || student.email || student.member || "S").charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition truncate">
                                {student.full_name || student.email || student.member}
                              </h4>
                              {Number(student.enabled) === 1 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Disabled
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 truncate">
                              <span className="truncate">{student.email || student.member}</span>
                            </div>
                          </div>
                        </div>

                        {/* Inspect Student's other enrollments button */}
                        <button
                          onClick={() => handleInspectStudentFromCourse(student.email || student.member)}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                          title="Inspect Student's Full Enrollments"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                          <span className="hidden sm:inline">Inspect Student</span>
                        </button>
                      </div>

                      {/* Middle: Progress Bar & Progress Badge */}
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium flex items-center gap-1.5">
                            {isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : isStarted ? (
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300" />
                            )}
                            Course Completion
                          </span>
                          <span
                            className={`font-bold text-xs ${
                              isCompleted
                                ? "text-emerald-700"
                                : isStarted
                                ? "text-indigo-700"
                                : "text-slate-500"
                            }`}
                          >
                            {progressVal.toFixed(1)}% {isCompleted ? "• Completed" : isStarted ? "• In Progress" : "• Not Started"}
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isCompleted
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                : isStarted
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                                : "bg-slate-300"
                            }`}
                            style={{ width: `${Math.min(Math.max(progressVal, 0), 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom Meta Row */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-slate-400">ID:</span>
                          <span className="font-semibold text-slate-600">{student.enrollment}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {student.creation
                              ? new Date(student.creation).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Enrolled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 px-6 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                Showing <span className="font-bold text-slate-900">{filteredCourseStudents.length}</span> of{" "}
                <span className="font-semibold text-slate-700">{courseStudents.length}</span> enrolled learners
              </div>
              <button
                onClick={() => setIsCourseDrawerOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-semibold text-sm">Loading Admin Console...</p>
          </div>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
