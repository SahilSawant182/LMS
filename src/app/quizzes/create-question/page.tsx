"use client";

import { useState, useEffect, Suspense } from "react";
import { createQuestion, CreateQuestionPayload } from "@/services/lms.services";
import { isAuthorizedInstructor } from "@/services/auth.services";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ShieldAlert, ArrowLeft } from "lucide-react";

function CreateQuestionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || (typeof window !== 'undefined' ? sessionStorage.getItem('lms_return_url') : null);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [question, setQuestion] = useState("");
  const [type, setType] = useState("Single Choice");
  
  const [possibilities, setPossibilities] = useState(["", "", "", ""]);
  const [explanations, setExplanations] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState<number>(0); // for Single Choice
  const [correctOptions, setCorrectOptions] = useState<boolean[]>([false, false, false, false]); // for Multiple Choice
  const [marks, setMarks] = useState<number>(10); // for Open Ended

  useEffect(() => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("apiKey");
      if (!apiKey) {
        router.push("/login");
        return;
      }
      const authorized = isAuthorizedInstructor();
      setIsAuthorized(authorized);
      setCheckingAuth(false);
    }
  }, [router]);

  const handlePossibilityChange = (index: number, value: string) => {
    const newPossibilities = [...possibilities];
    newPossibilities[index] = value;
    setPossibilities(newPossibilities);
  };

  const handleExplanationChange = (index: number, value: string) => {
    const newExplanations = [...explanations];
    newExplanations[index] = value;
    setExplanations(newExplanations);
  };

  const toggleCorrectOption = (index: number) => {
    const newCorrectOptions = [...correctOptions];
    newCorrectOptions[index] = !newCorrectOptions[index];
    setCorrectOptions(newCorrectOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setError("Unauthorized. Question creation is restricted to instructors and administrators.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let payload: CreateQuestionPayload;

      if (type === "Single Choice" || type === "Multiple Choice") {
        const isMultiple = type === "Multiple Choice";
        payload = {
          question: question.trim(),
          type: "Choices",
          multiple: isMultiple ? 1 : 0,
        };
        
        possibilities.forEach((pos, idx) => {
          const num = idx + 1;
          payload[`option_${num}`] = pos;
          if (isMultiple) {
            payload[`is_correct_${num}`] = correctOptions[idx] ? 1 : 0;
          } else {
            payload[`is_correct_${num}`] = correctOption === idx ? 1 : 0;
          }
          if (explanations[idx]?.trim()) {
            payload[`explanation_${num}`] = explanations[idx].trim();
          }
        });
      } else if (type === "User Input") {
        payload = {
          question: question.trim(),
          type: "User Input",
          multiple: 0,
        };
        possibilities.forEach((pos, idx) => {
          if (pos.trim()) {
            payload[`possibility_${idx + 1}`] = pos.trim();
          }
        });
      } else {
        // Open Ended
        payload = {
          question: question.trim(),
          type: "Open Ended",
          multiple: 0,
          marks: Number(marks) || 10,
        };
      }

      await createQuestion(payload);
      setSuccess(true);
      // Reset form
      setQuestion("");
      setPossibilities(["", "", "", ""]);
      setExplanations(["", "", "", ""]);
      setCorrectOption(0);
      setCorrectOptions([false, false, false, false]);
      
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('lms_return_url');
      }
      setTimeout(() => {
        if (returnUrl) {
          router.push(returnUrl);
        } else {
          router.push("/quizzes?tab=questions");
        }
      }, 1200);
      
    } catch (err: any) {
      setError(err.response?.data?.message?.message || err.message || "Failed to create question");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Navbar />
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5 border border-amber-100 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full inline-block mb-3">
              Instructor Role Required
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Access Restricted</h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              Creating assessment questions is restricted to authorized instructors and administrators. As a student, you can view and take quizzes from the assessments catalog.
            </p>
            <Link
              href="/quizzes"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Assessments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      {/* Hero Area */}
      <div className="bg-slate-900 text-white pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link href={returnUrl || "/quizzes"} className="inline-flex items-center text-indigo-300 hover:text-white mb-6 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {returnUrl ? "Back to Lesson Editor" : "Back to Assessments"}
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Create Question</h1>
          <p className="mt-2 text-indigo-200 max-w-2xl text-sm md:text-base">
            Add a new question to the LMS database. Choose the question type and specify options to build comprehensive assessments.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          
          <div className="p-6 md:p-10">
            {success && (
              <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start animate-fade-in-down">
                <svg className="w-6 h-6 text-green-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div className="flex-1">
                  <h3 className="text-green-800 font-bold">Question created successfully!</h3>
                  <p className="text-green-600 text-sm mt-0.5">
                    {returnUrl ? "Redirecting back to your editor..." : "Redirecting to the Question Bank..."}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <Link
                      href={returnUrl || "/quizzes?tab=questions"}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
                    >
                      View in {returnUrl ? "Editor" : "Question Bank"} now &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start animate-fade-in-down">
                <svg className="w-6 h-6 text-red-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                  <h3 className="text-red-800 font-semibold">Failed to create question</h3>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Question Text */}
              <div>
                <label htmlFor="question" className="block text-sm font-semibold text-gray-900 mb-2">
                  Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="question"
                  rows={4}
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-4 outline-none border transition-all resize-y text-gray-900"
                  placeholder="E.g., What is Python?"
                />
              </div>

              {/* Question Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="type" className="block text-sm font-semibold text-gray-900 mb-2">
                    Question Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 px-4 py-3 outline-none border transition-all text-gray-900"
                  >
                    <option value="Single Choice">Single Choice</option>
                    <option value="Multiple Choice">Multiple Choice</option>
                    <option value="User Input">User Input</option>
                    <option value="Open Ended">Open Ended</option>
                  </select>
                </div>
                {type === "Open Ended" && (
                  <div>
                    <label htmlFor="marks" className="block text-sm font-semibold text-gray-900 mb-2">
                      Marks <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="marks"
                      type="number"
                      min="1"
                      max="100"
                      value={marks}
                      onChange={(e) => setMarks(Number(e.target.value) || 1)}
                      className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 px-4 py-3 outline-none border transition-all text-gray-900"
                    />
                  </div>
                )}
              </div>

              {/* Options */}
              {type !== "Open Ended" && (
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {type === "User Input" ? "Accepted Answers" : "Options"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {type === "User Input" 
                    ? "Provide up to 4 accepted answers for this user input question (the first one is required)." 
                    : "Provide 4 possibilities, select the correct one(s), and optionally add explanations."}
                </p>
                
                <div className="space-y-4">
                  {possibilities.map((possibility, index) => {
                    const isCorrect = type === "Single Choice" ? correctOption === index : correctOptions[index];
                    return (
                      <div key={index} className={`flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl border transition-all ${isCorrect && type !== "User Input" ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center gap-3 w-full sm:w-1/2 mt-1 sm:mt-0">
                          {type === "Single Choice" && (
                            <input
                              type="radio"
                              name="correctOption"
                              checked={correctOption === index}
                              onChange={() => setCorrectOption(index)}
                              className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer shrink-0 mt-0.5"
                            />
                          )}
                          {type === "Multiple Choice" && (
                            <input
                              type="checkbox"
                              checked={correctOptions[index]}
                              onChange={() => toggleCorrectOption(index)}
                              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0 mt-0.5"
                            />
                          )}
                          {type === "User Input" && (
                            <div className="w-5 h-5 border border-gray-300 rounded bg-gray-100 flex-shrink-0 cursor-not-allowed opacity-50 mt-0.5" title="Any of these will be accepted"></div>
                          )}
                          <div className="flex-1 w-full">
                            <input
                              type="text"
                              required={index === 0} // First one is required
                              value={possibility}
                              onChange={(e) => handlePossibilityChange(index, e.target.value)}
                              placeholder={type === "User Input" ? `Accepted Answer ${index + 1}` : `Option ${index + 1}`}
                              className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-500 text-gray-900 placeholder-gray-400 py-1 transition-colors"
                            />
                          </div>
                        </div>
                        {type !== "User Input" && (
                          <div className="w-full sm:w-1/2">
                            <input
                              type="text"
                              value={explanations[index]}
                              onChange={(e) => handleExplanationChange(index, e.target.value)}
                              placeholder={`Explanation (optional)`}
                              className="w-full bg-white outline-none border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 placeholder-gray-400 px-3 py-1.5 text-sm transition-all"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Submit Button */}
              <div className="pt-6 flex items-center justify-end border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.push('/quizzes')}
                  className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 mr-4 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-3 rounded-xl font-semibold text-white shadow-md transition-all ${
                    loading 
                      ? 'bg-indigo-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    "Create Question"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateQuestionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
      <CreateQuestionForm />
    </Suspense>
  );
}
