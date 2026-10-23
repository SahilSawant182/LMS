"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  MinusCircle,
  ExternalLink,
  FileText,
  Check,
  AlertCircle,
} from "lucide-react";
import { updateAssignmentSubmission } from "@/services/lms.services";

export type GradingStatus = "Pass" | "Fail" | "Not Graded" | "Not Applicable";

export interface GradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: {
    name?: string;
    submission?: string;
    member?: string;
    member_name?: string;
    owner?: string;
    status?: string;
    assignment?: string;
    assignment_title?: string;
    type?: string;
    answer?: string;
    anwer?: string;
    content?: string;
    submission_url?: string;
    attachment?: string;
    submission_attachment?: string;
    [key: string]: any;
  } | null;
  assignmentTitle?: string;
  totalMarks?: number | string;
  onGraded?: (updatedSubmission: any) => void;
}

const STATUS_OPTIONS: {
  value: GradingStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  cardBase: string;
  cardActive: string;
}[] = [
  {
    value: "Pass",
    label: "Pass",
    description: "Meets or exceeds requirements",
    icon: CheckCircle,
    cardBase: "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-900",
    cardActive: "border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300",
  },
  {
    value: "Fail",
    label: "Fail",
    description: "Did not meet passing criteria",
    icon: XCircle,
    cardBase: "border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 text-rose-900",
    cardActive: "border-rose-600 bg-rose-600 text-white shadow-sm ring-2 ring-rose-300",
  },
  {
    value: "Not Graded",
    label: "Not Graded",
    description: "Pending instructor evaluation",
    icon: Clock,
    cardBase: "border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-amber-900",
    cardActive: "border-amber-500 bg-amber-500 text-white shadow-sm ring-2 ring-amber-300",
  },
  {
    value: "Not Applicable",
    label: "Not Applicable",
    description: "Exempt or not applicable",
    icon: MinusCircle,
    cardBase: "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800",
    cardActive: "border-slate-700 bg-slate-700 text-white shadow-sm ring-2 ring-slate-300",
  },
];

export default function GradingModal({
  isOpen,
  onClose,
  submission,
  assignmentTitle,
  onGraded,
}: GradingModalProps) {
  const [status, setStatus] = useState<GradingStatus>("Pass");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (submission && isOpen) {
      const validStatuses: GradingStatus[] = ["Pass", "Fail", "Not Graded", "Not Applicable"];
      const rawStatus = (submission.status || "").trim();
      if (validStatuses.includes(rawStatus as GradingStatus)) {
        setStatus(rawStatus as GradingStatus);
      } else {
        setStatus("Pass");
      }

      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [submission, isOpen]);

  if (!isOpen || !submission) return null;

  const subName = submission.name || submission.submission || "";
  const studentName = submission.member_name || submission.member || submission.owner || "Student";
  const studentEmail = submission.member || submission.owner || "";
  const displayTitle = assignmentTitle || submission.assignment_title || submission.assignment || "Assignment";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName) {
      setErrorMsg("Missing submission ID. Cannot update submission.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Only passing name and status in payload as requested
      const payload = {
        name: subName,
        status: status,
      };

      // Call API method: lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.update_assignment_submission
      await updateAssignmentSubmission(payload, subName);

      const updatedDoc = {
        ...submission,
        status: status,
      };

      setSuccessMsg(`Status updated successfully to ${status}!`);

      if (onGraded) {
        onGraded(updatedDoc);
      }

      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 700);
    } catch (err: any) {
      console.error("Grading submission failed:", err);
      const apiErr =
        err?.response?.data?.message ||
        err?.response?.data?.exception ||
        err?.message ||
        "Failed to update status. Please check your network and try again.";
      setErrorMsg(typeof apiErr === "string" ? apiErr : JSON.stringify(apiErr));
    } finally {
      setSaving(false);
    }
  };

  const studentAnswer = submission.answer || submission.anwer || submission.content;
  const projectUrl = submission.submission_url;
  const attachmentUrl = submission.attachment || submission.submission_attachment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Evaluate & Grade Submission</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                ID: {subName || "ASG-SUB"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Student & Assignment Context */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Student</span>
              <span className="font-bold text-slate-900 block truncate mt-0.5">{studentName}</span>
              {studentEmail && (
                <span className="text-[11px] font-mono text-slate-500 block truncate mt-0.5">
                  {studentEmail}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Assignment</span>
              <span className="font-bold text-slate-900 block truncate mt-0.5">{displayTitle}</span>
            </div>
          </div>

          {/* Student Work Preview */}
          {(studentAnswer || projectUrl || attachmentUrl) && (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
              <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Submitted Student Answer
                </span>
                <span className="text-[10px] font-mono font-medium text-slate-500">
                  {submission.type || "Text"}
                </span>
              </div>
              <div className="p-3.5 space-y-2">
                {studentAnswer && (
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed selection:bg-indigo-600">
                    {String(studentAnswer)}
                  </div>
                )}
                {projectUrl && (
                  <div>
                    <a
                      href={projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Project URL: {projectUrl}
                    </a>
                  </div>
                )}
                {attachmentUrl && (
                  <div>
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Download / View Attached Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Selection Buttons (Pass, Fail, Not Graded, Not Applicable) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Evaluation Status <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = status === opt.value;
                const IconComp = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected ? opt.cardActive : opt.cardBase
                    }`}
                  >
                    <IconComp
                      className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-white" : ""}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`font-bold text-xs ${isSelected ? "text-white" : ""}`}>
                        {opt.label}
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 truncate ${
                          isSelected ? "text-white/85" : "text-slate-500"
                        }`}
                      >
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Status</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
