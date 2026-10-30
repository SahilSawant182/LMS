"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Menu, LogOut, User, Bell, PanelLeft, Medal, Sparkles, Receipt, CreditCard, UserCheck, Wallet, TrendingUp, Settings, ClipboardCheck, BookOpen, Users, Tag, X, Loader2, ArrowRight, GraduationCap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { logout } from '@/services/auth.services';
import { getCourses, getBatches, getProgramList } from '@/services/lms.services';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userImage, setUserImage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateSidebarWidth = (expanded: boolean) => {
    if (typeof window !== "undefined") {
      document.body.classList.add("has-sidebar");
      document.documentElement.style.setProperty("--sidebar-width", expanded ? "16rem" : "5rem");
    }
  };

  const checkAuth = () => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("apiKey");
      const userEmail = localStorage.getItem("userEmail") || localStorage.getItem("user");
      const fullName = localStorage.getItem("fullName");

      if (apiKey || userEmail) {
        setUserName(fullName || userEmail?.split("@")[0] || "Learner");
        setUserEmail(userEmail || "");
        const userImg = localStorage.getItem("user_image") || localStorage.getItem("userImage") || "";
        setUserImage(userImg);
        setIsAuthenticated(true);
        let hasInstructorRole = false;
        try {
          const rolesStr = localStorage.getItem("roles");
          if (rolesStr) {
            const parsedRoles = JSON.parse(rolesStr);
            if (Array.isArray(parsedRoles)) {
              hasInstructorRole = parsedRoles.some((r: string) =>
                ["Instructor", "Course Creator", "Moderator", "Administrator", "System Manager"].includes(r)
              );
            }
          }
        } catch (e) {
          const roles = localStorage.getItem("roles");
          hasInstructorRole = roles?.includes("Instructor") || false;
        }
        setIsInstructor(hasInstructorRole);
      } else {
        setIsAuthenticated(false);
        setUserImage("");
        setIsInstructor(false);
      }
    }
  };

  useEffect(() => {
    checkAuth();
    if (typeof window !== "undefined") {
      // Check if current route is a particular lesson page (/course/[courseId]/[chapterId]/[lessonId])
      const isLessonRoute = pathname ? /^\/course\/[^/]+\/[^/]+\/[^/]+(?:\/.*)?$/.test(pathname) : false;

      const saved = localStorage.getItem("lms_sidebar_expanded");
      // If user opens a particular lesson, automatically shrink the sidebar (expanded = false)
      const expanded = isLessonRoute ? false : (saved !== null ? saved === "true" : true);
      setIsSidebarExpanded(expanded);
      updateSidebarWidth(expanded);

      const handleSidebarEvent = (e: any) => {
        if (e.detail?.expanded !== undefined) {
          setIsSidebarExpanded(e.detail.expanded);
          updateSidebarWidth(e.detail.expanded);
        }
      };

      window.addEventListener("sidebar-toggle", handleSidebarEvent);
      window.addEventListener("auth-changed", checkAuth);
      return () => {
        document.body.classList.remove("has-sidebar");
        document.documentElement.style.removeProperty("--sidebar-width");
        window.removeEventListener("sidebar-toggle", handleSidebarEvent);
        window.removeEventListener("auth-changed", checkAuth);
      };
    }
  }, [pathname]);

  const toggleSidebar = () => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 1024) {
        setIsMobileSidebarOpen(prev => !prev);
      } else {
        const next = !isSidebarExpanded;
        setIsSidebarExpanded(next);
        localStorage.setItem("lms_sidebar_expanded", String(next));
        updateSidebarWidth(next);
        window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: { expanded: next } }));
      }
    }
  };

  const handleLogout = async () => {
    try {
      logout().catch((err) => console.warn("Logout API warning:", err));
    } catch (e) { }

    // Immediately clear all credentials and storage
    localStorage.removeItem("apiKey");
    localStorage.removeItem("apiSecret");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("fullName");
    localStorage.removeItem("roles");
    localStorage.removeItem("isInstructor");
    localStorage.clear();
    sessionStorage.clear();

    document.body.classList.remove("has-sidebar");
    document.documentElement.style.removeProperty("--sidebar-width");
    setIsAuthenticated(false);
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/login";
  };

  // Load courses, batches, and programs for search
  const loadSearchData = async () => {
    if (dataFetched || searchLoading) return;
    setSearchLoading(true);
    try {
      const [coursesRes, batchesRes, programsRes] = await Promise.allSettled([
        getCourses({ all: true, user: "" }),
        getBatches({ all: true, user: "" }),
        getProgramList({ all: true, user: "" })
      ]);

      if (coursesRes.status === 'fulfilled') {
        const cVal = coursesRes.value;
        const cList = Array.isArray(cVal) ? cVal : ((cVal as any)?.message || (cVal as any)?.data || []);
        setAllCourses(Array.isArray(cList) ? cList : []);
      }

      if (batchesRes.status === 'fulfilled') {
        const bVal = batchesRes.value;
        const bList = Array.isArray(bVal) ? bVal : ((bVal as any)?.message?.data || (bVal as any)?.data?.message || (bVal as any)?.data || (bVal as any)?.message || []);
        setAllBatches(Array.isArray(bList) ? bList : []);
      }

      if (programsRes.status === 'fulfilled') {
        const pVal = programsRes.value;
        const pList = Array.isArray(pVal) ? pVal : ((pVal as any)?.message?.data || (pVal as any)?.data?.message || (pVal as any)?.data || (pVal as any)?.message || []);
        setAllPrograms(Array.isArray(pList) ? pList : []);
      }

      setDataFetched(true);
    } catch (err) {
      console.warn("Failed to load search data:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Pre-load search data on mount
  useEffect(() => {
    loadSearchData();
  }, []);

  // Close search on route change
  useEffect(() => {
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
  }, [pathname]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        (!mobileSearchContainerRef.current || !mobileSearchContainerRef.current.contains(target))
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute matched courses, batches, programs, and skills
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return { courses: [], batches: [], programs: [], skills: [], total: 0 };
    }

    // 1. Matching courses
    const matchingCourses = allCourses.filter((c: any) => {
      const title = (c.title || c.course_name || "").toLowerCase();
      const name = (c.name || "").toLowerCase();
      const tags = (c.tags || "").toLowerCase();
      const cat = (c.category || "").toLowerCase();
      const desc = (c.short_introduction || c.description || "").toLowerCase();
      return title.includes(q) || name.includes(q) || tags.includes(q) || cat.includes(q) || desc.includes(q);
    }).slice(0, 5);

    // 2. Matching batches
    const matchingBatches = allBatches.filter((b: any) => {
      const title = (b.title || b.batch_name || "").toLowerCase();
      const name = (b.name || "").toLowerCase();
      const cat = (b.category || "").toLowerCase();
      const desc = (b.description || "").toLowerCase();
      return title.includes(q) || name.includes(q) || cat.includes(q) || desc.includes(q);
    }).slice(0, 5);

    // 3. Matching programs
    const matchingPrograms = allPrograms.filter((p: any) => {
      const title = (p.title || p.name || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      const desc = (p.short_introduction || p.description || "").toLowerCase();
      return title.includes(q) || name.includes(q) || desc.includes(q);
    }).slice(0, 5);

    // 4. Matching skills / tags
    const skillCountMap = new Map<string, number>();
    allCourses.forEach((c: any) => {
      if (c.tags && typeof c.tags === 'string') {
        c.tags.split(',').forEach((t: string) => {
          const tag = t.trim();
          if (tag) {
            skillCountMap.set(tag, (skillCountMap.get(tag) || 0) + 1);
          }
        });
      }
      if (c.category && typeof c.category === 'string') {
        const cat = c.category.trim();
        if (cat) {
          skillCountMap.set(cat, (skillCountMap.get(cat) || 0) + 1);
        }
      }
    });

    const matchingSkills: { name: string; count: number }[] = [];
    skillCountMap.forEach((count, name) => {
      if (name.toLowerCase().includes(q)) {
        matchingSkills.push({ name, count });
      }
    });
    matchingSkills.sort((a, b) => b.count - a.count);
    const topSkills = matchingSkills.slice(0, 5);

    const total = matchingCourses.length + matchingBatches.length + matchingPrograms.length + topSkills.length;
    return {
      courses: matchingCourses,
      batches: matchingBatches,
      programs: matchingPrograms,
      skills: topSkills,
      total
    };
  }, [searchQuery, allCourses, allBatches, allPrograms]);

  return (
    <>
      {/* Sidebar Component */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggleExpand={toggleSidebar}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Top Navbar */}
      <nav className="h-16 sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between bg-white border-b border-slate-200 text-slate-800 shadow-sm transition-colors duration-300">
        {/* Left Section: Sidebar Toggle & "Back to StrideNex" Button */}
        <div className="flex items-center gap-3">
          {/* Mobile / Sidebar Toggle (w-5 h-5 in p-2 rounded-lg) */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* "Back to StrideNex" Button */}
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Back to StrideNex</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>

            {/* Middle: Search Bar with Dropdown Results */}
            <div className="hidden md:flex flex-1 max-w-md mx-6 relative" ref={searchContainerRef}>
              <div className="w-full relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  {searchLoading ? (
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  )}
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    loadSearchData();
                    if (searchQuery.trim()) setIsSearchOpen(true);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!isSearchOpen) setIsSearchOpen(true);
                    if (!dataFetched) loadSearchData();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsSearchOpen(false);
                    } else if (e.key === "Enter" && searchQuery.trim()) {
                      if (searchResults.courses.length > 0) {
                        router.push(`/course/${searchResults.courses[0].name}`);
                        setIsSearchOpen(false);
                      } else if (searchResults.batches.length > 0) {
                        router.push(`/batch/${searchResults.batches[0].name}`);
                        setIsSearchOpen(false);
                      } else if (searchResults.programs.length > 0) {
                        router.push(`/programs/${encodeURIComponent(searchResults.programs[0].title || searchResults.programs[0].name)}`);
                        setIsSearchOpen(false);
                      } else {
                        router.push(`/courses`);
                        setIsSearchOpen(false);
                      }
                    }
                  }}
                  placeholder="Search courses, batches, programs, skills..."
                  className="w-full pl-10 pr-9 py-2 bg-slate-100 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-800 placeholder:text-slate-400 transition-all duration-300 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Floating Search Results Dropdown */}
              {isSearchOpen && searchQuery.trim() && (
                <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 max-h-[75vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150">
                  {searchLoading ? (
                    <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      Searching courses, batches, programs, and skills...
                    </div>
                  ) : searchResults.total === 0 ? (
                    <div className="p-6 text-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">No results found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        No courses, batches, programs, or skills match &ldquo;{searchQuery}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Courses Section */}
                      {searchResults.courses.length > 0 && (
                        <div>
                          <div className="px-4 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Courses
                            </span>
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                              {searchResults.courses.length}
                            </span>
                          </div>
                          <div className="mt-1 divide-y divide-slate-50">
                            {searchResults.courses.map((course: any) => (
                              <Link
                                key={course.name}
                                href={`/course/${course.name}`}
                                onClick={() => setIsSearchOpen(false)}
                                className="px-4 py-2 hover:bg-indigo-50/50 flex items-center justify-between group/item transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                    <BookOpen className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 group-hover/item:text-indigo-600 truncate transition-colors">
                                      {course.title || course.name}
                                    </p>
                                    {course.tags && (
                                      <p className="text-[10px] text-slate-400 truncate">
                                        Skills: {course.tags}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover/item:text-indigo-500 group-hover/item:translate-x-0.5 transition-all flex-shrink-0" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Batches Section */}
                      {searchResults.batches.length > 0 && (
                        <div className="pt-1 border-t border-slate-100">
                          <div className="px-4 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-emerald-500" /> Batches
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              {searchResults.batches.length}
                            </span>
                          </div>
                          <div className="mt-1 divide-y divide-slate-50">
                            {searchResults.batches.map((batch: any) => (
                              <Link
                                key={batch.name}
                                href={`/batch/${batch.name}`}
                                onClick={() => setIsSearchOpen(false)}
                                className="px-4 py-2 hover:bg-emerald-50/50 flex items-center justify-between group/item transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                    <Users className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 group-hover/item:text-emerald-600 truncate transition-colors">
                                      {batch.title || batch.batch_name || batch.name}
                                    </p>
                                    {batch.category && (
                                      <p className="text-[10px] text-slate-400 truncate">
                                        {batch.category}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover/item:text-emerald-500 group-hover/item:translate-x-0.5 transition-all flex-shrink-0" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Programs Section */}
                      {searchResults.programs.length > 0 && (
                        <div className="pt-1 border-t border-slate-100">
                          <div className="px-4 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-violet-500" /> Programs
                            </span>
                            <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                              {searchResults.programs.length}
                            </span>
                          </div>
                          <div className="mt-1 divide-y divide-slate-50">
                            {searchResults.programs.map((prog: any) => (
                              <Link
                                key={prog.name || prog.title}
                                href={`/programs/${encodeURIComponent(prog.title || prog.name)}`}
                                onClick={() => setIsSearchOpen(false)}
                                className="px-4 py-2 hover:bg-violet-50/50 flex items-center justify-between group/item transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
                                    <GraduationCap className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 group-hover/item:text-violet-600 truncate transition-colors">
                                      {prog.title || prog.name}
                                    </p>
                                    {prog.course_count !== undefined && (
                                      <p className="text-[10px] text-slate-400 truncate">
                                        {prog.course_count} {prog.course_count === 1 ? 'course' : 'courses'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover/item:text-violet-500 group-hover/item:translate-x-0.5 transition-all flex-shrink-0" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Skills Section */}
                      {searchResults.skills.length > 0 && (
                        <div className="pt-1 border-t border-slate-100">
                          <div className="px-4 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-amber-500" /> Skills & Tags
                            </span>
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              {searchResults.skills.length}
                            </span>
                          </div>
                          <div className="mt-1 px-4 py-1.5 flex flex-wrap gap-1.5">
                            {searchResults.skills.map((skill) => (
                              <button
                                key={skill.name}
                                type="button"
                                onClick={() => {
                                  setSearchQuery(skill.name);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-medium border border-amber-200/60 transition-colors"
                              >
                                <span>{skill.name}</span>
                                <span className="text-[9px] bg-white/80 px-1 rounded text-amber-700 font-bold">
                                  {skill.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

        {/* Right Section: Notification Bell & Profile Pill */}
        <div className="flex items-center gap-3">
          {/* Mobile search toggle */}
          <button
            onClick={() => {
              setIsMobileSearchOpen(!isMobileSearchOpen);
              if (!isMobileSearchOpen) {
                loadSearchData();
              }
            }}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-full transition-colors cursor-pointer md:hidden"
            aria-label="Toggle Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {isAuthenticated ? (
            <>
              {/* Exact StrideNex Notification Bell */}
              <NotificationBell />

              {/* Exact StrideNex User Profile Pill */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-full border bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {/* 32px Avatar Circle */}
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white font-medium text-sm shrink-0 bg-gradient-to-tr from-amber-500 to-orange-500">
                    {userImage ? (
                      <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                      userName ? userName.charAt(0).toUpperCase() : "U"
                    )}
                  </div>

                  {/* Name and Role Icon */}
                  <span className="text-sm font-medium hidden sm:flex items-center gap-2 text-slate-700">
                    <span className="truncate max-w-[120px]">{userName || "Learner"}</span>
                    <GraduationCap className="w-5 h-5 text-orange-500" />
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu (Exact StrideNex dimensions) */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 z-50 p-2 space-y-1">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs text-slate-400 font-medium">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{userEmail || userName}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      My Dashboard
                    </Link>
                    <Link
                      href="/student/dashboard"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      Portal Dashboard
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50/50 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-xs font-semibold bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Search Bar Expandable Drawer */}
        {isMobileSearchOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 border-b border-slate-200 bg-white px-4 py-3 shadow-md z-50" ref={mobileSearchContainerRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {searchLoading ? (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <input
                type="text"
                value={searchQuery}
                autoFocus
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!dataFetched) loadSearchData();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsMobileSearchOpen(false);
                  } else if (e.key === "Enter" && searchQuery.trim()) {
                    if (searchResults.courses.length > 0) {
                      router.push(`/course/${searchResults.courses[0].name}`);
                      setIsMobileSearchOpen(false);
                    } else if (searchResults.batches.length > 0) {
                      router.push(`/batch/${searchResults.batches[0].name}`);
                      setIsMobileSearchOpen(false);
                    } else if (searchResults.programs.length > 0) {
                      router.push(`/programs/${encodeURIComponent(searchResults.programs[0].title || searchResults.programs[0].name)}`);
                      setIsMobileSearchOpen(false);
                    } else {
                      router.push(`/courses`);
                      setIsMobileSearchOpen(false);
                    }
                  }
                }}
                placeholder="Search courses, batches, programs, skills..."
                className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile Results */}
            {searchQuery.trim() && (
              <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-slate-50 border border-slate-100 rounded-xl bg-white shadow-lg p-2">
                {searchLoading ? (
                  <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    Searching...
                  </div>
                ) : searchResults.total === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No results for &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.courses.map((course: any) => (
                      <Link
                        key={course.name}
                        href={`/course/${course.name}`}
                        onClick={() => setIsMobileSearchOpen(false)}
                        className="block px-2 py-1.5 text-xs font-semibold text-slate-800 hover:text-indigo-600 truncate"
                      >
                        🎓 {course.title || course.name}
                      </Link>
                    ))}
                    {searchResults.batches.map((batch: any) => (
                      <Link
                        key={batch.name}
                        href={`/batch/${batch.name}`}
                        onClick={() => setIsMobileSearchOpen(false)}
                        className="block px-2 py-1.5 text-xs font-semibold text-slate-800 hover:text-emerald-600 truncate"
                      >
                        👥 {batch.title || batch.batch_name || batch.name}
                      </Link>
                    ))}
                    {searchResults.programs.map((prog: any) => (
                      <Link
                        key={prog.name || prog.title}
                        href={`/programs/${encodeURIComponent(prog.title || prog.name)}`}
                        onClick={() => setIsMobileSearchOpen(false)}
                        className="block px-2 py-1.5 text-xs font-semibold text-slate-800 hover:text-violet-600 truncate"
                      >
                        📜 {prog.title || prog.name}
                      </Link>
                    ))}
                    {searchResults.skills.map((skill) => (
                      <button
                        key={skill.name}
                        type="button"
                        onClick={() => {
                          setSearchQuery(skill.name);
                        }}
                        className="inline-block m-1 px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[11px] font-medium"
                      >
                        🏷️ {skill.name} ({skill.count})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
