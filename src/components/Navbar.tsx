"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Menu, LogOut, User, Bell, PanelLeft, Medal, Sparkles, Receipt, CreditCard, UserCheck, Wallet, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { logout } from '@/services/auth.services';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (window.confirm("Are you sure you want to log out?")) {
      try {
        await logout();
      } catch (err) {
        console.error("Logout API failed:", err);
      }
      localStorage.clear();
      document.body.classList.remove("has-sidebar");
      document.documentElement.style.removeProperty("--sidebar-width");
      setIsAuthenticated(false);
      window.dispatchEvent(new Event("auth-changed"));
      router.push("/login");
    }
  };

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
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs text-gray-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            {/* Left side: Sidebar Toggle & Quick Explorer */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-xl transition-all duration-200 border border-slate-200/70 shadow-2xs group"
                title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                aria-label="Toggle Sidebar Navigation"
              >
                <PanelLeft className="w-5 h-5 group-hover:scale-105 transition-transform" />
              </button>

              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
              >
                Dashboard
              </Link>

              <Link
                href="/badges"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-amber-800 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/70 hover:shadow-xs transition-all duration-200 hover:border-amber-300"
              >
                <Medal className="w-3.5 h-3.5 text-amber-500" />
                <span>Badges</span>
                <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase">
                  New
                </span>
              </Link>
            </div>

            {/* Middle: Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-6 relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search courses, skills, batches..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200/80 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-xs font-medium transition-all duration-300 shadow-2xs focus:bg-white"
              />
            </div>

            {/* Right side: Streamlined Clean Actions & Auth */}
            <div className="flex items-center space-x-3 text-sm font-semibold whitespace-nowrap flex-shrink-0">
              {isInstructor && (
                <Link
                  href="/badges/create"
                  className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Create Badge</span>
                </Link>
              )}

              {isAuthenticated ? (
                <div className="flex items-center space-x-3 relative">
                  <NotificationBell />

                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-full py-1 px-1.5 pr-3 transition-all duration-200"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200">
                        {(userName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 max-w-[100px] truncate">
                        {userName || 'User'}
                      </span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-fade-in-up origin-top-right">
                        {userEmail && (
                          <div className="px-4 py-2.5 border-b border-gray-100">
                            <p className="text-[11px] text-gray-400 font-medium">Signed in as</p>
                            <p className="text-xs font-bold text-gray-900 truncate">{userEmail}</p>
                            {isInstructor && (
                              <span className="inline-block mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                Instructor
                              </span>
                            )}
                          </div>
                        )}

                        <div className="py-1 border-b border-gray-100">
                          <Link
                            href="/badges"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center justify-between px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Medal className="w-4 h-4 text-amber-500" />
                              Badges & Achievements
                            </div>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">New</span>
                          </Link>
                          {isInstructor && (
                            <>
                              <Link
                                href="/coupons"
                                onClick={() => setIsDropdownOpen(false)}
                                className="flex items-center gap-2 px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors font-semibold"
                              >
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                                Coupons & Discounts
                              </Link>
                              <Link
                                href="/badges/create"
                                onClick={() => setIsDropdownOpen(false)}
                                className="flex items-center gap-2 px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors font-semibold"
                              >
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                Create Badge
                              </Link>
                              <Link
                                href="/course-evaluators"
                                onClick={() => setIsDropdownOpen(false)}
                                className="flex items-center gap-2 px-4 py-2 text-xs text-violet-700 hover:bg-violet-50 transition-colors font-semibold"
                              >
                                <UserCheck className="w-4 h-4 text-violet-600" />
                                Course Evaluators
                              </Link>
                            </>
                          )}
                          <Link
                            href="/dashboard"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            My Dashboard
                          </Link>
                          <Link
                            href="/plans"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                            Plans
                          </Link>
                          {isInstructor ? (
                            <Link
                              href="/sales-earnings"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors font-medium"
                            >
                              <TrendingUp className="w-4 h-4 mr-2 text-emerald-600" />
                              Sales & Earnings
                            </Link>
                          ) : (
                            <Link
                              href="/my-payments"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Receipt className="w-4 h-4 mr-2 text-gray-400" />
                              My Payments
                            </Link>
                          )}
                          <Link
                            href="/profile"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            Profile
                          </Link>
                        </div>

                        <div className="py-1">
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              handleLogout();
                            }}
                            className="w-full flex items-center px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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

              {/* Mobile sidebar opener */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 text-gray-600 hover:text-indigo-600 bg-gray-50 rounded-xl focus:outline-none lg:hidden"
                aria-label="Open Mobile Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
