"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getAssignment, createAssignmentSubmission, updateAssignment, deleteAssignment, getAssignmentSubmissions } from '@/services/lms.services';
import { ArrowLeft, BookOpen, Send, Upload, CheckCircle, Trash2, Edit, Users, ExternalLink } from 'lucide-react';

export default function AssignmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const name = Array.isArray(params?.name) ? params.name[0] : params?.name;

  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionAnswer, setSubmissionAnswer] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rolesStr = localStorage.getItem("roles");
      if (rolesStr) {
        try {
          const roles = JSON.parse(rolesStr);
          setIsInstructor(roles.includes("Instructor") || roles.includes("System Manager") || roles.includes("Administrator"));
        } catch (e) {}
      }
      
      const apiKey = localStorage.getItem("apiKey");
      if (!apiKey) {
        router.push("/login");
        return;
      }
    }

    if (name) {
      fetchAssignment(name);
    }
  }, [name, router]);

  const fetchAssignment = async (assignmentName: string) => {
    setLoading(true);
    try {
      const response = await getAssignment(assignmentName);
      const rawData = response?.data || response;
      let assignmentsData = rawData?.message?.data || rawData?.data || rawData;
      if (assignmentsData?.assignments && Array.isArray(assignmentsData.assignments)) {
        assignmentsData = assignmentsData.assignments[0];
      } else if (assignmentsData?.assignment) {
        assignmentsData = assignmentsData.assignment;
      }
      setAssignment(assignmentsData);
      
      // Pre-fill if already submitted
      if (assignmentsData?.submission_url) setSubmissionUrl(assignmentsData.submission_url);
      if (assignmentsData?.content) setSubmissionAnswer(assignmentsData.content);
      // If instructor, fetch submissions
      const rolesStr = localStorage.getItem("roles") || "[]";
      if (rolesStr.includes("Instructor") || rolesStr.includes("System Manager") || rolesStr.includes("Administrator")) {
        try {
          const subRes = await getAssignmentSubmissions();
          const subRaw = subRes?.data || subRes;
          let list: any[] = [];
          
          if (Array.isArray(subRaw)) list = subRaw;
          else if (subRaw && typeof subRaw === 'object') {
            if (Array.isArray(subRaw.submissions)) list = subRaw.submissions;
            else if (subRaw.data && Array.isArray(subRaw.data.submissions)) list = subRaw.data.submissions;
            else if (subRaw.message && Array.isArray(subRaw.message.data)) list = subRaw.message.data;
            else if (subRaw.message && Array.isArray(subRaw.message)) list = subRaw.message;
            else if (subRaw.message && subRaw.message.data && Array.isArray(subRaw.message.data.submissions)) list = subRaw.message.data.submissions;
            else if (Array.isArray(subRaw.data)) list = subRaw.data;
          }

          console.log("Extracted Submissions List:", list);
          console.log("Current Assignment Name:", name);

          // Filter submissions for this assignment (case-insensitive, trim)
          const targetName = String(name || '').trim().toLowerCase();
          const targetDataName = String(assignmentsData?.name || '').trim().toLowerCase();
          
          const filtered = list.filter((s: any) => {
            const sName = String(s.assignment || '').trim().toLowerCase();
            return sName === targetName || sName === targetDataName;
          });
          setSubmissions(filtered);
        } catch (e) {
          console.error("Failed to fetch submissions", e);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch assignment details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      const formData = new FormData();
      formData.append('assignment', name || '');
      
      const memberEmail = localStorage.getItem("userEmail") || '';
      if (memberEmail) formData.append('member', memberEmail);

      if (submissionUrl) formData.append('submission_url', submissionUrl);
      if (submissionAnswer) {
        formData.append('content', submissionAnswer);
        formData.append('answer', submissionAnswer); // send both just in case API relies on either
      }
      if (file) formData.append('attachment', file);
      
      let response;
      if (assignment?.status && assignment.status !== 'Pending') {
        // If already submitted, maybe use update
        formData.append('name', assignment.submission_name || assignment.name);
        response = await updateAssignment(formData);
      } else {
        response = await createAssignmentSubmission(formData);
      }
      
      const resData = response?.data?.message?.data || response?.data?.data || response?.data;
      if (resData) {
        setAssignment((prev: any) => ({
          ...prev,
          status: resData.status || 'Submitted',
          submission_name: resData.name,
          answer: resData.answer || resData.content,
          submission_url: resData.submission_url || submissionUrl
        }));
      }
      
      setSubmitSuccess(true);
      
    } catch (err: any) {
      setError(err.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!name) return;
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    
    setDeleting(true);
    try {
      await deleteAssignment(name);
      router.push(assignment?.course ? `/course/${assignment.course}` : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to delete assignment');
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Header */}
      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Link href={assignment?.course ? `/course/${assignment.course}` : '/dashboard'} className="inline-flex items-center text-indigo-300 hover:text-white mb-6 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Link>
          
          {loading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-8 bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : assignment ? (
            <>
              <div className="flex flex-wrap items-center justify-between mb-3 gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    (assignment.status && assignment.status !== 'Pending') || assignment.submission_count > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {(assignment.status && assignment.status !== 'Pending') || assignment.submission_count > 0 ? 'Submitted' : 'Pending'}
                  </span>
                  {assignment.course && (
                    <span className="text-slate-400 text-sm flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      {assignment.course}
                    </span>
                  )}
                </div>
                
                {isInstructor && (
                  <div className="flex items-center gap-3">
                    <Link href={`/assignments/${name}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700">
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
                {assignment.title || assignment.assignment_title || assignment.name || 'Assignment Details'}
              </h1>
            </>
          ) : (
            <h1 className="text-3xl font-extrabold text-white">Assignment Not Found</h1>
          )}
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-6 relative z-10">
        
        {error && !loading && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
            {error}
          </div>
        )}
        
        {submitSuccess && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Assignment submitted successfully!</span>
          </div>
        )}

        {!loading && assignment && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column: Instructions */}
            <div className="space-y-8">
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Instructions</h2>
                <div 
                  className="prose prose-slate prose-indigo max-w-none text-slate-600"
                  dangerouslySetInnerHTML={{ __html: assignment.description || assignment.question || 'No instructions provided for this assignment.' }}
                />
              </div>
            </div>

            {/* Right Column: Submission Form (for Students) */}
            {!isInstructor && (
              <div className="space-y-8">
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">Your Submission</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {(!assignment?.type || assignment.type === 'Text') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Your Answer / Code
                        </label>
                        <textarea
                          required
                          rows={14}
                          placeholder="Write your program or text answer here..."
                          value={submissionAnswer}
                          onChange={(e) => setSubmissionAnswer(e.target.value)}
                          className="w-full px-5 py-4 bg-[#1e1e2e] text-[#cdd6f4] font-mono text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow resize-y shadow-inner border border-slate-800"
                          style={{ tabSize: 4 }}
                          spellCheck={false}
                        ></textarea>
                      </div>
                    )}

                    {assignment?.type === 'URL' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Project URL
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://github.com/..."
                          value={submissionUrl}
                          onChange={(e) => setSubmissionUrl(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                        />
                      </div>
                    )}

                    {assignment?.type === 'Document' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Attachment
                        </label>
                        <label className="flex items-center justify-center w-full px-4 py-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer group">
                          <div className="flex flex-col items-center">
                            <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 mb-2" />
                            <span className="text-sm text-slate-500 font-medium text-center">
                              {file ? file.name : 'Click to upload file'}
                            </span>
                          </div>
                          <input 
                            type="file" 
                            required={!file && (!assignment.submission_url && !assignment.submission_name)}
                            className="hidden" 
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || ((assignment?.status && assignment.status !== 'Pending') || assignment?.submission_count > 0)}
                      className="w-full mt-2 flex items-center justify-center py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Submitting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          {((assignment?.status && assignment.status !== 'Pending') || assignment?.submission_count > 0) ? 'Already Submitted' : 'Submit Assignment'}
                        </span>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Right Column: Instructor Submissions View */}
            {isInstructor && (
              <div className="space-y-8">
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Student Submissions ({submissions.length})
                  </h2>

                  {submissions.length > 0 ? (
                    <div className="space-y-4">
                      {submissions.map((sub: any) => (
                        <div key={sub.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-slate-900">{sub.member_name || sub.member || sub.owner}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{sub.owner}</p>
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${sub.status === 'Graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {sub.status || 'Submitted'}
                            </span>
                          </div>
                          
                          {/* Answer rendering based on type */}
                          {(!assignment?.type || assignment.type === 'Text') && sub.content && (
                            <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {sub.content}
                            </div>
                          )}
                          
                          {assignment?.type === 'URL' && sub.submission_url && (
                            <a href={sub.submission_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline">
                              <ExternalLink className="w-4 h-4" /> View Project URL
                            </a>
                          )}

                          {assignment?.type === 'Document' && (sub.attachment || sub.submission_attachment) && (
                            <a href={sub.attachment || sub.submission_attachment} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline">
                              <ExternalLink className="w-4 h-4" /> View Attachment
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-medium">No submissions yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
