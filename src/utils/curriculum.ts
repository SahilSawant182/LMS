/**
 * Utility functions for robust sequencing and sorting of chapters and lessons in LMS courses.
 */

/**
 * Safely extracts a numerical sequence/index from an item.
 * Supports: idx, sequence_no, sequence, order, step, sort_order, lesson_order, chapter_order
 */
export const extractSequenceNumber = (item: any): number | null => {
  if (!item || typeof item !== 'object') return null;
  const sequenceKeys = ['idx', 'sequence_no', 'sequence', 'order', 'step', 'sort_order', 'lesson_order', 'chapter_order'];
  for (const key of sequenceKeys) {
    const val = item[key];
    if (val !== undefined && val !== null && val !== '') {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }
  return null;
};

/**
 * Extracts leading or embedded numbering from titles like:
 * "Chapter 1: Intro", "Chapter 02", "Lesson 3", "1. Basics", "02 - Setup", "#1 Hello"
 */
export const extractTitleNumber = (title?: string): number | null => {
  if (!title || typeof title !== 'string') return null;
  const trimmed = title.trim();

  // 1. Check for starting digits e.g. "1. ", "01 - ", "1 "
  const leadingMatch = trimmed.match(/^(\d+)(?:[.:\-)\s]|$)/);
  if (leadingMatch && leadingMatch[1]) {
    return parseInt(leadingMatch[1], 10);
  }

  // 2. Check for "Chapter 1", "Lesson 2", "Module 3", "Unit 4", "Part 5"
  const keywordMatch = trimmed.match(/(?:chapter|lesson|module|unit|part|section|session)\s*#?\s*(\d+)/i);
  if (keywordMatch && keywordMatch[1]) {
    return parseInt(keywordMatch[1], 10);
  }

  return null;
};

/**
 * Robust comparator for curriculum chapters or lessons:
 * 1. Explicit positive sequence number (idx, sequence_no, order, etc. > 0)
 * 2. Creation timestamp (ascending: created first comes first, matching course creation sequence)
 * 3. Title-extracted numbering (e.g. Chapter 1 vs Chapter 2, Lesson 1 vs Lesson 2)
 * 4. Natural language alphanumeric sorting (localeCompare with numeric: true)
 */
export const compareCurriculumItems = (a: any, b: any): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // 1. Explicit sequence number (idx, sequence_no, order, etc.)
  const seqA = extractSequenceNumber(a);
  const seqB = extractSequenceNumber(b);
  if (seqA !== null && seqB !== null && seqA !== seqB) {
    return seqA - seqB;
  }
  if (seqA !== null && seqB === null) return -1;
  if (seqA === null && seqB !== null) return 1;

  // 2. Creation timestamp (ascending: created first comes first)
  if (a.creation && b.creation) {
    const timeA = new Date(a.creation).getTime();
    const timeB = new Date(b.creation).getTime();
    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
      return timeA - timeB;
    }
  }

  // 3. Title-extracted numbering (e.g. Chapter 1 vs Chapter 2)
  const titleA = a.title || a.chapter_name || a.lesson_name || a.name || '';
  const titleB = b.title || b.chapter_name || b.lesson_name || b.name || '';
  const numA = extractTitleNumber(titleA);
  const numB = extractTitleNumber(titleB);
  if (numA !== null && numB !== null && numA !== numB) {
    return numA - numB;
  }
  if (numA !== null && numB === null) return -1;
  if (numA === null && numB !== null) return 1;

  // 4. Preserve original syllabus order if no explicit sequence, creation date, or numbered title exists
  return 0;
};
