"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  getQuiz,
  getQuestions,
  getQuestion,
  getQuizSubmissions,
  getQuizResult,
  createQuizSubmission,
  getQuizSubmissionDetails,
  QuizSubmissionAnswer,
  CreateQuizSubmissionPayload
} from "@/services/lms.services";
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
  BookOpen,
  Users,
  X,
  FileCheck2,
  ChevronRight
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
  key?: string;
  option: string;
  is_correct?: number | boolean;
  explanation?: string;
}

interface QuizQuestion {
  name: string;
  question: string;
  question_id?: string;
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
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // Submissions & Results state (for both Student and Instructor roles)
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "submissions">("overview");
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  // Quiz taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<any | null>(null);

  const bankMapRef = useRef<Map<string, any>>(new Map());

  const resolveQuestionId = (q: any): string => {
    if (!q) return "";
    if (typeof q.qts_id === "string" && q.qts_id.startsWith("QTS-")) return q.qts_id.trim();
    if (typeof q.question === "string" && q.question.startsWith("QTS-")) return q.question.trim();
    if (typeof q.question_id === "string" && q.question_id.startsWith("QTS-")) return q.question_id.trim();
    if (typeof q.name === "string" && q.name.startsWith("QTS-")) return q.name.trim();

    const textCandidates = [
      q.question_detail,
      q.question_title,
      q.question_text,
      q.title,
      typeof q.question === "string" && !q.question.startsWith("QTS-") ? q.question : null,
      q.name
    ].filter(Boolean);

    for (const c of textCandidates) {
      const matched = bankMapRef.current.get(String(c).toLowerCase().trim());
      if (matched) {
        if (typeof matched.question === "string" && matched.question.startsWith("QTS-")) return matched.question.trim();
        if (typeof matched.name === "string" && matched.name.startsWith("QTS-")) return matched.name.trim();
        if (typeof matched.question_id === "string" && matched.question_id.startsWith("QTS-")) return matched.question_id.trim();
        if (typeof matched.qts_id === "string" && matched.qts_id.startsWith("QTS-")) return matched.qts_id.trim();
      }
    }

    const allStrings = [q.question, q.question_id, q.qts_id, q.name, q.question_detail].filter(Boolean);
    for (const s of allStrings) {
      const rx = String(s).match(/QTS-\d{4}-\d+/i);
      if (rx) return rx[0];
    }

    return (q.question && !q.question.includes(" ") ? q.question : (q.question_id || q.name || ""));
  };

  useEffect(() => {
    const isInst = isAuthorizedInstructor();
    setIsInstructor(isInst);
    const email = typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "";
    setCurrentUserEmail(email);
  }, []);

  const fetchSubmissions = async () => {
    if (!name) return;
    setLoadingSubmissions(true);
    try {
      const email = typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "";
      const isInst = isAuthorizedInstructor();
      const filters: any = { quiz: name };
      // For student role, filter by member/user; for instructor, list all student submissions
      if (!isInst && email) {
        filters.member = email;
      }
      const res = await getQuizSubmissions(filters);
      setSubmissions(Array.isArray(res) ? res : []);
    } catch (e) {
      console.warn("Failed to fetch quiz submissions:", e);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleViewResult = async (submissionId: string) => {
    if (!submissionId) return;
    setLoadingResult(true);
    setResultModalOpen(true);
    try {
      const res = await getQuizSubmissionDetails(submissionId);
      setSelectedResult(res || { submission: submissionId });
    } catch (e) {
      console.warn("Failed to fetch quiz submission details:", e);
      try {
        const fallbackRes = await getQuizResult(submissionId);
        setSelectedResult(fallbackRes || { submission: submissionId });
      } catch (err) {
        setSelectedResult({ submission: submissionId });
      }
    } finally {
      setLoadingResult(false);
    }
  };

  useEffect(() => {
    if (!name) return;

    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getQuiz(name);
        
        // Extract data property properly across various API response wrappers
        const data: any = res?.data?.data || res?.message?.data || res?.data || res?.message || res;
        
        if (data && (data.name || data.title || data.questions)) {
          const rawQuestions = Array.isArray(data.questions)
            ? data.questions
            : Array.isArray(data.quiz_questions)
            ? data.quiz_questions
            : Array.isArray(data.question_list)
            ? data.question_list
            : Array.isArray(data.data?.questions)
            ? data.data.questions
            : [];

          // Helper to parse question options
          const parseOptions = (q: any, match?: any): QuizOption[] => {
            let rawOpts: any[] = [];
            if (typeof q?.options === 'string') {
              try { rawOpts = JSON.parse(q.options); } catch {}
            } else if (Array.isArray(q?.options) && q.options.length > 0) {
              rawOpts = q.options;
            }

            if (!Array.isArray(rawOpts) || rawOpts.length === 0) {
              const flatOnQ = [1, 2, 3, 4, 5, 6].map((num) => {
                const val = q?.[`option_${num}`];
                if (!val) return null;
                return {
                  key: `option_${num}`,
                  option: val,
                  is_correct: q[`is_correct_${num}`] === 1 || q[`is_correct_${num}`] === true,
                  explanation: q[`explanation_${num}`] || ''
                };
              }).filter(Boolean);
              if (flatOnQ.length > 0) rawOpts = flatOnQ;
            }

            if ((!Array.isArray(rawOpts) || rawOpts.length === 0) && match) {
              if (Array.isArray(match.options) && match.options.length > 0) {
                rawOpts = match.options;
              } else if (typeof match.options === 'string') {
                try { rawOpts = JSON.parse(match.options); } catch {}
              } else {
                rawOpts = [1, 2, 3, 4, 5, 6].map((num) => {
                  const val = match[`option_${num}`];
                  if (!val) return null;
                  return {
                    key: `option_${num}`,
                    option: val,
                    is_correct: match[`is_correct_${num}`] === 1 || match[`is_correct_${num}`] === true,
                    explanation: match[`explanation_${num}`] || ''
                  };
                }).filter(Boolean);
              }
            }

            return (rawOpts || []).map((opt: any, optIdx: number) => {
              const optKey = opt.key || `option_${optIdx + 1}`;
              const optText = typeof opt === 'string'
                ? opt
                : (opt.option || opt.title || opt.text || opt.value || opt.label || '');
              return {
                ...opt,
                key: optKey,
                option: optText
              };
            });
          };

          // Enrich questions with question bank data if available
          const indexBankItem = (item: any) => {
            if (!item || typeof item !== 'object') return;
            const qtsId =
              (item.question && String(item.question).startsWith('QTS-'))
                ? String(item.question).trim()
                : (item.name && String(item.name).startsWith('QTS-'))
                ? String(item.name).trim()
                : (item.question_id && String(item.question_id).startsWith('QTS-'))
                ? String(item.question_id).trim()
                : null;

            if (item.name) bankMapRef.current.set(String(item.name).toLowerCase().trim(), item);
            if (item.question) bankMapRef.current.set(String(item.question).toLowerCase().trim(), item);
            if (item.question_id) bankMapRef.current.set(String(item.question_id).toLowerCase().trim(), item);
            if (qtsId) bankMapRef.current.set(qtsId.toLowerCase(), item);

            const textValues = [
              item.question_detail,
              item.question_title,
              item.question_text,
              item.title,
              typeof item.question === 'string' && !item.question.startsWith('QTS-') ? item.question : null
            ].filter(Boolean);

            textValues.forEach((txt: string) => {
              bankMapRef.current.set(String(txt).toLowerCase().trim(), item);
            });
          };

          try {
            const bankRes = await getQuestions();
            const list = Array.isArray(bankRes)
              ? bankRes
              : (bankRes?.data?.questions || bankRes?.message?.data?.questions || bankRes?.questions || []);
            if (Array.isArray(list) && list.length > 0) {
              list.forEach(indexBankItem);
            }
          } catch (enrichErr) {
            console.warn("Could not enrich quiz questions with bank:", enrichErr);
          }

          // Fetch individual question details in parallel if missing from bankMapRef
          const missingQuestionIds = rawQuestions
            .map((q: any) => q.question || q.name)
            .filter((qId: string) => {
              if (!qId) return false;
              const low = String(qId).toLowerCase();
              const match = bankMapRef.current.get(low);
              return !match || (!match.options && !match.option_1);
            });

          if (missingQuestionIds.length > 0) {
            try {
              const uniqueMissingIds = Array.from(new Set(missingQuestionIds));
              const indivRes = await Promise.all(
                uniqueMissingIds.map((id: any) => getQuestion(id).catch(() => null))
              );
              indivRes.forEach(indexBankItem);
            } catch (indivErr) {
              console.warn("Could not fetch missing question details:", indivErr);
            }
          }

          data.questions = rawQuestions.map((q: any) => {
            const rawRef = q.question || q.name || '';
            const textRef = q.question_detail || q.question_title || q.question_text || q.title || (typeof q.question === 'string' && !q.question.startsWith('QTS-') ? q.question : '') || '';
            const match =
              (textRef ? bankMapRef.current.get(String(textRef).toLowerCase().trim()) : null) ||
              (q.question ? bankMapRef.current.get(String(q.question).toLowerCase().trim()) : null) ||
              (q.name ? bankMapRef.current.get(String(q.name).toLowerCase().trim()) : null) ||
              (typeof rawRef === 'string' ? bankMapRef.current.get(rawRef.toLowerCase().trim()) : null);

            const normalizedOptions = parseOptions(q, match);
            const resolvedQtsId = resolveQuestionId({ ...match, ...q });

            const questionDetail =
              q.question_detail ||
              q.question_title ||
              q.question_text ||
              q.title ||
              match?.question_detail ||
              match?.question_title ||
              match?.question_text ||
              match?.title ||
              (typeof q.question === 'string' && !q.question.startsWith('QTS-') ? q.question : '') ||
              rawRef;

            return {
              ...q,
              question: resolvedQtsId,
              question_id: resolvedQtsId,
              qts_id: resolvedQtsId,
              question_detail: questionDetail,
              marks: Number(q.marks) || Number(match?.marks) || 1,
              type: q.type || match?.type || 'Choices',
              options: normalizedOptions,
            };
          });

          setQuiz({
            ...data,
            name: data.name || name,
            title: data.title || data.name || name,
            max_attempts: Number(data.max_attempts) || 3,
            total_marks: Number(data.total_marks) || 0,
            passing_percentage: Number(data.passing_percentage) || 100,
            questions: data.questions,
          });
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
    fetchSubmissions();
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
    setSubmitted(false);
    setSubmissionError(null);
    setLastSubmissionId(null);
    setLastSubmissionResult(null);
    setCurrentQuestionIndex(0);
  };

  const handleAnswer = (question: QuizQuestion, answerValue: string) => {
    const qKey = resolveQuestionId(question);
    setAnswers(prev => ({
      ...prev,
      [qKey]: answerValue,
      [question.name]: answerValue,
      ...(question.question ? { [question.question]: answerValue } : {}),
      ...(question.question_id ? { [question.question_id]: answerValue } : {}),
      ...(question.question_detail ? { [question.question_detail]: answerValue } : {}),
      ...((question as any).qts_id ? { [(question as any).qts_id]: answerValue } : {})
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

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setSubmissionError(null);

    try {
      // Build answers payload matching exact requested format:
      // {
      //   "quiz": "dxfcgvhbn",
      //   "answers": [
      //     { "question": "QTS-2026-00008", "answer": "Project Management" },
      //     { "question": "QTS-2026-00009", "answer": "Lessons" }
      //   ]
      // }
      const answersPayload: QuizSubmissionAnswer[] = (quiz.questions || [])
        .map((q: any) => {
          const qId = resolveQuestionId(q);

          const userAns =
            answers[qId] ??
            (q.qts_id ? answers[q.qts_id] : undefined) ??
            (q.question ? answers[q.question] : undefined) ??
            (q.question_id ? answers[q.question_id] : undefined) ??
            (q.question_detail ? answers[q.question_detail] : undefined) ??
            answers[q.name] ??
            "";

          let finalAnswer = String(userAns || "").trim();
          if (q.options && q.options.length > 0) {
            const matchedOpt = q.options.find((opt: any, oIdx: number) => {
              const key = opt.key || `option_${oIdx + 1}`;
              const label = typeof opt === 'string' ? opt : (opt.option || opt.value || opt.text || opt.title || '');
              return (
                userAns === key ||
                userAns === label ||
                userAns.toLowerCase() === String(key).toLowerCase() ||
                userAns.toLowerCase() === String(label).toLowerCase() ||
                userAns === `option_${oIdx + 1}`
              );
            });
            if (matchedOpt) {
              const label = typeof matchedOpt === 'string' ? matchedOpt : (matchedOpt.option || matchedOpt.value || matchedOpt.text || matchedOpt.title || '');
              if (label) {
                finalAnswer = String(label).trim();
              }
            }
          }

          return {
            question: qId,
            answer: finalAnswer
          };
        })
        .filter((item) => Boolean(item.question && item.answer && item.answer.trim().length > 0));

      const payload: CreateQuizSubmissionPayload = {
        quiz: quiz.name || name,
        answers: answersPayload
      };

      const res = await createQuizSubmission(payload);
      
      const subId =
        typeof res === "string"
          ? res
          : (res?.name || res?.submission || res?.submission_name || res?.data?.name || res?.message?.name || res?.id || "");

      if (subId) {
        setLastSubmissionId(subId);
        try {
          const details = await getQuizSubmissionDetails(subId);
          if (details) {
            setLastSubmissionResult(details);
          }
        } catch (detailErr) {
          console.warn("Could not fetch submission details immediately:", detailErr);
        }
      }

      await fetchSubmissions();
      setSubmitted(true);
    } catch (err: any) {
      console.error("Failed to submit quiz:", err);
      setSubmissionError(err?.message || "Failed to submit assessment. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
            
            {/* Live Evaluation Highlight from get_quiz_submission_details */}
            {lastSubmissionResult && (
              <div className="mb-6 p-5 rounded-xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 border border-indigo-100 text-left">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      Evaluation Result
                    </span>
                    <h4 className="text-2xl font-extrabold text-gray-900 mt-1">
                      {lastSubmissionResult.score !== undefined ? lastSubmissionResult.score : (lastSubmissionResult.marks ?? "-")}{" "}
                      <span className="text-xs font-semibold text-gray-400">/ {totalCalculatedMarks} Marks</span>
                    </h4>
                    {lastSubmissionResult.percentage !== undefined && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Achieved <span className="font-bold text-gray-800">{lastSubmissionResult.percentage}%</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                      lastSubmissionResult.status === "Passed" || (lastSubmissionResult.percentage !== undefined && Number(lastSubmissionResult.percentage) >= Number(quiz.passing_percentage))
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}>
                      {lastSubmissionResult.status === "Passed" || (lastSubmissionResult.percentage !== undefined && Number(lastSubmissionResult.percentage) >= Number(quiz.passing_percentage)) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Passed
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          {lastSubmissionResult.status || "Completed"}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 text-xs uppercase tracking-wider">
                Submission Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <span className="block text-xs text-gray-500 mb-1">Answered</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {(quiz.questions || []).filter((q: any) => Boolean(answers[q.question_id || q.question || q.name] || answers[q.name] || answers[q.question])).length}{" "}
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
              {(lastSubmissionId || lastSubmissionResult) && (
                <button
                  type="button"
                  onClick={() => handleViewResult(lastSubmissionId || lastSubmissionResult?.name)}
                  className="inline-flex justify-center items-center px-6 py-2.5 font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex-1 text-sm cursor-pointer"
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  View Evaluation
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  startQuiz();
                }}
                className="inline-flex justify-center items-center px-6 py-2.5 font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors flex-1 text-sm shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Retake Assessment
              </button>
              <Link
                href="/quizzes"
                onClick={(e) => {
                  e.preventDefault();
                  navigateBack(router, "/quizzes");
                }}
                className="inline-flex justify-center items-center px-6 py-2.5 font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors flex-1 text-sm shadow-sm cursor-pointer"
              >
                Back to Quizzes
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
                        const optKey = opt.key || `option_${oIdx + 1}`;
                        const optLabel = typeof opt === 'string' ? opt : (opt.option || (opt as any).value || (opt as any).text || (opt as any).title || optKey);
                        const qId = resolveQuestionId(currentQuestion);
                        const isSelected =
                          answers[qId] === optLabel ||
                          answers[currentQuestion.name] === optLabel ||
                          (currentQuestion.question_detail && answers[currentQuestion.question_detail] === optLabel) ||
                          answers[qId] === optKey ||
                          answers[currentQuestion.name] === optKey;

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleAnswer(currentQuestion, String(optLabel).trim())}
                            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between text-sm ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-2 ring-indigo-500/20 font-medium'
                                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-800'
                            }`}
                          >
                            <span>{optLabel}</span>
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
                        value={
                          answers[resolveQuestionId(currentQuestion)] ||
                          answers[currentQuestion.question_id || currentQuestion.question || currentQuestion.name] ||
                          (currentQuestion.question_detail ? answers[currentQuestion.question_detail] : '') ||
                          answers[currentQuestion.name] ||
                          ""
                        }
                        onChange={(e) => handleAnswer(currentQuestion, e.target.value)}
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>

              {submissionError && (
                <div className="mx-6 md:mx-8 mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submissionError}</span>
                </div>
              )}

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
                    disabled={submitting}
                    className="px-6 py-2 rounded-lg font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 rounded-lg font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
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

      {/* Tab Navigation for Instructors */}
      {isInstructor && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "overview"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileQuestion className="w-4 h-4" />
              <span>Assessment Details</span>
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`py-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "submissions"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Student Submissions</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                {submissions.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Details Body */}
      <div className="flex-1 py-10 px-4 flex justify-center">
        <div className="max-w-4xl w-full">
          {/* TAB: INSTRUCTOR SUBMISSIONS */}
          {isInstructor && activeTab === "submissions" ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Student Assessment Submissions
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Showing all student attempts for <span className="font-semibold text-gray-700">{quiz.title || quiz.name}</span>. Click on any row to view full result breakdown.
                    </p>
                  </div>
                  <button
                    onClick={fetchSubmissions}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>

                {loadingSubmissions ? (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                    <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-xs font-medium">Loading student submissions...</p>
                  </div>
                ) : submissions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Submission ID</th>
                          <th className="py-3 px-4">Score</th>
                          <th className="py-3 px-4">Result</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {submissions.map((sub: any, idx: number) => {
                          const subId = sub.name || sub.submission || `SUB-${idx}`;
                          const student = sub.member_name || sub.member || sub.owner || "Student";
                          const scoreVal = sub.score !== undefined ? sub.score : (sub.marks !== undefined ? sub.marks : "-");
                          const pctVal = sub.percentage !== undefined ? Number(sub.percentage) : null;
                          const isPassed = sub.status === "Passed" || (pctVal !== null && pctVal >= Number(quiz.passing_percentage));

                          return (
                            <tr key={subId} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="py-3.5 px-4">
                                <p className="font-semibold text-gray-900">{student}</p>
                                <p className="text-[11px] text-gray-400">{sub.owner || sub.member}</p>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-gray-600">
                                {subId}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-gray-900">
                                {scoreVal}
                                {pctVal !== null && (
                                  <span className="text-gray-400 font-normal ml-1">({pctVal}%)</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPassed
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}>
                                  {isPassed ? "Passed" : (sub.status || "Completed")}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                                {sub.creation ? formatDate(sub.creation) : "Recent"}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => handleViewResult(subId)}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors cursor-pointer border border-indigo-200/60"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Result</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-semibold">No student submissions recorded yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Student attempts and results will automatically appear here.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB: OVERVIEW (METRICS & STUDENT PREVIOUS ATTEMPTS) */
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

                {/* STUDENT ROLE: PREVIOUS ATTEMPTS & RESULTS */}
                {!isInstructor && (
                  <div className="mb-6 p-5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-4 h-4 text-indigo-600" />
                        Your Assessment History & Results
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {submissions.length} / {quiz.max_attempts} attempts used
                      </span>
                    </div>

                    {loadingSubmissions ? (
                      <div className="py-4 text-center text-xs text-gray-400">Loading your past attempts...</div>
                    ) : submissions.length > 0 ? (
                      <div className="space-y-2 mt-3">
                        {submissions.map((sub: any, idx: number) => {
                          const subId = sub.name || sub.submission || `SUB-${idx}`;
                          const isPassed = sub.status === "Passed" || (sub.percentage !== undefined && Number(sub.percentage) >= Number(quiz.passing_percentage));
                          return (
                            <div
                              key={subId}
                              className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] ${
                                  isPassed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                }`}>
                                  #{idx + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 font-mono">{subId}</p>
                                  <p className="text-[11px] text-slate-400">
                                    {sub.creation ? formatDate(sub.creation) : "Completed"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="font-bold text-slate-900">
                                    {sub.score !== undefined ? sub.score : "-"}{" "}
                                    {sub.percentage !== undefined && <span className="text-slate-400 font-normal">({sub.percentage}%)</span>}
                                  </p>
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isPassed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                  }`}>
                                    {isPassed ? "Passed" : (sub.status || "Completed")}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleViewResult(subId)}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Result</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">
                        You have not attempted this assessment yet. Click the button below to start your test.
                      </p>
                    )}
                  </div>
                )}

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
                      className="w-full md:w-1/2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 active:scale-[0.99] cursor-pointer"
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
          )}
        </div>
      </div>

      {/* QUIZ RESULT MODAL (Calls get_quiz_result with submission param) */}
      {resultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Quiz Assessment Result</h3>
                  <p className="text-xs text-gray-500 font-mono">
                    ID: {selectedResult?.name || selectedResult?.submission || "Evaluation"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setResultModalOpen(false);
                  setSelectedResult(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {loadingResult ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs text-gray-500 font-medium">Fetching evaluation result from server...</p>
                </div>
              ) : selectedResult ? (
                <>
                  {/* Score Highlight Box */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 border border-indigo-100 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                        Assessment Performance
                      </span>
                      <h4 className="text-3xl font-extrabold text-gray-900 mt-1">
                        {selectedResult.score !== undefined ? selectedResult.score : (selectedResult.marks || "-")}{" "}
                        <span className="text-sm font-semibold text-gray-400">/ {totalCalculatedMarks} Marks</span>
                      </h4>
                      {selectedResult.percentage !== undefined && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Achieved <span className="font-bold text-gray-800">{selectedResult.percentage}%</span> (Passing requirement: {quiz.passing_percentage}%)
                        </p>
                      )}
                    </div>
                    <div>
                      {(() => {
                        const isPassed =
                          selectedResult.status === "Passed" ||
                          selectedResult.status === "Pass" ||
                          selectedResult.result === "Passed" ||
                          selectedResult.result === "Pass" ||
                          (selectedResult.percentage !== undefined && Number(selectedResult.percentage) >= Number(quiz.passing_percentage));
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                            isPassed
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {isPassed ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Passed
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                {selectedResult.status || selectedResult.result || "Failed"}
                              </>
                            )}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Submission Details Meta */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Candidate</span>
                      <span className="font-semibold text-gray-800 truncate block mt-0.5">
                        {selectedResult.member_name || selectedResult.member || selectedResult.owner || currentUserEmail || "Student"}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Submission Date</span>
                      <span className="font-semibold text-gray-800 block mt-0.5">
                        {selectedResult.creation ? formatDate(selectedResult.creation) : "Recorded"}
                      </span>
                    </div>
                  </div>

                  {/* Questions Breakdown / Review if available */}
                  {Array.isArray(selectedResult.questions || selectedResult.results) && (selectedResult.questions || selectedResult.results).length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Question Breakdown & Answers
                      </h5>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {(selectedResult.questions || selectedResult.results).map((item: any, qIdx: number) => (
                          <div key={qIdx} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 text-xs flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-gray-800">
                                {qIdx + 1}. {item.question || item.title || `Question ${qIdx + 1}`}
                              </p>
                              {item.selected_option && (
                                <p className="text-[11px] text-gray-500 mt-1">
                                  Your answer: <span className="font-semibold text-gray-700">{item.selected_option}</span>
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              item.is_correct || item.score > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}>
                              {item.is_correct || item.score > 0 ? "Correct" : "Incorrect"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-xs text-gray-500">
                  No evaluation details returned for this submission ID.
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setResultModalOpen(false);
                  setSelectedResult(null);
                }}
                className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
