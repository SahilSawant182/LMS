"use client";

import { useEffect, useState, useMemo } from "react";
import { getQuiz, getQuestions } from "@/services/lms.services";
import { isAuthorizedInstructor } from "@/services/auth.services";
import { formatDate } from "@/utils/formatters";
import { navigateBack } from "@/utils/navigation";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Clock,
  CheckCircle2,
  Award,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Eye,
  History,
  Shuffle,
  Calendar,
  User,
  ArrowLeft,
  ArrowRight,
  Edit3,
  FileQuestion,
  AlertCircle,
  PlusCircle,
  CheckSquare,
  Sparkles,
  BookOpen
} from "lucide-react";

interface QuizAuthor {
  name?: string;
  owner?: string;
  creation?: string;
  modified?: string;
  author: string;
  parent?: string;
  parentfield?: string;
  parenttype?: string;
  doctype?: string;
}

interface QuizOption {
  option: string;
  is_correct?: number | boolean;
  explanation?: string;
}

interface QuizQuestion {
  name: string;
  question: string;
  question_detail?: string;
  marks?: number;
  type?: string;
  options?: QuizOption[];
}

interface QuizDetails {
  name: string;
  owner?: string;
  creation?: string;
  modified?: string;
  modified_by?: string;
  docstatus?: number;
  idx?: number;
  title: string;
  max_attempts: number;
  show_answers?: number;
  show_submission_history?: number;
  total_marks: number;
  passing_percentage: number;
  duration?: string | number;
  enable_proctoring?: number;
  max_violations?: number;
  enable_scheduling?: number;
  schedule_start?: string | null;
  schedule_end?: string | null;
  shuffle_questions?: number;
  limit_questions_to?: number;
  enable_negative_marking?: number;
  marks_to_cut?: number;
  lesson?: string | null;
  course?: string | null;
  doctype?: string;
  description?: string;
  authors?: QuizAuthor[];
  questions: QuizQuestion[];
}

export default function QuizDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const rawName = (params?.name as string) || "";
  const name = decodeURIComponent(rawName);

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);

  // Quiz taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setIsInstructor(isAuthorizedInstructor());
  }, []);

  useEffect(() => {
    if (!name) return;

    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getQuiz(name);
        
        // Extract data property properly across various API response wrappers
        const data: any = res?.data?.data || res?.message?.data || res?.data || res?.message || res;
        
        if (data && (data.name || data.title)) {
          const rawQuestions = Array.isArray(data.questions) ? data.questions : [];

          // Enrich questions with question bank data if available
          if (rawQuestions.length > 0) {
            try {
              const bankRes = await getQuestions();
              const list = Array.isArray(bankRes)
                ? bankRes
                : (bankRes?.data?.questions || bankRes?.message?.data?.questions || bankRes?.questions || []);
              if (Array.isArray(list) && list.length > 0) {
                const bankMap = new Map<string, any>();
                list.forEach((item: any) => {
                  const k1 = String(item.question || item.name || '').toLowerCase();
                  const k2 = String(item.name || '').toLowerCase();
                  if (k1) bankMap.set(k1, item);
                  if (k2) bankMap.set(k2, item);
                });
                data.questions = rawQuestions.map((q: any) => {
                  const rawRef = q.question || q.name || '';
                  const match = bankMap.get(String(rawRef).toLowerCase()) || bankMap.get(String(q.name || '').toLowerCase());
                  return {
                    ...q,
                    question_detail: q.question_detail || match?.question_detail || match?.question_title || q.question || rawRef,
                    marks: Number(q.marks) || Number(match?.marks) || 1,
                    type: q.type || match?.type || 'Choices',
                    options: q.options || match?.options || [],
                  };
                });
              } else {
                data.questions = rawQuestions;
              }
            } catch (enrichErr) {
              console.warn("Could not enrich quiz questions:", enrichErr);
              data.questions = rawQuestions;
            }
          } else {
            data.questions = [];
          }

          setQuiz(data);
        } else {
          setError("Assessment details could not be loaded.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch quiz details");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [name]);

  const primaryAuthor = useMemo(() => {
    if (!quiz) return "";
    return quiz.authors?.[0]?.author || quiz.owner || "Instructor";
  }, [quiz]);

  const totalCalculatedMarks = useMemo(() => {
    if (!quiz) return 0;
    if (quiz.total_marks && Number(quiz.total_marks) > 0) {
      return Number(quiz.total_marks);
    }
    if (quiz.questions && quiz.questions.length > 0) {
      return quiz.questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
    }
    return 0;
  }, [quiz]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-500 font-medium">Loading assessment details...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 py-12 px-4 flex flex-col items-center justify-center">
          <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
            <p className="text-gray-500 mb-6 text-sm">{error || "The requested assessment could not be loaded."}</p>
            <Link
              href="/quizzes"
              onClick={(e) => {
                e.preventDefault();
                navigateBack(router, "/quizzes");
              }}
              className="inline-flex justify-center items-center px-4 py-2.5 font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors w-full text-sm shadow-sm cursor-pointer"
            >
              Back to Previous Screen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const startQuiz = () => {
    if (!quiz.questions || quiz.questions.length === 0) return;
    setStarted(true);
  };

  const handleAnswer = (questionName: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionName]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const currentQuestion = quiz.questions?.[currentQuestionIndex];
  const isLastQuestion = quiz.questions ? currentQuestionIndex === quiz.questions.length - 1 : true;
  const progressPercentage = quiz.questions?.length
    ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100
    : 0;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 py-12 px-4 flex flex-col items-center justify-center">
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm max-w-xl w-full text-center border border-gray-200">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Assessment Submitted</h2>
            <p className="text-gray-500 mb-8 text-sm">
              You have completed <span className="font-semibold text-gray-900">{quiz.title || quiz.name}</span>.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 text-xs uppercase tracking-wider">
                Submission Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <span className="block text-xs text-gray-500 mb-1">Answered</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {Object.keys(answers).length}{" "}
                    <span className="text-sm font-medium text-gray-400">/ {quiz.questions.length}</span>
                  </span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <span className="block text-xs text-gray-500 mb-1">Total Marks</span>
                  <span className="text-2xl font-bold text-gray-900">{totalCalculatedMarks}</span>
                </div>
              </div>

              {quiz.show_answers ? (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Answer review is enabled. Detailed answer keys will be provided shortly.</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/quizzes"
                onClick={(e) => {
                  e.preventDefault();
                  navigateBack(router, "/quizzes");
                }}
                className="inline-flex justify-center items-center px-6 py-2.5 font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex-1 text-sm cursor-pointer"
              >
                Back to Previous Screen
              </Link>
              {isInstructor && (
                <Link
                  href={`/quizzes/create?quiz=${encodeURIComponent(quiz.name)}`}
                  className="inline-flex justify-center items-center px-6 py-2.5 font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors flex-1 text-sm shadow-sm"
                >
                  <Edit3 className="w-4 h-4 mr-1.5" />
                  Edit Quiz
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Taking View
  if (started && currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{quiz.title || quiz.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span className="font-medium">
                    Question {currentQuestionIndex + 1} of {quiz.questions.length}
                  </span>
                  {quiz.duration && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      {quiz.duration} Mins Time Limit
                    </span>
                  )}
                  {quiz.enable_negative_marking ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      -{quiz.marks_to_cut || 1} Penalty on Wrong Answer
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="w-36">
                <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-6 gap-4">
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900 leading-snug">
                    {currentQuestion.question_detail || currentQuestion.question || "Assessment Question"}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {currentQuestion.marks || 1} Mark{Number(currentQuestion.marks) !== 1 ? 's' : ''}
                    </span>
                    {currentQuestion.type && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {currentQuestion.type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  {currentQuestion.options && currentQuestion.options.length > 0 ? (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select your answer:
                      </label>
                      {currentQuestion.options.map((opt, oIdx) => {
                        const isSelected = answers[currentQuestion.name] === opt.option;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleAnswer(currentQuestion.name, opt.option)}
                            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between text-sm ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-2 ring-indigo-500/20 font-medium'
                                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-800'
                            }`}
                          >
                            <span>{opt.option}</span>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                              isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Answer
                      </label>
                      <textarea
                        id="answer"
                        className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none text-gray-900 min-h-[140px] text-sm resize-y placeholder:text-gray-400"
                        placeholder="Type your response here..."
                        value={answers[currentQuestion.name] || ""}
                        onChange={(e) => handleAnswer(currentQuestion.name, e.target.value)}
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center transition-colors ${
                    currentQuestionIndex === 0
                      ? 'text-gray-400 bg-transparent cursor-not-allowed'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Previous
                </button>

                {isLastQuestion ? (
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-2 rounded-lg font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <span>Submit</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 rounded-lg font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Overview / Landing View
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Navbar />

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-slate-900 text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="mb-4 flex items-center justify-between text-xs">
            <Link
              href="/quizzes"
              onClick={(e) => {
                e.preventDefault();
                navigateBack(router, "/quizzes");
              }}
              className="inline-flex items-center gap-1.5 font-medium text-indigo-200 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
            {isInstructor && (
              <Link
                href={`/quizzes/create?quiz=${encodeURIComponent(quiz.name)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all backdrop-blur-sm shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Quiz
              </Link>
            )}
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-white">
            {quiz.title || quiz.name}
          </h1>
          <p className="text-indigo-100 mt-1 text-sm max-w-2xl">
            {quiz.description ||
              "Please read the instructions carefully before starting. Make sure you have a stable connection and enough time to complete the assessment."}
          </p>

          {/* Metadata Chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {quiz.duration && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {quiz.duration} Mins Duration
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Passing: {quiz.passing_percentage}%
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 font-medium">
              <RotateCcw className="w-3.5 h-3.5" />
              {quiz.max_attempts} Attempt{Number(quiz.max_attempts) > 1 ? "s" : ""} Allowed
            </span>
            {primaryAuthor && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium">
                <User className="w-3.5 h-3.5" />
                {primaryAuthor}
              </span>
            )}
            {quiz.creation && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                Created {formatDate(quiz.creation)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="flex-1 py-10 px-4 flex justify-center">
        <div className="max-w-3xl w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <FileQuestion className="w-4 h-4 text-indigo-600" />
                  </div>
                  Assessment Details
                </h3>
                {isInstructor && (
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md font-semibold border border-indigo-100">
                    Instructor View
                  </span>
                )}
              </div>

              {/* Assessment Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {/* Total Questions */}
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-blue-100">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Questions</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {quiz.questions?.length || 0}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {quiz.limit_questions_to
                        ? `Limited to ${quiz.limit_questions_to} questions`
                        : "Questions in test"}
                    </p>
                  </div>
                </div>

                {/* Duration */}
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-amber-100">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time Duration</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {quiz.duration ? `${quiz.duration} Mins` : "Untimed"}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {quiz.duration ? "Allocated assessment time" : "No time limit"}
                    </p>
                  </div>
                </div>

                {/* Passing Score */}
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-emerald-100">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Passing Score</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {quiz.passing_percentage}%
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Minimum required to pass</p>
                  </div>
                </div>

                {/* Max Attempts */}
                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-purple-100">
                    <RotateCcw className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Attempts</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {quiz.max_attempts}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Submissions permitted</p>
                  </div>
                </div>

                {/* Total Marks */}
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-indigo-100">
                    <Award className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Marks</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {totalCalculatedMarks}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Maximum achievable score</p>
                  </div>
                </div>

                {/* Negative Marking */}
                <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  quiz.enable_negative_marking
                    ? "bg-rose-50/60 border-rose-100"
                    : "bg-slate-50 border-slate-200/80"
                }`}>
                  <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border ${
                    quiz.enable_negative_marking ? "border-rose-100" : "border-slate-200"
                  }`}>
                    <AlertCircle className={`w-5 h-5 ${
                      quiz.enable_negative_marking ? "text-rose-600" : "text-slate-500"
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Negative Marking</p>
                    <p className={`text-xl font-bold mt-0.5 ${
                      quiz.enable_negative_marking ? "text-rose-600" : "text-gray-900"
                    }`}>
                      {quiz.enable_negative_marking ? `-${quiz.marks_to_cut || 1} Mark` : "Disabled"}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {quiz.enable_negative_marking
                        ? "Deducted per incorrect answer"
                        : "No penalty for wrong answers"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assessment Policy & Configuration */}
              <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-200 mb-6">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Assessment Policy & Settings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${quiz.enable_proctoring ? 'text-amber-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-gray-900">Proctoring</p>
                      <p className="text-gray-500">
                        {quiz.enable_proctoring
                          ? `Enabled (${quiz.max_violations || 3} max violations)`
                          : "Disabled (Unmonitored)"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Eye className={`w-4 h-4 mt-0.5 shrink-0 ${quiz.show_answers ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-gray-900">Review Answers</p>
                      <p className="text-gray-500">
                        {quiz.show_answers ? "Visible after submission" : "Hidden after submission"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <History className={`w-4 h-4 mt-0.5 shrink-0 ${quiz.show_submission_history ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-gray-900">Submission History</p>
                      <p className="text-gray-500">
                        {quiz.show_submission_history ? "Recorded and visible" : "Private to instructor"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Shuffle className={`w-4 h-4 mt-0.5 shrink-0 ${quiz.shuffle_questions ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-gray-900">Question Sequence</p>
                      <p className="text-gray-500">
                        {quiz.shuffle_questions ? "Shuffled randomly" : "Standard order"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Calendar className={`w-4 h-4 mt-0.5 shrink-0 ${quiz.enable_scheduling ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-gray-900">Scheduling</p>
                      <p className="text-gray-500">
                        {quiz.enable_scheduling && (quiz.schedule_start || quiz.schedule_end)
                          ? `${formatDate(quiz.schedule_start) || 'Start'} to ${formatDate(quiz.schedule_end) || 'End'}`
                          : "Open anytime"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
                    <div>
                      <p className="font-semibold text-gray-900">Created By</p>
                      <p className="text-gray-500 truncate max-w-[170px]" title={primaryAuthor}>
                        {primaryAuthor}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Empty Questions Notice */}
              {(!quiz.questions || quiz.questions.length === 0) && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-amber-900">
                        No Questions Added Yet
                      </h4>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        This assessment currently contains 0 questions. You can edit this quiz to add questions directly from the Question Bank or create new assessment questions.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        <Link
                          href={`/quizzes/create?quiz=${encodeURIComponent(quiz.name)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Quiz & Add Questions
                        </Link>
                        <Link
                          href="/quizzes?tab=questions"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-amber-700" />
                          Browse Question Bank
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col items-center justify-center border-t border-gray-100 pt-6">
                {quiz.questions && quiz.questions.length > 0 ? (
                  <button
                    onClick={startQuiz}
                    className="w-full md:w-1/2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 active:scale-[0.99]"
                  >
                    <span>Begin Assessment Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-center w-full">
                    <button
                      disabled
                      className="w-full md:w-1/2 px-6 py-3 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl border border-gray-200 cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                    >
                      <span>Begin Assessment Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-gray-400 mt-2">
                      Cannot begin assessment because it currently contains 0 questions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
