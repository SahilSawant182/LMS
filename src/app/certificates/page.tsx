"use client";

import React, { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import {
  Award,
  Calendar,
  User,
  Clock,
  FileText,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Printer,
  ChevronDown,
  Layers,
  Sparkles,
  AlertCircle,
  Check,
  Star,
  Loader2,
  X,
  Download,
} from 'lucide-react';
import {
  getCertificates,
  getCertificateTemplates,
  previewCertificate,
  createDefaultCertificate,
  getStudentCertificates,
  getCertificatePdfUrl,
  downloadCertificatePdf,
  CertificateTemplate,
} from '@/services/lms.services';
import { getCurrentUserEmail } from '@/services/api.services';
import { isAuthorizedInstructor } from '@/services/auth.services';
import { formatDate } from '@/utils/formatters';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Dropdown from '@/components/ui/Dropdown';
import { showToast } from '@/components/ui/Toast';

interface Certificate {
  name: string;
  member_name?: string;
  evaluator_name?: string;
  issue_date?: string;
  expiry_date?: string;
  course_title?: string;
  course?: string;
  batch_title?: string;
  template?: string;
  format?: string;
}

export default function CertificatesPage() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const prevBlobUrlRef = useRef<string | null>(null);

  // Role detection
  const [isInstructor, setIsInstructor] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Instructor: Templates & Preview state
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSettingDefault, setIsSettingDefault] = useState<boolean>(false);
  const [defaultCertificate, setDefaultCertificate] = useState<string>('');

  // Set selected template as default certificate for instructor
  const handleSetDefaultCertificate = async () => {
    if (!selectedTemplate) {
      showToast.warning('Please select a certificate template first.');
      return;
    }

    const instructorEmail =
      typeof window !== 'undefined'
        ? localStorage.getItem('userEmail') ||
          localStorage.getItem('user') ||
          ''
        : '';

    if (!instructorEmail) {
      showToast.error('Instructor email not found. Please log in again.');
      return;
    }

    setIsSettingDefault(true);
    try {
      const res = await createDefaultCertificate({
        instructor: instructorEmail.trim(),
        certificate: selectedTemplate.trim(),
      });

      setDefaultCertificate(selectedTemplate);
      const msg =
        res?.message?.message ||
        res?.message ||
        `"${selectedTemplate}" has been set as your default certificate.`;
      showToast.success(
        typeof msg === 'string' ? msg : 'Default certificate set successfully!'
      );
    } catch (err: any) {
      console.error('Failed to set default certificate:', err);
      const errMsg =
        err?.response?.data?.message?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to set default certificate.';
      showToast.error(errMsg);
    } finally {
      setIsSettingDefault(false);
    }
  };

  // Student state
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [studentLoading, setStudentLoading] = useState<boolean>(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Helper to fetch student's earned certificates using the dedicated get_student_certificate API
  const fetchStudentCertificates = async () => {
    setStudentLoading(true);
    setStudentError(null);
    try {
      const email = getCurrentUserEmail();
      const rawResponse = await getStudentCertificates(email);
      const certArray = Array.isArray(rawResponse)
        ? rawResponse
        : (rawResponse?.message?.data || rawResponse?.data?.message || rawResponse?.data || rawResponse?.message || []);
      const data = Array.isArray(certArray) ? certArray : [];
      setCertificates(data);
    } catch (err: any) {
      console.error('Failed to fetch student certificates:', err);
      try {
        const fallbackRes = await getCertificates();
        const certArray = Array.isArray(fallbackRes)
          ? fallbackRes
          : (fallbackRes?.message?.data || fallbackRes?.data?.message || fallbackRes?.data || fallbackRes?.message || []);
        setCertificates(Array.isArray(certArray) ? certArray : []);
      } catch {
        setStudentError(err?.message || 'Failed to fetch certificates');
      }
    } finally {
      setStudentLoading(false);
    }
  };

  // Open Certificate PDF directly in a new tab using the Frappe download_pdf print format
  const handleOpenCertificate = (cert: Certificate) => {
    const url = getCertificatePdfUrl(
      cert.name,
      cert.template || cert.format || 'StrideNEX Creative Pathways'
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Helper to load preview for a given template
  const loadPreview = async (templateName: string) => {
    if (!templateName) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const rawRes = await previewCertificate(templateName);

      let content = '';

      if (rawRes instanceof Blob) {
        if (rawRes.type === 'application/pdf') {
          content = URL.createObjectURL(rawRes);
        } else {
          try {
            const text = await rawRes.text();
            if (text.startsWith('%PDF') || text.includes('%PDF-')) {
              content = URL.createObjectURL(
                new Blob([rawRes], { type: 'application/pdf' })
              );
            } else {
              try {
                const parsed = JSON.parse(text);
                content =
                  parsed?.message?.html ||
                  parsed?.message?.template ||
                  parsed?.message ||
                  parsed?.data ||
                  text;
              } catch {
                content = text;
              }
            }
          } catch {
            content = URL.createObjectURL(rawRes);
          }
        }
      } else if (typeof rawRes === 'string') {
        const trimmed = rawRes.trim();
        if (trimmed.startsWith('%PDF') || trimmed.includes('%PDF-')) {
          const len = rawRes.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = rawRes.charCodeAt(i) & 0xff;
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          content = URL.createObjectURL(blob);
        } else {
          content = rawRes;
        }
      } else if (rawRes?.message !== undefined) {
        if (typeof rawRes.message === 'string') {
          const trimmed = rawRes.message.trim();
          if (trimmed.startsWith('%PDF') || trimmed.includes('%PDF-')) {
            const len = rawRes.message.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = rawRes.message.charCodeAt(i) & 0xff;
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });
            content = URL.createObjectURL(blob);
          } else {
            content = rawRes.message;
          }
        } else if (rawRes.message && typeof rawRes.message === 'object') {
          content =
            rawRes.message.html ||
            rawRes.message.template ||
            rawRes.message.preview ||
            rawRes.message.url ||
            JSON.stringify(rawRes.message);
        }
      } else if (rawRes?.data !== undefined) {
        if (typeof rawRes.data === 'string') {
          const trimmed = rawRes.data.trim();
          if (trimmed.startsWith('%PDF') || trimmed.includes('%PDF-')) {
            const len = rawRes.data.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = rawRes.data.charCodeAt(i) & 0xff;
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });
            content = URL.createObjectURL(blob);
          } else {
            content = rawRes.data;
          }
        } else if (rawRes.data && typeof rawRes.data === 'object') {
          content =
            rawRes.data.html ||
            rawRes.data.template ||
            rawRes.data.preview ||
            rawRes.data.url ||
            JSON.stringify(rawRes.data);
        }
      } else if (rawRes?.html) {
        content = rawRes.html;
      } else if (rawRes?.template) {
        content = rawRes.template;
      }

      if (content.startsWith('blob:')) {
        if (prevBlobUrlRef.current) {
          try {
            URL.revokeObjectURL(prevBlobUrlRef.current);
          } catch {}
        }
        prevBlobUrlRef.current = content;
      }

      setPreviewContent(content);
    } catch (err: any) {
      setPreviewError(err?.message || 'Failed to load certificate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Helper to fetch template list for instructor
  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const list = await getCertificateTemplates();
      const validTemplates = Array.isArray(list) ? list : [];
      setTemplates(validTemplates);

      if (validTemplates.length > 0) {
        const first = validTemplates[0];
        const defaultName = typeof first === 'string' ? first : first.name;
        setSelectedTemplate(defaultName);
        await loadPreview(defaultName);
      } else {
        setSelectedTemplate('');
        setPreviewContent('');
      }
    } catch (err: any) {
      setTemplatesError(err?.message || 'Failed to fetch certificate templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    const isInst = isAuthorizedInstructor();
    setIsInstructor(isInst);
    setAuthChecked(true);

    if (isInst) {
      /*
      // =========================================================================
      // Previously integrated API - commented out for instructor role as requested:
      // =========================================================================
      // const rawResponse = await getCertificates();
      // const certArray = Array.isArray(rawResponse)
      //   ? rawResponse
      //   : (rawResponse?.message?.data || rawResponse?.data?.message || rawResponse?.data || rawResponse?.message || []);
      // const data = Array.isArray(certArray) ? certArray : [];
      // setCertificates(data);
      */
      fetchTemplates();
    } else {
      // Student role flow: fetch earned certificates
      fetchStudentCertificates();
    }
  }, []);

  const handleSelectTemplate = (name: string) => {
    setSelectedTemplate(name);
    loadPreview(name);
  };

  // Check if preview content is a direct URL (e.g. PDF or image)
  const isUrl = (val: string): boolean => {
    if (typeof val !== 'string') return false;
    const v = val.trim();
    return (
      v.startsWith('blob:') ||
      v.startsWith('http://') ||
      v.startsWith('https://') ||
      v.startsWith('data:image/') ||
      v.startsWith('data:application/pdf') ||
      (v.startsWith('/') &&
        (v.endsWith('.pdf') ||
          v.endsWith('.png') ||
          v.endsWith('.jpg') ||
          v.includes('/files/')))
    );
  };

  // Build full HTML doc if fragment is returned
  const getIframeDoc = (raw: string) => {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (
      trimmed.toLowerCase().includes('<html') ||
      trimmed.toLowerCase().includes('<!doctype')
    ) {
      return raw;
    }
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
  </style>
</head>
<body>
  ${raw}
</body>
</html>`;
  };

  const handleOpenInNewWindow = () => {
    if (!previewContent) return;
    if (isUrl(previewContent)) {
      window.open(previewContent, '_blank');
      return;
    }
    const blob = new Blob([getIframeDoc(previewContent)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch {}
    }
    handleOpenInNewWindow();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-slate-900 text-white pt-8 pb-14 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-60 h-60 rounded-full bg-yellow-500/10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center justify-center p-2 bg-amber-500/20 rounded-full mb-3 ring-2 ring-amber-500/10">
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-1.5 tracking-tight">
            {isInstructor ? (
              <>
                Certificate{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
                  Templates
                </span>
              </>
            ) : (
              <>
                Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
                  Certificates
                </span>
              </>
            )}
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-xs md:text-sm mb-2">
            {isInstructor
              ? 'Select and preview certificate templates available for your courses, batches, and programs.'
              : "View and manage the certificates you've earned from completing courses and batches."}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full -mt-6 relative z-20">
        {/* INSTRUCTOR ROLE VIEW */}
        {isInstructor ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 mb-8">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    Certificate Template Preview
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose a certificate template from the dropdown to see its live design.
                  </p>
                </div>
              </div>

              {/* Template Dropdown Selector (Matches Image 2) */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-auto min-w-[280px] md:min-w-[320px]">
                  <Dropdown
                    id="certificate-template-select"
                    value={selectedTemplate}
                    onChange={(val: string) => handleSelectTemplate(val)}
                    options={templates.map((tpl) => {
                      const name = typeof tpl === 'string' ? tpl : tpl.name;
                      return { value: name, label: name };
                    })}
                    placeholder={
                      templatesLoading
                        ? 'Loading templates...'
                        : 'Select Certificate Template'
                    }
                    modalTitle="SELECT TEMPLATE"
                    searchable
                    disabled={templatesLoading || templates.length === 0}
                    triggerClassName="!bg-white !border-slate-200 hover:!border-slate-300 !rounded-xl !text-sm !font-semibold !py-2.5 !px-3.5 shadow-sm"
                  />
                </div>

                {/* Actions: Refresh, Fullscreen, Print, Set as Default */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadPreview(selectedTemplate)}
                    disabled={previewLoading || !selectedTemplate}
                    title="Refresh Preview"
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RotateCcw
                      className={`w-4 h-4 ${previewLoading ? 'animate-spin' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenInNewWindow}
                    disabled={!previewContent || previewLoading}
                    title="Open in new window"
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={!previewContent || previewLoading}
                    title="Print template"
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSetDefaultCertificate}
                    disabled={
                      isSettingDefault ||
                      !selectedTemplate ||
                      templatesLoading
                    }
                    title="Set as Default Certificate"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSettingDefault ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Saving Default...</span>
                      </>
                    ) : defaultCertificate === selectedTemplate ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span className="hidden sm:inline">Default Template</span>
                      </>
                    ) : (
                      <>
                        <Star className="w-4 h-4 fill-white/20" />
                        <span className="hidden sm:inline">Set as Default</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Template Status / Meta Bar */}
            {selectedTemplate && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 px-4 py-2.5 bg-amber-50/60 rounded-xl border border-amber-100 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-semibold truncate">
                  <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="truncate">
                    Current Template: <strong className="text-amber-950 font-bold">{selectedTemplate}</strong>
                  </span>
                  {defaultCertificate === selectedTemplate && (
                    <span className="inline-flex items-center gap-1 bg-amber-200/90 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ml-1">
                      <Check className="w-3 h-3" /> Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-medium flex-shrink-0">
                    {templates.length} template{templates.length === 1 ? '' : 's'} loaded
                  </span>
                  {defaultCertificate !== selectedTemplate && (
                    <button
                      type="button"
                      onClick={handleSetDefaultCertificate}
                      disabled={isSettingDefault || !selectedTemplate}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer"
                    >
                      {isSettingDefault ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Star className="w-3 h-3" />
                      )}
                      <span>Set as Default</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Preview Display Container */}
            <div className="mt-6">
              {templatesLoading ? (
                <div className="flex flex-col items-center justify-center py-28 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="animate-spin rounded-full h-12 w-12 border-3 border-amber-500 border-t-transparent mb-3"></div>
                  <p className="text-sm font-semibold text-slate-700">Loading Certificate Templates...</p>
                  <p className="text-xs text-slate-400 mt-1">Fetching available design templates from server</p>
                </div>
              ) : templatesError ? (
                <div className="py-16 px-6 bg-red-50 rounded-2xl border border-red-200 text-center max-w-xl mx-auto my-6">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-red-900 mb-1">Failed to load templates</h3>
                  <p className="text-xs text-red-600 mb-4">{templatesError}</p>
                  <button
                    type="button"
                    onClick={fetchTemplates}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Try Again
                  </button>
                </div>
              ) : previewLoading ? (
                <div className="flex flex-col items-center justify-center py-36 text-center bg-slate-50/70 rounded-2xl border border-slate-200">
                  <div className="animate-spin rounded-full h-12 w-12 border-3 border-indigo-600 border-t-transparent mb-3"></div>
                  <p className="text-sm font-semibold text-slate-700">Generating Preview for "{selectedTemplate}"...</p>
                  <p className="text-xs text-slate-400 mt-1">Rendering certificate template with sample details</p>
                </div>
              ) : previewError ? (
                <div className="py-16 px-6 bg-amber-50/80 rounded-2xl border border-amber-200 text-center max-w-xl mx-auto my-6">
                  <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">Preview Unavailable</h3>
                  <p className="text-xs text-slate-600 mb-4">{previewError}</p>
                  <button
                    type="button"
                    onClick={() => loadPreview(selectedTemplate)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry Preview
                  </button>
                </div>
              ) : previewContent ? (
                <div className="bg-slate-100 rounded-2xl p-3 md:p-5 border border-slate-200 shadow-inner">
                  {isUrl(previewContent) ? (
                    <iframe
                      ref={iframeRef}
                      title={`Preview: ${selectedTemplate}`}
                      src={previewContent}
                      className="w-full h-[650px] md:h-[750px] rounded-xl border-0 bg-white shadow-sm"
                    />
                  ) : (
                    <iframe
                      ref={iframeRef}
                      title={`Preview: ${selectedTemplate}`}
                      srcDoc={getIframeDoc(previewContent)}
                      className="w-full h-[650px] md:h-[750px] rounded-xl border-0 bg-white shadow-sm"
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-24 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
                  <div className="bg-white p-4 rounded-2xl shadow-sm mb-3">
                    <Award className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No preview available</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Select a template from the dropdown above to view its live certificate preview.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STUDENT ROLE VIEW */
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8 mb-8 min-h-[400px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Issued Certificates
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Certificates earned from completing your courses and programs.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                  {certificates.length} Total
                </div>
              </div>
            </div>

            {studentLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : studentError ? (
              <div className="text-center py-12 bg-red-50 text-red-600 rounded-lg border border-red-100">
                <p>{studentError}</p>
              </div>
            ) : certificates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map((cert) => (
                  <div
                    key={cert.name}
                    className="block group cursor-pointer"
                    onClick={() => handleOpenCertificate(cert)}
                  >
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all flex flex-col h-full">
                      {/* Card Header (Design) */}
                      <div className="h-24 bg-gradient-to-br from-slate-800 to-slate-900 relative">
                        <div className="absolute -bottom-6 left-6 p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                          <div className="bg-amber-100 p-2 rounded-lg">
                            <Award className="w-8 h-8 text-amber-600" />
                          </div>
                        </div>
                        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/20 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-semibold text-white">
                            Verified
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 pt-10 flex-grow flex flex-col">
                        <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                          {cert.course_title || cert.course}
                        </h3>
                        {cert.batch_title && (
                          <p className="text-sm text-indigo-600 font-medium mb-4">
                            {cert.batch_title}
                          </p>
                        )}

                        <div className="space-y-3 mt-auto pt-3">
                          {cert.member_name && (
                            <div className="flex items-start gap-3">
                              <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-slate-500 font-medium">
                                  Issued To
                                </p>
                                <p className="text-sm font-semibold text-slate-800">
                                  {cert.member_name}
                                </p>
                              </div>
                            </div>
                          )}

                          {cert.issue_date && (
                            <div className="flex items-start gap-3">
                              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-slate-500 font-medium">
                                  Issue Date
                                </p>
                                <p className="text-sm font-medium text-slate-800">
                                  {formatDate(cert.issue_date)}
                                </p>
                              </div>
                            </div>
                          )}

                          {cert.expiry_date && (
                            <div className="flex items-start gap-3">
                              <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-slate-500 font-medium">
                                  Expiry Date
                                </p>
                                <p className="text-sm font-medium text-slate-800">
                                  {formatDate(cert.expiry_date)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end items-center text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCertificate(cert);
                            }}
                            title="View / Download Certificate PDF"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-1">
                            View &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                  <Award className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  No certificates found
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Complete courses to earn your official completion certificates. They will appear here once earned.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-300 py-8 text-center mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">© 2026 Stridenex Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
