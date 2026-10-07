"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { 
  createCertificateEvaluation, 
  getCertificateEvaluation, 
  deleteCertificateEvaluation,
  updateCertificateEvaluation
} from '@/services/lms.services';
import { 
  CheckCircle, Search, Trash2, PlusCircle, 
  User, BookOpen, Star, Calendar, Clock, FileText, XCircle, RefreshCw, Edit2
} from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';

export default function CertificateEvaluationsPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  
  // Create / Edit State
  const [formData, setFormData] = useState({
    name: '', // Added for editing
    member: '',
    course: '',
    batch_name: '',
    evaluator: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00:00',
    end_time: '11:00:00',
    rating: 4,
    status: 'Pass',
    summary: ''
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState('');
  const [createError, setCreateError] = useState('');

  // Manage State
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeTab === 'manage') {
      fetchEvaluationsList();
    }
  }, [activeTab]);

  const fetchEvaluationsList = async () => {
    setListLoading(true);
    setListError('');
    try {
      const res = await getCertificateEvaluation('');
      const data = res?.message || res?.data || res;
      if (Array.isArray(data)) {
        setEvaluations(data);
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.data)) setEvaluations(data.data);
        else if (data.name) setEvaluations([data]);
        else setEvaluations([]);
      } else {
        setEvaluations([]);
      }
    } catch (err: any) {
      setListError(err?.message || 'Failed to fetch evaluations.');
    } finally {
      setListLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateSuccess('');
    setCreateError('');
    try {
      if (formData.name) {
        await updateCertificateEvaluation(formData as any);
        setCreateSuccess('Certificate evaluation updated successfully!');
      } else {
        await createCertificateEvaluation(formData);
        setCreateSuccess('Certificate evaluation created successfully!');
      }
      
      setFormData({
        name: '', member: '', course: '', batch_name: '', evaluator: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '10:00:00', end_time: '11:00:00',
        rating: 4, status: 'Pass', summary: ''
      });
      fetchEvaluationsList();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to save evaluation. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = (evalData: any) => {
    setFormData({
      name: evalData.name || '',
      member: evalData.member || '',
      course: evalData.course || '',
      batch_name: evalData.batch_name || '',
      evaluator: evalData.evaluator || '',
      date: evalData.date || new Date().toISOString().split('T')[0],
      start_time: evalData.start_time || '10:00:00',
      end_time: evalData.end_time || '11:00:00',
      rating: evalData.rating || 4,
      status: evalData.status || 'Pass',
      summary: evalData.summary || ''
    });
    setCreateSuccess('');
    setCreateError('');
    setActiveTab('create');
  };

  const handleDelete = async (evalName: string) => {
    if (!evalName) return;
    if (!confirm('Are you sure you want to delete this evaluation?')) return;
    
    setDeleteLoading(evalName);
    try {
      await deleteCertificateEvaluation(evalName);
      setEvaluations(prev => prev.filter(e => e.name !== evalName));
      alert('Evaluation deleted successfully.');
    } catch (err: any) {
      alert(err?.message || 'Failed to delete evaluation.');
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />
      
      <div className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Certificate Evaluations</h1>
          <p className="text-indigo-200">Create, manage, and track student evaluations seamlessly.</p>
        </div>
      </div>

      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full -mt-8 relative z-20">
        
        {/* Tabs */}
        <div className="flex space-x-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100 mb-8 w-fit mx-auto md:mx-0">
          <button
            onClick={() => {
              setFormData({
                name: '', member: '', course: '', batch_name: '', evaluator: '',
                date: new Date().toISOString().split('T')[0],
                start_time: '10:00:00', end_time: '11:00:00',
                rating: 4, status: 'Pass', summary: ''
              });
              setCreateSuccess('');
              setCreateError('');
              setActiveTab('create');
            }}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {formData.name ? <Edit2 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />} 
            {formData.name ? 'Edit Evaluation' : 'Create Evaluation'}
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${activeTab === 'manage' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <BookOpen className="w-4 h-4" /> Evaluations List
          </button>
        </div>

        {/* Create / Edit Tab */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              {formData.name ? `Edit Record: ${formData.name}` : 'New Evaluation Record'}
            </h2>
            
            {createSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-3 border border-emerald-100">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium text-sm">{createSuccess}</p>
              </div>
            )}
            
            {createError && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 border border-red-100">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium text-sm">{createError}</p>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" /> Member Email
                  </label>
                  <input type="email" name="member" required value={formData.member} onChange={handleInputChange} placeholder="student@example.com" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm" />
                </div>

                <div className="space-y-2 z-[90]">
                  <Dropdown
                    id="course"
                    label="Course"
                    value={formData.course}
                    onChange={(value) => setFormData(prev => ({ ...prev, course: value }))}
                    endpoint="https://devlms.stridenex.ai/api/method/lms.lms.stride_lms.get_course_dropdown"
                    placeholder="Select Course"
                    required
                    searchable
                  />
                </div>

                <div className="space-y-2 z-[80]">
                  <Dropdown
                    id="batch_name"
                    label="Batch Name"
                    value={formData.batch_name}
                    onChange={(value) => setFormData(prev => ({ ...prev, batch_name: value }))}
                    endpoint="https://devlms.stridenex.ai/api/method/lms.lms.stride_lms.get_batch_dropdown"
                    placeholder="Select Batch"
                    searchable
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Evaluator Email</label>
                  <input type="email" name="evaluator" value={formData.evaluator} onChange={handleInputChange} placeholder="evaluator@example.com" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" /> Date
                  </label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" /> Time (Start - End)
                  </label>
                  <div className="flex gap-2">
                    <input type="time" name="start_time" step="1" value={formData.start_time} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm" />
                    <input type="time" name="end_time" step="1" value={formData.end_time} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400" /> Rating (1-5)
                  </label>
                  <input type="number" name="rating" min="1" max="5" value={formData.rating} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm">
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Evaluation Summary</label>
                <textarea name="summary" rows={4} value={formData.summary} onChange={handleInputChange} placeholder="Student successfully completed the evaluation." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-colors text-sm resize-none"></textarea>
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={createLoading} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none">
                  {createLoading ? 'Submitting...' : formData.name ? 'Update Evaluation' : 'Create Evaluation'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Manage Tab - List */}
        {activeTab === 'manage' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">All Evaluations</h2>
              <button 
                onClick={fetchEvaluationsList} 
                disabled={listLoading}
                title="Refresh List"
                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 rounded-full transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${listLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {listError && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
                <p className="font-medium text-sm">{listError}</p>
              </div>
            )}

            {!listLoading && evaluations.length === 0 && !listError && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No evaluations found</h3>
                <p className="text-slate-500">There are currently no certificate evaluations in the system.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {evaluations.map((evaluation, idx) => (
                <div key={evaluation.name || idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 truncate pr-4">{evaluation.name}</h3>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full flex-shrink-0 ${
                      evaluation.status === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 
                      evaluation.status === 'Fail' ? 'bg-red-100 text-red-700' : 
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {evaluation.status || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-6">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Member</p>
                        <p className="text-sm font-semibold text-slate-900 truncate">{evaluation.member}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Course</p>
                        <p className="text-sm font-semibold text-slate-900 truncate">{evaluation.course}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                        <p className="text-sm font-semibold text-slate-900">{evaluation.date || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rating</p>
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < (evaluation.rating || 0) ? 'fill-current' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(evaluation)}
                        className="flex items-center gap-1.5 text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(evaluation.name)}
                        disabled={deleteLoading === evaluation.name}
                        className="flex items-center gap-1.5 text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleteLoading === evaluation.name ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
