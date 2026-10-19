"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getAssignment, createAssignmentSubmission, updateAssignmentSubmission, updateAssignment, deleteAssignment, getAssignmentSubmissions } from '@/services/lms.services';
import { getImageUrl } from '@/services/api.services';
import { ArrowLeft, BookOpen, Send, Upload, CheckCircle, Trash2, Edit, Users, ExternalLink, Clock } from 'lucide-react';

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
      
      const currentUserEmail = (typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || "") : "").trim().toLowerCase();
      const targetName = String(assignmentName || '').trim().toLowerCase();
      const targetDataName = String(assignmentsData?.name || '').trim().toLowerCase();
      const targetTitle = String(assignmentsData?.title || assignmentsData?.assignment_title || '').trim().toLowerCase();

      // Check local storage backup first
      let localSub: any = null;
      if (typeof window !== "undefined" && currentUserEmail) {
        try {
          const stored = localStorage.getItem(`lms_submission_${currentUserEmail}_${assignmentName}`) ||
                         localStorage.getItem(`lms_submission_${currentUserEmail}_${assignmentsData?.name}`) ||
                         localStorage.getItem(`lms_submission_${currentUserEmail}_${assignmentsData?.title}`);
          if (stored) {
            localSub = JSON.parse(stored);
          }
        } catch (e) {}
      }

      // Fetch submissions for this assignment
      let submissionsList: any[] = [];
      try {
        const subRes = await getAssignmentSubmissions({
          assignment: assignmentsData?.name || assignmentName,
          member: currentUserEmail,
          user: currentUserEmail
        });
        const subRaw: any = (subRes as any)?.data || subRes;
        
        if (Array.isArray(subRaw)) submissionsList = subRaw;
        else if (subRaw && typeof subRaw === 'object') {
          if (Array.isArray(subRaw.submissions)) submissionsList = subRaw.submissions;
          else if (subRaw.data && Array.isArray(subRaw.data.submissions)) submissionsList = subRaw.data.submissions;
          else if (subRaw.message && Array.isArray(subRaw.message.data)) submissionsList = subRaw.message.data;
          else if (subRaw.message && Array.isArray(subRaw.message.submissions)) submissionsList = subRaw.message.submissions;
          else if (Array.isArray(subRaw.data)) submissionsList = subRaw.data;
          else if (Array.isArray(subRaw.message)) submissionsList = subRaw.message;
        }
      } catch (subErr) {
        console.warn("Failed to fetch assignment submissions:", subErr);
      }

      // Find the user's submission
      const mySub = submissionsList.find((s: any) => {
        const sAssignment = String(s.assignment || '').trim().toLowerCase();
        const sTitle = String(s.assignment_title || '').trim().toLowerCase();
        const matchesAssignment = sAssignment === targetName || sAssignment === targetDataName || (targetTitle && sTitle === targetTitle);
        if (!matchesAssignment) return false;

        if (!currentUserEmail) return true;
        const sMember = String(s.member || s.owner || s.member_name || '').trim().toLowerCase();
        return !sMember || sMember.includes(currentUserEmail) || currentUserEmail.includes(sMember);
      }) || localSub;

      let resolvedStatus = assignmentsData?.status || 'Pending';
      let resolvedAnswer = '';
      let resolvedUrl = '';
      let isSub = false;

      if (mySub) {
        isSub = true;
        resolvedStatus = mySub.status || 'Submitted';
        resolvedAnswer = mySub.content || mySub.answer || mySub.text || '';
        resolvedUrl = mySub.submission_url || mySub.url || '';
        
        if (resolvedAnswer) setSubmissionAnswer(resolvedAnswer);
        if (resolvedUrl) setSubmissionUrl(resolvedUrl);
      } else {
        if (assignmentsData?.submission_url) setSubmissionUrl(assignmentsData.submission_url);
        if (assignmentsData?.content) setSubmissionAnswer(assignmentsData.content);
      }

      setAssignment({
        ...assignmentsData,
        status: isSub ? (resolvedStatus !== 'Pending' ? resolvedStatus : 'Submitted') : (assignmentsData?.status || 'Pending'),
        _is_submitted: isSub,
        submission_name: mySub?.name,
        submission_status: resolvedStatus,
        answer: resolvedAnswer,
        submission_url: resolvedUrl || assignmentsData?.submission_url,
        submission_attachment: mySub?.attachment || mySub?.submission_attachment
      });

      // Filter submissions for instructors
      const rolesStr = typeof window !== "undefined" ? (localStorage.getItem("roles") || "[]") : "[]";
      if (rolesStr.includes("Instructor") || rolesStr.includes("System Manager") || rolesStr.includes("Administrator")) {
        const filtered = submissionsList.filter((s: any) => {
          const sName = String(s.assignment || '').trim().toLowerCase();
          const sTitle = String(s.assignment_title || '').trim().toLowerCase();
          return sName === targetName || sName === targetDataName || (targetTitle && sTitle === targetTitle);
        });
        setSubmissions(filtered);
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
      const memberEmail = (typeof window !== "undefined" ? (localStorage.getItem("userEmail") || localStorage.getItem("user") || '') : '').trim();
      const assignmentId = assignment?.name || name || '';

      // Instant local persistence to ensure student's answer and status are never lost
      if (memberEmail && typeof window !== "undefined") {
        try {
          const payloadCache = {
            assignment: assignmentId,
            assignment_title: assignment?.title || assignmentId,
            member: memberEmail,
            content: submissionAnswer,
            answer: submissionAnswer,
            submission_url: submissionUrl,
            status: 'Submitted',
            submitted_at: new Date().toISOString()
          };
          localStorage.setItem(`lms_submission_${memberEmail.toLowerCase()}_${assignmentId}`, JSON.stringify(payloadCache));
          if (name && name !== assignmentId) {
            localStorage.setItem(`lms_submission_${memberEmail.toLowerCase()}_${name}`, JSON.stringify(payloadCache));
          }
        } catch (e) {}
      }

      const formData = new FormData();
      formData.append('assignment', assignmentId);
      if (memberEmail) formData.append('member', memberEmail);
      if (submissionUrl) formData.append('submission_url', submissionUrl);
      if (submissionAnswer) {
        formData.append('content', submissionAnswer);
        formData.append('answer', submissionAnswer);
      }
      if (file) formData.append('attachment', file);
      
      let response;
      if (assignment?._is_submitted && assignment?.submission_name) {
        formData.append('name', assignment.submission_name);
        response = await updateAssignmentSubmission(formData, assignment.submission_name);
      } else {
        response = await createAssignmentSubmission(formData);
      }
      
      const resData = response?.data?.message?.data || response?.data?.data || response?.message?.data || response?.data || response;
      const newStatus = resData?.status || 'Submitted';
      const subName = resData?.name || assignment?.submission_name;

      setAssignment((prev: any) => ({
        ...prev,
        status: newStatus,
        _is_submitted: true,
        submission_name: subName,
        submission_status: newStatus,
        answer: submissionAnswer,
        submission_url: submissionUrl
      }));
      
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
      router.push('/assignments');
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
          <Link href="/assignments" className="inline-flex items-center text-indigo-300 hover:text-white mb-6 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assignments
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
                  {(() => {
                    const isSubmitted = assignment._is_submitted || (assignment.status && assignment.status !== 'Pending') || assignment.submission_count > 0;
                    return (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isSubmitted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {isSubmitted ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {isSubmitted ? (assignment.status && assignment.status !== 'Pending' ? assignment.status : 'Submitted') : 'Pending'}
                      </span>
                    );
                  })()}
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
                  {(() => {
                    const isSubmitted = assignment._is_submitted || (assignment.status && assignment.status !== 'Pending') || assignment.submission_count > 0;
                    return (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-xl font-bold text-slate-900">Your Submission</h2>
                          {isSubmitted && (
                            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {assignment.status || 'Submitted'}
                            </span>
                          )}
                        </div>
                        
                        {isSubmitted && (
                          <div className="mb-5 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs sm:text-sm">
                            <div className="flex items-center gap-2 font-bold mb-1 text-emerald-900">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              Your assignment is submitted!
                            </div>
                            <p className="text-emerald-700">
                              Your answer is saved and visible below. You can make adjustments and update your submission at any time.
                            </p>
                          </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                          {(!assignment?.type || assignment.type === 'Text') && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-700">
                                  Your Answer / Code
                                </label>
                                {isSubmitted && (
                                  <span className="text-xs text-emerald-600 font-medium">✓ Saved Submission</span>
                                )}
                              </div>
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
                              {isSubmitted && submissionUrl && (
                                <div className="mt-2">
                                  <a
                                    href={submissionUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> Open Submitted URL
                                  </a>
                                </div>
                              )}
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
                                    {file ? file.name : (assignment.submission_attachment ? 'Click to replace attached file' : 'Click to upload file')}
                                  </span>
                                </div>
                                <input 
                                  type="file" 
                                  required={!file && (!assignment.submission_url && !assignment.submission_name && !assignment.submission_attachment)}
                                  className="hidden" 
                                  onChange={handleFileChange}
                                />
                              </label>
                              {assignment.submission_attachment && (
                                <div className="mt-2">
                                  <a
                                    href={getImageUrl(assignment.submission_attachment)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> View Current Attachment
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={submitting}
                            className="w-full mt-2 flex items-center justify-center py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 shadow-sm"
                          >
                            {submitting ? (
                              <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Submitting...
                              </span>
                            ) : isSubmitted ? (
                              <span className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Update / Resubmit Answer
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Send className="w-4 h-4" />
                                Submit Assignment
                              </span>
                            )}
                          </button>
                        </form>
                      </>
                    );
                  })()}
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
