"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { getCourseProgressFiltered, getCourses, getCourseOutline, getCourse } from '@/services/lms.services';
import { Search, Filter, CheckCircle, Clock, BookOpen, User, RefreshCw, RotateCcw, X, Layers, FileText, ChevronDown } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import { compareCurriculumItems } from '@/utils/curriculum';

interface CourseOption {
  name: string;
  title: string;
}

interface LessonOption {
  name: string;
  title: string;
  chapter?: string;
  course?: string;
}

interface ChapterOption {
  name: string;
  title: string;
  course?: string;
  lessons?: LessonOption[];
}

interface SearchableSelectProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { name: string; title: string }[];
  placeholder?: string;
  allLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
}

function SearchableSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select option',
  allLabel,
  disabled = false,
  loading = false,
  emptyText = 'No options available'
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.name === value);
  const displayLabel = selectedOption
    ? (selectedOption.title && selectedOption.title !== selectedOption.name
        ? `${selectedOption.title} (${selectedOption.name})`
        : (selectedOption.title || selectedOption.name))
    : (allLabel || `All ${label}s`);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((opt) =>
      (opt.title || '').toLowerCase().includes(q) ||
      (opt.name || '').toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  return (
    <div className={`relative ${isOpen ? 'z-30' : 'z-10'}`} ref={containerRef}>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center justify-between">
        <span>{label}</span>
        {loading && <span className="text-[10px] text-indigo-500 lowercase font-normal animate-pulse">loading...</span>}
      </label>

      <button
        id={id}
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          if (!disabled && !loading) {
            setIsOpen(!isOpen);
            setSearchQuery('');
          }
        }}
        className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-left flex items-center justify-between transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
          disabled || loading
            ? 'opacity-60 cursor-not-allowed bg-slate-100'
            : 'cursor-pointer hover:bg-slate-100/70 hover:border-slate-300'
        } ${value ? 'text-slate-900 font-medium' : 'text-slate-600'}`}
      >
        <span className="truncate pr-2">
          {loading ? `Loading ${label.toLowerCase()}s...` : displayLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 max-h-72 flex flex-col animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-56 divide-y divide-slate-50">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchQuery('');
              }}
              className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between hover:bg-indigo-50/50 transition-colors ${
                !value ? 'text-indigo-600 font-bold bg-indigo-50/40' : 'text-slate-600'
              }`}
            >
              <span>{allLabel || `All ${label}s`}</span>
              {!value && <CheckCircle className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
            </button>

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.name === value;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => {
                      onChange(opt.name);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between gap-2 hover:bg-indigo-50/50 transition-colors ${
                      isSelected ? 'text-indigo-600 font-bold bg-indigo-50/40' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate">{opt.title || opt.name}</span>
                      {opt.title && opt.title !== opt.name && (
                        <span className="text-[10px] text-slate-400 font-mono truncate">{opt.name}</span>
                      )}
                    </div>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-xs text-slate-400 text-center">
                {searchQuery ? `No matching ${label.toLowerCase()} found` : emptyText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseProgressPage() {
  const [progressData, setProgressData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter form state
  const [filters, setFilters] = useState({
    name: '',
    member: '',
    course: '',
    chapter: '',
    lesson: '',
    status: ''
  });

  // Dynamic dropdown data sources
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [loadingOutline, setLoadingOutline] = useState(false);

  // Fetch progress data using active filters
  const fetchFilteredProgress = async (customFilters?: typeof filters) => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(customFilters || filters).filter(([_, v]) => v && v.trim() !== '')
      );

      const res = await getCourseProgressFiltered(activeFilters);
      const data = res?.data?.records || res?.records || res?.message?.data?.records || res?.message?.records || res?.message?.data || res?.data || [];
      setProgressData(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch course progress.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load: fetch progress and courses list
  useEffect(() => {
    fetchFilteredProgress();

    let isMounted = true;
    const fetchCoursesList = async () => {
      setLoadingCourses(true);
      try {
        const res = await getCourses();
        const rawList = Array.isArray(res) ? res : ((res as any)?.message || (res as any)?.data || []);
        if (isMounted && Array.isArray(rawList)) {
          const list: CourseOption[] = rawList.map((c: any) => ({
            name: c.name || '',
            title: c.title || c.course_name || c.name || 'Untitled Course'
          })).filter(c => Boolean(c.name));
          setCourses(list);
        }
      } catch (err) {
        console.error('Failed to load courses for filter:', err);
      } finally {
        if (isMounted) setLoadingCourses(false);
      }
    };

    fetchCoursesList();
    return () => { isMounted = false; };
  }, []);

  // Fetch chapters and lessons whenever the selected course changes
  useEffect(() => {
    let isMounted = true;
    const fetchOutline = async () => {
      if (!filters.course) {
        setChapters([]);
        return;
      }

      setLoadingOutline(true);
      try {
        let outlineList: any[] = [];
        try {
          const res = await getCourseOutline({ course: filters.course });
          const data = Array.isArray(res) ? res : ((res as any)?.message || (res as any)?.data || []);
          if (Array.isArray(data) && data.length > 0) {
            outlineList = data;
          }
        } catch (e) {
          console.warn('getCourseOutline fallback to getCourse', e);
        }

        if (outlineList.length === 0) {
          try {
            const courseRes = await getCourse(filters.course);
            const cObj = (courseRes as any)?.data || (courseRes as any)?.message?.data || (courseRes as any)?.message || courseRes;
            if (cObj && Array.isArray(cObj.chapters)) {
              outlineList = cObj.chapters;
            }
          } catch (e) {
            console.warn('getCourse fallback failed', e);
          }
        }

        if (isMounted && Array.isArray(outlineList)) {
          const sortedOutline = [...outlineList].sort(compareCurriculumItems);
          const formattedChapters: ChapterOption[] = sortedOutline.map((ch: any) => ({
            name: ch.name || '',
            title: ch.title || ch.name || 'Untitled Chapter',
            course: filters.course,
            lessons: Array.isArray(ch.lessons) ? [...ch.lessons].sort(compareCurriculumItems).map((l: any) => ({
              name: l.name || '',
              title: l.title || l.lesson_name || l.name || 'Untitled Lesson',
              chapter: ch.name || '',
              course: filters.course
            })) : []
          }));
          setChapters(formattedChapters);
        }
      } catch (err) {
        console.error('Failed to load course outline:', err);
        if (isMounted) setChapters([]);
      } finally {
        if (isMounted) setLoadingOutline(false);
      }
    };

    fetchOutline();
    return () => { isMounted = false; };
  }, [filters.course]);

  // Handle standard input changes (Name, Member Email, Status)
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Submit search form
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredProgress();
  };

  // Clear all filters
  const handleClearFilters = () => {
    const cleared = {
      name: '',
      member: '',
      course: '',
      chapter: '',
      lesson: '',
      status: ''
    };
    setFilters(cleared);
    fetchFilteredProgress(cleared);
  };

  // Clear an individual filter pill
  const handleRemoveFilter = (filterKey: keyof typeof filters) => {
    const updated = {
      ...filters,
      [filterKey]: '',
      ...(filterKey === 'course' ? { chapter: '', lesson: '' } : {}),
      ...(filterKey === 'chapter' ? { lesson: '' } : {})
    };
    setFilters(updated);
    fetchFilteredProgress(updated);
  };

  // 1. Available Course options (merged with any found in loaded progress records)
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach(c => {
      if (c.name) map.set(c.name, c.title);
    });
    progressData.forEach(p => {
      if (p.course && !map.has(p.course)) {
        map.set(p.course, p.course);
      }
    });
    return Array.from(map.entries()).map(([name, title]) => ({ name, title }));
  }, [courses, progressData]);

  // 2. Available Chapter options
  const chapterOptions = useMemo(() => {
    const map = new Map<string, string>();
    if (filters.course) {
      chapters.forEach(ch => {
        if (ch.name) map.set(ch.name, ch.title);
      });
      progressData.forEach(p => {
        if (p.course === filters.course && p.chapter && !map.has(p.chapter)) {
          map.set(p.chapter, p.chapter);
        }
      });
    } else {
      progressData.forEach(p => {
        if (p.chapter && !map.has(p.chapter)) {
          map.set(p.chapter, p.chapter);
        }
      });
    }
    return Array.from(map.entries()).map(([name, title]) => ({ name, title }));
  }, [filters.course, chapters, progressData]);

  // 3. Available Lesson options
  const lessonOptions = useMemo(() => {
    const map = new Map<string, string>();
    if (filters.chapter) {
      const ch = chapters.find(c => c.name === filters.chapter);
      if (ch && ch.lessons) {
        ch.lessons.forEach(l => {
          if (l.name) map.set(l.name, l.title);
        });
      }
      progressData.forEach(p => {
        if (p.chapter === filters.chapter && p.lesson && !map.has(p.lesson)) {
          map.set(p.lesson, p.lesson);
        }
      });
    } else if (filters.course) {
      chapters.forEach(ch => {
        if (ch.lessons) {
          ch.lessons.forEach(l => {
            if (l.name) map.set(l.name, l.title);
          });
        }
      });
      progressData.forEach(p => {
        if (p.course === filters.course && p.lesson && !map.has(p.lesson)) {
          map.set(p.lesson, p.lesson);
        }
      });
    } else {
      progressData.forEach(p => {
        if (p.lesson && !map.has(p.lesson)) {
          map.set(p.lesson, p.lesson);
        }
      });
    }
    return Array.from(map.entries()).map(([name, title]) => ({ name, title }));
  }, [filters.course, filters.chapter, chapters, progressData]);

  // Lookup maps for human readable titles in the results table
  const courseTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    courseOptions.forEach(c => m.set(c.name, c.title));
    return m;
  }, [courseOptions]);

  const chapterTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    chapterOptions.forEach(ch => m.set(ch.name, ch.title));
    return m;
  }, [chapterOptions]);

  const lessonTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    lessonOptions.forEach(l => m.set(l.name, l.title));
    return m;
  }, [lessonOptions]);

  const hasActiveFilters = Boolean(
    filters.name || filters.member || filters.course || filters.chapter || filters.lesson || filters.status
  );

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 text-white pt-8 pb-14">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-60 h-60 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="inline-block px-2.5 py-0.5 mb-2 text-[11px] font-semibold tracking-wide text-indigo-300 uppercase bg-indigo-900/50 border border-indigo-700/50 rounded-md backdrop-blur-sm">
            Administration
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-1.5 tracking-tight text-white">
            Course Progress
          </h1>
          <p className="text-xs md:text-sm text-indigo-100/80 max-w-2xl mx-auto font-light">
            Search, filter, and track student progress across all courses, chapters, and lessons.
          </p>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20">
        
        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 mb-8">
          <div className="flex items-center justify-between gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-800">Filter Progress</h2>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset all
              </button>
            )}
          </div>
          
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* ID (Name) Filter */}
            <div>
              <label htmlFor="filter-name" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                ID (Name)
              </label>
              <input
                id="filter-name"
                type="text"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                placeholder="e.g. 8fdo3aojl8"
              />
            </div>

            {/* Member Email Filter */}
            <div>
              <label htmlFor="filter-member" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Member Email
              </label>
              <input
                id="filter-member"
                type="text"
                name="member"
                value={filters.member}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                placeholder="student@example.com"
              />
            </div>

            {/* Course Searchable Dropdown Filter */}
            <SearchableSelect
              id="filter-course"
              label="Course"
              value={filters.course}
              onChange={(val) => {
                setFilters(prev => ({
                  ...prev,
                  course: val,
                  chapter: '',
                  lesson: ''
                }));
              }}
              options={courseOptions}
              loading={loadingCourses}
              allLabel="All Courses"
              placeholder="Select Course"
              emptyText="No courses available"
            />

            {/* Chapter Searchable Dropdown Filter */}
            <SearchableSelect
              id="filter-chapter"
              label="Chapter"
              value={filters.chapter}
              onChange={(val) => {
                setFilters(prev => ({
                  ...prev,
                  chapter: val,
                  lesson: ''
                }));
              }}
              options={chapterOptions}
              loading={loadingOutline}
              allLabel="All Chapters"
              placeholder="Select Chapter"
              emptyText={filters.course ? "No chapters found for this course" : "No chapters available"}
            />

            {/* Lesson Searchable Dropdown Filter */}
            <SearchableSelect
              id="filter-lesson"
              label="Lesson"
              value={filters.lesson}
              onChange={(val) => {
                setFilters(prev => ({
                  ...prev,
                  lesson: val
                }));
              }}
              options={lessonOptions}
              loading={loadingOutline}
              allLabel="All Lessons"
              placeholder="Select Lesson"
              emptyText={filters.chapter || filters.course ? "No lessons found" : "No lessons available"}
            />

            {/* Status Dropdown Filter */}
            <div>
              <label htmlFor="filter-status" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Status
              </label>
              <select
                id="filter-status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-slate-800 cursor-pointer"
              >
                <option value="">Any Status</option>
                <option value="Complete">Complete</option>
                <option value="Incomplete">Incomplete</option>
              </select>
            </div>
            
            {/* Form Actions */}
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-6 flex flex-wrap items-center justify-between gap-3 mt-2 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {hasActiveFilters ? (
                  <span className="inline-flex items-center gap-1.5 text-indigo-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    Filters applied
                  </span>
                ) : (
                  <span>Showing all records</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm shadow-md shadow-indigo-600/20 disabled:opacity-70"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Apply Filters
                </button>
              </div>
            </div>
          </form>

          {/* Active Filter Pills */}
          {hasActiveFilters && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Active filters:</span>
              {filters.name && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium border border-indigo-100">
                  ID: <span className="font-semibold">{filters.name}</span>
                  <button type="button" onClick={() => handleRemoveFilter('name')} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.member && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium border border-indigo-100">
                  Member: <span className="font-semibold">{filters.member}</span>
                  <button type="button" onClick={() => handleRemoveFilter('member')} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.course && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium border border-indigo-100">
                  Course: <span className="font-semibold">{courseTitleMap.get(filters.course) || filters.course}</span>
                  <button type="button" onClick={() => handleRemoveFilter('course')} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.chapter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium border border-indigo-100">
                  Chapter: <span className="font-semibold">{chapterTitleMap.get(filters.chapter) || filters.chapter}</span>
                  <button type="button" onClick={() => handleRemoveFilter('chapter')} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.lesson && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium border border-indigo-100">
                  Lesson: <span className="font-semibold">{lessonTitleMap.get(filters.lesson) || filters.lesson}</span>
                  <button type="button" onClick={() => handleRemoveFilter('lesson')} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium border border-indigo-100">
                  Status: <span className="font-semibold">{filters.status}</span>
                  <button type="button" onClick={() => handleRemoveFilter('status')} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results Section */}
        {error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold mb-2">Error Loading Progress</h2>
            <p className="text-sm">{error}</p>
          </div>
        ) : progressData.length === 0 && !loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-400 mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No progress records found</h3>
            <p className="text-slate-500 mb-4">Try adjusting your filters or search criteria.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-semibold text-sm rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Course Details</th>
                    <th className="px-6 py-4">Lesson</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {progressData.map((prog, idx) => {
                    const cTitle = courseTitleMap.get(prog.course) || prog.course;
                    const chTitle = chapterTitleMap.get(prog.chapter) || prog.chapter;
                    const lTitle = lessonTitleMap.get(prog.lesson) || prog.lesson;

                    return (
                      <tr key={prog.name || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 flex-shrink-0">
                              {prog.member_name ? prog.member_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{prog.member_name || prog.member}</div>
                              <div className="text-xs text-slate-500">{prog.member}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800" title={prog.course}>
                              <BookOpen className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                              <span className="line-clamp-1">{cTitle}</span>
                            </span>
                            {chTitle && (
                              <span className="text-xs text-slate-500 font-medium" title={prog.chapter}>
                                Ch: {chTitle}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200" title={prog.lesson}>
                            <FileText className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="line-clamp-1">{lTitle}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            prog.status === 'Complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {prog.status === 'Complete' && <CheckCircle className="w-3.5 h-3.5" />}
                            {prog.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 flex flex-col">
                          <span>{formatDate(prog.modified?.split(' ')[0] || prog.creation?.split(' ')[0])}</span>
                          <span className="text-xs text-slate-400 font-mono mt-0.5" title="Progress Record ID">{prog.name}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
              <span>Showing {progressData.length} records</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
