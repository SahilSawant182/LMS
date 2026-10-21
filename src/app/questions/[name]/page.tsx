"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, CheckSquare, AlignLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { getQuestion, getQuestions } from '@/services/lms.services';
import { formatDate } from '@/utils/formatters';
import { useParams, useRouter } from 'next/navigation';
import { navigateBack } from '@/utils/navigation';

export default function QuestionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const rawName = (params?.name as string) || '';
  const name = decodeURIComponent(rawName);

  const [questionData, setQuestionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!name) return;
      setLoading(true);
      setError(null);
      try {
        const rawResponse = await getQuestion(name);
        
        // Extract data properly across various API response wrappers
        let data: any = null;
        if (rawResponse) {
          if (rawResponse.data?.data) {
            data = rawResponse.data.data;
          } else if (rawResponse.message?.data) {
            data = rawResponse.message.data;
          } else if (rawResponse.data && typeof rawResponse.data === 'object' && (rawResponse.data.name || rawResponse.data.question)) {
            data = rawResponse.data;
          } else if (rawResponse.message && typeof rawResponse.message === 'object' && (rawResponse.message.name || rawResponse.message.question)) {
            data = rawResponse.message;
          } else if (rawResponse.name || rawResponse.question) {
            data = rawResponse;
          }
        }

        // Secondary fallback: if single get returned null, try searching question list
        if (!data) {
          try {
            const listRes = await getQuestions();
            const list = Array.isArray(listRes)
              ? listRes
              : (listRes?.data?.questions || listRes?.message?.data?.questions || listRes?.data || listRes?.message || []);
            if (Array.isArray(list)) {
              const found = list.find((q: any) => q.name === name || q.name === rawName || q.question === name);
              if (found) data = found;
            }
          } catch (listErr) {
            console.warn('Fallback list search failed:', listErr);
          }
        }

        if (data && (data.name || data.question)) {
          setQuestionData(data);
        } else {
          setError('Question not found.');
        }
      } catch (err: any) {
        // Last-resort fallback: check questions list
        try {
          const listRes = await getQuestions();
          const list = Array.isArray(listRes)
            ? listRes
            : (listRes?.data?.questions || listRes?.message?.data?.questions || listRes?.data || listRes?.message || []);
          if (Array.isArray(list)) {
            const found = list.find((q: any) => q.name === name || q.name === rawName || q.question === name);
            if (found) {
              setQuestionData(found);
              setLoading(false);
              return;
            }
          }
        } catch {}
        setError(err.response?.data?.message?.message || err.message || 'Failed to fetch question');
      } finally {
        setLoading(false);
      }
    };

    if (name) {
      fetchQuestion();
    }
  }, [name, rawName]);

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'Choices':
      case 'Multiple Choice':
      case 'Single Choice':
        return <CheckSquare className="w-8 h-8 text-indigo-500" />;
      case 'User Input':
      case 'Free Text':
        return <AlignLeft className="w-8 h-8 text-emerald-500" />;
      default:
        return <HelpCircle className="w-8 h-8 text-blue-500" />;
    }
  };

interface RenderOption {
  num: number;
  value: string;
  isCorrect: boolean;
  explanation?: string;
}

  // Helper to get normalized choice options
  const getRenderOptions = (): RenderOption[] => {
    if (!questionData) return [];

    // 1. If options array (Frappe child table) exists
    if (Array.isArray(questionData.options) && questionData.options.length > 0) {
      return questionData.options.map((opt: any, idx: number) => ({
        num: idx + 1,
        value: typeof opt === 'string' ? opt : (opt.option || opt.title || opt.name || ''),
        isCorrect: opt.is_correct === 1 || opt.is_correct === true || opt.correct === 1,
        explanation: opt.explanation || '',
      })).filter((o: RenderOption) => Boolean(o.value));
    }

    // 2. Flat option_1..4 columns
    return [1, 2, 3, 4].map((num) => {
      const optionKey = `option_${num}`;
      const isCorrectKey = `is_correct_${num}`;
      const explanationKey = `explanation_${num}`;
      
      const optionValue = questionData[optionKey];
      const isCorrect = questionData[isCorrectKey] === 1 || questionData[isCorrectKey] === true;
      const explanation = questionData[explanationKey];

      return {
        num,
        value: optionValue || '',
        isCorrect,
        explanation,
      };
    }).filter((o: RenderOption) => Boolean(o.value));
  };

  // Helper to get normalized user input possibilities
  const getUserInputPossibilities = () => {
    if (!questionData) return [];
    if (Array.isArray(questionData.possibilities) && questionData.possibilities.length > 0) {
      return questionData.possibilities.map((p: any) => typeof p === 'string' ? p : (p.possibility || p.value || '')).filter(Boolean);
    }
    return [1, 2, 3, 4].map((num) => questionData[`possibility_${num}`]).filter(Boolean);
  };

  const choiceOptions = getRenderOptions();
  const userInputPossibilities = getUserInputPossibilities();

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        <div className="mb-6">
          <Link
            href="/quizzes?tab=questions"
            onClick={(e) => {
              e.preventDefault();
              navigateBack(router, "/quizzes?tab=questions");
            }}
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error || !questionData ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
             <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
             <h3 className="text-xl font-bold text-slate-900 mb-2">Question Not Found</h3>
             <p className="text-slate-500 max-w-sm mx-auto mb-6">{error || "The question you're looking for doesn't exist."}</p>
             <Link
               href="/quizzes?tab=questions"
               onClick={(e) => {
                 e.preventDefault();
                 navigateBack(router, "/quizzes?tab=questions");
               }}
               className="inline-flex items-center px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
             >
               <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
             </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            
            {/* Header Section */}
            <div className="bg-slate-900 px-8 py-6 border-b border-slate-800 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  {getQuestionTypeIcon(questionData.type)}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {questionData.type || 'Question'}
                    </span>
                    <span className="text-slate-400 font-mono text-sm">ID: {questionData.name}</span>
                  </div>
                  <h2 className="text-white font-medium text-sm">Question Details</h2>
                </div>
              </div>
            </div>

            {/* Question Body */}
            <div className="p-8">
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">The Question</h3>
                <div className="text-xl md:text-2xl font-bold text-slate-900 leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <span dangerouslySetInnerHTML={{ __html: questionData.question_detail || questionData.question }} />
                </div>
              </div>

              {/* Options / Answers Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  {questionData.type === 'User Input' ? 'Accepted Answers' : 'Options & Answers'}
                </h3>
                
                {questionData.type === 'Choices' || questionData.type === 'Single Choice' || questionData.type === 'Multiple Choice' || choiceOptions.length > 0 ? (
                  <div className="space-y-4">
                    {choiceOptions.map(({ num, value, isCorrect, explanation }) => (
                      <div key={num} className={`p-5 rounded-xl border-2 transition-all flex gap-4 ${isCorrect ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 bg-white'}`}>
                        <div className="pt-1 shrink-0">
                          {isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs font-bold text-slate-400">
                              {String.fromCharCode(64 + num)}
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <p className={`text-lg font-medium ${isCorrect ? 'text-emerald-900' : 'text-slate-700'}`}>
                            <span dangerouslySetInnerHTML={{ __html: value }} />
                          </p>
                          {explanation && (
                            <div className="mt-3 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                              <span className="font-semibold text-slate-800">Explanation:</span> <span dangerouslySetInnerHTML={{ __html: explanation }} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // User Input Handling
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {userInputPossibilities.length > 0 ? (
                      userInputPossibilities.map((possibility: string, idx: number) => (
                        <div key={idx} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          <span className="font-medium text-emerald-900" dangerouslySetInnerHTML={{ __html: possibility }} />
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">No specific accepted answer possibilities defined.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer metadata */}
            <div className="bg-slate-50 p-6 border-t border-slate-100 text-sm text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                Created by <span className="font-semibold text-slate-700">{questionData.owner || questionData.modified_by || 'Instructor'}</span>
              </div>
              <div className="flex gap-4">
                {questionData.creation && <span>Created: {formatDate(questionData.creation)}</span>}
                {questionData.modified && <span>Modified: {formatDate(questionData.modified)}</span>}
              </div>
            </div>

          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8 text-center mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">© 2026 Stridenex Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
