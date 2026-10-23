export type NoteColor = 'Red' | 'Blue' | 'Green' | 'Yellow' | 'Purple';

export interface LessonNote {
  name: string;
  lesson: string;
  course?: string;
  member: string;
  color: NoteColor;
  highlighted_text?: string | null;
  note?: string | null;
  creation?: string;
  modified?: string;
}

export interface LessonNotesResponse {
  success: boolean;
  notes: LessonNote[];
  highlights: LessonNote[];
  notebook: LessonNote | null;
}

export interface SaveLessonNotePayload {
  lesson: string;
  note?: string | null;
  highlighted_text?: string | null;
  color?: NoteColor;
  name?: string | null;
}
