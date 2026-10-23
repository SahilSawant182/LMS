'use client';

import React, { useEffect, useRef, useState } from 'react';
import { NotebookPen, Trash2 } from 'lucide-react';
import { NoteColor } from '@/types/notes.types';

const COLOR_OPTIONS: { label: string; color: NoteColor; dot: string; ring: string }[] = [
  { label: 'Yellow', color: 'Yellow', dot: '#f59e0b', ring: 'ring-amber-400' },
  { label: 'Green',  color: 'Green',  dot: '#10b981', ring: 'ring-emerald-400' },
  { label: 'Blue',   color: 'Blue',   dot: '#0284c7', ring: 'ring-sky-400' },
  { label: 'Purple', color: 'Purple', dot: '#a855f7', ring: 'ring-purple-400' },
  { label: 'Red',    color: 'Red',    dot: '#f43f5e', ring: 'ring-rose-400' },
];

interface InlineHighlightMenuProps {
  /** Viewport-relative position of the selection bounding rect */
  rect: DOMRect;
  selectedText: string;
  /** If not null, the selection sits inside an existing highlight with this note ID */
  existingNoteId?: string | null;
  onHighlight: (color: NoteColor) => void;
  onAddToNotes: () => void;
  onRemoveHighlight?: () => void;
  onClose: () => void;
}

export default function InlineHighlightMenu({
  rect,
  selectedText,
  existingNoteId,
  onHighlight,
  onAddToNotes,
  onRemoveHighlight,
  onClose,
}: InlineHighlightMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Close on outside click / escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Position: center horizontally over the selection, above it
  const MENU_WIDTH = 292; // approximate px width
  const MENU_HEIGHT = 60;
  const OFFSET_Y = 10;

  const scrollX = typeof window !== 'undefined' ? window.scrollX : 0;
  const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
  const vpW = typeof window !== 'undefined' ? window.innerWidth : 1200;

  let left = rect.left + scrollX + rect.width / 2 - MENU_WIDTH / 2;
  let top = rect.top + scrollY - MENU_HEIGHT - OFFSET_Y;

  // Clamp horizontally
  left = Math.max(8, Math.min(left, vpW - MENU_WIDTH - 8));
  // If menu would go off top, show below selection instead
  if (top < scrollY + 8) {
    top = rect.bottom + scrollY + OFFSET_Y;
  }

  if (!selectedText.trim()) return null;

  return (
    <div
      ref={menuRef}
      role="toolbar"
      aria-label="Text highlight menu"
      className={`fixed z-50 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-150 ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95'
      }`}
      style={{ left, top, minWidth: MENU_WIDTH }}
    >
      {/* Colour swatch row */}
      <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
        {COLOR_OPTIONS.map(({ label, color, dot, ring }) => (
          <button
            key={color}
            title={`Highlight ${label}`}
            aria-label={`Highlight in ${label}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onHighlight(color);
            }}
            className={`w-5 h-5 rounded-full ring-2 ring-offset-1 ${ring} transition-transform duration-150 hover:scale-125 active:scale-95 cursor-pointer shadow-sm`}
            style={{ backgroundColor: dot }}
          />
        ))}
      </div>

      {/* Add to Notes */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddToNotes();
        }}
        title="Add to my notes"
        aria-label="Add selected text to lesson notes"
        className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
      >
        <NotebookPen className="w-3.5 h-3.5 shrink-0" />
        Add to Notes
      </button>

      {/* Remove Highlight — shown only when inside existing highlight */}
      {existingNoteId && onRemoveHighlight && (
        <>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemoveHighlight();
            }}
            title="Remove highlight"
            aria-label="Remove existing highlight"
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            Remove
          </button>
        </>
      )}
    </div>
  );
}
