"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Check, X, Loader2 } from 'lucide-react';
import { createCourse, updateCourse } from '@/services/lms.services';

interface CourseFormProps {
  initialData?: {
    name?: string;
    title?: string;
    short_introduction?: string;
    description?: string;
    published?: number;
  };
  isEditing?: boolean;
}

export default function CourseForm({ initialData, isEditing = false }: CourseFormProps) {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    title: initialData?.title || '',
    short_introduction: initialData?.short_introduction || '',
    description: initialData?.description || '',
    published: initialData?.published === 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = new FormData();
      if (formData.name) data.append('name', formData.name);
      data.append('title', formData.title);
      data.append('short_introduction', formData.short_introduction);
      data.append('description', formData.description);
      data.append('published', formData.published ? '1' : '0');

      if (isEditing) {
        await updateCourse(data);
        setSuccess('Course updated successfully!');
      } else {
        await createCourse(data);
        setSuccess('Course created successfully!');
      }

      // Add a slight delay for better UX before redirecting
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 px-8 py-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-white/10 p-3 rounded-2xl">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {isEditing ? 'Edit Course' : 'Create New Course'}
            </h2>
            <p className="text-indigo-200 font-light mt-1">
              {isEditing ? 'Update the details of your course below.' : 'Fill in the details to publish a new course to the catalog.'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-3">
            <X className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-3">
            <Check className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">
                Course Name / ID <span className="text-slate-400 font-normal">(Required for API)</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. intro-to-python"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-1">
                Display Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Introduction to Python Programming"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="short_introduction" className="block text-sm font-semibold text-slate-700 mb-1">
                Short Introduction
              </label>
              <input
                type="text"
                id="short_introduction"
                name="short_introduction"
                required
                value={formData.short_introduction}
                onChange={handleChange}
                placeholder="A brief tagline for your course..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-1">
                Full Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide comprehensive details about what students will learn..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900 resize-y"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <div className="relative flex items-start">
                <div className="flex h-6 items-center">
                  <input
                    id="published"
                    name="published"
                    type="checkbox"
                    checked={formData.published}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-2 transition-all cursor-pointer"
                  />
                </div>
                <div className="ml-3 text-sm leading-6">
                  <label htmlFor="published" className="font-semibold text-slate-700 cursor-pointer select-none">
                    Publish Course
                  </label>
                  <p className="text-slate-500">Make this course visible to students immediately.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-8 border-t border-slate-100 flex items-center justify-end gap-4">
              {isEditing && (
                <button
                  type="button"
                  disabled={loading || success !== null}
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                      setLoading(true);
                      try {
                        await import('@/services/lms.services').then(m => m.deleteCourse(formData.name));
                        setSuccess('Course deleted successfully!');
                        setTimeout(() => {
                          router.push('/');
                          router.refresh();
                        }, 1500);
                      } catch (err: any) {
                        setError(err?.message || 'Failed to delete course.');
                        setLoading(false);
                      }
                    }
                  }}
                  className="px-6 py-3 font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Delete Course
                </button>
              )}
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success !== null}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : isEditing ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
}
