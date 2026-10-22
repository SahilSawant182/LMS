"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import Pagination from '@/components/ui/Pagination';
import {
  Medal,
  Sparkles,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  Info,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Tag,
  RefreshCw,
  Award,
  Users,
  Edit3,
  Trash2,
  Clock,
  Mail,
  UserCheck,
  Check,
  Copy,
  AlertCircle,
  Loader2,
  CalendarDays,
  X
} from 'lucide-react';
import {
  getBadgeList,
  LMSBadge,
  getBadgeAssignmentList,
  createBadgeAssignment,
  updateBadgeAssignment,
  deleteBadgeAssignment,
  LMSBadgeAssignment
} from '@/services/lms.services';
import { getImageUrl, getCurrentUserEmail } from '@/services/api.services';
import { getInstructorDashboard } from '@/services/payment.services';

// Format date to DD-MM-YYYY
const formatDateDDMMYYYY = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  const match = clean.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}-${month}-${year}`;
  }
  try {
    const d = new Date(clean.replace(' ', 'T'));
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {}
  return dateStr;
};

export default function BadgesPage() {
  // Tabs: 'catalog' | 'assignments'
  const [activeTab, setActiveTab] = useState<'catalog' | 'assignments'>('catalog');

  // Badge Catalog State
  const [badges, setBadges] = useState<LMSBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [instructorCourses, setInstructorCourses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<LMSBadge | null>(null);

  // Badge Assignments State
  const [assignments, setAssignments] = useState<LMSBadgeAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('');
  const [assignmentBadgeFilter, setAssignmentBadgeFilter] = useState('all');
  const [assignmentCurrentPage, setAssignmentCurrentPage] = useState(1);
  const ASSIGNMENTS_PER_PAGE = 6;

  // Assignment Modal (Create & Edit)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentModalMode, setAssignmentModalMode] = useState<'create' | 'edit'>('create');
  const [assignmentFormName, setAssignmentFormName] = useState('');
  const [assignmentMember, setAssignmentMember] = useState('');
  const [assignmentBadge, setAssignmentBadge] = useState('');
  const [assignmentIssuedOn, setAssignmentIssuedOn] = useState('');
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentModalError, setAssignmentModalError] = useState<string | null>(null);

  // Delete Assignment Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<LMSBadgeAssignment | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Success Feedback Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const fetchBadges = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBadgeList();
      if (Array.isArray(data)) {
        setBadges(data);
      } else {
        setBadges([]);
      }
    } catch (err: any) {
      console.error("Badge API error:", err);
      setError(err?.message || "Failed to fetch badges");
      setBadges([]);
    } finally {
      setLoading(false);
    }
  };

  const getStoredUserEmail = () => {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('userEmail') ||
      localStorage.getItem('email') ||
      localStorage.getItem('user') ||
      localStorage.getItem('user_id') ||
      localStorage.getItem('username') ||
      ''
    ).trim();
  };

  const isMatchUser = (member?: string, username?: string, currentEmail?: string) => {
    if (!currentEmail) return false;
    const cur = currentEmail.toLowerCase().trim();
    const m = (member || '').toLowerCase().trim();
    const u = (username || '').toLowerCase().trim();
    if (!m && !u) return false;

    // Exact matches
    if (m === cur || u === cur) return true;

    // Email username portion match (e.g. "teena" matches "teena@erpdata.in")
    const curPrefix = cur.includes('@') ? cur.split('@')[0] : cur;
    const mPrefix = m.includes('@') ? m.split('@')[0] : m;
    const uPrefix = u.includes('@') ? u.split('@')[0] : u;

    if (mPrefix === curPrefix && curPrefix.length >= 3) return true;
    if (uPrefix === curPrefix && curPrefix.length >= 3) return true;

    return false;
  };

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    setAssignmentError(null);
    try {
      const email = (getCurrentUserEmail() || getStoredUserEmail()).toLowerCase().trim();
      const roles = typeof window !== 'undefined' ? localStorage.getItem('roles') || '' : '';
      const isInst = roles.includes('Instructor') || roles.includes('Administrator') || roles.includes('System Manager') || roles.includes('Course Creator');
      
      let data: LMSBadgeAssignment[] = [];
      // If student view, first attempt with member filter
      if (!isInst && email) {
        data = await getBadgeAssignmentList({ member: email });
      }
      // If no data returned from member query (or instructor view), fetch all assignments
      if (!Array.isArray(data) || data.length === 0) {
        data = await getBadgeAssignmentList();
      }

      if (Array.isArray(data)) {
        setAssignments(data);
      } else {
        setAssignments([]);
      }
    } catch (err: any) {
      console.error("Badge assignment API error:", err);
      const raw = typeof err?.message === 'string' ? err.message.trim() : '';
      const isTechnical =
        !raw ||
        raw.includes('Failed to get method') ||
        raw.includes('has no attribute') ||
        raw.includes('Traceback') ||
        raw.includes('AttributeError') ||
        raw.includes('doctype') ||
        raw.includes('module ');
      setAssignmentError(isTechnical ? "Failed to fetch badge assignments." : raw);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const checkAuthAndFetch = () => {
    let instructorFlag = false;
    let adminFlag = false;
    let email = '';
    if (typeof window !== 'undefined') {
      const roles = localStorage.getItem('roles') || '';
      email = (getCurrentUserEmail() || getStoredUserEmail()).toLowerCase().trim();
      adminFlag = roles.includes('Administrator') || roles.includes('System Manager');
      instructorFlag = adminFlag || roles.includes('Instructor') || roles.includes('Course Creator');
      setIsInstructor(instructorFlag);
      setIsAdmin(adminFlag);
      setUserEmail(email);
    }
    fetchBadges();
    fetchAssignments();

    if (instructorFlag && !adminFlag) {
      getInstructorDashboard().then((iData) => {
        if (iData && Array.isArray(iData.courses)) {
          setInstructorCourses(iData.courses);
        }
      }).catch((e) => {
        console.warn('Could not load instructor courses in badges page:', e);
      });
    }
  };

  useEffect(() => {
    checkAuthAndFetch();

    const handleAuthEvent = () => {
      checkAuthAndFetch();
    };

    window.addEventListener('auth-changed', handleAuthEvent);
    window.addEventListener('storage', handleAuthEvent);
    return () => {
      window.removeEventListener('auth-changed', handleAuthEvent);
      window.removeEventListener('storage', handleAuthEvent);
    };
  }, []);

  // When activeTab changes to 'assignments', make sure badge awards are fresh
  useEffect(() => {
    if (activeTab === 'assignments') {
      fetchAssignments();
    }
  }, [activeTab]);

  // Map of badge name to badge detail for emblems and titles
  const badgeMap = useMemo(() => {
    const map = new Map<string, LMSBadge>();
    badges.forEach(b => {
      if (b.name) map.set(b.name, b);
      if (b.title) map.set(b.title, b);
    });
    return map;
  }, [badges]);

  // Set of courses associated with this instructor
  const instructorCourseNames = useMemo(() => {
    const set = new Set<string>();
    instructorCourses.forEach((c: any) => {
      if (c.name) set.add(String(c.name).toLowerCase().trim());
      if (c.title) set.add(String(c.title).toLowerCase().trim());
    });
    return set;
  }, [instructorCourses]);

  // Check if a badge belongs to or is associated with the relevant instructor
  const isBadgeAssociatedWithInstructor = useMemo(() => {
    return (b?: LMSBadge | string | null): boolean => {
      if (!b) return false;
      if (isAdmin) return true;
      if (!isInstructor) return true;

      const badgeObj = typeof b === 'string' ? badgeMap.get(b) : b;
      const bName = typeof b === 'string' ? b : b.name || b.title;

      // 1. Badge owner matches instructor email/username
      if (badgeObj?.owner && isMatchUser(badgeObj.owner, undefined, userEmail)) {
        return true;
      }

      // 2. Locally created badge in instructor's session
      if (typeof window !== 'undefined' && userEmail) {
        try {
          const localBadges: string[] = JSON.parse(
            localStorage.getItem(`lms_instructor_badges_${userEmail}`) || '[]'
          );
          if (
            Array.isArray(localBadges) &&
            ((bName && localBadges.includes(bName)) ||
              (badgeObj?.title && localBadges.includes(badgeObj.title)))
          ) {
            return true;
          }
        } catch {}
      }

      // 3. Badge associated with instructor's courses
      if (badgeObj && instructorCourseNames.size > 0) {
        const cond = String(badgeObj.condition || '').toLowerCase();
        const refName = String((badgeObj as any).reference_name || (badgeObj as any).course || '').toLowerCase();
        for (const cName of instructorCourseNames) {
          if (cName && (cond.includes(cName) || refName === cName)) {
            return true;
          }
        }
      }

      return false;
    };
  }, [isAdmin, isInstructor, badgeMap, userEmail, instructorCourseNames]);

  // Check if a badge assignment was awarded by or associated with the relevant instructor
  const isAssignmentAssociatedWithInstructor = useMemo(() => {
    return (item: LMSBadgeAssignment): boolean => {
      if (isAdmin) return true;
      if (!isInstructor) {
        // Student view: only student's own earned badges
        return isMatchUser(item.member, (item as any).member_username, userEmail);
      }

      // Instructor view: badges awarded by or associated with the relevant instructor

      // 1. Assignment was awarded by this instructor (owner / awarded_by matches)
      if (item.owner && isMatchUser(item.owner, (item as any).awarded_by, userEmail)) {
        return true;
      }
      if ((item as any).awarded_by && isMatchUser((item as any).awarded_by, undefined, userEmail)) {
        return true;
      }

      // 2. Assignment was awarded in this instructor's session (tracked in localStorage)
      if (typeof window !== 'undefined' && userEmail) {
        try {
          const localAwards: string[] = JSON.parse(
            localStorage.getItem(`lms_instructor_awarded_assignments_${userEmail}`) || '[]'
          );
          if (
            Array.isArray(localAwards) &&
            (localAwards.includes(item.name) ||
              localAwards.includes(`${item.member?.toLowerCase().trim()}::${item.badge?.toLowerCase().trim()}`))
          ) {
            return true;
          }
        } catch {}
      }

      // 3. The badge itself is associated with or created by this instructor
      if (isBadgeAssociatedWithInstructor(item.badge)) {
        return true;
      }

      return false;
    };
  }, [isAdmin, isInstructor, userEmail, isBadgeAssociatedWithInstructor]);

  // Relevant assignments for the current instructor/student
  const instructorAssignments = useMemo(() => {
    return assignments.filter(isAssignmentAssociatedWithInstructor);
  }, [assignments, isAssignmentAssociatedWithInstructor]);

  // Filtered badges catalog
  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.reference_doctype && b.reference_doctype.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'enabled'
          ? Number(b.enabled) === 1
          : Number(b.enabled) === 0;

      const matchesEvent =
        eventFilter === 'all' || (b.event && b.event.toLowerCase() === eventFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesEvent;
    });
  }, [badges, searchTerm, statusFilter, eventFilter]);

  // Badges relevant to this instructor for filter dropdown in Awarded Badges tab
  const instructorRelevantBadges = useMemo(() => {
    if (isAdmin) return badges;
    if (!isInstructor) return badges;
    const awardedBadgeNames = new Set(
      instructorAssignments.map((a) => a.badge).filter(Boolean)
    );
    const relevant = badges.filter((b) => {
      return (
        (b.name && awardedBadgeNames.has(b.name)) ||
        (b.title && awardedBadgeNames.has(b.title)) ||
        isBadgeAssociatedWithInstructor(b)
      );
    });
    return relevant.length > 0 ? relevant : badges;
  }, [badges, instructorAssignments, isBadgeAssociatedWithInstructor, isAdmin, isInstructor]);

  // Badges that the instructor can select when clicking "Award Badge"
  const assignableBadges = useMemo(() => {
    if (isAdmin) return badges.filter((b) => Number(b.enabled) === 1);
    const relevant = badges.filter(
      (b) => isBadgeAssociatedWithInstructor(b) && Number(b.enabled) === 1
    );
    if (relevant.length > 0) return relevant;
    return badges.filter((b) => Number(b.enabled) === 1);
  }, [badges, isAdmin, isBadgeAssociatedWithInstructor]);

  // Filtered assignments (displays only relevant instructor's awarded/associated badges)
  const filteredAssignments = useMemo(() => {
    return instructorAssignments.filter((item) => {
      const matchesSearch =
        !assignmentSearchTerm ||
        item.member?.toLowerCase().includes(assignmentSearchTerm.toLowerCase().trim()) ||
        item.badge?.toLowerCase().includes(assignmentSearchTerm.toLowerCase().trim()) ||
        item.name?.toLowerCase().includes(assignmentSearchTerm.toLowerCase().trim());

      const matchesBadge =
        assignmentBadgeFilter === 'all' ||
        item.badge === assignmentBadgeFilter ||
        badgeMap.get(item.badge)?.title === assignmentBadgeFilter;

      return matchesSearch && matchesBadge;
    });
  }, [instructorAssignments, assignmentSearchTerm, assignmentBadgeFilter, badgeMap]);

  // Pagination for assignments
  const totalAssignmentPages = Math.max(1, Math.ceil(filteredAssignments.length / ASSIGNMENTS_PER_PAGE));
  const paginatedAssignments = useMemo(() => {
    return filteredAssignments.slice(
      (assignmentCurrentPage - 1) * ASSIGNMENTS_PER_PAGE,
      assignmentCurrentPage * ASSIGNMENTS_PER_PAGE
    );
  }, [filteredAssignments, assignmentCurrentPage]);

  const uniqueEvents = Array.from(
    new Set(badges.map((b) => b.event).filter(Boolean))
  ) as string[];

  const activeCount = badges.filter((b) => Number(b.enabled) === 1).length;

  // Assignment Modal Handlers
  const handleOpenCreateAssignment = (preselectedBadge?: string) => {
    setAssignmentModalMode('create');
    setAssignmentFormName('');
    setAssignmentMember('');
    const defaultBadge =
      preselectedBadge ||
      (assignableBadges.length > 0
        ? assignableBadges[0].name || assignableBadges[0].title || ''
        : badges.length > 0
        ? badges[0].name || ''
        : '');
    setAssignmentBadge(defaultBadge);
    setAssignmentIssuedOn(new Date().toISOString().split('T')[0]);
    setAssignmentModalError(null);
    setAssignmentModalOpen(true);
  };

  const handleOpenEditAssignment = (item: LMSBadgeAssignment) => {
    setAssignmentModalMode('edit');
    setAssignmentFormName(item.name);
    setAssignmentMember(item.member);
    setAssignmentBadge(item.badge);
    setAssignmentIssuedOn(item.issued_on || new Date().toISOString().split('T')[0]);
    setAssignmentModalError(null);
    setAssignmentModalOpen(true);
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = assignmentMember.trim();
    const badge = assignmentBadge.trim();
    const issuedOn = assignmentIssuedOn.trim();

    if (!member) {
      setAssignmentModalError('Student email (member) is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(member)) {
      setAssignmentModalError('Please enter a valid email address (e.g. shamp@gmail.com).');
      return;
    }
    if (!badge) {
      setAssignmentModalError('Please select a badge to assign.');
      return;
    }
    if (!issuedOn) {
      setAssignmentModalError('Please select the issuance date.');
      return;
    }

    try {
      setAssignmentSubmitting(true);
      setAssignmentModalError(null);

      if (assignmentModalMode === 'create') {
        const createRes = await createBadgeAssignment({
          member,
          badge,
          issued_on: issuedOn,
        });
        const createdName =
          createRes?.name ||
          createRes?.message?.name ||
          createRes?.data?.name ||
          createRes?.message;
        if (typeof window !== 'undefined' && userEmail) {
          const key = `lms_instructor_awarded_assignments_${userEmail}`;
          try {
            const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
            if (createdName && typeof createdName === 'string') existing.push(createdName);
            existing.push(`${member.toLowerCase().trim()}::${badge.toLowerCase().trim()}`);
            localStorage.setItem(key, JSON.stringify(existing));
          } catch {}
        }
        setSuccessToast(`Badge "${badge}" successfully awarded to ${member}!`);
      } else {
        await updateBadgeAssignment({
          name: assignmentFormName,
          member,
          badge,
          issued_on: issuedOn,
        });
        setSuccessToast(`Badge assignment updated for ${member}.`);
      }

      setAssignmentModalOpen(false);
      await fetchAssignments();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Error saving badge assignment:', err);
      const isCreate = assignmentModalMode === 'create';
      const defaultError = isCreate
        ? 'Failed to create badge assignment.'
        : 'Failed to update badge assignment.';

      const raw = typeof err?.message === 'string' ? err.message.trim() : '';
      const isTechnical =
        !raw ||
        raw.includes('Failed to get method') ||
        raw.includes('has no attribute') ||
        raw.includes('Traceback') ||
        raw.includes('AttributeError') ||
        raw.includes('ValidationError') ||
        raw.includes('doctype') ||
        raw.includes('module ') ||
        raw.includes('status code 404') ||
        raw.includes('status code 500') ||
        raw.includes('not available') ||
        raw.includes('operation failed');

      setAssignmentModalError(isTechnical ? defaultError : raw);
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const handleOpenDeleteAssignment = (item: LMSBadgeAssignment) => {
    setAssignmentToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      setDeleteSubmitting(true);
      await deleteBadgeAssignment(assignmentToDelete.name);

      if (typeof window !== 'undefined' && userEmail) {
        const key = `lms_instructor_awarded_assignments_${userEmail}`;
        try {
          const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
          const updated = existing.filter(
            (k) =>
              k !== assignmentToDelete.name &&
              k !== `${assignmentToDelete.member?.toLowerCase().trim()}::${assignmentToDelete.badge?.toLowerCase().trim()}`
          );
          localStorage.setItem(key, JSON.stringify(updated));
        } catch {}
      }

      setSuccessToast(`Badge "${assignmentToDelete.badge}" revoked from ${assignmentToDelete.member}.`);
      setDeleteModalOpen(false);
      setAssignmentToDelete(null);

      // Optimistic update
      setAssignments(prev => prev.filter(a => a.name !== assignmentToDelete.name));
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Error deleting badge assignment:', err);
      const raw = typeof err?.message === 'string' ? err.message.trim() : '';
      const isTechnical =
        !raw ||
        raw.includes('Failed to get method') ||
        raw.includes('has no attribute') ||
        raw.includes('Traceback') ||
        raw.includes('AttributeError') ||
        raw.includes('ValidationError') ||
        raw.includes('doctype') ||
        raw.includes('module ') ||
        raw.includes('not available');

      setAssignmentError(isTechnical ? 'Failed to delete badge assignment.' : raw);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedEmail(text);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  };

  // Metrics for assignments
  const assignmentMetrics = useMemo(() => {
    const list = isInstructor && !isAdmin ? instructorAssignments : assignments;
    const totalAwards = list.length;
    const uniqueStudents = new Set(list.map((a) => a.member).filter(Boolean)).size;
    const uniqueBadges = new Set(list.map((a) => a.badge).filter(Boolean)).size;
    const myAwardsCount = assignments.filter((a) =>
      isMatchUser(a.member, (a as any).member_username, userEmail)
    ).length;
    return { totalAwards, uniqueStudents, uniqueBadges, myAwardsCount };
  }, [assignments, instructorAssignments, isInstructor, isAdmin, userEmail]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-slate-900 text-white pt-6 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl"></div>
          <div className="absolute top-10 -left-20 w-60 h-60 rounded-full bg-indigo-500/15 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold mb-2 border border-amber-500/30">
                <Medal className="w-3.5 h-3.5 text-amber-400" />
                Achievement & Credential System
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Badges &{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200">
                  Achievements
                </span>
              </h1>
              <p className="text-slate-300 max-w-2xl text-xs md:text-sm mt-1.5">
                Recognizing student dedication, milestone mastery, and active batch engagement across the platform.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {isInstructor && (
                <>
                  <button
                    onClick={() => handleOpenCreateAssignment()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/30 hover:scale-[1.02] transition-all duration-200"
                  >
                    <Award className="w-4 h-4" />
                    Award Badge
                  </button>

                  <Link
                    href="/badges/create"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-sm border border-white/10 hover:scale-[1.02] transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    New Badge Template
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Dynamic Tab Switcher */}
          <div className="flex items-center gap-2 mt-6 border-b border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'catalog'
                  ? 'bg-white/15 text-white shadow-sm border border-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Medal className="w-4 h-4 text-amber-400" />
              <span>{isInstructor ? 'Badges Catalog' : 'Available Badges'}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-white/90">
                {badges.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('assignments');
                fetchAssignments();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'assignments'
                  ? 'bg-white/15 text-white shadow-sm border border-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Award className="w-4 h-4 text-orange-400" />
              <span>{isInstructor ? 'Awarded Badges' : 'My Earned Badges'}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                {isInstructor ? (isAdmin ? assignments.length : instructorAssignments.length) : assignmentMetrics.myAwardsCount}
              </span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <p className="text-[11px] text-slate-400 font-medium">Total Badge Types</p>
              <p className="text-xl font-bold text-white mt-0.5">{badges.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <p className="text-[11px] text-slate-400 font-medium">Total Awards Issued</p>
              <p className="text-xl font-bold text-amber-300 mt-0.5">{assignmentMetrics.totalAwards}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <p className="text-[11px] text-slate-400 font-medium">
                {isInstructor ? 'Awarded Students' : 'My Earned Badges'}
              </p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">
                {isInstructor ? assignmentMetrics.uniqueStudents : assignmentMetrics.myAwardsCount}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <p className="text-[11px] text-slate-400 font-medium">Active Mode</p>
              <p className="text-xs font-bold text-indigo-300 mt-1">
                {isInstructor ? 'Instructor (Admin Portal)' : 'Learner View'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20 space-y-6">
        
        {/* Global Feedback Notifications */}
        {successToast && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold">
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: BADGES CATALOG */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Controls Bar */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search badges by title, doctype, description..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                  />
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    aria-label="Filter badges by status"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">All Statuses</option>
                    <option value="enabled">Active Only</option>
                    <option value="disabled">Inactive Only</option>
                  </select>

                  <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    aria-label="Filter badges by trigger event"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">All Events</option>
                    {uniqueEvents.map((evt) => (
                      <option key={evt} value={evt}>
                        {evt}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={fetchBadges}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 transition-colors"
                    title="Refresh badges catalog"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Badges Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 shadow-xs">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-sm font-semibold text-slate-600 mt-3">Loading achievement badges...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-red-200 flex flex-col items-center p-8">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Unable to Load Badges</h3>
                <p className="text-sm text-slate-500 max-w-md mb-6">{error}</p>
                <button
                  onClick={fetchBadges}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              </div>
            ) : filteredBadges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBadges.map((badge, idx) => {
                  const isEnabled = Number(badge.enabled) === 1;
                  const imageUrl = badge.image ? getImageUrl(badge.image) : null;

                  return (
                    <div
                      key={badge.name || badge.title + idx}
                      className="bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group relative"
                    >
                      {/* Header Gradient */}
                      <div className="h-32 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>

                        {/* Status Pill */}
                        <div className="flex justify-between items-start relative z-10">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isEnabled
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isEnabled ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-400" /> Inactive
                              </>
                            )}
                          </span>

                          {badge.grant_only_once ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/20">
                              Grant Once
                            </span>
                          ) : null}
                        </div>

                        {/* Floating Emblem */}
                        <div className="absolute -bottom-6 left-6 p-2 bg-white rounded-2xl shadow-md border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-300 flex items-center justify-center overflow-hidden shadow-inner p-1">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={badge.title}
                                className="w-full h-full object-contain drop-shadow-sm"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Medal className="w-9 h-9 text-white drop-shadow-sm" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 pt-10 flex-grow flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {badge.title}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed flex-grow">
                          {badge.description || "No description provided for this achievement badge."}
                        </p>

                        {/* Meta Tags */}
                        <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Layers className="w-3.5 h-3.5" /> Reference DocType
                            </span>
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] truncate max-w-[150px]">
                              {badge.reference_doctype || 'Direct'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Sparkles className="w-3.5 h-3.5" /> Trigger Event
                            </span>
                            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                              {badge.event || 'Manual Assignment'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => setSelectedBadge(badge)}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
                        >
                          Inspect Rules <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {isInstructor && (
                          <button
                            onClick={() => handleOpenCreateAssignment(badge.name)}
                            className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 inline-flex items-center gap-1.5 transition-all shadow-2xs"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                            <span>Award Badge</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
                  <Medal className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No Badges Found</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                  {searchTerm || statusFilter !== 'all' || eventFilter !== 'all'
                    ? 'Try adjusting your filters or search keywords to find what you are looking for.'
                    : 'No badges have been created yet. As an instructor, you can create the first badge right away.'}
                </p>
                {isInstructor && (
                  <Link
                    href="/badges/create"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Badge
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BADGE ASSIGNMENTS (Awarded Badges / My Earned Badges) */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            {/* Controls Bar */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={assignmentSearchTerm}
                    onChange={(e) => {
                      setAssignmentSearchTerm(e.target.value);
                      setAssignmentCurrentPage(1);
                    }}
                    placeholder={isInstructor ? "Search by student email, badge name, or assignment ID..." : "Search my earned badges..."}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-800"
                  />
                  {assignmentSearchTerm && (
                    <button
                      onClick={() => setAssignmentSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={assignmentBadgeFilter}
                    onChange={(e) => {
                      setAssignmentBadgeFilter(e.target.value);
                      setAssignmentCurrentPage(1);
                    }}
                    aria-label="Filter assignments by badge"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="all">All Awarded Badges</option>
                    {instructorRelevantBadges.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.title}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={fetchAssignments}
                    className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-slate-200 transition-colors"
                    title="Refresh badge assignments"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAssignments ? 'animate-spin' : ''}`} />
                  </button>

                  {isInstructor && (
                    <button
                      onClick={() => handleOpenCreateAssignment()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
                    >
                      <Award className="w-4 h-4" />
                      <span>Award Badge</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Assignments List */}
            {loadingAssignments ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 shadow-xs">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-sm font-semibold text-slate-600 mt-3">Loading badge awards...</p>
              </div>
            ) : assignmentError ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-red-200 flex flex-col items-center p-8">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Unable to Load Badge Awards</h3>
                <p className="text-sm text-slate-500 max-w-md mb-6">{assignmentError}</p>
                <button
                  onClick={fetchAssignments}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              </div>
            ) : filteredAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedAssignments.map((item) => {
                  const badgeInfo = badgeMap.get(item.badge);
                  const badgeTitle = badgeInfo?.title || item.badge_title || item.badge;
                  const badgeImage = badgeInfo?.image ? getImageUrl(badgeInfo.image) : (item.badge_image ? getImageUrl(item.badge_image) : null);
                  const initial = (item.member || 'S').charAt(0).toUpperCase();

                  return (
                    <div
                      key={item.name}
                      className="bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
                    >
                      {/* Top Section with Badge Emblem & Recipient */}
                      <div className="p-5 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Emblem */}
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-300 text-white flex items-center justify-center shrink-0 shadow-xs p-1">
                              {badgeImage ? (
                                <img
                                  src={badgeImage}
                                  alt={badgeTitle}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Medal className="w-6 h-6 text-white" />
                              )}
                            </div>

                            {/* Badge & Recipient Info */}
                            <div className="min-w-0">
                              <h3 className="text-sm font-extrabold text-slate-900 truncate" title={badgeTitle}>
                                {badgeTitle}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-semibold text-slate-600 truncate" title={item.member}>
                                  {item.member}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(item.member)}
                                  className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5 rounded transition-colors"
                                  title="Copy student email"
                                >
                                  {copiedEmail === item.member ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Awarded Chip */}
                          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Awarded
                          </span>
                        </div>
                      </div>

                      {/* Details Section */}
                      <div className="p-5 flex-grow space-y-3">
                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Issued On
                          </span>
                          <span className="font-bold text-slate-800">
                            {formatDateDDMMYYYY(item.issued_on) || 'Recent'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
                          <span>Ref: {item.name}</span>
                          {badgeInfo?.event && <span>Trigger: {badgeInfo.event}</span>}
                        </div>
                      </div>

                      {/* Instructor Action Footer */}
                      {isInstructor && (
                        <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditAssignment(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 text-xs font-bold transition-colors"
                            title="Edit Assignment"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleOpenDeleteAssignment(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                            title="Revoke Badge"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {isInstructor ? 'No Badge Assignments Found' : 'No Earned Badges Yet'}
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                  {isInstructor
                    ? (assignmentSearchTerm || assignmentBadgeFilter !== 'all'
                        ? 'No assignments matched your filter query.'
                        : 'No badges have been awarded to students yet. Use the Award Badge button to recognize your first student!')
                    : 'Complete assignments, quizzes, and course milestones to earn milestone badges!'}
                </p>
                {isInstructor && (
                  <button
                    onClick={() => handleOpenCreateAssignment()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
                  >
                    <Award className="w-4 h-4" />
                    Award First Badge
                  </button>
                )}
              </div>
            )}

            {/* Pagination for Assignments */}
            <Pagination
              currentPage={assignmentCurrentPage}
              totalPages={totalAssignmentPages}
              onPageChange={setAssignmentCurrentPage}
              totalItems={filteredAssignments.length}
              pageSize={ASSIGNMENTS_PER_PAGE}
              itemName="badge assignments"
              className="pt-2"
            />
          </div>
        )}
      </main>

      {/* CREATE / EDIT ASSIGNMENT MODAL (Instructor Only) */}
      {assignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    {assignmentModalMode === 'create' ? 'Award Badge to Student' : 'Update Badge Assignment'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {assignmentModalMode === 'create' ? 'Assign an achievement badge to a learner' : `Editing assignment ID: ${assignmentFormName}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignmentModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignmentSubmit} className="p-6 space-y-4">
              {assignmentModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{assignmentModalError}</span>
                </div>
              )}

              {/* Student Email / Member */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student Email (Member) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={assignmentMember}
                    onChange={(e) => setAssignmentMember(e.target.value)}
                    placeholder="e.g. shamp@gmail.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  The email address of the student receiving this achievement.
                </p>
              </div>

              {/* Badge Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Badge <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={assignmentBadge}
                  onChange={(e) => setAssignmentBadge(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="">Choose a badge to award...</option>
                  {assignableBadges.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.title} {b.name !== b.title ? `(${b.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issued On Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Issued On Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    placeholder="DD/MM/YYYY"
                    value={assignmentIssuedOn}
                    onChange={(e) => setAssignmentIssuedOn(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 uppercase [&::-webkit-datetime-edit]:uppercase [&::-webkit-datetime-edit-fields-wrapper]:uppercase [&::-webkit-datetime-edit-text]:uppercase [&::-webkit-datetime-edit-month-field]:uppercase [&::-webkit-datetime-edit-day-field]:uppercase [&::-webkit-datetime-edit-year-field]:uppercase"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Display format: DD-MM-YYYY
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAssignmentModalOpen(false)}
                  disabled={assignmentSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignmentSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {assignmentSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-3.5 h-3.5" />
                      <span>{assignmentModalMode === 'create' ? 'Award Badge' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / REVOKE CONFIRMATION MODAL */}
      {deleteModalOpen && assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Revoke Badge Award</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to revoke badge <strong className="text-slate-800">{assignmentToDelete.badge}</strong> from <strong className="text-slate-800">{assignmentToDelete.member}</strong>?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAssignment}
                disabled={deleteSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleteSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <span>Revoke Badge</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Badge Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-fade-in-up">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-md">
                    <Medal className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedBadge.title}</h3>
                    <p className="text-xs text-indigo-200">
                      DocType: {selectedBadge.reference_doctype || 'Standard'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedBadge.description || "No description specified."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Event Trigger</span>
                  <span className="font-bold text-slate-800">{selectedBadge.event || 'Manual'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Status</span>
                  <span className={`font-bold ${Number(selectedBadge.enabled) === 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(selectedBadge.enabled) === 1 ? 'Active & Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Grant Only Once</span>
                  <span className="font-bold text-slate-800">
                    {selectedBadge.grant_only_once ? 'Yes (Once per user)' : 'No (Repeated)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">User Field</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedBadge.user_field || 'owner'}
                  </span>
                </div>
              </div>

              {selectedBadge.condition && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Evaluation Condition (JSON)
                  </label>
                  <pre className="text-xs bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono overflow-x-auto">
                    {selectedBadge.condition}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedBadge(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors"
              >
                Close
              </button>
              {isInstructor && (
                <button
                  onClick={() => {
                    const badgeToAward = selectedBadge.name;
                    setSelectedBadge(null);
                    handleOpenCreateAssignment(badgeToAward);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  Award This Badge
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs">© 2026 Stridenex LMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
