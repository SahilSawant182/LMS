"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { navigateBack } from '@/utils/navigation';
import { 
  BookOpen, Check, X, Loader2, Sparkles, Upload, 
  PlayCircle, DollarSign, Award, Layers, Eye, 
  Palette, Tag, ShieldCheck, Clock, ArrowLeft,
  CheckCircle2, Lock, Image as ImageIcon, Globe
} from 'lucide-react';
import { createCourse, updateCourse, getMasterData, getCategoryList, CreateCoursePayload, normalizeCourseColor } from '@/services/lms.services';
import { uploadFile, getImageUrl } from '@/services/api.services';
import Dropdown from '@/components/ui/Dropdown';

interface CourseFormProps {
  initialData?: {
    name?: string;
    course?: string;
    course_name?: string;
    title?: string;
    short_introduction?: string;
    description?: string;
    published?: number;
    published_on?: string | null;
    status?: string | null;
    video_link?: string;
    tags?: string;
    category?: string;
    image?: string;
    card_gradient?: string;
    color?: string;
    upcoming?: number;
    featured?: number;
    disable_self_learning?: number;
    enforce_lesson_completion?: number;
    paid_course?: number;
    paid_certificate?: number;
    enable_certification?: number;
    course_price?: number;
    currency?: string;
    amount_usd?: number;
  };
  isEditing?: boolean;
}

const GRADIENT_OPTIONS = [
  { label: 'Blue', value: 'Blue', class: 'from-blue-600 to-indigo-700', bg: 'bg-blue-600' },
  { label: 'Violet', value: 'Violet', class: 'from-violet-600 to-purple-800', bg: 'bg-violet-600' },
  { label: 'Purple', value: 'Purple', class: 'from-purple-600 to-indigo-800', bg: 'bg-purple-600' },
  { label: 'Teal', value: 'Teal', class: 'from-teal-600 to-cyan-700', bg: 'bg-teal-600' },
  { label: 'Cyan', value: 'Cyan', class: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-500' },
  { label: 'Green', value: 'Green', class: 'from-emerald-600 to-teal-700', bg: 'bg-emerald-600' },
  { label: 'Amber', value: 'Amber', class: 'from-amber-500 to-yellow-600', bg: 'bg-amber-500' },
  { label: 'Orange', value: 'Orange', class: 'from-amber-600 to-orange-700', bg: 'bg-orange-600' },
  { label: 'Red', value: 'Red', class: 'from-rose-600 to-red-700', bg: 'bg-rose-600' },
  { label: 'Pink', value: 'Pink', class: 'from-pink-500 to-rose-600', bg: 'bg-pink-500' },
  { label: 'Yellow', value: 'Yellow', class: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-500' },
  { label: 'Gray', value: 'Gray', class: 'from-slate-600 to-gray-800', bg: 'bg-gray-600' },
];

const DEFAULT_CATEGORIES = [
  'Business',
  'Technology',
  'Design',
  'Marketing',
  'Data Science',
  'Programming',
  'Personal Development',
  'General'
];

export default function CourseForm({ initialData, isEditing = false }: CourseFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: initialData?.name || initialData?.course || '',
    title: initialData?.title || '',
    short_introduction: initialData?.short_introduction || '',
    description: initialData?.description || '',
    published: Boolean(initialData?.published),
    video_link: initialData?.video_link || '',
    tags: initialData?.tags || '',
    category: initialData?.category || 'Business',
    image: initialData?.image || '/assets/lms/images/course_card.jpeg',
    card_gradient: normalizeCourseColor(initialData?.card_gradient || initialData?.color || 'Blue'),
    upcoming: Boolean(initialData?.upcoming),
    featured: Boolean(initialData?.featured !== undefined ? initialData?.featured : 1),
    disable_self_learning: Boolean(initialData?.disable_self_learning),
    enforce_lesson_completion: Boolean(initialData?.enforce_lesson_completion),
    paid_course: Boolean(initialData?.paid_course || (Number(initialData?.course_price || 0) > 0)),
    paid_certificate: Boolean(initialData?.paid_certificate),
    enable_certification: Boolean(initialData?.enable_certification !== undefined ? initialData?.enable_certification : 1),
    course_price: initialData?.course_price !== undefined ? initialData.course_price : 0,
    currency: initialData?.currency || 'INR',
    amount_usd: initialData?.amount_usd !== undefined ? initialData.amount_usd : 0,
  });

  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const courseId = formData.name || initialData?.name || initialData?.course || '';

  const isInitializedRef = React.useRef(Boolean(initialData?.name || initialData?.course));

  // Synchronize when initialData is loaded asynchronously (only once on load, never overwriting user edits)
  useEffect(() => {
    if (initialData && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setFormData({
        name: initialData.name || initialData.course || '',
        title: initialData.title || '',
        short_introduction: initialData.short_introduction || '',
        description: initialData.description || '',
        published: Boolean(initialData.published),
        video_link: initialData.video_link || '',
        tags: initialData.tags || '',
        category: initialData.category || 'Business',
        image: initialData.image || '/assets/lms/images/course_card.jpeg',
        card_gradient: normalizeCourseColor(initialData.card_gradient || initialData.color || 'Blue'),
        upcoming: Boolean(initialData.upcoming),
        featured: Boolean(initialData.featured !== undefined ? initialData.featured : 1),
        disable_self_learning: Boolean(initialData.disable_self_learning),
        enforce_lesson_completion: Boolean(initialData.enforce_lesson_completion),
        paid_course: Boolean(initialData.paid_course || (Number(initialData.course_price || 0) > 0)),
        paid_certificate: Boolean(initialData.paid_certificate),
        enable_certification: Boolean(initialData.enable_certification !== undefined ? initialData.enable_certification : 1),
        course_price: initialData.course_price !== undefined ? initialData.course_price : 0,
        currency: initialData.currency || 'INR',
        amount_usd: initialData.amount_usd !== undefined ? initialData.amount_usd : 0,
      });
    }
  }, [initialData]);

  // Fetch categories dynamically
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        let catList: string[] = [];
        try {
          const res = await getMasterData('LMS Category');
          if (Array.isArray(res) && res.length > 0) {
            catList = res.filter(Boolean);
          }
        } catch (e) {}

        if (catList.length === 0) {
          try {
            const res = await getCategoryList();
            const items = Array.isArray(res) 
              ? res 
              : (res?.data?.categories || res?.message?.data?.categories || res?.message?.categories || res?.message?.data || res?.data || []);
            if (Array.isArray(items)) {
              catList = items.map((i: any) => typeof i === 'string' ? i : (i.value || i.label || i.category || i.name || i.title || '')).filter(Boolean);
            }
          } catch (e) {}
        }

        if (Array.isArray(catList) && catList.length > 0) {
          const merged = Array.from(new Set([...catList.filter(Boolean), ...DEFAULT_CATEGORIES]));
          setCategories(merged);
        }
      } catch (e) {
        // Fallback to default categories
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'course_price' || name === 'amount_usd') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        ...(name === 'course_price' && Number(value) > 0 ? { paid_course: true } : {})
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleToggle = (field: keyof typeof formData) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const res = await uploadFile(file);
      const uploadedUrl = res?.file_url || res?.message?.file_url || res?.data?.file_url;
      if (uploadedUrl) {
        setFormData(prev => ({ ...prev, image: uploadedUrl }));
      } else {
        throw new Error('Could not retrieve uploaded file URL.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to upload image. Please try entering an image URL directly.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, forcePublished?: boolean) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!formData.title.trim()) {
      setError('Please provide a course title.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const courseId = formData.name || initialData?.name || initialData?.course || '';
      const rawPrice = Number(formData.course_price);
      const parsedPrice = isNaN(rawPrice) ? 0 : rawPrice;
      const rawUsd = Number(formData.amount_usd);
      const parsedUsd = isNaN(rawUsd) ? 0 : rawUsd;
      const isPaid = Boolean(formData.paid_course || parsedPrice > 0);

      const isPublished = forcePublished !== undefined ? forcePublished : Boolean(formData.published);
      const todayStr = new Date().toISOString().split('T')[0];

      // Build clean JSON payload matching API specification
      const normalizedColor = normalizeCourseColor(formData.card_gradient || 'Blue');
      const payload: CreateCoursePayload = {
        name: courseId,
        course: courseId,
        course_name: courseId,
        title: formData.title.trim(),
        short_introduction: formData.short_introduction.trim(),
        description: formData.description.trim(),
        published: isPublished ? 1 : 0,
        status: isPublished ? 'Approved' : 'In Progress',
        published_on: isPublished ? (initialData?.published_on || todayStr) : null,
        video_link: formData.video_link.trim(),
        tags: formData.tags.trim(),
        category: formData.category.trim() || 'Business',
        image: formData.image.trim() || '/assets/lms/images/course_card.jpeg',
        card_gradient: normalizedColor,
        color: normalizedColor,
        upcoming: formData.upcoming ? 1 : 0,
        featured: formData.featured ? 1 : 0,
        disable_self_learning: formData.disable_self_learning ? 1 : 0,
        enforce_lesson_completion: formData.enforce_lesson_completion ? 1 : 0,
        paid_course: isPaid ? 1 : 0,
        paid_certificate: formData.paid_certificate ? 1 : 0,
        enable_certification: formData.enable_certification ? 1 : 0,
        course_price: isPaid ? parsedPrice : 0,
        currency: formData.currency || 'INR',
        amount_usd: isPaid ? parsedUsd : 0,
      };

      if (isEditing) {
        await updateCourse(payload);
        setFormData(prev => ({ ...prev, published: isPublished }));
        setSuccess(isPublished ? 'Course updated and published successfully!' : 'Course updated and saved as draft!');
      } else {
        const res = await createCourse(payload);
        const createdName = res?.data?.name || res?.message?.name || res?.data?.data?.name || res?.name;
        setSuccess(
          isPublished 
            ? 'Course created and published successfully!' 
            : 'Course saved as draft! Redirecting to course studio...'
        );
        setTimeout(() => {
          if (createdName) {
            router.push(`/course/${encodeURIComponent(createdName)}`);
          } else {
            router.push('/courses');
          }
          router.refresh();
        }, 1200);
        return;
      }

      setTimeout(() => {
        if (courseId) {
          router.push(`/course/${encodeURIComponent(courseId)}`);
        } else {
          router.push('/courses');
        }
        router.refresh();
      }, 1200);

    } catch (err: any) {
      console.error('Course submission error:', err);
      setError(err?.message || 'Something went wrong. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedGradient = GRADIENT_OPTIONS.find(g => g.value === formData.card_gradient) || GRADIENT_OPTIONS[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-inner">
              <BookOpen className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Instructor Studio
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {isEditing ? 'Edit Course Details' : 'Create New Course'}
              </h1>
              <p className="text-indigo-200/80 text-sm mt-1 max-w-xl font-light">
                {isEditing 
                  ? 'Update curriculum parameters, pricing, media, and publishing rules.' 
                  : 'Design and publish an engaging course with lessons, certifications, and live batches.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              navigateBack(
                router,
                isEditing && courseId ? `/course/${encodeURIComponent(courseId)}` : '/courses'
              );
            }}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3 animate-fade-in shadow-xs">
          <X className="w-5 h-5 shrink-0 text-rose-600" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <p className="font-semibold text-sm">{success}</p>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Section 1: Basic Information */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">1. Basic Course Details</h2>
              <p className="text-xs text-slate-500">Essential course title, category, tags, and descriptive overview.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Course Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Python Programming"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold text-slate-900"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Category
              </label>
              <Dropdown
                id="category"
                value={formData.category}
                onChange={(value: string) => setFormData(prev => ({ ...prev, category: value }))}
                endpoint="https://devlms.stridenex.ai/api/method/lms.lms.master.get_dropdown_options"
                params={{ doctype: "LMS Category" }}
                placeholder="Select Category"
                searchable
                options={categories.map((cat) => ({ value: cat, label: cat }))}
              />
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Course Tags <span className="text-slate-400 font-normal lowercase">(comma separated)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="e.g. Python, Programming, Data Science"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium text-slate-900"
                />
                <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Short Introduction */}
            <div className="md:col-span-2">
              <label htmlFor="short_introduction" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Short Introduction / Tagline
              </label>
              <input
                type="text"
                id="short_introduction"
                name="short_introduction"
                value={formData.short_introduction}
                onChange={handleChange}
                placeholder="e.g. Learn Python from beginner to advanced."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium text-slate-900"
              />
            </div>

            {/* Full Description */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="description" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Full Description <span className="text-slate-400 font-normal lowercase">(HTML or plain text)</span>
                </label>
                <span className="text-[11px] text-slate-400">Supports &lt;p&gt;, &lt;h3&gt;, &lt;ul&gt; tags</span>
              </div>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="<p>Learn Python fundamentals, functions, and object-oriented programming.</p>"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-mono text-slate-800 resize-y"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Media & Visual Branding */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">2. Media & Visual Branding</h2>
              <p className="text-xs text-slate-500">Cover image, preview video ID, and catalog card gradient.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image URL & Upload */}
            <div>
              <label htmlFor="image" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Course Cover Image
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  id="image"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="/assets/lms/images/course_card.jpeg"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-medium text-slate-900"
                />
                <label className="cursor-pointer px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1.5 transition-colors shrink-0">
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400">
                Enter an image URL, path, or upload a local file (.jpg, .png).
              </p>

              {/* Designed Space / Container for Cover Image */}
              <div className="mt-3 relative w-full h-48 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-950 overflow-hidden flex items-center justify-center shadow-inner group">
                {formData.image ? (
                  <>
                    <img
                      src={getImageUrl(formData.image) || '/assets/lms/images/course_card.jpeg'}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-110 pointer-events-none"
                    />
                    <img
                      src={getImageUrl(formData.image) || '/assets/lms/images/course_card.jpeg'}
                      alt="Course Cover"
                      className="relative z-10 max-h-full max-w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/lms/images/course_card.jpeg';
                      }}
                    />
                    <div className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] text-slate-200 font-semibold border border-white/10 flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-indigo-400" /> Cover Preview (Fits Container)
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600/80 text-white backdrop-blur-md transition-colors border border-white/10 cursor-pointer"
                      title="Clear image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 text-slate-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-300">No cover image selected</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Upload or enter an image URL to preview how it fits in the container.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Video Link */}
            <div>
              <label htmlFor="video_link" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Introductory Video Link <span className="text-slate-400 font-normal lowercase">(YouTube ID or URL)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="video_link"
                  name="video_link"
                  value={formData.video_link}
                  onChange={handleChange}
                  placeholder="e.g. VIt_bsbBjLI or https://youtu.be/..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-medium text-slate-900"
                />
                <PlayCircle className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Learners can watch this video preview directly from the course page.
              </p>
            </div>

            {/* Card Gradient Selector */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Card Gradient Theme
              </label>
              <div className="flex flex-wrap gap-2.5">
                {GRADIENT_OPTIONS.map((grad) => {
                  const isSelected = formData.card_gradient === grad.value;
                  return (
                    <button
                      key={grad.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, card_gradient: grad.value }))}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 shadow-xs ring-2 ring-indigo-500/20' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${grad.bg} shadow-xs shrink-0`}></span>
                      <span>{grad.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="md:col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-3">
                Live Card Preview
              </span>
              <div className="max-w-sm rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-white">
                <div className="aspect-[16/9] w-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
                  <img
                    src={getImageUrl(formData.image) || '/assets/lms/images/course_card.jpeg'}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none"
                  />
                  <img
                    src={getImageUrl(formData.image) || '/assets/lms/images/course_card.jpeg'}
                    alt="Course Preview"
                    className="relative z-10 max-h-full max-w-full object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/lms/images/course_card.jpeg';
                    }}
                  />
                  <div className={`absolute top-2.5 right-2.5 z-20 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs bg-gradient-to-r ${selectedGradient.class}`}>
                    {formData.category || 'Course'}
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                    {formData.title || 'Course Title Preview'}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {formData.short_introduction || 'Learn essential concepts with hands-on practice.'}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs font-bold">
                    <span className="text-indigo-600">
                      {formData.paid_course && formData.course_price > 0 
                        ? `${formData.currency} ${formData.course_price}` 
                        : 'Free Course'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {formData.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Pricing & Currency */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">3. Pricing & Currency</h2>
                <p className="text-xs text-slate-500">Configure free access or set custom course and certificate pricing.</p>
              </div>
            </div>

            {/* Paid Course Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">
                {formData.paid_course ? 'Paid Course' : 'Free Course'}
              </span>
              <button
                type="button"
                onClick={() => handleToggle('paid_course')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  formData.paid_course ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.paid_course ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {formData.paid_course ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fade-in">
              <div>
                <label htmlFor="course_price" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Price ({formData.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  id="course_price"
                  name="course_price"
                  value={formData.course_price}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-medium text-slate-900"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label htmlFor="amount_usd" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Price in USD ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  id="amount_usd"
                  name="amount_usd"
                  value={formData.amount_usd}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-900"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>This course is marked as free. Students can enroll with a single click without checkout.</span>
            </div>
          )}
        </div>

        {/* Section 4: Certification & Learning Rules */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">4. Certification & Learning Rules</h2>
              <p className="text-xs text-slate-500">Enable completion certificates and sequential lesson flow.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enable Certification */}
            <div 
              onClick={() => handleToggle('enable_certification')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.enable_certification ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div>
                <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Enable Certification
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Grant a digital certificate to students when all course requirements are completed.
                </p>
              </div>
              <input
                type="checkbox"
                name="enable_certification"
                checked={formData.enable_certification}
                onChange={() => {}}
                className="h-5 w-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
              />
            </div>

            {/* Paid Certificate */}
            <div 
              onClick={() => handleToggle('paid_certificate')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.paid_certificate ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div>
                <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  Paid Certificate
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Require a separate fee before generating and issuing the verified certificate.
                </p>
              </div>
              <input
                type="checkbox"
                name="paid_certificate"
                checked={formData.paid_certificate}
                onChange={() => {}}
                className="h-5 w-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
              />
            </div>

            {/* Enforce Lesson Completion */}
            <div 
              onClick={() => handleToggle('enforce_lesson_completion')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.enforce_lesson_completion ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div>
                <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  Enforce Lesson Completion
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Students must complete lessons in strict sequential order before unlocking the next.
                </p>
              </div>
              <input
                type="checkbox"
                name="enforce_lesson_completion"
                checked={formData.enforce_lesson_completion}
                onChange={() => {}}
                className="h-5 w-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
              />
            </div>

            {/* Disable Self Learning */}
            <div 
              onClick={() => handleToggle('disable_self_learning')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.disable_self_learning ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div>
                <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Disable Self-Paced Learning
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Restrict self-study access so learners can only attend via scheduled live batches.
                </p>
              </div>
              <input
                type="checkbox"
                name="disable_self_learning"
                checked={formData.disable_self_learning}
                onChange={() => {}}
                className="h-5 w-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Publishing & Visibility */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">5. Publishing & Visibility</h2>
              <p className="text-xs text-slate-500">Control course listing visibility on the public catalog and homepage.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Published */}
            <div 
              onClick={() => handleToggle('published')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.published ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div>
                <p className="font-bold text-sm text-slate-900">Publish Immediately</p>
                <p className="text-xs text-slate-500 mt-0.5">Make course visible to students in catalog.</p>
              </div>
              <input
                type="checkbox"
                name="published"
                checked={formData.published}
                onChange={() => {}}
                className="h-5 w-5 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
              />
            </div>

            {/* Featured */}
            <div 
              onClick={() => handleToggle('featured')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.featured ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div>
                <p className="font-bold text-sm text-slate-900">Featured Course</p>
                <p className="text-xs text-slate-500 mt-0.5">Highlight in top banners & featured sections.</p>
              </div>
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={() => {}}
                className="h-5 w-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
              />
            </div>

            {/* Upcoming */}
            <div 
              onClick={() => handleToggle('upcoming')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.upcoming ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div>
                <p className="font-bold text-sm text-slate-900">Mark as Upcoming</p>
                <p className="text-xs text-slate-500 mt-0.5">Show coming soon badge with pre-enrollment.</p>
              </div>
              <input
                type="checkbox"
                name="upcoming"
                checked={formData.upcoming}
                onChange={() => {}}
                className="h-5 w-5 mt-0.5 rounded text-amber-600 focus:ring-amber-500 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                if (isEditing && courseId) {
                  router.push(`/course/${encodeURIComponent(courseId)}`);
                } else {
                  router.push('/courses');
                }
              }}
              className="px-5 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* Save as Draft Button */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading || uploadingImage}
              className="flex-1 sm:flex-none px-5 py-3 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-500" />
              <span>{isEditing && !formData.published ? 'Save Draft Changes' : 'Save as Draft'}</span>
            </button>

            {/* Publish Course Button */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading || uploadingImage}
              className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>{isEditing && formData.published ? 'Save & Keep Published' : 'Publish Course'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
