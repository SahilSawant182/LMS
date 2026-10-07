"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Users, Calendar, Clock, ArrowRight, Search, Trash2 } from 'lucide-react';
import { getBatches, deleteBatch } from '@/services/lms.services';
import { formatDate } from '@/utils/formatters';

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);

  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true);
      try {
        const rawResponse = await getBatches();
        // Safely extract data whether it's in response.message.data, response.data, or response directly
        const batchesArray = Array.isArray(rawResponse) 
          ? rawResponse 
          : (rawResponse?.message?.data || rawResponse?.data?.message || rawResponse?.data || rawResponse?.message || []);
        
        const data = Array.isArray(batchesArray) ? batchesArray : [];
        setBatches(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch batches');
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
    const checkRoles = () => {
      try {
        const rolesStr = localStorage.getItem("roles");
        if (rolesStr) {
          const roles = JSON.parse(rolesStr);
          setIsInstructor(roles.includes("Instructor"));
        }
      } catch (e) {}
    };
    checkRoles();
  }, []);

  const handleDelete = async (batchName: string) => {
    if (confirm('Are you sure you want to delete this batch?')) {
      try {
        await deleteBatch(batchName);
        alert('Batch deleted successfully!');
        // Re-fetch batches to update the list
        setLoading(true);
        const rawResponse = await getBatches();
        const batchesArray = Array.isArray(rawResponse) 
          ? rawResponse 
          : (rawResponse?.message?.data || rawResponse?.data?.message || rawResponse?.data || rawResponse?.message || []);
        
        const data = Array.isArray(batchesArray) ? batchesArray : [];
        setBatches(data);
      } catch (err: any) {
        alert(err.message || 'Failed to delete batch');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-slate-900 text-white pt-16 pb-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Explore Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">Batches</span>
          </h1>
          <p className="text-indigo-100 max-w-2xl mx-auto text-lg mb-8">
            Join curated cohorts of learners, follow structured timelines, and achieve your goals together with expert instructors.
          </p>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-12 relative z-20">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8 mb-8">
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">All Available Batches</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input type="text" placeholder="Search batches..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full sm:w-64" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-red-50 text-red-600 rounded-lg border border-red-100">
              <p>{error}</p>
            </div>
          ) : batches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map((batch: any, idx: number) => (
                <div key={batch.name || idx} className="relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all flex flex-col h-full group">
                  
                  {/* Delete Button - Shows on Hover */}
                  {isInstructor && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(batch.name); }} 
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors border border-red-200 shadow-sm flex items-center justify-center"
                        title="Delete Batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="p-5 flex-grow">
                    <div className="flex justify-between items-start mb-4 pr-10">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md">
                        {batch.category || 'General'}
                      </span>
                      {batch.seats_left > 0 ? (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                          {batch.seats_left} seats left
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                          Full
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {batch.title || batch.name}
                    </h3>
                    
                    {batch.description && (
                      <div className="text-sm text-slate-500 mb-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: batch.description }} />
                    )}

                    <div className="space-y-2 mt-auto">
                      {batch.start_date && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formatDate(batch.start_date)} {batch.end_date ? `to ${formatDate(batch.end_date)}` : ''}</span>
                        </div>
                      )}
                      {batch.start_time && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{batch.start_time} - {batch.end_time}</span>
                        </div>
                      )}
                      {batch.instructors && batch.instructors.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100 mt-3">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span>Instructor: <span className="font-medium text-slate-900">{batch.instructors[0].full_name}</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="font-bold text-slate-900">
                      {batch.paid_batch ? `${batch.currency || '$'} ${batch.amount || 0}` : 'Free'}
                    </div>
                    <Link 
                      href={`/batch/${batch.name}`}
                      className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      View Details <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No active batches available at the moment.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8 text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">© 2026 Stridenex Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
