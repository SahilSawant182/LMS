import { apiService } from "./api.services";

// Define interfaces if needed, or use any/generic for now
export interface GetCourseDetailsPayload {
  course: string;
}

export interface GetLessonPayload {
  course: string;
  chapter: number | string;
  lesson: number | string;
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
  return apiService.get(`method/lms.lms.utils.get_courses`);
};

export const getCourseCompletionData = async (payload?: any) => {
  // If payload is required, you can change the parameter and use it in params or data depending on method.
  // Assuming GET requires params, but standard frappe utils often use GET with params.
  return apiService.get(`method/lms.lms.utils.get_course_completion_data`, { params: payload });
};

export const getCourseDetails = async (payload: GetCourseDetailsPayload) => {
  return apiService.get(`method/lms.lms.utils.get_course_details`, { params: payload });
};

export const getCourseOutline = async (payload?: any) => {
  return apiService.get(`method/lms.lms.utils.get_course_outline`, { params: payload });
};

export const getChapters = async (payload?: any) => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_chapters`, { 
    params: payload,
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getLesson = async (payload: GetLessonPayload) => {
  return apiService.get(`method/lms.lms.utils.get_lesson`, { params: payload });
};

export const getLessons = async (payload?: any) => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_lessons`, { 
    params: payload,
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getEnrollments = async (payload?: any) => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_enrollments`, { 
    params: payload,
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getReviews = async (payload: GetReviewsPayload) => {
  return apiService.get(`method/lms.lms.utils.get_reviews`, { params: payload });
};

export const getBatchDetails = async (payload: GetBatchDetailsPayload) => {
  const nameParam = payload.name || payload.batch;
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_batch`, { 
    params: { name: nameParam },
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getBatchCourses = async (payload: GetBatchCoursesPayload) => {
  return apiService.get(`method/lms.lms.utils.get_batch_courses`, { params: payload });
};

export const getBatches = async () => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_batches`, {
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getCertificates = async () => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_certificates`, {
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getCertificate = async (name: string) => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_certificate`, {
    params: { name },
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const createCourse = async (data: FormData) => {
  return apiService.post(`method/stridenex_app.api_stridenex_app.lms.create_course`, data, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      'Authorization': 'token accf7b66dd64697:9e1f936f0d102d3'
    }
  });
};

export const updateCourse = async (data: FormData) => {
  return apiService.post(`method/stridenex_app.api_stridenex_app.lms.update_course`, data, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const deleteCourse = async (name: string) => {
  return apiService.post(`method/stridenex_app.api_stridenex_app.lms.delete_course`, { name }, {
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const deleteBatch = async (name: string) => {
  return apiService.post(`method/stridenex_app.api_stridenex_app.lms.delete_batch`, null, {
    params: { name },
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const createChapter = async (data: FormData) => {
  return apiService.post(`method/stridenex_app.api_stridenex_app.lms.create_chapter`, data, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const createLesson = async (data: FormData) => {
  return apiService.post(`method/stridenex_app.api_stridenex_app.lms.create_lesson`, data, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getQuizzes = async () => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_quizzes`, {
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getQuiz = async (name: string) => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_quiz`, { 
    params: { name },
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
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
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_questions`, {
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getQuestion = async (name: string) => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_question`, {
    params: { name },
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
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

  return apiService.post(`method/stridenex_app.api_stridenex_app.lms.create_question`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
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

  return apiService.post(`method/stridenex_app.api_stridenex_app.lms.create_certificate_evaluation`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
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

  return apiService.post(`method/stridenex_app.api_stridenex_app.lms.update_certificate_evaluation`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getCertificateEvaluation = async (name: string) => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_certificate_evaluation`, {
    params: { name },
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getCertificateEvaluations = async () => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_certificate_evaluations`, {
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const deleteCertificateEvaluation = async (name: string) => {
  return apiService.post(`method/stridenex_app.api_stridenex_app.lms.delete_certificate_evaluation`, null, {
    params: { name },
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};

export const getCourseProgress = async (course: string) => {
  return apiService.get(`method/stridenex_app.api_stridenex_app.lms.get_course_progress`, {
    params: { course },
    headers: {
      'Authorization': 'token b658c8efecac0c0:9cc3739960f3eed'
    }
  });
};
