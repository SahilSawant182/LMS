"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { getCourseProgressFiltered } from '@/services/lms.services';
import { Search, Filter, CheckCircle, Clock, BookOpen, User, RefreshCw } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

export default function CourseProgressPage() {
  const [progressData, setProgressData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    name: '',
    member: '',
    course: '',
    chapter: '',
    lesson: '',
    status: ''
  });

  const fetchFilteredProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      // Clean up empty filters
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v.trim() !== '')
      );

      const res = await getCourseProgressFiltered(activeFilters);
      // Handle the various Frappe wrapper layers
      const data = res?.data?.records || res?.records || res?.message?.data?.records || res?.message?.records || res?.message?.data || res?.data || [];
      setProgressData(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch course progress.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredProgress();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredProgress();
  };

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
            Search, filter, and track student progress across all courses and lessons.
          </p>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20">
        
        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 mb-8">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Filter className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Filter Progress</h2>
          </div>
          
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">ID (Name)</label>
              <input type="text" name="name" value={filters.name} onChange={handleFilterChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm" placeholder="e.g. 8fdo3aojl8" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Member Email</label>
              <input type="text" name="member" value={filters.member} onChange={handleFilterChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm" placeholder="student@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Course</label>
              <input type="text" name="course" value={filters.course} onChange={handleFilterChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm" placeholder="e.g. python-django" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Chapter</label>
              <input type="text" name="chapter" value={filters.chapter} onChange={handleFilterChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm" placeholder="e.g. 0018 python intro" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Lesson</label>
              <input type="text" name="lesson" value={filters.lesson} onChange={handleFilterChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm" placeholder="e.g. 0213 Python" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
              <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm">
                <option value="">Any Status</option>
                <option value="Complete">Complete</option>
                <option value="Incomplete">Incomplete</option>
              </select>
            </div>
            
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-6 flex justify-end mt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-70"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Apply Filters
              </button>
            </div>
          </form>
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
            <p className="text-slate-500">Try adjusting your filters or search criteria.</p>
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
                  {progressData.map((prog, idx) => (
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
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            {prog.course}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">Ch: {prog.chapter}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {prog.lesson}
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
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
              <span>Showing {progressData.length} records</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
