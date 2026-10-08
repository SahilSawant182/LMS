"use client";

import React, { useState, useEffect } from 'react';
import { createBatch, updateBatch, getMasterData } from '@/services/lms.services';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Calendar as CalendarIcon, Clock, Users, BookOpen, Tag, Video } from 'lucide-react';
import Link from 'next/link';
import Dropdown from '@/components/ui/Dropdown';

interface BatchFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function BatchForm({ initialData, isEdit }: BatchFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'details' | 'assessment' | 'timetable' | 'pricing'>('details');

  const [formData, setFormData] = useState<any>({
    title: '',
    name: '',
    batch: '',
    published: 0,
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
    instructors: [],
    
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
        courses: initialData.courses || [],
        instructors: initialData.instructors || [],
        assessment: initialData.assessment || [],
        timetable: initialData.timetable || [],
        timetable_legends: initialData.timetable_legends || [],
      });
    }
  }, [initialData]);

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
      const payload = {
        ...formData,
        name: formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        batch: formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      };

      if (isEdit) {
        payload.name = initialData.name;
        payload.batch = initialData.batch || initialData.name;
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
          <Link href="/batches" className="p-1.5 bg-white rounded-md border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Short Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors resize-none"></textarea>
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
                  <input type="text" name="conferencing_provider" value={formData.conferencing_provider} onChange={handleChange} className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors" placeholder="e.g. Zoom" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Detailed HTML Description</label>
                  <textarea name="batch_details" value={formData.batch_details} onChange={handleChange} rows={3} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition-colors font-mono resize-none"></textarea>
                </div>

                <div className="col-span-2 flex flex-wrap gap-4 mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" name="published" checked={formData.published === 1} onChange={handleChange} className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span className="text-xs font-medium text-slate-600">Published</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" name="allow_self_enrollment" checked={formData.allow_self_enrollment === 1} onChange={handleChange} className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span className="text-xs font-medium text-slate-600">Self Enrollment</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" name="allow_future" checked={formData.allow_future === 1} onChange={handleChange} className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span className="text-xs font-medium text-slate-600">Future Enrollment</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" name="show_live_class" checked={formData.show_live_class === 1} onChange={handleChange} className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span className="text-xs font-medium text-slate-600">Show Live Class</span>
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
                    endpoint="https://devlms.stridenex.ai/api/method/lms.lms.master.get_dropdown_options"
                    params={{ doctype: "LMS Course" }}
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
                    <h3 className="text-sm font-semibold text-slate-700">Assessments</h3>
                    <button type="button" onClick={() => handleArrayAdd('assessment', { assessment: '' })} className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md"><Plus className="w-3 h-3" /> Add Assessment</button>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {formData.assessment.map((ass: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="text" value={ass.assessment || ''} onChange={(e) => handleArrayChange('assessment', idx, 'assessment', e.target.value)} placeholder="Assessment Name" className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                        <button type="button" onClick={() => handleArrayRemove('assessment', idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {formData.assessment.length === 0 && <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-md border border-dashed border-slate-200">No assessments added.</p>}
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
    </div>
  );
}
