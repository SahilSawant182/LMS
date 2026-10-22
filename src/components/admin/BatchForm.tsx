"use client";

import React, { useState, useEffect } from 'react';
import { createBatch, updateBatch, getMasterData, getQuizzes, getAssignments } from '@/services/lms.services';
import { getCurrentUserEmail } from '@/services/api.services';
import { getConferencingSettings } from '@/services/live_class.services';
import { ConferencingSettings, ZoomSetting } from '@/types/live_class.types';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Calendar as CalendarIcon, Clock, Users, BookOpen, Tag, Video } from 'lucide-react';
import Link from 'next/link';
import { navigateBack } from '@/utils/navigation';
import Dropdown from '@/components/ui/Dropdown';
import ConnectZoomModal from '@/components/live-class/ConnectZoomModal';
import ConnectGoogleMeetModal from '@/components/live-class/ConnectGoogleMeetModal';

interface BatchFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function BatchForm({ initialData, isEdit }: BatchFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'details' | 'assessment' | 'timetable' | 'pricing'>('details');
  const [assessmentOptions, setAssessmentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [assessmentTypeMap, setAssessmentTypeMap] = useState<Map<string, string>>(new Map());
  const [conferencingSettings, setConferencingSettings] = useState<ConferencingSettings>({
    zoom_accounts: [],
    google_meet_accounts: [],
    providers: [],
  });

  // Fetch available assessments and quizzes for the dropdown
  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const optionMap = new Map<string, string>();
        const typeMap = new Map<string, string>();

        // 1. Fetch from getMasterData('LMS Assessment')
        try {
          const lmsAssessments = await getMasterData('LMS Assessment');
          if (Array.isArray(lmsAssessments)) {
            lmsAssessments.forEach((item: any) => {
              const val = typeof item === 'string' ? item : item.name || item.value || item.title || '';
              const lbl = typeof item === 'string' ? item : item.title || item.name || item.label || val;
              if (val) {
                optionMap.set(val, lbl);
                typeMap.set(val, 'LMS Quiz');
              }
            });
          }
        } catch {}

        // 2. Fetch from getMasterData('LMS Quiz')
        try {
          const lmsQuizzes = await getMasterData('LMS Quiz');
          if (Array.isArray(lmsQuizzes)) {
            lmsQuizzes.forEach((item: any) => {
              const val = typeof item === 'string' ? item : item.name || item.value || item.title || '';
              const lbl = typeof item === 'string' ? item : item.title || item.name || item.label || val;
              if (val) {
                optionMap.set(val, lbl);
                typeMap.set(val, 'LMS Quiz');
              }
            });
          }
        } catch {}

        // 3. Fetch from getQuizzes()
        try {
          const quizzesRes = await getQuizzes();
          const qList = Array.isArray(quizzesRes) 
            ? quizzesRes 
            : (quizzesRes?.data || quizzesRes?.message || []);
          if (Array.isArray(qList)) {
            qList.forEach((q: any) => {
              const val = q.name || q.title || '';
              const lbl = q.title && q.title !== q.name ? `${q.title} (${q.name})` : val;
              if (val) {
                optionMap.set(val, lbl);
                typeMap.set(val, 'LMS Quiz');
              }
            });
          }
        } catch {}

        // 4. Fetch from getAssignments()
        try {
          const assignRes = await getAssignments();
          const aList = Array.isArray(assignRes) 
            ? assignRes 
            : (assignRes?.data || assignRes?.message || []);
          if (Array.isArray(aList)) {
            aList.forEach((a: any) => {
              const val = a.name || a.title || '';
              const lbl = a.title && a.title !== a.name ? `${a.title} (${a.name})` : val;
              if (val) {
                optionMap.set(val, lbl);
                typeMap.set(val, 'LMS Assignment');
              }
            });
          }
        } catch {}

        if (optionMap.size > 0) {
          setAssessmentOptions(
            Array.from(optionMap.entries()).map(([value, label]) => ({ value, label }))
          );
          setAssessmentTypeMap(typeMap);
        }
      } catch (err) {
        console.warn('Failed to load assessment options:', err);
      }
    };

    fetchAssessments();
  }, []);

  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);

  // Fetch conferencing settings
  const fetchConferencing = async () => {
    try {
      const s = await getConferencingSettings();
      setConferencingSettings(s);
      return s;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    fetchConferencing().then(() => {
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get("google_meet") === "connected") {
          const acc = sp.get("account");
          if (acc) {
            setFormData((prev: any) => ({
              ...prev,
              conferencing_provider: "Google Meet",
              google_meet_account: acc,
            }));
          }
        }
      }
    });
  }, []);

  const handleZoomSuccess = async (savedAccount?: ZoomSetting) => {
    const updated = await fetchConferencing();
    if (savedAccount?.name || savedAccount?.account_name) {
      setFormData((prev: any) => ({
        ...prev,
        zoom_account: savedAccount.name || savedAccount.account_name,
      }));
    } else if (updated?.zoom_accounts && updated.zoom_accounts.length > 0) {
      const last = updated.zoom_accounts[updated.zoom_accounts.length - 1];
      setFormData((prev: any) => ({
        ...prev,
        zoom_account: last.name,
      }));
    }
  };

  const currentUserEmail = getCurrentUserEmail();

  const [formData, setFormData] = useState<any>({
    title: '',
    name: '',
    batch: '',
    published: 1, // Default to Published (1) so batch appears in student's Programs & Batches
    description: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    timezone: 'Asia/Kolkata',
    category: '',
    medium: 'Online',
    seat_count: 0,
    allow_self_enrollment: 1,
    allow_future: 1,
    batch_details: '',
    conferencing_provider: '',
    show_live_class: 1,
    courses: [],
    instructors: currentUserEmail ? [{ instructor: currentUserEmail }] : [],
    zoom_account: '',
    google_meet_account: '',
    
    evaluation: 0,
    evaluation_end_date: '',
    certification: 0,
    assessment: [],
    
    timetable: [],
    timetable_legends: [],
    
    paid_batch: 0,
    amount: 0,
    currency: 'INR',
    amount_usd: 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...formData,
        ...initialData,
        published: initialData.published !== undefined ? (Number(initialData.published) ? 1 : 0) : 1,
        courses: initialData.courses || [],
        instructors: (initialData.instructors && initialData.instructors.length > 0)
          ? initialData.instructors
          : (currentUserEmail ? [{ instructor: currentUserEmail }] : []),
        assessment: (initialData.assessment || []).map((ass: any) => {
          const name = typeof ass === 'string' ? ass.trim() : (ass.assessment_name || ass.assessment || '').trim();
          const type = (typeof ass === 'object' && ass.assessment_type)
            ? ass.assessment_type
            : (name.toLowerCase().includes('assignment') ? 'LMS Assignment' : 'LMS Quiz');
          return {
            ...(typeof ass === 'object' ? ass : {}),
            assessment_type: type,
            assessment_name: name,
            assessment: name,
          };
        }),
        timetable: initialData.timetable || [],
        timetable_legends: initialData.timetable_legends || [],
      });
    } else if (currentUserEmail) {
      setFormData((prev: any) => ({
        ...prev,
        published: 1,
        instructors: prev.instructors?.length > 0 ? prev.instructors : [{ instructor: currentUserEmail }]
      }));
    }
  }, [initialData, currentUserEmail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
  };

  const handleArrayAdd = (field: string, defaultObj: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: [...(prev[field] || []), defaultObj]
    }));
  };

  const handleArrayChange = (field: string, index: number, key: string, value: any) => {
    setFormData((prev: any) => {
      const arr = [...(prev[field] || [])];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
  };

  const handleArrayRemove = (field: string, index: number) => {
    setFormData((prev: any) => {
      const arr = [...(prev[field] || [])];
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Filter out any blank or unselected assessment rows and format for Frappe LMS Assessment child table
      const validAssessments = (formData.assessment || [])
        .map((ass: any) => {
          const name = typeof ass === 'string' ? ass.trim() : (ass.assessment_name || ass.assessment || '').trim();
          if (!name) return null;
          const type = (typeof ass === 'object' && ass.assessment_type)
            ? ass.assessment_type
            : (assessmentTypeMap.get(name) || (name.toLowerCase().includes('assignment') ? 'LMS Assignment' : 'LMS Quiz'));
          return {
            ...(typeof ass === 'object' ? ass : {}),
            assessment_type: type,
            assessment_name: name,
            assessment: name,
          };
        })
        .filter(Boolean);

      // Clean slug name
      const rawTitle = (formData.title || '').trim();
      const cleanSlug = rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `batch-${Date.now()}`;

      // Ensure instructors list contains current instructor if empty
      const instructorsList = (formData.instructors || []).filter(
        (inst: any) => (typeof inst === 'string' ? inst.trim() : (inst?.instructor && inst.instructor.trim()))
      );
      if (instructorsList.length === 0 && currentUserEmail) {
        instructorsList.push({ instructor: currentUserEmail });
      }

      const isPub = formData.published === 1 || formData.published === '1' || formData.published === true;

      const payload = {
        ...formData,
        published: isPub ? 1 : 0,
        instructors: instructorsList,
        assessment: validAssessments,
        name: isEdit && initialData?.name ? initialData.name : cleanSlug,
        batch: isEdit && (initialData?.batch || initialData?.name) ? (initialData.batch || initialData.name) : cleanSlug,
      };

      if (isEdit) {
        await updateBatch(payload);
      } else {
        await createBatch(payload);
      }
      
      router.push(`/batch/${payload.batch}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the batch.');
    } finally {
      setLoading(false);
    }
  };

  const primaryInstructor = formData.instructors
    ?.map((inst: any) => (typeof inst === 'string' ? inst : inst?.instructor)?.trim())
    ?.filter(Boolean)[0] || '';
  const instructorForCourseDropdown = primaryInstructor || currentUserEmail;

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'assessment', label: 'Assessment' },
    { id: 'timetable', label: 'Timetable' },
    { id: 'pricing', label: 'Pricing' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={isEdit && initialData?.name ? `/batch/${initialData.name}` : "/batches"}
            onClick={(e) => {
              e.preventDefault();
              navigateBack(router, isEdit && initialData?.name ? `/batch/${initialData.name}` : "/batches");
            }}
            className="p-1.5 bg-white rounded-md border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">{isEdit ? 'Update Batch Details' : 'New Batch Setup'}</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id 
                  ? 'text-indigo-600 bg-white' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-600" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5 md:p-6">
          <form id="batch-form" onSubmit={handleSubmit} className="[&_input]:text-slate-900 [&_textarea]:text-slate-900 [&_select]:text-slate-900">
            
            {/* DETAILS TAB */}
            <div className={activeTab === 'details' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Batch Title *</label>
                  <input type="text" name="title" required value={formData.title} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" placeholder="e.g., AWS Cloud Practitioner" />
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <Dropdown
                    id="category"
                    value={formData.category}
                    onChange={(value) => setFormData((prev: any) => ({ ...prev, category: value }))}
                    endpoint="https://devlms.stridenex.ai/api/method/lms.lms.master.get_dropdown_options"
                    params={{ doctype: "LMS Category" }}
                    placeholder="Select Category"
                    searchable
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Short Description *</label>
                  <textarea name="description" required value={formData.description} onChange={handleChange} rows={2} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors resize-none"></textarea>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm uppercase focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm uppercase focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time</label>
                  <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">End Time</label>
                  <input type="time" name="end_time" value={formData.end_time} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Timezone</label>
                  <input type="text" name="timezone" value={formData.timezone} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" placeholder="e.g. Asia/Kolkata" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Medium</label>
                  <select name="medium" value={formData.medium} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors">
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Seat Count (0 for unlimited)</label>
                  <input type="number" name="seat_count" value={formData.seat_count} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Conferencing Provider</label>
                  <select name="conferencing_provider" value={formData.conferencing_provider} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors">
                    <option value="">Custom (Manual URL)</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Google Meet">Google Meet</option>
                  </select>
                </div>

                {/* Zoom Account selector */}
                {formData.conferencing_provider === 'Zoom' && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-600">Zoom Account</label>
                        <button
                          type="button"
                          onClick={() => setZoomModalOpen(true)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Connect Zoom</span>
                        </button>
                      </div>
                      {conferencingSettings.zoom_accounts.length > 0 ? (
                        <select name="zoom_account" value={formData.zoom_account || ''} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors">
                          <option value="">Select Zoom Account</option>
                          {conferencingSettings.zoom_accounts.map((a) => (
                            <option key={a.name} value={a.name}>{a.account_name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input type="text" name="zoom_account" value={formData.zoom_account || ''} onChange={handleChange} className="flex-1 px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" placeholder="Zoom Account ID or Name" />
                          <button
                            type="button"
                            onClick={() => setZoomModalOpen(true)}
                            className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-md hover:bg-indigo-100 transition-colors shrink-0 cursor-pointer"
                          >
                            + Connect Zoom
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Auto Recording</label>
                      <select
                        name="auto_recording"
                        value={formData.auto_recording || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors"
                      >
                        <option value="">No Recording</option>
                        <option value="Local">Local Recording (Host computer)</option>
                        <option value="Cloud">Cloud Recording (Zoom Cloud)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Google Meet Account selector */}
                {formData.conferencing_provider === 'Google Meet' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-600">Google Meet Account</label>
                      <button
                        type="button"
                        onClick={() => setGoogleModalOpen(true)}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Connect Google Meet</span>
                      </button>
                    </div>
                    {conferencingSettings.google_meet_accounts.length > 0 ? (
                      <select name="google_meet_account" value={formData.google_meet_account || ''} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors">
                        <option value="">Select Google Meet Account</option>
                        {conferencingSettings.google_meet_accounts.map((a) => (
                          <option key={a.name} value={a.name}>{a.account_name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input type="text" name="google_meet_account" value={formData.google_meet_account || ''} onChange={handleChange} className="flex-1 px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" placeholder="Google Meet Account ID or Name" />
                        <button
                          type="button"
                          onClick={() => setGoogleModalOpen(true)}
                          className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-md hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
                        >
                          + Connect Google Meet
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Detailed HTML Description</label>
                  <textarea name="batch_details" value={formData.batch_details} onChange={handleChange} rows={3} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors font-mono resize-none"></textarea>
                </div>

                <div className="col-span-2 flex flex-wrap gap-4 mt-1 bg-slate-50/80 p-3 rounded-lg border border-slate-200/60">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" name="published" checked={formData.published === 1} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <div>
                      <span className="text-xs font-semibold text-slate-800">Published</span>
                      <span className="text-[11px] text-slate-500 ml-1.5">(Visible to students in Programs & Batches)</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" name="allow_self_enrollment" checked={formData.allow_self_enrollment === 1} onChange={handleChange} className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span className="text-xs font-medium text-slate-600">Self Enrollment</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" name="allow_future" checked={formData.allow_future === 1} onChange={handleChange} className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span className="text-xs font-medium text-slate-600">Future Enrollment</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" name="show_live_class" checked={formData.show_live_class === 1} onChange={handleChange} className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span className="text-xs font-medium text-slate-600">Show Live Classes Tab to Students</span>
                  </label>
                </div>
                
                {/* Instructors & Courses */}
                <div className="col-span-2 md:col-span-1 mt-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Instructors (Email/ID)</label>
                  <div className="flex flex-col gap-2">
                    {formData.instructors.map((inst: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="text" value={inst.instructor} onChange={(e) => handleArrayChange('instructors', idx, 'instructor', e.target.value)} placeholder="Email/ID" className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none h-[34px]" />
                        <button type="button" onClick={() => handleArrayRemove('instructors', idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => handleArrayAdd('instructors', { instructor: '' })} className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-700 w-fit"><Plus className="w-3 h-3" /> Add Instructor</button>
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1 mt-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Courses</label>
                  <Dropdown
                    id="courses"
                    value={formData.courses.map((c: any) => c.course)}
                    onChange={(values: string[]) => setFormData((prev: any) => ({ ...prev, courses: values.map(v => ({ course: v })) }))}
                    endpoint="https://devlms.stridenex.ai/api/method/lms.lms.stride_lms.get_courses"
                    params={{
                      doctype: "LMS Course",
                      ...(instructorForCourseDropdown ? { user: instructorForCourseDropdown } : {})
                    }}
                    placeholder="Select Courses"
                    multiSelect
                    searchable
                  />
                </div>
              </div>
            </div>

            {/* ASSESSMENT TAB */}
            <div className={activeTab === 'assessment' ? 'block' : 'hidden'}>
              <div className="flex flex-col gap-5 max-w-lg">
                <div className="flex items-center gap-6 p-3 bg-slate-50 border border-slate-100 rounded-md">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="evaluation" checked={formData.evaluation === 1} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300" />
                    <span className="text-sm font-medium text-slate-700">Requires Evaluation</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="certification" checked={formData.certification === 1} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300" />
                    <span className="text-sm font-medium text-slate-700">Offers Certification</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Evaluation End Date</label>
                  <input type="date" name="evaluation_end_date" value={formData.evaluation_end_date || ''} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm uppercase focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" />
                </div>

                <div className="border border-slate-100 bg-slate-50 rounded-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">Assessments</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Select existing assessments from the assessment &amp; quiz bank.</p>
                    </div>
                    <button type="button" onClick={() => handleArrayAdd('assessment', { assessment_type: 'LMS Quiz', assessment_name: '', assessment: '' })} className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md"><Plus className="w-3 h-3" /> Add Assessment</button>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {formData.assessment.map((ass: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 bg-white p-2.5 rounded-md border border-slate-200">
                        <div className="w-full sm:w-44">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Type</label>
                          <select
                            value={ass.assessment_type || 'LMS Quiz'}
                            onChange={(e) => {
                              const newType = e.target.value;
                              handleArrayChange('assessment', idx, 'assessment_type', newType);
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                          >
                            <option value="LMS Quiz">Quiz</option>
                            <option value="LMS Assignment">Assignment</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Assessment / Quiz</label>
                          <Dropdown
                            id={`assessment-${idx}`}
                            value={ass.assessment_name || ass.assessment || ''}
                            onChange={(value: string) => {
                              const detectedType = assessmentTypeMap.get(value) || ass.assessment_type || (value.toLowerCase().includes('assignment') ? 'LMS Assignment' : 'LMS Quiz');
                              setFormData((prev: any) => {
                                const arr = [...(prev.assessment || [])];
                                arr[idx] = {
                                  ...(arr[idx] || {}),
                                  assessment: value,
                                  assessment_name: value,
                                  assessment_type: detectedType,
                                };
                                return { ...prev, assessment: arr };
                              });
                            }}
                            endpoint="https://devlms.stridenex.ai/api/method/lms.lms.master.get_dropdown_options"
                            params={{ doctype: ass.assessment_type || "LMS Quiz" }}
                            placeholder="Select Assessment or Quiz"
                            options={assessmentOptions.length > 0 ? assessmentOptions : undefined}
                            searchable
                          />
                        </div>
                        <div className="sm:pt-5">
                          <button
                            type="button"
                            onClick={() => handleArrayRemove('assessment', idx)}
                            className="text-red-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors"
                            title="Remove assessment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {formData.assessment.length === 0 && (
                      <div className="text-center py-5 bg-white rounded-md border border-dashed border-slate-200">
                        <p className="text-xs text-slate-500 font-medium">No assessments added to this batch.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Click &quot;Add Assessment&quot; to pick from available quizzes &amp; assessments.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* TIMETABLE TAB */}
            <div className={activeTab === 'timetable' ? 'block' : 'hidden'}>
              <div className="border border-slate-100 bg-slate-50 rounded-md p-4 mb-5 overflow-x-auto">
                <div className="flex items-center justify-between mb-3 min-w-[500px]">
                  <h3 className="text-sm font-semibold text-slate-700">Class Timetable</h3>
                  <button type="button" onClick={() => handleArrayAdd('timetable', { date: '', day: 0, from_time: '', to_time: '', instructor: '', room: '' })} className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md"><Plus className="w-3 h-3" /> Add Slot</button>
                </div>
                
                <div className="flex flex-col gap-2 min-w-[500px]">
                  {formData.timetable.map((slot: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-md">
                      <input type="date" value={slot.date || ''} onChange={(e) => handleArrayChange('timetable', idx, 'date', e.target.value)} className="w-32 px-2 py-1 border border-slate-200 rounded text-xs uppercase focus:ring-1 focus:ring-indigo-500 outline-none" title="Date" />
                      <input type="number" min="0" max="6" value={slot.day ?? ''} onChange={(e) => handleArrayChange('timetable', idx, 'day', parseInt(e.target.value))} className="w-16 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Day" title="Day (0-6)" />
                      <input type="time" value={slot.from_time || ''} onChange={(e) => handleArrayChange('timetable', idx, 'from_time', e.target.value)} className="w-24 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" title="From Time" />
                      <input type="time" value={slot.to_time || ''} onChange={(e) => handleArrayChange('timetable', idx, 'to_time', e.target.value)} className="w-24 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" title="To Time" />
                      <input type="text" value={slot.instructor || ''} onChange={(e) => handleArrayChange('timetable', idx, 'instructor', e.target.value)} className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Instructor" />
                      <input type="text" value={slot.room || ''} onChange={(e) => handleArrayChange('timetable', idx, 'room', e.target.value)} className="w-20 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Room" />
                      <button type="button" onClick={() => handleArrayRemove('timetable', idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  {formData.timetable.length === 0 && <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 bg-white rounded-md">No timetable slots configured.</p>}
                </div>
              </div>

            </div>

            {/* PRICING TAB */}
            <div className={activeTab === 'pricing' ? 'block' : 'hidden'}>
              <div className="flex flex-col gap-5 max-w-sm">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-md">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="paid_batch" checked={formData.paid_batch === 1} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300" />
                    <span className="text-sm font-medium text-slate-700">Is Paid Batch?</span>
                  </label>
                </div>

                {formData.paid_batch === 1 && (
                  <div className="p-4 border border-slate-100 rounded-md flex flex-col gap-4 bg-slate-50">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                      <input type="text" name="currency" value={formData.currency || 'INR'} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
                      <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Amount USD (Optional)</label>
                      <input type="number" step="0.01" name="amount_usd" value={formData.amount_usd} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>
        
        {/* Footer actions for easier navigation/saving */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {tabs.map((t, i) => (
              <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${activeTab === t.id ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
            ))}
          </div>
          <div className="flex items-center gap-2">
             {activeTab !== 'details' && (
               <button 
                 type="button" 
                 onClick={() => setActiveTab(tabs[tabs.findIndex(t => t.id === activeTab) - 1].id as any)} 
                 className="px-3 py-1.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-md hover:bg-slate-100 transition-colors"
               >
                 Previous
               </button>
             )}
             {activeTab !== 'pricing' && (
               <button 
                 type="button" 
                 onClick={() => setActiveTab(tabs[tabs.findIndex(t => t.id === activeTab) + 1].id as any)} 
                 className="px-3 py-1.5 bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors shadow-sm"
               >
                 Next
               </button>
             )}
             <button 
               onClick={handleSubmit}
               disabled={loading}
               className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-70 shadow-sm ml-2"
             >
               {loading ? (
                 <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
               ) : (
                 <Save className="w-3.5 h-3.5" />
               )}
               {isEdit ? 'Update' : 'Create'}
             </button>
          </div>
        </div>
      </div>

      {/* Connect Zoom Modal Shortcut */}
      <ConnectZoomModal
        isOpen={zoomModalOpen}
        onClose={() => setZoomModalOpen(false)}
        onSuccess={handleZoomSuccess}
      />

      {/* Connect Google Meet Modal Shortcut */}
      <ConnectGoogleMeetModal
        isOpen={googleModalOpen}
        onClose={() => {
          setGoogleModalOpen(false);
          fetchConferencing();
        }}
      />
    </div>
  );
}
