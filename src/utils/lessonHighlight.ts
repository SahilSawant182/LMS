import { LessonNote } from '@/types/notes.types';

export interface HighlightColorDef {
  bg: string;
  rgbaBg: string;
  dot: string;
  border: string;
  twClass: string;
}

export const COLOR_STYLES: Record<string, HighlightColorDef> = {
  yellow: {
    bg: 'bg-amber-200/60 hover:bg-amber-200/80',
    rgbaBg: 'rgba(254, 240, 138, 0.65)',
    dot: '#eab308',
    border: '#ca8a04',
    twClass: 'amber',
  },
  green: {
    bg: 'bg-emerald-200/60 hover:bg-emerald-200/80',
    rgbaBg: 'rgba(167, 243, 208, 0.65)',
    dot: '#10b981',
    border: '#059669',
    twClass: 'emerald',
  },
  blue: {
    bg: 'bg-sky-200/60 hover:bg-sky-200/80',
    rgbaBg: 'rgba(186, 230, 253, 0.65)',
    dot: '#0284c7',
    border: '#0284c7',
    twClass: 'sky',
  },
  purple: {
    bg: 'bg-purple-200/60 hover:bg-purple-200/80',
    rgbaBg: 'rgba(233, 213, 255, 0.65)',
    dot: '#a855f7',
    border: '#9333ea',
    twClass: 'purple',
  },
  red: {
    bg: 'bg-rose-200/60 hover:bg-rose-200/80',
    rgbaBg: 'rgba(254, 205, 211, 0.65)',
    dot: '#f43f5e',
    border: '#e11d48',
    twClass: 'rose',
  },
};

export const getColorStyleByName = (colorName?: string | null): HighlightColorDef => {
  const key = (colorName || 'Yellow').toLowerCase();
  return COLOR_STYLES[key] || COLOR_STYLES.yellow;
};

export const applyHighlightToDOM = (note: LessonNote, container: HTMLElement): boolean => {
  if (!note.highlighted_text || !container) return false;
  const phrase = note.highlighted_text.trim();
  if (!phrase) return false;

  // Avoid duplicate highlight spans
  const existing = container.querySelector(`[data-note-id="${note.name}"]`);
  if (existing) return true;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // Skip nodes inside existing highlights
      if ((node.parentElement as HTMLElement)?.closest?.('.lms-highlighted-text')) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue && node.nodeValue.toLowerCase().includes(phrase.toLowerCase())
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  const textNode = walker.nextNode();
  if (!textNode || !textNode.nodeValue) return false;

  const startIndex = textNode.nodeValue.toLowerCase().indexOf(phrase.toLowerCase());
  if (startIndex === -1) return false;
  const endIndex = startIndex + phrase.length;

  try {
    const range = document.createRange();
    range.setStart(textNode, startIndex);
    range.setEnd(textNode, endIndex);

    const mark = document.createElement('mark');
    const colorKey = (note.color || 'Yellow').toLowerCase();
    const style = COLOR_STYLES[colorKey] || COLOR_STYLES.yellow;

    mark.className = `lms-highlighted-text rounded-[3px] px-1 py-0.5 cursor-pointer transition-all duration-150 ${style.bg}`;
    mark.dataset.noteId = note.name;
    mark.dataset.color = note.color;
    mark.dataset.text = phrase;
    mark.style.backgroundColor = style.rgbaBg;
    mark.style.color = 'inherit';
    mark.style.boxDecorationBreak = 'clone';
    (mark.style as unknown as Record<string, string>).WebkitBoxDecorationBreak = 'clone';

    range.surroundContents(mark);
    return true;
  } catch (err) {
    console.debug('Could not wrap highlight range:', err);
    return false;
  }
};

export const removeHighlightFromDOM = (noteId: string, container: HTMLElement): void => {
  const mark = container.querySelector<HTMLElement>(`[data-note-id="${noteId}"]`);
  if (!mark) return;
  const parent = mark.parentNode;
  if (!parent) return;
  // Unwrap all children of the mark back into parent
  while (mark.firstChild) {
    parent.insertBefore(mark.firstChild, mark);
  }
  parent.removeChild(mark);
  parent.normalize();
};

export const scrollToLessonQuote = (text: string, container: HTMLElement): void => {
  if (!text || !container) return;
  const targetText = text.trim().toLowerCase();

  // First try: search for a highlighted mark with matching text
  const marks = container.querySelectorAll<HTMLElement>('.lms-highlighted-text');
  for (const mark of Array.from(marks)) {
    if (
      mark.dataset.text?.toLowerCase().includes(targetText) ||
      mark.textContent?.toLowerCase().includes(targetText)
    ) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mark.style.outline = '3px solid #6366f1';
      mark.style.outlineOffset = '3px';
      mark.style.borderRadius = '4px';
      setTimeout(() => {
        mark.style.outline = 'none';
        mark.style.outlineOffset = '';
        mark.style.borderRadius = '';
      }, 2500);
      return;
    }
  }

  // Fallback: search all text-bearing elements
  const paras = container.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, li, blockquote');
  for (const el of Array.from(paras)) {
    if (el.textContent?.toLowerCase().includes(targetText)) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const prevBg = el.style.backgroundColor;
      el.style.backgroundColor = 'rgba(254, 240, 138, 0.55)';
      el.style.transition = 'background-color 0.5s ease';
      setTimeout(() => {
        el.style.backgroundColor = prevBg;
      }, 2500);
      return;
    }
  }
};
