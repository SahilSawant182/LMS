"use client";

import { useEffect, useState } from "react";
import { getQuizzes } from "@/services/lms.services";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Quiz {
  name: string;
  title: string;
  max_attempts: number;
  total_marks: number;
  passing_percentage: number;
  creation: string;
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await getQuizzes();
        // The API might return { status: 200, message: "...", data: [...] }
        // or just [...] depending on the frappe api wrapper
        const data = Array.isArray(res) ? res : (res?.data || []);
        if (data) {
          setQuizzes(data);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch quizzes");
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar />
      
      {/* Hero Header Area */}
      <div className="relative overflow-hidden bg-slate-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Assessments
            </h1>
            <p className="text-indigo-100 mt-2 text-sm max-w-2xl">
              Browse and take available quizzes to test your knowledge.
            </p>
          </div>
          <div>
            <Link 
              href="/quizzes/create-question" 
              className="inline-flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors border border-indigo-400/50"
            >
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Create Question
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 flex items-start">
            <svg className="w-5 h-5 mt-0.5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <h3 className="font-semibold text-sm">Error Loading Quizzes</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center bg-white p-16 rounded-xl border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No assessments available</h3>
            <p className="text-gray-500 mt-1">Check back later for new quizzes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div 
                key={quiz.name} 
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
              >
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-xl font-semibold text-gray-900 line-clamp-1">{quiz.title}</h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap ml-3 shrink-0">
                      {quiz.total_marks} Marks
                    </span>
                  </div>
                  
                  <div className="space-y-2 mt-5 text-sm text-gray-600">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-gray-500">Passing Score</span>
                      <span className="font-medium text-gray-900">{quiz.passing_percentage}%</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-gray-500">Max Attempts</span>
                      <span className="font-medium text-gray-900">{quiz.max_attempts}</span>
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <Link 
                    href={`/quizzes/${quiz.name}`}
                    className="flex justify-center items-center w-full px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Start Assessment
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
