"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Award,
  Medal,
  FileText,
  HelpCircle,
  TrendingUp,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PlusCircle,
  BookOpen,
  X,
  Ticket,
  Percent,
  Tags
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  instructorOnly?: boolean;
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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lms_sidebar_expanded');
      if (saved !== null) {
        setInternalExpanded(saved === 'true');
      }
      const roles = localStorage.getItem('roles') || '';
      setIsInstructor(roles.includes('Instructor'));

      const handleAuthChange = () => {
        const updatedRoles = localStorage.getItem('roles') || '';
        setIsInstructor(updatedRoles.includes('Instructor'));
      };

      window.addEventListener('auth-changed', handleAuthChange);
      return () => window.removeEventListener('auth-changed', handleAuthChange);
    }
  }, []);

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

  const mainNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Explore Courses', href: '/', icon: BookOpen },
    { name: 'Programs', href: '/programs', icon: GraduationCap },
    { name: 'Batches', href: '/batches', icon: Users },
  ];

  const achievementNavItems: NavItem[] = [
    { 
      name: 'Badges', 
      href: '/badges', 
      icon: Medal, 
      badge: 'New', 
      badgeColor: 'bg-gradient-to-r from-amber-500 to-rose-500 text-white' 
    },
    { name: 'Certificates', href: '/certificates', icon: Award },
    { name: 'Assignments', href: '/assignments', icon: FileText },
    { name: 'Quizzes', href: '/quizzes', icon: HelpCircle },
  ];

  const instructorNavItems: NavItem[] = [
    { 
      name: 'Categories', 
      href: '/categories', 
      icon: Tags, 
      badge: 'Manage', 
      badgeColor: 'bg-emerald-100 text-emerald-700 font-semibold',
      instructorOnly: true 
    },
    { 
      name: 'Coupons', 
      href: '/coupons', 
      icon: Ticket, 
      badge: 'Promo', 
      badgeColor: 'bg-emerald-100 text-emerald-700 font-semibold',
      instructorOnly: true 
    },
    { 
      name: 'Create Badge', 
      href: '/badges/create', 
      icon: PlusCircle, 
      badge: 'Action', 
      badgeColor: 'bg-indigo-100 text-indigo-700 font-semibold',
      instructorOnly: true 
    },
    { 
      name: 'Course Progress', 
      href: '/progress', 
      icon: TrendingUp, 
      instructorOnly: true 
    },
    { 
      name: 'Evaluations', 
      href: '/certificate-evaluations', 
      icon: ClipboardCheck, 
      instructorOnly: true 
    },
  ];

  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const renderNavSection = (title: string, items: NavItem[]) => {
    const visibleItems = items.filter(item => !item.instructorOnly || isInstructor);
    if (visibleItems.length === 0) return null;

    return (
      <div className="mb-6">
        {isExpanded && (
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </div>
        )}
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);

            return (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  href={item.href}
                  onClick={() => onCloseMobile?.()}
                  className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
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

                  {/* Active Indicator Bar on Collapsed */}
                  {!isExpanded && active && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-full" />
                  )}
                </Link>

                {/* Floating Tooltip when Collapsed */}
                {!isExpanded && hoveredItem === item.name && (
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
          })}
        </div>
      </div>
    );
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
        } ${
          isOpenMobile
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header with StrideNex Logo */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-100">
          <Link href="/" className="flex items-center group py-2">
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
          {renderNavSection('Overview', mainNavItems)}
          {renderNavSection('Achievements & Learning', achievementNavItems)}
          {isInstructor && renderNavSection('Instructor Tools', instructorNavItems)}

          {/* Prompt card for instructors when expanded */}
          {isExpanded && isInstructor && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50/50 to-amber-50/50 border border-indigo-100/80 shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2 text-indigo-950 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Badge Studio
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Design custom achievement badges to motivate student milestones.
              </p>
              <Link
                href="/badges/create"
                onClick={() => onCloseMobile?.()}
                className="inline-flex items-center justify-center w-full py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                New Badge
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar Footer / Collapse Toggle */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          {isExpanded ? (
            <div className="flex items-center gap-2.5 truncate flex-1 px-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                {isInstructor ? 'INS' : 'LRN'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 leading-none truncate">
                  {isInstructor ? 'Instructor Portal' : 'Student Portal'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">StrideNex Hub</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                {isInstructor ? 'INS' : 'LRN'}
              </div>
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
    </>
  );
}
