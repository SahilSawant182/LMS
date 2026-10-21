"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, BookOpen, Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getCourses, createChapter } from "@/services/lms.services";
import { showToast } from "@/components/ui/Toast";

interface CreateChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourseId?: string;
  onSuccess?: (courseId: string, chapterTitle: string) => void;
}

interface CourseOption {
  name: string;
  title: string;
}

export default function CreateChapterModal({
  isOpen,
  onClose,
  defaultCourseId = "",
  onSuccess,
}: CreateChapterModalProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      setChapterTitle("");
      fetchCoursesList();
    }
  }, [isOpen]);

  const fetchCoursesList = async () => {
    setLoadingCourses(true);
    try {
      const res = await getCourses();
      const rawList = Array.isArray(res) ? res : (res as any)?.message || (res as any)?.data || [];
      const formatted = rawList.map((c: any) => ({
        name: c.name || "",
        title: c.title || c.course_name || c.name || "Untitled Course",
      }));
      setCourses(formatted);

      if (defaultCourseId && formatted.some((c: CourseOption) => c.name === defaultCourseId)) {
        setSelectedCourse(defaultCourseId);
      } else if (formatted.length > 0 && !selectedCourse) {
        setSelectedCourse(formatted[0].name);
      }
    } catch (err: any) {
      console.error("Failed to load courses for chapter creation:", err);
      setError("Unable to load course list. Please try again.");
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      setError("Please select a course.");
      return;
    }
    if (!chapterTitle.trim()) {
      setError("Please provide a chapter title.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("course", selectedCourse);
      fd.append("title", chapterTitle.trim());

      await createChapter(fd);

      setSuccess(true);
      showToast.success("Chapter created successfully!");
      window.dispatchEvent(
        new CustomEvent("chapter-created", {
          detail: { course: selectedCourse, title: chapterTitle.trim() },
        })
      );

      if (onSuccess) {
        onSuccess(selectedCourse, chapterTitle.trim());
      }

      setTimeout(() => {
        onClose();
        router.push(`/course/${encodeURIComponent(selectedCourse)}`);
        router.refresh();
      }, 900);
    } catch (err: any) {
      console.error("Failed to create chapter:", err);
      setError(err?.message || "Failed to create chapter. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New Chapter</h3>
              <p className="text-xs text-indigo-100">Add a curriculum module to any course</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Chapter created successfully! Redirecting to course outline...</span>
            </div>
          )}

          {/* Select Course */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Course <span className="text-red-500">*</span>
            </label>
            {loadingCourses ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading available courses...</span>
              </div>
            ) : courses.length > 0 ? (
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              >
                {courses.map((course) => (
                  <option key={course.name} value={course.name}>
                    {course.title} ({course.name})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                No courses found. Please create a course first.
              </p>
            )}
          </div>

          {/* Chapter Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Chapter Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="e.g. Chapter 1: Foundations & Core Concepts"
              required
              disabled={isSubmitting || success}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loadingCourses || success || !selectedCourse}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Chapter...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Chapter</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
