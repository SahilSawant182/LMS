'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, BookOpen, Quote, Trash2, StickyNote, Eye, Edit3 } from 'lucide-react';
import { LessonNote, NoteColor } from '@/types/notes.types';
import { saveLessonNote, deleteLessonNote } from '@/services/notes.services';
import { getColorStyleByName, scrollToLessonQuote } from '@/utils/lessonHighlight';
import { showToast } from '@/components/ui/Toast';

/**
 * Sanitizes and normalizes stored note text.
 * Converts legacy raw HTML tags (<blockquote>, <p>, etc.) into clean Markdown blockquotes (> text).
 */
export function cleanStoredNote(raw?: string | null): string {
  if (!raw) return '';
  if (!/<[a-z][\s\S]*>/i.test(raw)) return raw;

  return raw
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
      const stripped = content
        .replace(/<\/?p[^>]*>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .trim();
      const lines = stripped
        .split('\n')
        .map((l: string) => (l.trim() ? `> ${l.trim()}` : '>'))
        .join('\n');
      return `${lines}\n\n`;
    })
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Lightweight, safe renderer for personal markdown notes (blockquotes, lists, paragraphs).
 */
function renderMarkdownNotes(content: string): React.ReactNode {
  const cleaned = cleanStoredNote(content);
  if (!cleaned.trim()) {
    return (
      <p className="text-sm text-slate-400 italic">
        No notes written yet. Switch to <strong>Edit</strong> mode to jot down notes or select text in the lesson to quote it.
      </p>
    );
  }

  const blocks = cleaned.split(/\n\s*\n/);

  return (
    <div className="space-y-3.5 text-sm leading-relaxed text-slate-800">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Blockquote
        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed
            .split('\n')
            .map((line) => line.replace(/^>\s?/, ''))
            .join('\n');

          return (
            <blockquote
              key={idx}
              className="my-3 pl-4 border-l-4 border-indigo-500 italic text-slate-700 bg-indigo-50/50 py-3 pr-4 rounded-r-xl font-sans"
            >
              <div className="whitespace-pre-wrap leading-relaxed">{quoteLines}</div>
            </blockquote>
          );
        }

        // Bullet list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed
            .split('\n')
            .filter((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '));
          return (
            <ul key={idx} className="list-disc list-inside space-y-1 text-slate-700 pl-1">
              {items.map((it, i) => (
                <li key={i}>{it.replace(/^[-*]\s+/, '')}</li>
              ))}
            </ul>
          );
        }

        // Paragraph
        return (
          <p key={idx} className="whitespace-pre-wrap text-slate-700 leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

interface LessonNotesTabProps {
  lessonName: string;
  /** Initial notebook note (the single per-lesson free-text pad) */
  initialNotebook: LessonNote | null;
  /** All saved highlights for this lesson */
  highlights: LessonNote[];
  /** Ref to the lesson reading container DOM node (for scroll-to-quote) */
  readingContainerRef: React.RefObject<HTMLElement | null>;
  /** Called when a highlight is deleted so parent can remove from DOM */
  onHighlightDeleted?: (noteId: string) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

export default function LessonNotesTab({
  lessonName,
  initialNotebook,
  highlights,
  readingContainerRef,
  onHighlightDeleted,
}: LessonNotesTabProps) {
  const [noteContent, setNoteContent] = useState<string>(() => cleanStoredNote(initialNotebook?.note));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [notebookId, setNotebookId] = useState<string | null>(() => initialNotebook?.name || null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [prevNotebook, setPrevNotebook] = useState(initialNotebook);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when initialNotebook prop changes asynchronously
  if (initialNotebook !== prevNotebook) {
    setPrevNotebook(initialNotebook);
    if (initialNotebook) {
      setNoteContent(cleanStoredNote(initialNotebook.note));
      setNotebookId(initialNotebook.name || null);
    }
  }

  const highlightList = highlights.filter((h) => !deletedIds.has(h.name));

  // Auto-grow textarea height
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [noteContent]);

  const persistNote = useCallback(
    async (content: string) => {
      if (!lessonName) return;
      setSaveStatus('saving');
      try {
        const saved = await saveLessonNote({
          lesson: lessonName,
          note: content,
          color: 'Yellow' as NoteColor,
          name: notebookId || undefined,
        });
        if (saved?.name && !notebookId) {
          setNotebookId(saved.name);
        }
        setSaveStatus('saved');
        // Reset to idle after 2.5 s
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch {
        setSaveStatus('idle');
      }
    },
    [lessonName, notebookId]
  );

  // Listen for "Add to Notes" event dispatched by the parent InlineHighlightMenu handler
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ text: string }>;
      const quoteText = custom.detail?.text;
      if (!quoteText) return;
      setNoteContent((prev) => {
        const separator = prev && !prev.endsWith('\n') ? '\n\n' : '';
        const next = prev + separator + quoteText;
        // Trigger auto-save
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => persistNote(next), 1600);
        setSaveStatus('saving');
        return next;
      });
      // Scroll textarea into view
      setTimeout(() => textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    };
    window.addEventListener('lms-append-note', handler);
    return () => window.removeEventListener('lms-append-note', handler);
  }, [persistNote]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNoteContent(value);
    setSaveStatus('saving');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistNote(value);
    }, 1600);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleQuoteClick = (text: string) => {
    const container = readingContainerRef.current;
    if (!container) {
      showToast.info('Scroll up to see the lesson content');
      return;
    }
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      scrollToLessonQuote(text, container as HTMLElement);
    }, 350);
  };

  const handleDeleteHighlight = async (note: LessonNote) => {
    const ok = await deleteLessonNote(note.name);
    if (ok) {
      setDeletedIds((prev) => new Set(prev).add(note.name));
      onHighlightDeleted?.(note.name);
      showToast.success('Highlight removed');
    } else {
      showToast.error('Failed to remove highlight');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Personal Notebook ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-50 to-white border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <StickyNote className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">My Lesson Notes</p>
              <p className="text-[11px] text-slate-500">Auto-saved as you type</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Edit / Preview Segmented Control */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100/90 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'edit'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'preview'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            {/* Save Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-300 ${
                saveStatus === 'saving'
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : saveStatus === 'saved'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-transparent text-transparent border border-transparent'
              }`}
            >
              {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
              {saveStatus === 'saved' && <CheckCircle2 className="w-3 h-3" />}
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : ''}
            </div>
          </div>
        </div>

        {/* Note Body */}
        {viewMode === 'edit' ? (
          <div className="p-4">
            <textarea
              ref={textareaRef}
              id="lesson-notes-textarea"
              value={noteContent}
              onChange={handleNoteChange}
              placeholder="✍️  Start writing your personal notes for this lesson…&#10;&#10;Tip: Select any text in the lesson and click 'Add to Notes' to quote it here."
              className="w-full min-h-[180px] resize-none text-sm text-slate-700 placeholder:text-slate-400 bg-transparent outline-none leading-relaxed font-sans"
              spellCheck
            />
          </div>
        ) : (
          <div
            className="p-5 min-h-[180px] bg-slate-50/30"
            onClick={() => !noteContent.trim() && setViewMode('edit')}
          >
            {renderMarkdownNotes(noteContent)}
          </div>
        )}
      </div>

      {/* ─── Saved Highlights ─── */}
      {highlightList.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Quote className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saved Highlights ({highlightList.length})
            </h3>
          </div>

          <div className="space-y-2.5">
            {highlightList.map((h) => {
              const style = getColorStyleByName(h.color);
              return (
                <div
                  key={h.name}
                  className="group flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-150"
                >
                  {/* Color dot */}
                  <div
                    className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1"
                    style={{ backgroundColor: style.dot }}
                  />

                  {/* Quote text */}
                  <button
                    onClick={() => handleQuoteClick(h.highlighted_text || '')}
                    className="flex-1 text-left text-sm text-slate-700 leading-relaxed italic cursor-pointer hover:text-indigo-700 transition-colors"
                    title="Click to jump to this passage in the lesson"
                  >
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      &ldquo;{h.highlighted_text}&rdquo;
                    </span>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteHighlight(h)}
                    title="Remove this highlight"
                    aria-label="Remove highlight"
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {highlightList.length === 0 && !noteContent && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-1">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No highlights yet</p>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Select any text in the lesson above and use the pop-up toolbar to highlight it or add it to your notes.
          </p>
        </div>
      )}
    </div>
  );
}
