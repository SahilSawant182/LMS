"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, LayoutList, BookOpen, Users, Info } from "lucide-react";
import Link from "next/link";
import Dropdown from "@/components/ui/Dropdown";
import { createProgram } from "@/services/lms.services";

export default function CreateProgramPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(false);
  const [enforceOrder, setEnforceOrder] = useState(false);
  
  const [programCourses, setProgramCourses] = useState<{course: string, course_title: string}[]>([]);
  const [programMembers, setProgramMembers] = useState<{member: string}[]>([]);

  useEffect(() => {
    // Check roles
    const rolesStr = typeof window !== 'undefined' ? localStorage.getItem("roles") : null;
    if (rolesStr) {
      const roles = JSON.parse(rolesStr);
      if (!roles.includes("Instructor") && !roles.includes("LMS Admin") && !roles.includes("System Manager")) {
        router.push("/programs");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  const handleAddCourse = () => {
    setProgramCourses([...programCourses, { course: "", course_title: "" }]);
  };

  const handleRemoveCourse = (index: number) => {
    const newCourses = [...programCourses];
    newCourses.splice(index, 1);
    setProgramCourses(newCourses);
  };

  const handleCourseChange = (index: number, courseName: string) => {
    const newCourses = [...programCourses];
    newCourses[index] = {
      course: courseName,
      course_title: courseName,
    };
    setProgramCourses(newCourses);
  };

  const handleAddMember = () => {
    setProgramMembers([...programMembers, { member: "" }]);
  };

  const handleRemoveMember = (index: number) => {
    const newMembers = [...programMembers];
    newMembers.splice(index, 1);
    setProgramMembers(newMembers);
  };

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...programMembers];
    newMembers[index] = { member: value };
    setProgramMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Program title is required.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title,
        published: published ? 1 : 0,
        enforce_course_order: enforceOrder ? 1 : 0,
        course_count: programCourses.length,
        member_count: programMembers.length,
        doctype: "LMS Program",
        program_courses: programCourses.map((c, i) => ({ ...c, idx: i + 1, doctype: "LMS Program Course" })),
        program_members: programMembers.map((m, i) => ({ ...m, idx: i + 1, doctype: "LMS Program Member" }))
      };

      await createProgram(payload);
      router.push("/programs");
    } catch (err: any) {
      setError(err.message || "Failed to create program.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setLoading(false);
    }
  };

  return (
    <>
      <title>Create Learning Path | StrideNex LMS</title>
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
        <Navbar />

        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-20 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/programs"
                className="p-2 -ml-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Create Learning Path</h1>
                <p className="text-sm text-slate-500">Group multiple courses into a structured program</p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? "Saving..." : "Save Program"}
            </button>
          </div>
        </div>

        {/* Main Form */}
        <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="font-medium text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* General Info */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-indigo-500" />
                <h2 className="text-base font-bold text-slate-900">General Information</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Program Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Master Web Development"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={published}
                        onChange={(e) => setPublished(e.target.checked)}
                        className="w-5 h-5 border-2 border-slate-300 rounded text-indigo-600 focus:ring-indigo-500/50 transition-colors cursor-pointer group-hover:border-indigo-400"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Publish Program</p>
                      <p className="text-xs text-slate-500">Make this program visible to learners.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={enforceOrder}
                        onChange={(e) => setEnforceOrder(e.target.checked)}
                        className="w-5 h-5 border-2 border-slate-300 rounded text-indigo-600 focus:ring-indigo-500/50 transition-colors cursor-pointer group-hover:border-indigo-400"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Enforce Course Order</p>
                      <p className="text-xs text-slate-500">Learners must complete courses in sequence.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Courses List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-base font-bold text-slate-900">Courses in Program</h2>
                </div>
                <button
                  type="button"
                  onClick={handleAddCourse}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Course
                </button>
              </div>
              <div className="p-6">
                {programCourses.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium mb-1">No courses added yet</p>
                    <p className="text-sm text-slate-400 mb-4">Add courses to build your learning path.</p>
                    <button
                      type="button"
                      onClick={handleAddCourse}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add First Course
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {programCourses.map((pc, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50 relative group">
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1 ml-4 sm:ml-0">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Select Course
                          </label>
                          <Dropdown
                            id={`course-${idx}`}
                            value={pc.course}
                            onChange={(val) => handleCourseChange(idx, val)}
                            endpoint="https://devlms.stridenex.ai/api/method/lms.lms.master.get_dropdown_options"
                            params={{ doctype: "LMS Course" }}
                            placeholder="Select Course"
                            searchable
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCourse(idx)}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 ml-4 sm:ml-0"
                          title="Remove Course"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Members List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-base font-bold text-slate-900">Enroll Initial Members (Optional)</h2>
                </div>
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Member
                </button>
              </div>
              <div className="p-6">
                {programMembers.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-slate-500 font-medium mb-1">No members added</p>
                    <p className="text-sm text-slate-400">You can enroll students directly into this path now, or do it later.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {programMembers.map((member, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Search & Select Member Email <span className="text-red-500">*</span>
                          </label>
                          <Dropdown
                            id={`member-${idx}`}
                            value={member.member}
                            onChange={(val) => handleMemberChange(idx, val)}
                            endpoint="https://devlms.stridenex.ai/api/method/lms.lms.master.get_dropdown_options"
                            params={{ doctype: "User" }}
                            placeholder="Select User"
                            searchable
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Remove Member"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom spacer for mobile */}
            <div className="h-10" />
          </form>
        </main>
      </div>
    </>
  );
}
