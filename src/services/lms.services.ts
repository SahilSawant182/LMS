import { apiService, API_TOKEN, API_METHOD_PREFIX } from "./api.services";

// Define interfaces if needed, or use any/generic for now
export interface GetCourseDetailsPayload {
  course: string;
}

export interface GetLessonPayload {
  course: string;
  chapter: number | string;
  name: number | string;
}

export interface GetReviewsPayload {
  course: string;
}

export interface GetBatchDetailsPayload {
  batch?: string;
  name?: string;
}

export interface GetBatchCoursesPayload {
  batch: string;
}

export interface Instructor {
  name: string;
  username: string;
  full_name: string;
  user_image: string | null;
  first_name: string;
}

export interface Course {
  name: string;
  title: string;
  tags: string | null;
  image: string | null;
  video_link: string | null;
  card_gradient: string | null;
  short_introduction: string | null;
  description: string | null;
  published: number;
  upcoming: number;
  featured: number;
  disable_self_learning: number;
  published_on: string | null;
  category: string | null;
  status: string | null;
  paid_course: number;
  paid_certificate: number;
  course_price: number;
  currency: string | null;
  amount_usd: number;
  enable_certification: number;
  lessons: number;
  enrollments: number;
  rating: string | number;
  instructors: Instructor[];
}

export const getCourses = async (): Promise<Course[]> => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_courses`, {
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getMasterData = async (doctype: string, additionalPayload: any = {}) => {
  try {
    const payload = {
      doctype,
      ...additionalPayload
    };
    const response = await apiService.get(
      "method/lms.lms.master.get_dropdown_options",
      { params: payload }
    );
    let arr: any[] = [];
    if (response?.data && response?.data?.data && Array.isArray(response?.data?.data)) {
      arr = response.data.data;
    } else if (response?.data && Array.isArray(response?.data)) {
      arr = response.data;
    } else if (response?.message && Array.isArray(response?.message)) {
      arr = response.message;
    } else if (response?.message && response?.message?.data && Array.isArray(response?.message?.data)) {
      arr = response.message.data;
    }
    return arr.map((item: any) =>
      typeof item === "string" ? item : item.name || item.id || item.title || item.course || item.category || ""
    );
  } catch (error) {
    console.error(`Error fetching master data for ${doctype}:`, error);
    return [];
  }
};

export const enrollStudent = async (payload: { member: string, batch: string }) => {
  return apiService.post("method/lms.lms.doctype.lms_batch_enrollment.lms_batch_enrollment.enroll_student", payload);
};

export const getEnrolledStudents = async (payload: { batch: string }) => {
  return apiService.get("method/lms.lms.doctype.lms_batch_enrollment.lms_batch_enrollment.get_enrolled_students", { params: payload });
};

export const getCourseCompletionData = async (payload?: any) => {
  // If payload is required, you can change the parameter and use it in params or data depending on method.
  // Assuming GET requires params, but standard frappe utils often use GET with params.
  return apiService.get(`method/${API_METHOD_PREFIX}.get_course_completion_data`, {
    params: payload,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getCourse = async (name: string) => {
  return apiService.get("method/lms.lms.stride_lms.get_course", {
    params: { name }
  });
};

export const getCourseDetails = async (payload: GetCourseDetailsPayload | { name?: string; course?: string }) => {
  const courseName = (payload as any).name || (payload as any).course;
  return getCourse(courseName);
};

export const getCourseOutline = async (payload?: any) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_course_outline`, {
    params: payload,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getChapters = async (payload?: any) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_chapters`, {
    params: payload,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getLesson = async (payload: GetLessonPayload) => {
  return apiService.get(`method/lms.lms.stride_lms.get_lesson`, {
    params: payload,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getLessons = async (payload?: any) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_lessons`, {
    params: payload,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getEnrollments = async (payload?: any) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_enrollments`, {
    params: payload,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getReviews = async (payload: GetReviewsPayload) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_reviews`, {
    params: payload,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getBatchDetails = async (payload: GetBatchDetailsPayload) => {
  const nameParam = payload.batch || payload.name;
  return apiService.get(`method/lms.lms.stride_lms.get_batch_details`, {
    params: { batch: nameParam },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getBatchCourses = async (payload: GetBatchCoursesPayload) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_batch_courses`, {
    params: payload,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getBatches = async () => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_batches`, {
    headers: { 'Authorization': `token ${API_TOKEN}` }
  });
};

export const createBatch = async (payload: any) => {
  return apiService.post(`method/lms.lms.stride_lms.create_batch`, payload, {
    headers: { 'Authorization': `token ${API_TOKEN}` }
  });
};

export const updateBatch = async (payload: any) => {
  return apiService.post(`method/lms.lms.stride_lms.update_batch`, payload, {
    headers: { 'Authorization': `token ${API_TOKEN}` }
  });
};

export const getCertificates = async () => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_certificates`, {
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getCertificate = async (name: string) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_certificate`, {
    params: { name },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export interface CreateCoursePayload {
  title: string;
  course?: string;
  course_name?: string;
  name?: string;
  short_introduction?: string;
  description?: string;
  published?: number;
  video_link?: string;
  tags?: string;
  category?: string;
  image?: string;
  card_gradient?: string;
  upcoming?: number;
  featured?: number;
  disable_self_learning?: number;
  enforce_lesson_completion?: number;
  paid_course?: number;
  paid_certificate?: number;
  enable_certification?: number;
  course_price?: number;
  currency?: string;
  amount_usd?: number;
}

export const createCourse = async (data: CreateCoursePayload | FormData | any) => {
  const token = typeof window !== "undefined" && localStorage.getItem("apiKey") && localStorage.getItem("apiSecret")
    ? `token ${localStorage.getItem("apiKey")}:${localStorage.getItem("apiSecret")}`
    : `token ${API_TOKEN}`;

  if (typeof window !== "undefined" && data instanceof FormData) {
    return apiService.post("method/lms.lms.stride_lms.create_course", data, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': token
      }
    });
  }
  return apiService.post("method/lms.lms.stride_lms.create_course", data, {
    headers: {
      'Authorization': token
    }
  });
};

export const updateCourse = async (data: CreateCoursePayload | FormData | any) => {
  const token = typeof window !== "undefined" && localStorage.getItem("apiKey") && localStorage.getItem("apiSecret")
    ? `token ${localStorage.getItem("apiKey")}:${localStorage.getItem("apiSecret")}`
    : `token ${API_TOKEN}`;

  if (typeof window !== "undefined" && data instanceof FormData) {
    return apiService.post("method/lms.lms.stride_lms.update_course", data, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': token
      }
    });
  }
  return apiService.post("method/lms.lms.stride_lms.update_course", data, {
    headers: {
      'Authorization': token
    }
  });
};

export const deleteCourse = async (name: string) => {
  return apiService.post(`method/${API_METHOD_PREFIX}.delete_course`, { name }, {
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const deleteBatch = async (name: string) => {
  return apiService.post(`method/${API_METHOD_PREFIX}.delete_batch`, null, {
    params: { name },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const createChapter = async (data: FormData) => {
  return apiService.post(`method/${API_METHOD_PREFIX}.create_chapter`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const createLesson = async (data: any) => {
  return apiService.post(`method/${API_METHOD_PREFIX}.create_lesson`, data, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getQuizzes = async () => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_quizzes`, {
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getQuiz = async (name: string) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_quiz`, {
    params: { name },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export interface CreateQuestionPayload {
  question: string;
  type: string;
  possibility_1?: string;
  possibility_2?: string;
  possibility_3?: string;
  possibility_4?: string;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  is_correct_1?: number;
  is_correct_2?: number;
  is_correct_3?: number;
  is_correct_4?: number;
  explanation_1?: string;
  explanation_2?: string;
  explanation_3?: string;
  explanation_4?: string;
  multiple?: number;
}
export const getQuestions = async () => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_questions`, {
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getQuestion = async (name: string) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_question`, {
    params: { name },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};
export const createQuestion = async (data: CreateQuestionPayload) => {
  // Convert object to URLSearchParams for x-www-form-urlencoded
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  return apiService.post(`method/${API_METHOD_PREFIX}.create_question`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export interface CreateCertificateEvaluationPayload {
  member: string;
  course: string;
  batch_name?: string;
  evaluator?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  rating?: number;
  status?: string;
  summary?: string;
}

export const createCertificateEvaluation = async (data: CreateCertificateEvaluationPayload) => {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  return apiService.post(`method/${API_METHOD_PREFIX}.create_certificate_evaluation`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export interface UpdateCertificateEvaluationPayload extends CreateCertificateEvaluationPayload {
  name: string;
}

export const updateCertificateEvaluation = async (data: UpdateCertificateEvaluationPayload) => {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  return apiService.post(`method/${API_METHOD_PREFIX}.update_certificate_evaluation`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getCertificateEvaluation = async (name: string) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_certificate_evaluation`, {
    params: { name },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getCertificateEvaluations = async () => {
  return apiService.get(`method/${API_METHOD_PREFIX}.list_certificate_evaluations`, {
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const deleteCertificateEvaluation = async (name: string) => {
  return apiService.post(`method/${API_METHOD_PREFIX}.delete_certificate_evaluation`, null, {
    params: { name },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getCourseProgress = async (course: string) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_course_progress`, {
    params: { course },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getAssignments = async () => {
  return apiService.get(`method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.get_assignments`, {
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getAssignment = async (name: string) => {
  return apiService.get(`method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.get_assignment`, {
    params: { name },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const createAssignment = async (data: FormData | Record<string, any>) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const params = isFormData ? data : new URLSearchParams(data as Record<string, string>);
  const contentType = isFormData ? 'multipart/form-data' : 'application/x-www-form-urlencoded';

  return apiService.post(`method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.create_assignment`, params, {
    headers: {
      'Content-Type': contentType,
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const createAssignmentSubmission = async (data: FormData | Record<string, any>) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const params = isFormData ? data : new URLSearchParams(data as Record<string, string>);
  const contentType = isFormData ? 'multipart/form-data' : 'application/x-www-form-urlencoded';

  return apiService.post(`method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.create_assignment_submission`, params, {
    headers: {
      'Content-Type': contentType,
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const updateAssignment = async (data: FormData | Record<string, any>) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const params = isFormData ? data : new URLSearchParams(data as Record<string, string>);
  const contentType = isFormData ? 'multipart/form-data' : 'application/x-www-form-urlencoded';

  return apiService.post(`method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.update_assignment`, params, {
    headers: {
      'Content-Type': contentType,
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const deleteAssignment = async (name: string) => {
  return apiService.post(`method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.delete_assignment`, null, {
    params: { name },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getAssignmentSubmissions = async () => {
  return apiService.get(`method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.get_assignment_submissions`, {
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};


export const getBatchFeedback = async (batch: string) => {
  return apiService.get(`method/lms.lms.doctype.lms_batch_feedback.lms_batch_feedback.get_batch_feedback`, {
    params: { batch },
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};







//Programs

export interface ProgramCourse {
  name?: string;
  course: string;
  course_title: string;
  idx?: number;
}

export interface ProgramMember {
  name?: string;
  member: string;
  full_name?: string;
  progress?: number;
  idx?: number;
}

export interface Program {
  name?: string;
  title: string;
  published: number;
  enforce_course_order: number;
  course_count: number;
  member_count: number;
  doctype?: string;
  image?: string | null;
  short_introduction?: string | null;
  description?: string | null;
  program_courses?: ProgramCourse[];
  program_members?: ProgramMember[];
}

export const getProgramList = async (): Promise<Program[]> => {
  return apiService.get(`method/lms.lms.doctype.lms_program.lms_program.get_program_list`, {
    headers: { 'Authorization': `token ${API_TOKEN}` }
  });
};

export const getProgramDetail = async (program_title: string): Promise<Program> => {
  return apiService.get(`method/lms.lms.doctype.lms_program.lms_program.get_program_detail`, {
    params: { program_title },
    headers: { 'Authorization': `token ${API_TOKEN}` }
  });
};

export const createProgram = async (data: Partial<Program>) => {
  return apiService.post(`method/lms.lms.doctype.lms_program.lms_program.create_program`, data, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${API_TOKEN}`
    }
  });
};
export const updateProgram = async (data: Partial<Program> & { program_title?: string }) => {
  return apiService.post(`method/lms.lms.doctype.lms_program.lms_program.update_program`, data, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const deleteProgram = async (name: string) => {
  return apiService.post(`method/lms.lms.doctype.lms_program.lms_program.delete_program`, {
    program_title: name
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const enrollInCourse = async (payload: { course: string }) => {
  return apiService.post(`method/lms.lms.stride_lms.enroll_student`, payload, {
    headers: { 'Authorization': `token ${API_TOKEN}` }
  });
};

export const createCourseProgress = async (payload: { member: string, lesson: string, status: string }) => {
  return apiService.post(`method/lms.lms.doctype.lms_course_progress.lms_course_progress.create_course_progress`, payload, {
    headers: { 'Authorization': `token ${API_TOKEN}` }
  });
};

export const getCourseProgressFiltered = async (filters: { name?: string, member?: string, course?: string, chapter?: string, lesson?: string, status?: string }) => {
  return apiService.get(`method/lms.lms.doctype.lms_course_progress.lms_course_progress.get_course_progress`, {
    params: filters,
    headers: { 'Authorization': `token ${API_TOKEN}` }
  });
};

// ========================
// LMS Badges
// ========================

export interface LMSBadge {
  name?: string;
  title: string;
  enabled: number;
  description?: string | null;
  reference_doctype?: string | null;
  event?: string | null;
  image?: string | null;
  grant_only_once?: number;
  user_field?: string | null;
  field_to_check?: string | null;
  condition?: string | null;
  creation?: string;
  modified?: string;
  owner?: string;
}

export interface CreateBadgePayload {
  title: string;
  enabled: number;
  description?: string;
  reference_doctype?: string;
  event?: string;
  image?: string;
  grant_only_once?: number;
  user_field?: string;
  field_to_check?: string | null;
  condition?: string;
}

export const createBadge = async (payload: CreateBadgePayload) => {
  return apiService.post(
    "method/lms.lms.doctype.lms_badge.lms_badge.create_badge",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${API_TOKEN}`,
      },
    }
  );
};

export const getBadgeList = async (filters?: Record<string, any>): Promise<LMSBadge[]> => {
  const response = await apiService.get(
    "method/lms.lms.doctype.lms_badge.lms_badge.get_badge_list",
    {
      params: filters,
      headers: {
        Authorization: `token ${API_TOKEN}`,
      },
    }
  );
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.message && Array.isArray(response.message)) return response.message;
  return [];
};

export const getBadge = async (badge_name: string): Promise<LMSBadge> => {
  return apiService.get(
    "method/lms.lms.doctype.lms_badge.lms_badge.get_badge",
    {
      params: { name: badge_name },
      headers: {
        Authorization: `token ${API_TOKEN}`,
      },
    }
  );
};

// ==========================================
// LMS Badge Assignment Services
// ==========================================

export interface LMSBadgeAssignment {
  name: string;
  member: string;
  badge: string;
  issued_on: string;
  badge_title?: string;
  badge_image?: string | null;
  creation?: string;
  modified?: string;
}

export interface CreateBadgeAssignmentPayload {
  member: string;
  badge: string;
  issued_on: string;
}

export interface UpdateBadgeAssignmentPayload {
  name: string;
  member: string;
  badge: string;
  issued_on: string;
}

export const getBadgeAssignmentList = async (filters?: { member?: string; badge?: string }): Promise<LMSBadgeAssignment[]> => {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }

  // 1. Primary call: whitelisted RPC method
  try {
    const res = await apiService.get(
      "method/lms.lms.doctype.lms_badge_assignment.lms_badge_assignment.get_badge_assignment_list",
      {
        params: filters,
        headers,
      }
    );
    let list: LMSBadgeAssignment[] = [];
    if (Array.isArray(res)) {
      list = res;
    } else if (res && typeof res === "object") {
      if (Array.isArray(res.data)) list = res.data;
      else if (Array.isArray(res.message)) list = res.message;
      else if (res.message && typeof res.message === "object" && Array.isArray(res.message.data)) list = res.message.data;
      else if (res.data && typeof res.data === "object" && Array.isArray(res.data.data)) list = res.data.data;
    }
    if (list.length > 0) return list;
  } catch (err) {
    console.warn("get_badge_assignment_list primary call failed", err);
  }

  // 1b. If custom token header failed or returned 0, retry without custom token header (allowing cookie session)
  if (headers["Authorization"]) {
    try {
      const res = await apiService.get(
        "method/lms.lms.doctype.lms_badge_assignment.lms_badge_assignment.get_badge_assignment_list",
        {
          params: filters,
        }
      );
      let list: LMSBadgeAssignment[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && typeof res === "object") {
        if (Array.isArray(res.data)) list = res.data;
        else if (Array.isArray(res.message)) list = res.message;
        else if (res.message && typeof res.message === "object" && Array.isArray(res.message.data)) list = res.message.data;
      }
      if (list.length > 0) return list;
    } catch (cookieErr) {
      console.warn("get_badge_assignment_list cookie fallback failed", cookieErr);
    }
  }

  // 2. Fallback to Frappe standard resource API
  try {
    const resourceParams: Record<string, any> = {
      fields: JSON.stringify(["name", "member", "badge", "issued_on", "creation", "modified"]),
      limit_page_length: 100,
      order_by: "creation desc",
    };
    if (filters?.member) {
      resourceParams.filters = JSON.stringify([["LMS Badge Assignment", "member", "=", filters.member]]);
    }
    const fallbackRes = await apiService.get("resource/LMS Badge Assignment", {
      params: resourceParams,
      headers,
    });
    if (Array.isArray(fallbackRes?.data)) return fallbackRes.data;
    if (Array.isArray(fallbackRes)) return fallbackRes;
  } catch (fallbackErr) {
    console.error("Failed to load badge assignments via resource", fallbackErr);
  }

  return [];
};

export const getBadgeAssignment = async (name: string): Promise<LMSBadgeAssignment | null> => {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }

  try {
    const res = await apiService.get(
      "method/lms.lms.doctype.lms_badge_assignment.lms_badge_assignment.get_badge_assignment",
      {
        params: { name },
        headers,
      }
    );
    return res?.data || res?.message || res;
  } catch (err) {
    const fallbackRes = await apiService.get(`resource/LMS Badge Assignment/${name}`, { headers });
    return fallbackRes?.data || fallbackRes;
  }
};

export const createBadgeAssignment = async (payload: CreateBadgeAssignmentPayload): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }

  try {
    return await apiService.post(
      "method/lms.lms.doctype.lms_badge_assignment.lms_badge_assignment.create_badge_assignment",
      payload,
      { headers }
    );
  } catch (err) {
    console.warn("create_badge_assignment method failed, falling back to resource/LMS Badge Assignment:", err);
    const fallbackRes = await apiService.post(
      "resource/LMS Badge Assignment",
      {
        member: payload.member,
        badge: payload.badge,
        issued_on: payload.issued_on,
      },
      { headers }
    );
    return fallbackRes?.data || fallbackRes;
  }
};

export const updateBadgeAssignment = async (payload: UpdateBadgeAssignmentPayload): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }

  try {
    return await apiService.post(
      "method/lms.lms.doctype.lms_badge_assignment.lms_badge_assignment.update_badge_assignment",
      payload,
      { headers }
    );
  } catch (err) {
    console.warn("update_badge_assignment method failed, falling back to resource/LMS Badge Assignment:", err);
    const fallbackRes = await apiService.put(
      `resource/LMS Badge Assignment/${payload.name}`,
      {
        member: payload.member,
        badge: payload.badge,
        issued_on: payload.issued_on,
      },
      { headers }
    );
    return fallbackRes?.data || fallbackRes;
  }
};

export const deleteBadgeAssignment = async (name: string): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }

  try {
    return await apiService.post(
      "method/lms.lms.doctype.lms_badge_assignment.lms_badge_assignment.delete_badge_assignment",
      { name },
      {
        params: { name },
        headers,
      }
    );
  } catch (err) {
    console.warn("delete_badge_assignment method failed, falling back to resource/LMS Badge Assignment:", err);
    return await apiService.delete(`resource/LMS Badge Assignment/${name}`, { headers });
  }
};

// ========================
// LMS Course Reviews
// ========================

export interface LMSCourseReview {
  name?: string;
  course: string;
  rating: number;
  review: string;
  user?: string;
  user_name?: string;
  owner?: string;
  creation?: string;
  modified?: string;
}

export interface CreateCourseReviewPayload {
  course: string;
  rating: number;
  review: string;
}

export const getCourseReviewList = async (filters?: Record<string, any>): Promise<LMSCourseReview[]> => {
  const response = await apiService.get(
    "method/lms.lms.doctype.lms_course_review.lms_course_review.get_course_review_list",
    {
      params: filters,
      headers: {
        Authorization: `token ${API_TOKEN}`,
      },
    }
  );
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.message && Array.isArray(response.message)) return response.message;
  return [];
};

export const getCourseReview = async (name: string): Promise<LMSCourseReview> => {
  return apiService.get(
    "method/lms.lms.doctype.lms_course_review.lms_course_review.get_course_review",
    {
      params: { name },
      headers: {
        Authorization: `token ${API_TOKEN}`,
      },
    }
  );
};

export const createCourseReview = async (payload: CreateCourseReviewPayload) => {
  return apiService.post(
    "method/lms.lms.doctype.lms_course_review.lms_course_review.create_course_review",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${API_TOKEN}`,
      },
    }
  );
};

export const deleteCourseReview = async (name: string) => {
  return apiService.post(
    "method/lms.lms.doctype.lms_course_review.lms_course_review.delete_course_review",
    { name },
    {
      params: { name },
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${API_TOKEN}`,
      },
    }
  );
};

// ==========================================
// LMS Coupon Services
// ==========================================

export interface LMSCouponItem {
  name?: string;
  item: string;
}

export interface LMSCoupon {
  name: string;
  code: string;
  discount_type: 'Percentage' | 'Amount' | string;
  percentage_discount?: number;
  amount?: number;
  expires_on?: string;
  usage_limit?: number;
  used_count?: number;
  enabled?: number;
  owner?: string;
  creation?: string;
  modified?: string;
  applicable_items?: LMSCouponItem[];
}

export interface CreateLMSCouponPayload {
  code: string;
  discount_type: 'Percentage' | 'Amount' | string;
  percentage_discount?: number;
  amount?: number;
  expires_on?: string;
  usage_limit?: number;
  enabled?: number;
  applicable_items?: LMSCouponItem[];
}

export const getLMSCouponList = async (filters?: Record<string, any>): Promise<LMSCoupon[]> => {
  const response = await apiService.get(
    "method/lms.lms.doctype.lms_coupon.lms_coupon.get_lms_coupon_list",
    {
      params: filters,
      headers: {
        Authorization: `token ${API_TOKEN}`,
      },
    }
  );
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.message && Array.isArray(response.message)) return response.message;
  if (response?.message?.data && Array.isArray(response.message.data)) return response.message.data;
  return [];
};

export const getLMSCoupon = async (name: string): Promise<LMSCoupon> => {
  const response = await apiService.get(
    "method/lms.lms.doctype.lms_coupon.lms_coupon.get_lms_coupon",
    {
      params: { name },
      headers: {
        Authorization: `token ${API_TOKEN}`,
      },
    }
  );
  if (response?.message) return response.message;
  if (response?.data) return response.data;
  return response;
};

export const createLMSCoupon = async (payload: CreateLMSCouponPayload) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }
  return apiService.post(
    "method/lms.lms.doctype.lms_coupon.lms_coupon.create_lms_coupon",
    payload,
    { headers }
  );
};

export const getCategoryList = async (): Promise<any> => {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }
  return apiService.get(
    "method/lms.lms.doctype.lms_category.lms_category.get_category_list",
    { headers }
  );
};

export const createCategory = async (payload: { category: string }): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }
  return apiService.post(
    "method/lms.lms.doctype.lms_category.lms_category.create_category",
    payload,
    { headers }
  );
};

export const deleteCategory = async (category: string): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }
  return apiService.post(
    "method/lms.lms.doctype.lms_category.lms_category.delete_category",
    { category, name: category },
    { headers }
  );
};

// ==========================================
// Course Evaluator Services (Instructor Role)
// ==========================================

export interface CourseEvaluatorScheduleItem {
  day: string;
  start_time: string;
  end_time: string;
}

export interface CourseEvaluatorItem {
  name: string;
  evaluator: string;
  full_name?: string | null;
  username?: string | null;
  user_image?: string | null;
  unavailable_from?: string | null;
  unavailable_to?: string | null;
  schedule?: CourseEvaluatorScheduleItem[];
  creation?: string;
  modified?: string;
}

export interface CreateCourseEvaluatorPayload {
  evaluator: string;
  unavailable_from?: string | null;
  unavailable_to?: string | null;
  schedule: CourseEvaluatorScheduleItem[];
}

export interface UpdateCourseEvaluatorPayload {
  name: string;
  evaluator: string;
  unavailable_from?: string | null;
  unavailable_to?: string | null;
  schedule: CourseEvaluatorScheduleItem[];
}

export const getCourseEvaluatorList = async (): Promise<any> => {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }
  return apiService.get(
    "method/lms.lms.doctype.course_evaluator.course_evaluator.get_course_evaluator_list",
    { headers }
  );
};

export const createCourseEvaluator = async (
  payload: CreateCourseEvaluatorPayload
): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }
  return apiService.post(
    "method/lms.lms.doctype.course_evaluator.course_evaluator.create_course_evaluator",
    payload,
    { headers }
  );
};

export const updateCourseEvaluator = async (
  payload: UpdateCourseEvaluatorPayload
): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }
  return apiService.post(
    "method/lms.lms.doctype.course_evaluator.course_evaluator.update_course_evaluator",
    payload,
    { headers }
  );
};

export const deleteCourseEvaluator = async (
  evaluatorOrName: string
): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }
  return apiService.post(
    "method/lms.lms.doctype.course_evaluator.course_evaluator.delete_course_evaluator",
    { evaluator: evaluatorOrName, name: evaluatorOrName },
    {
      params: { evaluator: evaluatorOrName, name: evaluatorOrName },
      headers,
    }
  );
};

// ==========================================
// LMS Programming Exercise & Submission Services
// ==========================================
export * from '../types/programming_exercise.types';
import {
  LMSProgrammingExercise,
  CreateProgrammingExercisePayload,
  LMSProgrammingExerciseSubmission,
  CreateProgrammingExerciseSubmissionPayload,
} from '../types/programming_exercise.types';

const getProgrammingAuthHeaders = (contentType = "application/json") => {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
  };
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!headers["Authorization"] && API_TOKEN) {
    headers["Authorization"] = `token ${API_TOKEN}`;
  }
  return headers;
};

const normalizeExercise = (item: any): LMSProgrammingExercise => {
  if (!item) return item;
  let testCases = item.test_cases;
  if (typeof testCases === 'string') {
    try {
      testCases = JSON.parse(testCases);
    } catch {
      testCases = [];
    }
  }
  const normalizedTestCases = Array.isArray(testCases)
    ? testCases.map((tc: any) => {
        const out = tc?.expected_output !== undefined ? String(tc.expected_output) : (tc?.output !== undefined ? String(tc.output) : '');
        return {
          input: tc?.input !== undefined ? String(tc.input) : (tc?.test_input !== undefined ? String(tc.test_input) : ''),
          output: out,
          expected_output: out,
          explanation: tc?.explanation !== undefined ? String(tc.explanation) : undefined,
        };
      })
    : [];

  return {
    ...item,
    test_cases: normalizedTestCases,
  };
};

export const getProgrammingExercises = async (params?: { [key: string]: any }): Promise<LMSProgrammingExercise[]> => {
  const headers = getProgrammingAuthHeaders();

  // Fetch list of exercises using standard DocType resource endpoint
  try {
    const resourceRes = await apiService.get("resource/LMS Programming Exercise", {
      params: {
        fields: JSON.stringify(["name", "title", "language", "problem_statement", "test_cases", "creation", "modified", "owner"]),
        limit_page_length: 100,
        order_by: "creation desc",
        ...params,
      },
      headers,
    });
    const items = resourceRes?.data || resourceRes?.message || resourceRes;
    if (Array.isArray(items)) {
      return items.map(normalizeExercise);
    }
  } catch (resourceErr) {
    console.error("Resource fetch for LMS Programming Exercise failed:", resourceErr);
  }

  return [];
};

export const getProgrammingExercise = async (name: string): Promise<LMSProgrammingExercise | null> => {
  if (!name || typeof name !== 'string') return null;
  const headers = getProgrammingAuthHeaders();

  // 1. Primary RPC method with mandatory 'name' positional argument
  try {
    const res = await apiService.get(
      "method/lms.lms.doctype.lms_programming_exercise.lms_programming_exercise.get_programming_exercise",
      {
        params: { name },
        headers,
      }
    );
    let item = res?.data || res?.message || res;
    if (Array.isArray(item)) item = item[0];
    if (item?.data && !Array.isArray(item.data)) item = item.data;
    if (item?.exercise) item = item.exercise;
    if (item && (item.name || item.title)) {
      return normalizeExercise(item);
    }
  } catch (err) {
    console.warn("get_programming_exercise GET failed, trying POST with name:", err);
    try {
      const postRes = await apiService.post(
        "method/lms.lms.doctype.lms_programming_exercise.lms_programming_exercise.get_programming_exercise",
        { name },
        { headers, params: { name } }
      );
      let item = postRes?.data || postRes?.message || postRes;
      if (Array.isArray(item)) item = item[0];
      if (item?.data && !Array.isArray(item.data)) item = item.data;
      if (item?.exercise) item = item.exercise;
      if (item && (item.name || item.title)) {
        return normalizeExercise(item);
      }
    } catch (postErr) {
      console.warn("get_programming_exercise POST failed, trying resource fallback:", postErr);
    }
  }

  // 2. Resource fallback
  try {
    const resourceRes = await apiService.get(`resource/LMS Programming Exercise/${encodeURIComponent(name)}`, {
      headers,
    });
    const item = resourceRes?.data || resourceRes?.message || resourceRes;
    if (item && (item.name || item.title)) {
      return normalizeExercise(item);
    }
  } catch (resourceErr) {
    console.error(`Resource fallback for LMS Programming Exercise ${name} failed:`, resourceErr);
  }

  return null;
};

export const createProgrammingExercise = async (
  payload: CreateProgrammingExercisePayload
): Promise<any> => {
  const headers = getProgrammingAuthHeaders();

  // Normalize test_cases as an array of objects for Frappe child table
  let testCasesArray: any[] = [];
  if (Array.isArray(payload.test_cases)) {
    testCasesArray = payload.test_cases.map((tc: any) => {
      const out = tc?.expected_output !== undefined ? String(tc.expected_output) : (tc?.output !== undefined ? String(tc.output) : '');
      return {
        input: typeof tc === 'object' && tc?.input !== undefined ? String(tc.input) : String(tc),
        output: out,
        expected_output: out,
        explanation: typeof tc === 'object' && tc?.explanation !== undefined ? String(tc.explanation) : undefined,
      };
    });
  } else if (typeof payload.test_cases === 'string') {
    try {
      const parsed = JSON.parse(payload.test_cases);
      testCasesArray = Array.isArray(parsed)
        ? parsed.map((tc: any) => {
            const out = tc?.expected_output !== undefined ? String(tc.expected_output) : (tc?.output !== undefined ? String(tc.output) : '');
            return {
              input: typeof tc === 'object' && tc?.input !== undefined ? String(tc.input) : String(tc),
              output: out,
              expected_output: out,
              explanation: typeof tc === 'object' && tc?.explanation !== undefined ? String(tc.explanation) : undefined,
            };
          })
        : [];
    } catch {
      testCasesArray = [];
    }
  }

  const cleanPayload = {
    title: payload.title,
    problem_statement: payload.problem_statement,
    language: payload.language,
    test_cases: testCasesArray,
  };

  // 1. Primary RPC method
  try {
    const res = await apiService.post(
      "method/lms.lms.doctype.lms_programming_exercise.lms_programming_exercise.create_programming_exercise",
      cleanPayload,
      { headers }
    );
    return res?.data || res?.message || res;
  } catch (err) {
    console.warn("create_programming_exercise primary call failed, trying fallback:", err);
    // 2. Resource fallback - must pass test_cases as array of objects, never stringified!
    const res = await apiService.post(
      "resource/LMS Programming Exercise",
      cleanPayload,
      { headers }
    );
    return res?.data || res?.message || res;
  }
};

export const deleteProgrammingExercise = async (name: string): Promise<any> => {
  if (!name) return;
  const headers = getProgrammingAuthHeaders();

  // 1. Primary RPC method
  try {
    const res = await apiService.post(
      "method/lms.lms.doctype.lms_programming_exercise.lms_programming_exercise.delete_programming_exercise",
      { name },
      {
        params: { name },
        headers,
      }
    );
    return res?.data || res?.message || res;
  } catch (err) {
    console.warn("delete_programming_exercise primary call failed, trying resource DELETE:", err);
    // 2. Resource fallback
    const res = await apiService.delete(`resource/LMS Programming Exercise/${encodeURIComponent(name)}`, {
      headers,
    });
    return res?.data || res?.message || res;
  }
};

export const getProgrammingExerciseSubmissionList = async (
  filters?: { exercise?: string; member?: string; status?: string; [key: string]: any }
): Promise<LMSProgrammingExerciseSubmission[]> => {
  const headers = getProgrammingAuthHeaders();

  // 1. Primary RPC method
  try {
    const res = await apiService.get(
      "method/lms.lms.doctype.lms_programming_exercise.lms_programming_exercise.get_programming_exercise_submission_list",
      { params: filters, headers }
    );
    let list: LMSProgrammingExerciseSubmission[] | null = null;
    if (Array.isArray(res)) {
      list = res;
    } else if (res && typeof res === "object") {
      // Handles { status: "success", count: 1, data: [...] }
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.message && typeof res.message === "object" && Array.isArray(res.message.data)) {
        list = res.message.data;
      } else if (Array.isArray(res.message)) {
        list = res.message;
      } else if (res.data && typeof res.data === "object" && Array.isArray(res.data.data)) {
        list = res.data.data;
      } else if (Array.isArray(res.submissions)) {
        list = res.submissions;
      } else if (res.message && typeof res.message === "object" && Array.isArray(res.message.submissions)) {
        list = res.message.submissions;
      }
    }
    if (list !== null) return list;
  } catch (err) {
    console.warn("get_programming_exercise_submission_list primary call failed:", err);
  }

  // 2. Resource fallback
  try {
    const resourceParams: Record<string, any> = {
      fields: JSON.stringify(["name", "exercise", "member", "code", "language", "status", "creation", "modified", "owner"]),
      limit_page_length: 100,
      order_by: "creation desc",
    };
    if (filters?.exercise) {
      resourceParams.filters = JSON.stringify([["LMS Programming Exercise Submission", "exercise", "=", filters.exercise]]);
    } else if (filters?.member) {
      resourceParams.filters = JSON.stringify([["LMS Programming Exercise Submission", "member", "=", filters.member]]);
    }
    const resourceRes = await apiService.get("resource/LMS Programming Exercise Submission", {
      params: resourceParams,
      headers,
    });
    const items = resourceRes?.data || resourceRes?.message || resourceRes;
    if (Array.isArray(items)) return items;
  } catch (resourceErr) {
    console.error("Resource fallback for submissions failed:", resourceErr);
  }

  return [];
};

export const getProgrammingExerciseSubmission = async (
  name: string
): Promise<LMSProgrammingExerciseSubmission | null> => {
  if (!name) return null;
  const headers = getProgrammingAuthHeaders();

  // 1. Primary RPC method
  try {
    const res = await apiService.get(
      "method/lms.lms.doctype.lms_programming_exercise.lms_programming_exercise.get_programming_exercise_submission",
      {
        params: { name },
        headers,
      }
    );
    let item: any = res;
    if (item && typeof item === "object") {
      if (item.data && typeof item.data === "object" && !Array.isArray(item.data)) {
        item = item.data;
      } else if (item.message && typeof item.message === "object") {
        item = item.message.data || item.message.submission || item.message;
      } else if (item.submission) {
        item = item.submission;
      }
    }
    if (Array.isArray(item)) item = item[0];
    if (item && (item.name || item.exercise)) return item;
  } catch (err) {
    console.warn("get_programming_exercise_submission primary call failed:", err);
  }

  // 2. Resource fallback
  try {
    const resourceRes = await apiService.get(
      `resource/LMS Programming Exercise Submission/${encodeURIComponent(name)}`,
      { headers }
    );
    let item = resourceRes?.data || resourceRes?.message || resourceRes;
    if (Array.isArray(item)) item = item[0];
    if (item && (item.name || item.exercise)) return item;
  } catch (resourceErr) {
    console.error(`Resource fallback for submission ${name} failed:`, resourceErr);
  }

  return null;
};

export const createProgrammingExerciseSubmission = async (
  payload: CreateProgrammingExerciseSubmissionPayload
): Promise<any> => {
  const headers = getProgrammingAuthHeaders();

  // 1. Primary RPC method
  try {
    const res = await apiService.post(
      "method/lms.lms.doctype.lms_programming_exercise.lms_programming_exercise.create_programming_exercise_submission",
      payload,
      { headers }
    );
    return res?.data || res?.message || res;
  } catch (err) {
    console.warn("create_programming_exercise_submission primary call failed, trying fallback:", err);
    // 2. Resource fallback
    const res = await apiService.post(
      "resource/LMS Programming Exercise Submission",
      {
        exercise: payload.exercise,
        code: payload.code,
        language: payload.language || "Python",
        member: payload.member || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : ""),
        status: payload.status || "Submitted",
      },
      { headers }
    );
    return res?.data || res?.message || res;
  }
};

export const deleteProgrammingExerciseSubmission = async (
  name: string
): Promise<any> => {
  if (!name) return;
  const headers = getProgrammingAuthHeaders();

  // 1. Primary RPC method
  try {
    const res = await apiService.post(
      "method/lms.lms.doctype.lms_programming_exercise.lms_programming_exercise.delete_programming_exercise_submission",
      { name },
      {
        params: { name },
        headers,
      }
    );
    return res?.data || res?.message || res;
  } catch (err) {
    console.warn("delete_programming_exercise_submission primary call failed, trying resource DELETE:", err);
    // 2. Resource fallback
    const res = await apiService.delete(
      `resource/LMS Programming Exercise Submission/${encodeURIComponent(name)}`,
      { headers }
    );
    return res?.data || res?.message || res;
  }
};

export const getLmsSettings = async (): Promise<any> => {
  return apiService.get("method/lms.lms.doctype.lms_settings.lms_settings.get_lms_settings");
};

export const updateLmsSettings = async (payload: Record<string, any>): Promise<any> => {
  return apiService.post("method/lms.lms.doctype.lms_settings.lms_settings.update_lms_settings", payload);
};

export * from './payment.services';


