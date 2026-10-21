"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { getQuizzes, getQuestions } from "@/services/lms.services";
import { isAuthorizedInstructor } from "@/services/auth.services";
import { formatDate } from "@/utils/formatters";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  Award,
  HelpCircle,
  Plus,
  Search,
  CheckSquare,
  Radio,
  Type,
  AlignLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  BookOpen
} from "lucide-react";

interface Quiz {
  name: string;
  title: string;
  max_attempts: number;
  total_marks: number;
  passing_percentage: number;
  creation: string;
}

interface QuestionItem {
  name: string;
  question: string;
  question_detail?: string;
  question_title?: string;
  type: string;
  multiple?: number;
  marks?: number;
  creation?: string;
  [key: string]: any;
}

function QuizzesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"quizzes" | "questions">(
    tabParam === "questions" ? "questions" : "quizzes"
  );

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [errorQuizzes, setErrorQuizzes] = useState<string | null>(null);
  const [errorQuestions, setErrorQuestions] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);

  // Search & Filter state for Questions tab
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState("All");

  // Search for Quizzes tab
  const [quizSearch, setQuizSearch] = useState("");

  // Sync tab with URL
  useEffect(() => {
    if (tabParam === "questions") {
      setActiveTab("questions");
    } else if (tabParam === "quizzes") {
      setActiveTab("quizzes");
    }
  }, [tabParam]);

  useEffect(() => {
    setIsInstructor(isAuthorizedInstructor());

    // Fetch Quizzes
    const fetchQuizzesData = async () => {
      setLoadingQuizzes(true);
      try {
        const res = await getQuizzes();
        const data = Array.isArray(res) ? res : (res?.data || []);
        if (data) {
          setQuizzes(data);
        }
      } catch (err: any) {
        setErrorQuizzes(err.message || "Failed to fetch quizzes");
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchQuizzesData();
    fetchQuestionsData();
  }, []);

  const fetchQuestionsData = async () => {
    setLoadingQuestions(true);
    setErrorQuestions(null);
    try {
      const res = await getQuestions();
      const list = Array.isArray(res)
        ? res
        : (res?.data?.questions || res?.message?.data?.questions || res?.questions || res?.data || []);
      setQuestions(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setErrorQuestions(err.message || "Failed to fetch question bank");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleTabSwitch = (tab: "quizzes" | "questions") => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", tab);
    router.replace(`/quizzes?${newParams.toString()}`, { scroll: false });
  };

  // Filtered Quizzes
  const filteredQuizzes = useMemo(() => {
    if (!quizSearch.trim()) return quizzes;
    const q = quizSearch.toLowerCase();
    return quizzes.filter((item) =>
      item.title?.toLowerCase().includes(q) ||
      item.name?.toLowerCase().includes(q)
    );
  }, [quizzes, quizSearch]);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((item) => {
      const title = String(item.question_detail || item.question_title || item.question || item.name || "").toLowerCase();
      const matchesSearch = !questionSearch.trim() || title.includes(questionSearch.toLowerCase()) || String(item.name || "").toLowerCase().includes(questionSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (questionTypeFilter === "All") return true;
      const typeLower = String(item.type || "").toLowerCase();
      if (questionTypeFilter === "Multiple choice") {
        return (typeLower.includes("choice") && (item.multiple === 1 || typeLower.includes("multiple")));
      }
      if (questionTypeFilter === "Single choice") {
        return (typeLower.includes("choice") && (item.multiple === 0 || !item.multiple || typeLower.includes("single")));
      }
      if (questionTypeFilter === "User input") {
        return typeLower.includes("user input") || typeLower.includes("user_input");
      }
      if (questionTypeFilter === "Open ended") {
        return typeLower.includes("open ended") || typeLower.includes("open_ended");
      }
      return true;
    });
  }, [questions, questionSearch, questionTypeFilter]);

  const getQuestionTypeBadge = (q: QuestionItem) => {
    const typeStr = String(q.type || "").toLowerCase();
    const isMultiple = q.multiple === 1 || typeStr.includes("multiple");

    if (typeStr.includes("user input") || typeStr.includes("user_input")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Type className="w-3 h-3 text-amber-500" /> User Input
        </span>
      );
    }
    if (typeStr.includes("open ended") || typeStr.includes("open_ended")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <AlignLeft className="w-3 h-3 text-emerald-500" /> Open Ended
        </span>
      );
    }
    if (isMultiple) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <CheckSquare className="w-3 h-3 text-purple-500" /> Multiple Choice
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Radio className="w-3 h-3 text-indigo-500" /> Single Choice
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      <Navbar />

      {/* Hero Header Area */}
      <div className="relative overflow-hidden bg-slate-900 text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-60 h-60 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" /> Assessment Center
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Course Quizzes & Question Bank
            </h1>
            <p className="text-indigo-100 mt-1.5 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Create, manage, and take assessment quizzes or manage the centralized question bank for all courses.
            </p>
          </div>

          {isInstructor && (
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/quizzes/create"
                className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Quiz
              </Link>
              <Link
                href="/quizzes/create-question?returnUrl=/quizzes?tab=questions"
                className="inline-flex items-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl border border-slate-700 transition-all hover:border-slate-600"
              >
                <Plus className="w-4 h-4 mr-1.5 text-indigo-400" />
                Create Question
              </Link>
            </div>
          )}
        </div>

        {/* Tab Navigation Navigation */}
        <div className="max-w-7xl mx-auto mt-8 flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => handleTabSwitch("quizzes")}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
              activeTab === "quizzes"
                ? "border-indigo-500 text-white font-bold bg-slate-800/40 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Quizzes & Assessments</span>
            <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "quizzes" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {quizzes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch("questions")}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
              activeTab === "questions"
                ? "border-indigo-500 text-white font-bold bg-slate-800/40 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Question Bank</span>
            <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "questions" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {questions.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* TAB 1: QUIZZES */}
        {activeTab === "quizzes" && (
          <div>
            {/* Search Bar for Quizzes */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quizSearch}
                  onChange={(e) => setQuizSearch(e.target.value)}
                  placeholder="Search quizzes by title..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>

              {isInstructor && (
                <div className="text-xs text-slate-500">
                  Showing <strong className="text-slate-800">{filteredQuizzes.length}</strong> of {quizzes.length} quizzes
                </div>
              )}
            </div>

            {loadingQuizzes ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : errorQuizzes ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start">
                <svg className="w-5 h-5 mt-0.5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <h3 className="font-semibold text-sm">Error Loading Quizzes</h3>
                  <p className="text-sm mt-1">{errorQuizzes}</p>
                </div>
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center bg-white p-16 rounded-2xl border border-gray-200 shadow-xs">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {quizSearch ? "No matching quizzes found" : "No assessments available"}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                  {quizSearch ? "Try adjusting your search query." : "Check back later for new quizzes or create your first quiz now."}
                </p>
                {isInstructor && (
                  <div className="mt-5">
                    <Link
                      href="/quizzes/create"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Create Assessment
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredQuizzes.map((quiz) => (
                  <div
                    key={quiz.name}
                    className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden hover:border-indigo-200 group"
                  >
                    <div className="p-6 flex-grow">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {quiz.title}
                        </h2>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap shrink-0">
                          {quiz.total_marks} Marks
                        </span>
                      </div>

                      <div className="space-y-2 mt-4 text-xs text-gray-600">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <span className="text-gray-500">Passing Score</span>
                          <span className="font-semibold text-gray-900">{quiz.passing_percentage}%</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <span className="text-gray-500">Max Attempts</span>
                          <span className="font-semibold text-gray-900">{quiz.max_attempts}</span>
                        </div>
                        {quiz.creation && (
                          <div className="flex justify-between items-center pt-1 text-[11px] text-gray-400">
                            <span>Created</span>
                            <span>{formatDate(quiz.creation)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-6 py-3.5 bg-slate-50/70 border-t border-gray-100 flex items-center gap-2">
                      <Link
                        href={`/quizzes/${quiz.name}`}
                        className="flex-1 flex justify-center items-center px-4 py-2 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
                      >
                        Start Assessment
                      </Link>
                      {isInstructor && (
                        <Link
                          href={`/quizzes/edit/${quiz.name}`}
                          className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUESTION BANK */}
        {activeTab === "questions" && (
          <div>
            {/* Filters & Actions Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Search question text or ID..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={questionTypeFilter}
                    onChange={(e) => setQuestionTypeFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="All">All Types</option>
                    <option value="Single choice">Single Choice</option>
                    <option value="Multiple choice">Multiple Choice</option>
                    <option value="User input">User Input</option>
                    <option value="Open ended">Open Ended</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-xs text-slate-500">
                  Showing <strong className="text-slate-800">{filteredQuestions.length}</strong> of {questions.length}
                </span>
                {isInstructor && (
                  <Link
                    href="/quizzes/create-question?returnUrl=/quizzes?tab=questions"
                    className="inline-flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    New Question
                  </Link>
                )}
              </div>
            </div>

            {loadingQuestions ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : errorQuestions ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start">
                <svg className="w-5 h-5 mt-0.5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <h3 className="font-semibold text-sm">Error Loading Question Bank</h3>
                  <p className="text-sm mt-1">{errorQuestions}</p>
                </div>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center bg-white p-16 rounded-2xl border border-gray-200 shadow-xs">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {questionSearch ? "No matching questions found" : "Question Bank is empty"}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                  {questionSearch ? "Try searching with different terms or reset your type filter." : "Start populating your question bank by creating your first question."}
                </p>
                {isInstructor && (
                  <div className="mt-5">
                    <Link
                      href="/quizzes/create-question?returnUrl=/quizzes?tab=questions"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Create Question
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredQuestions.map((q, idx) => {
                  const qText = q.question_detail || q.question_title || q.question_text || q.question || "Untitled Question";
                  const qId = q.question || q.name;

                  return (
                    <div
                      key={`${q.name || q.question || idx}-${idx}`}
                      className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                          {idx + 1}
                        </span>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {getQuestionTypeBadge(q)}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              {q.marks || 1} mark{Number(q.marks) > 1 ? "s" : ""}
                            </span>
                            {qId && (
                              <span className="text-[11px] font-mono text-slate-400">
                                ID: {qId}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-2">
                            <span dangerouslySetInnerHTML={{ __html: qText }} />
                          </h3>

                          {q.creation && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Created {formatDate(q.creation)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Link
                          href={`/questions/${encodeURIComponent(q.name || q.question)}`}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-1"
                        >
                          View Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizzesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FA] flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      }
    >
      <QuizzesContent />
    </Suspense>
  );
}
