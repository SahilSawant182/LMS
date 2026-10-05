"use client";

import { useEffect, useState } from "react";
import { getQuiz } from "@/services/lms.services";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface QuizQuestion {
  name: string;
  question: string;
  question_detail: string;
  marks: number;
  type: string;
}

interface QuizDetails {
  name: string;
  title: string;
  max_attempts: number;
  total_marks: number;
  passing_percentage: number;
  questions: QuizQuestion[];
}

export default function QuizDetailsPage() {
  const params = useParams();
  const name = params.name as string;

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Quiz taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!name) return;
    
    const fetchQuiz = async () => {
      try {
        const res = await getQuiz(name);
        // Extract data property if response is wrapped
        const data = res?.data ? res.data : res;
        if (data) {
          setQuiz(data);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch quiz details");
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
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
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
            <p className="text-gray-500 mb-6">{error || "The requested assessment could not be loaded."}</p>
            <Link href="/quizzes" className="inline-flex justify-center items-center px-4 py-2 font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors w-full">
              Return to Quizzes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const startQuiz = () => setStarted(true);

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

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const progressPercentage = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 py-12 px-4 flex flex-col items-center justify-center">
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm max-w-xl w-full text-center border border-gray-200">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Assessment Submitted</h2>
            <p className="text-gray-500 mb-8">You have completed <span className="font-medium text-gray-900">{quiz.title}</span>.</p>
            
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wider">Submission Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <span className="block text-xs text-gray-500 mb-1">Answered</span>
                  <span className="text-2xl font-bold text-gray-900">{Object.keys(answers).length} <span className="text-sm font-medium text-gray-400">/ {quiz.questions.length}</span></span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <span className="block text-xs text-gray-500 mb-1">Total Marks</span>
                  <span className="text-2xl font-bold text-gray-900">{quiz.total_marks}</span>
                </div>
              </div>
            </div>

            <Link href="/quizzes" className="inline-flex justify-center items-center px-6 py-2.5 font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors w-full">
              Return to Assessment List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <Navbar />
        
        {/* Hero Area */}
        <div className="relative overflow-hidden bg-slate-900 text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl"></div>
            <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
          </div>

          <div className="max-w-3xl mx-auto relative z-10">
            <div className="mb-4 flex items-center text-xs">
              <Link href="/quizzes" className="inline-flex items-center gap-1.5 font-medium text-indigo-200 hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                Back to Quizzes
              </Link>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-white">
              {quiz.title}
            </h1>
            <p className="text-indigo-100 mt-1 text-sm max-w-2xl">
              Please read the instructions carefully before starting. Make sure you have a stable connection and enough time to complete the assessment.
            </p>
          </div>
        </div>

        <div className="flex-1 py-12 px-4 flex justify-center">
          <div className="max-w-3xl w-full">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 md:p-8">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Assessment Details
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center p-3 rounded-lg bg-blue-50/50 border border-blue-100/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Total Questions</p>
                      <p className="text-base font-bold text-gray-900">{quiz.questions.length}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 rounded-lg bg-indigo-50/50 border border-indigo-100/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Passing Score</p>
                      <p className="text-base font-bold text-gray-900">{quiz.passing_percentage}%</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 rounded-lg bg-purple-50/50 border border-purple-100/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Max Attempts</p>
                      <p className="text-base font-bold text-gray-900">{quiz.max_attempts}</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 rounded-lg bg-emerald-50/50 border border-emerald-100/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 11V9a2 2 0 00-2-2m2 4v4a2 2 0 104 0v-1m-4-3H9m2 0h4m6 1a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Total Marks</p>
                      <p className="text-base font-bold text-gray-900">{quiz.total_marks}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center border-t border-gray-100 pt-6">
                  <button 
                    onClick={startQuiz}
                    className="w-full md:w-1/2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    Begin Assessment Now
                    <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </p>
          </div>
          <div className="w-32">
            <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 md:p-8">
            <div className="flex justify-between items-start mb-6 gap-4">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                {currentQuestion.question_detail}
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 shrink-0">
                {currentQuestion.marks} Marks
              </span>
            </div>

            <div className="mt-6">
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">Your Answer</label>
              <textarea 
                id="answer"
                className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none text-gray-900 min-h-[120px] text-sm resize-y"
                placeholder="Type your answer..."
                value={answers[currentQuestion.name] || ""}
                onChange={(e) => handleAnswer(currentQuestion.name, e.target.value)}
              ></textarea>
              {currentQuestion.type === "Choices" && (
                <p className="mt-2 text-xs text-gray-500 italic flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Note: Options were not provided; please manually enter your answer.
                </p>
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
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              Previous
            </button>
            
            {isLastQuestion ? (
              <button 
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors flex items-center"
              >
                Submit
                <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </button>
            ) : (
              <button 
                onClick={handleNext}
                className="px-6 py-2 rounded-lg font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors flex items-center"
              >
                Next
                <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
