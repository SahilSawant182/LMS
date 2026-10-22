"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Plus,
  TrendingUp,
  Code2,
  GraduationCap,
  Users,
  Award,
  Medal,
  ClipboardCheck,
  UserCheck,
  Tags,
  Ticket,
  DollarSign,
  Receipt,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Settings,
  LogOut,
  HelpCircle,
  PenTool,
} from 'lucide-react';
import CreateChapterModal from '@/components/admin/CreateChapterModal';
import { logout } from '@/services/auth.services';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface NavDirectItem {
  type: 'link';
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  instructorOnly?: boolean;
}

interface NavAccordionSubItem {
  name: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  instructorOnly?: boolean;
}

interface NavAccordionGroup {
  type: 'accordion';
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  instructorOnly?: boolean;
  children: NavAccordionSubItem[];
}

type NavSectionItem = NavDirectItem | NavAccordionGroup;

interface NavSection {
  title: string;
  instructorOnly?: boolean;
  studentOnly?: boolean;
  items: NavSectionItem[];
}

export default function Sidebar({
  isOpenMobile = false,
  onCloseMobile,
  isExpanded: externalIsExpanded,
  onToggleExpand: externalOnToggleExpand,
}: SidebarProps) {
  const pathname = usePathname();
  const [internalExpanded, setInternalExpanded] = useState<boolean>(true);
  const [isInstructor, setIsInstructor] = useState<boolean>(false);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [isCreateChapterOpen, setIsCreateChapterOpen] = useState<boolean>(false);
  const flyoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Accordion state: which groups are currently expanded
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    courses: true,
    quizzes: false,
    assignments: false,
    exercises: false,
    academics: false,
    badges: false,
    evaluations: false,
    commerce: false,
  });

  const checkInstructor = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const rolesStr = localStorage.getItem('roles') || '';
      const roles = rolesStr.startsWith('[') ? JSON.parse(rolesStr) : rolesStr;
      const hasRole = Array.isArray(roles)
        ? roles.some((r: string) =>
            ['Instructor', 'Administrator', 'System Manager', 'Course Creator'].includes(r)
          )
        : ['Instructor', 'Administrator', 'System Manager', 'Course Creator'].some((r: string) =>
            rolesStr.includes(r)
          );
      if (hasRole) return true;
      if (localStorage.getItem('isInstructor') === 'true') return true;
    } catch {}
    return false;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lms_sidebar_expanded');
      if (saved !== null) {
        setInternalExpanded(saved === 'true');
      }
      setIsInstructor(checkInstructor());

      const handleAuthChange = () => {
        setIsInstructor(checkInstructor());
      };

      window.addEventListener('auth-changed', handleAuthChange);
      return () => window.removeEventListener('auth-changed', handleAuthChange);
    }
  }, []);

  // Detect current course from route for quick chapter creation modal pre-selection
  const currentCourseId = React.useMemo(() => {
    if (!pathname) return '';
    const match = pathname.match(/^\/course\/([^/]+)/);
    return match && match[1] !== 'create' ? decodeURIComponent(match[1]) : '';
  }, [pathname]);

  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalExpanded;

  const toggleExpanded = () => {
    if (externalOnToggleExpand) {
      externalOnToggleExpand();
    } else {
      const next = !internalExpanded;
      setInternalExpanded(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lms_sidebar_expanded', String(next));
        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { expanded: next } }));
      }
    }
  };

  const handleLogout = async () => {
    try {
      logout().catch((err) => console.warn("Logout API warning:", err));
    } catch (e) {}

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
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/login";
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isItemActive = (href?: string) => {
    if (!href) return false;
    if (href === '/') return pathname === '/';
    if (href.includes('?')) {
      const [base] = href.split('?');
      return pathname === base;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Auto-expand accordion if child item is active on load or path change
  useEffect(() => {
    if (!pathname) return;

    if (pathname.startsWith('/course') || pathname.startsWith('/courses') || pathname === '/progress') {
      setOpenAccordions((prev) => ({ ...prev, courses: true }));
    } else if (pathname.startsWith('/quizzes')) {
      setOpenAccordions((prev) => ({ ...prev, quizzes: true }));
    } else if (pathname.startsWith('/assignments')) {
      setOpenAccordions((prev) => ({ ...prev, assignments: true }));
    } else if (pathname.startsWith('/programming-exercises')) {
      setOpenAccordions((prev) => ({ ...prev, exercises: true }));
    } else if (pathname.startsWith('/programs') || pathname.startsWith('/batches') || pathname.startsWith('/batch')) {
      setOpenAccordions((prev) => ({ ...prev, academics: true }));
    } else if (pathname.startsWith('/badges')) {
      setOpenAccordions((prev) => ({ ...prev, badges: true }));
    } else if (pathname.startsWith('/certificate-evaluations') || pathname.startsWith('/course-evaluators')) {
      setOpenAccordions((prev) => ({ ...prev, evaluations: true }));
    } else if (pathname.startsWith('/categories') || pathname.startsWith('/coupons') || pathname.startsWith('/sales-earnings')) {
      setOpenAccordions((prev) => ({ ...prev, commerce: true }));
    }
  }, [pathname]);

  // Clean Navigation Structure: No repetitions, streamlined accordions
  const navSections: NavSection[] = [
    {
      title: 'Main Navigation',
      items: [
        {
          type: 'link',
          name: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          type: 'accordion',
          id: 'courses',
          name: 'Courses',
          icon: BookOpen,
          badge: isInstructor ? 'Manage' : undefined,
          badgeColor: 'bg-indigo-100 text-indigo-700 font-semibold',
          children: [
            {
              name: 'All Courses',
              href: '/courses',
              icon: BookOpen,
            },
            {
              name: 'Create Course',
              href: '/course/create',
              icon: PlusCircle,
              badge: 'New',
              badgeColor: 'bg-emerald-100 text-emerald-700 font-semibold',
              instructorOnly: true,
            },
            {
              name: 'Create Chapter',
              onClick: () => setIsCreateChapterOpen(true),
              icon: Plus,
              badge: 'Action',
              badgeColor: 'bg-indigo-100 text-indigo-700 font-semibold',
              instructorOnly: true,
            },
            {
              name: 'Course Progress',
              href: '/progress',
              icon: TrendingUp,
              instructorOnly: true,
            },
          ],
        },
        {
          type: 'accordion',
          id: 'academics',
          name: 'Programs & Batches',
          icon: GraduationCap,
          children: [
            {
              name: 'Academic Programs',
              href: '/programs',
              icon: GraduationCap,
            },
            {
              name: 'Batches & Cohorts',
              href: '/batches',
              icon: Users,
            },
          ],
        },
      ],
    },
    {
      title: 'Assessments',
      instructorOnly: true,
      items: [
        {
          type: 'accordion',
          id: 'quizzes',
          name: 'Quizzes',
          icon: HelpCircle,
          children: [
            {
              name: 'All Quizzes',
              href: '/quizzes',
              icon: HelpCircle,
            },
            {
              name: 'Create Quiz',
              href: '/quizzes/create',
              icon: PlusCircle,
              badge: 'New',
              badgeColor: 'bg-emerald-100 text-emerald-700 font-semibold',
              instructorOnly: true,
            },
            {
              name: 'Create Question',
              href: '/quizzes/create-question',
              icon: Plus,
              badge: 'Bank',
              badgeColor: 'bg-indigo-100 text-indigo-700 font-semibold',
              instructorOnly: true,
            },
          ],
        },
        {
          type: 'accordion',
          id: 'assignments',
          name: 'Assignments',
          icon: PenTool,
          children: [
            {
              name: 'All Assignments',
              href: '/assignments',
              icon: PenTool,
            },
            {
              name: 'Create Assignment',
              href: '/assignments/create',
              icon: PlusCircle,
              badge: 'New',
              badgeColor: 'bg-emerald-100 text-emerald-700 font-semibold',
              instructorOnly: true,
            },
          ],
        },
        {
          type: 'accordion',
          id: 'exercises',
          name: 'Programming Exercises',
          icon: Code2,
          badge: 'Code',
          badgeColor: 'bg-indigo-600 text-white font-bold',
          children: [
            {
              name: 'All Exercises',
              href: '/programming-exercises',
              icon: Code2,
            },
            {
              name: 'Create Exercise',
              href: '/programming-exercises/create',
              icon: PlusCircle,
              badge: 'New',
              badgeColor: 'bg-indigo-100 text-indigo-700 font-semibold',
              instructorOnly: true,
            },
          ],
        },
      ],
    },
    {
      title: 'Credentials & Achievements',
      items: [
        {
          type: 'link',
          name: 'Certificates',
          href: '/certificates',
          icon: Award,
        },
        {
          type: 'accordion',
          id: 'badges',
          name: 'Badges',
          icon: Medal,
          badge: 'New',
          badgeColor: 'bg-gradient-to-r from-amber-500 to-rose-500 text-white',
          children: [
            {
              name: 'All Badges',
              href: '/badges',
              icon: Medal,
            },
            {
              name: 'Create Badge',
              href: '/badges/create',
              icon: PlusCircle,
              badge: 'Action',
              badgeColor: 'bg-indigo-100 text-indigo-700 font-semibold',
              instructorOnly: true,
            },
          ],
        },
      ],
    },
    {
      title: 'Instructor Management',
      instructorOnly: true,
      items: [
        {
          type: 'accordion',
          id: 'evaluations',
          name: 'Evaluations & Staff',
          icon: ClipboardCheck,
          instructorOnly: true,
          children: [
            {
              name: 'Evaluations',
              href: '/certificate-evaluations',
              icon: ClipboardCheck,
              instructorOnly: true,
            },
            {
              name: 'Course Evaluators',
              href: '/course-evaluators',
              icon: UserCheck,
              badge: 'Staff',
              badgeColor: 'bg-violet-100 text-violet-700 font-semibold',
              instructorOnly: true,
            },
          ],
        },
        {
          type: 'accordion',
          id: 'commerce',
          name: 'Admin & Finance',
          icon: DollarSign,
          instructorOnly: true,
          children: [
            {
              name: 'Categories',
              href: '/categories',
              icon: Tags,
              instructorOnly: true,
            },
            {
              name: 'Coupons & Discounts',
              href: '/coupons',
              icon: Ticket,
              badge: 'Promo',
              badgeColor: 'bg-emerald-100 text-emerald-700 font-semibold',
              instructorOnly: true,
            },
            {
              name: 'Sales & Earnings',
              href: '/sales-earnings',
              icon: DollarSign,
              badge: 'Finance',
              badgeColor: 'bg-emerald-100 text-emerald-700 font-semibold',
              instructorOnly: true,
            },
          ],
        },
        {
          type: 'link',
          name: 'LMS Settings',
          href: '/settings',
          icon: Settings,
          badge: 'Admin',
          badgeColor: 'bg-indigo-100 text-indigo-700 font-semibold',
          instructorOnly: true,
        },
      ],
    },
    {
      title: 'Learner Services',
      studentOnly: true,
      items: [
        {
          type: 'link',
          name: 'My Enrollments',
          href: '/enrollments',
          icon: BookOpen,
        },
        {
          type: 'link',
          name: 'My Payments',
          href: '/my-payments',
          icon: Receipt,
        },
      ],
    },
  ];

  const handleFlyoutMouseEnter = (groupId: string) => {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current);
      flyoutTimerRef.current = null;
    }
    setHoveredGroupId(groupId);
  };

  const handleFlyoutMouseLeave = () => {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current);
    }
    flyoutTimerRef.current = setTimeout(() => {
      setHoveredGroupId(null);
    }, 150);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 bg-white border-r border-slate-200/80 shadow-sm z-40 transition-all duration-300 flex flex-col ${
          isExpanded ? 'w-64' : 'w-20'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Sidebar Header with StrideNex Logo */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center group py-2">
            {isExpanded ? (
              <img
                src="/images/Logo.png"
                alt="StrideNex Logo"
                className="h-8 w-auto max-w-[155px] object-contain transition-opacity duration-200 group-hover:opacity-85"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/20 shrink-0 transition-opacity duration-200 group-hover:opacity-90">
                S
              </div>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          {navSections.map((section, sIdx) => {
            if (section.instructorOnly && !isInstructor) return null;
            if (section.studentOnly && isInstructor) return null;

            // Filter items by instructor rights
            const visibleItems = section.items.filter((item) => {
              if (item.instructorOnly && !isInstructor) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title || sIdx} className="mb-5">
                {isExpanded && (
                  <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </div>
                )}

                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;

                    // DIRECT LINK
                    if (item.type === 'link') {
                      const active = isItemActive(item.href);

                      return (
                        <div
                          key={item.href}
                          className="relative"
                          onMouseEnter={() => !isExpanded && handleFlyoutMouseEnter(item.name)}
                          onMouseLeave={handleFlyoutMouseLeave}
                        >
                          <Link
                            href={item.href}
                            onClick={() => onCloseMobile?.()}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                              active
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20'
                                : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70'
                            } ${!isExpanded ? 'justify-center' : ''}`}
                          >
                            <div
                              className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>

                            {isExpanded && (
                              <div className="flex items-center justify-between flex-1 truncate">
                                <span className="truncate">{item.name}</span>
                                {item.badge && (
                                  <span
                                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                      active
                                        ? 'bg-white/20 text-white'
                                        : item.badgeColor || 'bg-indigo-100 text-indigo-700'
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Active indicator bar on collapsed */}
                            {!isExpanded && active && (
                              <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-full" />
                            )}
                          </Link>

                          {/* Tooltip for collapsed single item */}
                          {!isExpanded && hoveredGroupId === item.name && (
                            <div className="fixed left-20 ml-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none flex items-center gap-2 animate-fade-in-up">
                              <span>{item.name}</span>
                              {item.badge && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500 text-white">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // ACCORDION GROUP
                    const visibleChildren = item.children.filter(
                      (child) => !child.instructorOnly || isInstructor
                    );
                    const isGroupActive = visibleChildren.some(
                      (child) => child.href && isItemActive(child.href)
                    );
                    const isOpen = Boolean(openAccordions[item.id]);

                    return (
                      <div
                        key={item.id}
                        className="relative"
                        onMouseEnter={() => !isExpanded && handleFlyoutMouseEnter(item.id)}
                        onMouseLeave={handleFlyoutMouseLeave}
                      >
                        {/* Parent Accordion Header */}
                        {visibleChildren.length <= 1 ? (
                          <Link
                            href={visibleChildren[0]?.href || '#'}
                            onClick={() => onCloseMobile?.()}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                              isGroupActive
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20'
                                : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70'
                            } ${!isExpanded ? 'justify-center' : ''}`}
                          >
                            <div
                              className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                isGroupActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>

                            {isExpanded && (
                              <div className="flex items-center justify-between flex-1 truncate">
                                <span className="truncate">{item.name}</span>
                                {item.badge && (
                                  <span
                                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                      isGroupActive
                                        ? 'bg-white/20 text-white'
                                        : item.badgeColor || 'bg-indigo-100 text-indigo-700'
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            )}

                            {!isExpanded && isGroupActive && (
                              <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-full" />
                            )}
                          </Link>
                        ) : (
                          <div
                            className={`w-full flex items-center justify-between rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                              isGroupActive && !isOpen
                                ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100/80'
                                : isGroupActive && isOpen
                                ? 'bg-indigo-50/60 text-indigo-700 font-semibold'
                                : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/70'
                            }`}
                          >
                            <Link
                              href={visibleChildren[0]?.href || '#'}
                              onClick={() => onCloseMobile?.()}
                              className={`flex items-center gap-3 px-3 py-2.5 flex-1 truncate ${
                                !isExpanded ? 'justify-center' : ''
                              }`}
                            >
                              <div
                                className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                  isGroupActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-600'
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>

                              {isExpanded && (
                                <div className="flex items-center justify-between flex-1 truncate">
                                  <span className="truncate">{item.name}</span>
                                  {item.badge && (
                                    <span
                                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                        item.badgeColor || 'bg-indigo-100 text-indigo-700'
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                              )}
                            </Link>

                            {isExpanded && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAccordion(item.id);
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors mr-1 rounded-lg hover:bg-slate-200/50"
                                title={isOpen ? 'Collapse submenu' : 'Expand submenu'}
                              >
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isOpen ? 'rotate-180 text-indigo-600' : ''
                                  }`}
                                />
                              </button>
                            )}

                            {!isExpanded && isGroupActive && (
                              <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-full" />
                            )}
                          </div>
                        )}

                        {/* Accordion Sub-items (When Expanded) */}
                        {isExpanded && isOpen && (
                          <div className="ml-5 pl-3 border-l-2 border-indigo-100 my-1 space-y-1">
                            {visibleChildren.map((child, cIdx) => {
                              const active = child.href ? isItemActive(child.href) : false;
                              const SubIcon = child.icon;

                              if (child.onClick) {
                                return (
                                  <button
                                    key={child.name || cIdx}
                                    type="button"
                                    onClick={() => {
                                      onCloseMobile?.();
                                      child.onClick?.();
                                    }}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/80 transition-colors text-left group"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      {SubIcon ? (
                                        <SubIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                      ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform" />
                                      )}
                                      <span className="truncate">{child.name}</span>
                                    </div>
                                    {child.badge && (
                                      <span
                                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                          child.badgeColor || 'bg-indigo-100 text-indigo-700'
                                        }`}
                                      >
                                        {child.badge}
                                      </span>
                                    )}
                                  </button>
                                );
                              }

                              return (
                                <Link
                                  key={child.href || cIdx}
                                  href={child.href || '#'}
                                  onClick={() => onCloseMobile?.()}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors group ${
                                    active
                                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                                      : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/70'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    {SubIcon ? (
                                      <SubIcon
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'
                                        }`}
                                      />
                                    ) : (
                                      <div
                                        className={`w-1.5 h-1.5 rounded-full transition-transform ${
                                          active
                                            ? 'bg-indigo-600 scale-125'
                                            : 'bg-slate-300 group-hover:bg-indigo-400'
                                        }`}
                                      />
                                    )}
                                    <span className="truncate">{child.name}</span>
                                  </div>

                                  {child.badge && (
                                    <span
                                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                        active
                                          ? 'bg-indigo-600 text-white'
                                          : child.badgeColor || 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {child.badge}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}

                        {/* Collapsed Mode Flyout Dropdown */}
                        {!isExpanded && hoveredGroupId === item.id && (
                          <div
                            onMouseEnter={() => handleFlyoutMouseEnter(item.id)}
                            onMouseLeave={handleFlyoutMouseLeave}
                            className="fixed left-20 ml-2 py-2 px-3 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 z-50 min-w-[210px] animate-fade-in-up pointer-events-auto"
                          >
                            <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-slate-100 mb-1">
                              <span className="text-xs font-bold text-slate-900">{item.name}</span>
                              {item.badge && (
                                <span
                                  className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                    item.badgeColor || 'bg-indigo-100 text-indigo-700'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>

                            <div className="space-y-0.5">
                              {visibleChildren.map((child, cIdx) => {
                                const active = child.href ? isItemActive(child.href) : false;
                                const SubIcon = child.icon;

                                if (child.onClick) {
                                  return (
                                    <button
                                      key={child.name || cIdx}
                                      type="button"
                                      onClick={() => {
                                        setHoveredGroupId(null);
                                        child.onClick?.();
                                      }}
                                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors text-left"
                                    >
                                      <div className="flex items-center gap-2">
                                        {SubIcon && <SubIcon className="w-3.5 h-3.5" />}
                                        <span>{child.name}</span>
                                      </div>
                                      {child.badge && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                          {child.badge}
                                        </span>
                                      )}
                                    </button>
                                  );
                                }

                                return (
                                  <Link
                                    key={child.href || cIdx}
                                    href={child.href || '#'}
                                    onClick={() => setHoveredGroupId(null)}
                                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                                      active
                                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                                        : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {SubIcon && <SubIcon className="w-3.5 h-3.5 text-slate-400" />}
                                      <span>{child.name}</span>
                                    </div>
                                    {child.badge && (
                                      <span
                                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                          active
                                            ? 'bg-indigo-600 text-white'
                                            : child.badgeColor || 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {child.badge}
                                      </span>
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quick Action Card for Instructors */}
          {isExpanded && isInstructor && (
            <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 border border-indigo-100 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Course Builder
                </span>
                <span className="text-[9px] uppercase font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded">
                  Quick
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
                Add chapters or start building a new curriculum effortlessly.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsCreateChapterOpen(true)}
                  className="py-1.5 px-2 text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-50/80 border border-indigo-200/80 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  + Chapter
                </button>
                <Link
                  href="/course/create"
                  onClick={() => onCloseMobile?.()}
                  className="py-1.5 px-2 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs shadow-indigo-600/20"
                >
                  <PlusCircle className="w-3 h-3" />
                  + Course
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer / Collapse Toggle */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          {isExpanded ? (
            <div className="flex items-center gap-2 truncate flex-1 px-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                {isInstructor ? 'INS' : 'LRN'}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-semibold text-slate-800 leading-none truncate">
                  {isInstructor ? 'Instructor Portal' : 'Student Portal'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">StrideNex LMS</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                {isInstructor ? 'INS' : 'LRN'}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Desktop collapse toggle button */}
          <button
            onClick={toggleExpanded}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0 ml-1"
            title={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Quick Create Chapter Modal */}
      <CreateChapterModal
        isOpen={isCreateChapterOpen}
        onClose={() => setIsCreateChapterOpen(false)}
        defaultCourseId={currentCourseId}
      />
    </>
  );
}
