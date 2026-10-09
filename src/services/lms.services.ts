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

export const getCourseDetails = async (payload: GetCourseDetailsPayload) => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_course_details`, { 
    params: payload,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
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
  return apiService.get(`method/${API_METHOD_PREFIX}.get_lesson`, { 
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

export const createCourse = async (data: FormData) => {
  return apiService.post(`method/${API_METHOD_PREFIX}.create_course`, data, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const updateCourse = async (data: FormData) => {
  return apiService.post(`method/${API_METHOD_PREFIX}.update_course`, data, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      'Authorization': `token ${API_TOKEN}`
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

export const createLesson = async (data: FormData) => {
  return apiService.post(`method/${API_METHOD_PREFIX}.create_lesson`, data, {
    headers: { 
      'Content-Type': 'multipart/form-data',
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
  return apiService.get(`method/${API_METHOD_PREFIX}.get_certificate_evaluations`, {
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
