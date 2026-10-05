"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { HelpCircle, FileText, ChevronRight, Search, PlusCircle, AlignLeft, CheckSquare, List, MessageSquare } from 'lucide-react';
import { getQuestions } from '@/services/lms.services';
import { formatDate } from '@/utils/formatters';

interface Question {
  name: string;
  question: string;
  question_detail?: string;
  type: string;
  creation: string;
  owner?: string;
  [key: string]: any;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const rawResponse = await getQuestions();
        const dataArray = Array.isArray(rawResponse)
          ? rawResponse
          : (rawResponse?.data?.questions || rawResponse?.message?.data?.questions || rawResponse?.data || rawResponse?.message?.data || rawResponse?.message || []);
        
        const data = Array.isArray(dataArray) ? dataArray : [];
        setQuestions(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'Choices':
      case 'Multiple Choice':
      case 'Single Choice':
        return <CheckSquare className="w-5 h-5 text-indigo-500" />;
      case 'User Input':
      case 'Free Text':
        return <AlignLeft className="w-5 h-5 text-emerald-500" />;
      default:
        return <HelpCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-slate-900 text-white pt-16 pb-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-violet-600/10 blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/20 rounded-full mb-6 ring-4 ring-indigo-500/10">
            <HelpCircle className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Question <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">Bank</span>
          </h1>
          <p className="text-indigo-100 max-w-2xl mx-auto text-lg mb-8">
            Manage your repository of questions. Create, view, and organize questions for your quizzes and assessments.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-12 relative z-20">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8 mb-8 min-h-[400px]">
          
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-slate-100 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <List className="w-6 h-6 text-indigo-600" /> 
                All Questions
              </h2>
              <p className="text-slate-500 text-sm mt-1">Found {questions.length} questions in the database</p>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-grow md:flex-grow-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input type="text" placeholder="Search questions..." className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full sm:w-64 transition-all" />
              </div>
              <Link 
                href="/quizzes/create-question"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4" /> New Question
              </Link>
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
          ) : questions.length > 0 ? (
            <div className="grid gap-4">
              {questions.map((q) => (
                <Link href={`/questions/${q.name}`} key={q.name} className="block group">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all flex items-start gap-4">
                    
                    <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors shrink-0">
                      {getQuestionTypeIcon(q.type)}
                    </div>
                    
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors uppercase tracking-wider">
                          {q.type}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">ID: {q.name}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-2 pr-8">
                        {/* Use dangerouslySetInnerHTML if the question contains HTML, else just render */}
                        <span dangerouslySetInnerHTML={{ __html: q.question_detail || q.question }} />
                      </h3>
                      {q.creation && (
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                          Created on {formatDate(q.creation)}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 h-full flex items-center justify-center self-center opacity-0 group-hover:opacity-100 transition-opacity -ml-4">
                      <ChevronRight className="w-6 h-6 text-indigo-400" />
                    </div>

                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <HelpCircle className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No questions found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6">
                Your question bank is empty. Create your first question to get started.
              </p>
              <Link 
                href="/quizzes/create-question"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
              >
                Create Question
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8 text-center mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">© 2026 Stridenex Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
