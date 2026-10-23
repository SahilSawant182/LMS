import { apiService, API_METHOD_PREFIX } from '@/services/api.services';
import { LessonNote, LessonNotesResponse, SaveLessonNotePayload } from '@/types/notes.types';

type ApiEnvelope<T = Record<string, unknown>> = {
  message?: T;
  data?: T;
};

const extractData = <T extends object>(response: unknown): T => {
  if (response && typeof response === 'object') {
    const envelope = response as ApiEnvelope<T>;
    if (envelope.message && typeof envelope.message === 'object') {
      return envelope.message as T;
    }
    if (envelope.data && typeof envelope.data === 'object') {
      return envelope.data as T;
    }
    return response as T;
  }
  return {} as T;
};

export const getLessonNotes = async (lessonName: string): Promise<LessonNotesResponse> => {
  if (!lessonName) {
    return { success: false, notes: [], highlights: [], notebook: null };
  }
  try {
    const response = await apiService.get(
      `method/${API_METHOD_PREFIX}.get_lesson_notes?lesson=${encodeURIComponent(lessonName)}`
    );
    const data = extractData<{
      success?: boolean;
      notes?: LessonNote[];
      highlights?: LessonNote[];
      notebook?: LessonNote | null;
    }>(response);

    return {
      success: Boolean(data?.success),
      notes: data?.notes || [],
      highlights: data?.highlights || [],
      notebook: data?.notebook || null,
    };
  } catch {
    return { success: false, notes: [], highlights: [], notebook: null };
  }
};

export const saveLessonNote = async (payload: SaveLessonNotePayload): Promise<LessonNote | null> => {
  try {
    const response = await apiService.post(`method/${API_METHOD_PREFIX}.save_lesson_note`, payload);
    const data = extractData<{ note?: LessonNote } & LessonNote>(response);
    return data?.note || (data?.name ? (data as LessonNote) : null);
  } catch {
    return null;
  }
};

export const deleteLessonNote = async (name: string): Promise<boolean> => {
  try {
    await apiService.post(`method/${API_METHOD_PREFIX}.delete_lesson_note`, { name });
    return true;
  } catch {
    return false;
  }
};

export const deleteLessonHighlight = async (lesson: string, highlighted_text: string): Promise<number> => {
  try {
    const response = await apiService.post(`method/${API_METHOD_PREFIX}.delete_lesson_highlight`, {
      lesson,
      highlighted_text,
    });
    const data = extractData<{ deleted_count?: number }>(response);
    return data?.deleted_count || 0;
  } catch {
    return 0;
  }
};
