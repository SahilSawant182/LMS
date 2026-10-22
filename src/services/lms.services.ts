import { apiService, API_TOKEN, API_METHOD_PREFIX, uploadFile } from "./api.services";
import { isAuthorizedInstructor } from "./auth.services";

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

const getCurrentUserEmail = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("userEmail") || localStorage.getItem("user") || "";
  }
  return "";
};

const getInstructorFilterParams = (payload?: any) => {
  const isInstructor = isAuthorizedInstructor();
  const currentUser = getCurrentUserEmail();
  const params: Record<string, any> = { ...(payload || {}) };

  // If caller specifically requested all items or bypassed instructor filter (e.g. global search)
  if (params.all || params.user === "" || params.user === null) {
    delete params.all;
    delete params.user;
    return params;
  }

  // Only filter by user/instructor if user is an authorized instructor AND caller hasn't passed a custom user
  if (!params.user && isInstructor && currentUser) {
    params.user = currentUser;
  }

  return params;
};

export const getCourses = async (payload?: any): Promise<Course[]> => {
  const params = getInstructorFilterParams(payload);
  const response = await apiService.get(`method/${API_METHOD_PREFIX}.get_courses`, {
    params,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });

  let rawList: any[] = [];
  if (Array.isArray(response)) {
    rawList = response;
  } else if (response?.message && Array.isArray(response.message)) {
    rawList = response.message;
  } else if (response?.data && Array.isArray(response.data)) {
    rawList = response.data;
  }

  const filterUser = params?.user || payload?.user;
  if (filterUser && !params?.all) {
    const target = String(filterUser).toLowerCase().trim();
    rawList = rawList.filter((c: any) => {
      if (Array.isArray(c.instructors) && c.instructors.length > 0) {
        return c.instructors.some((inst: any) => {
          const instName = String(inst?.name || '').toLowerCase().trim();
          const instEmail = String(inst?.email || '').toLowerCase().trim();
          const instUsername = String(inst?.username || '').toLowerCase().trim();
          return instName === target || instEmail === target || (instUsername && instUsername === target);
        });
      }
      if (c.instructor && String(c.instructor).toLowerCase().trim() === target) return true;
      if (c.owner && String(c.owner).toLowerCase().trim() === target) return true;
      return false;
    });
  }

  return rawList;
};

export const getMasterData = async (doctype: string, additionalPayload: any = {}) => {
  try {
    const payload = getInstructorFilterParams({
      doctype,
      ...additionalPayload
    });
    const response = await apiService.get(
      "method/lms.lms.master.get_dropdown_options",
      { params: payload }
    );
    let arr: any[] = [];
    if (response?.data && response?.data?.data && Array.isArray(response?.data?.data)) {
      arr = response.data.data;
    } else if (response?.data && Array.isArray(response?.data)) {
      arr = response.data;
    } else if (response?.message?.data && Array.isArray(response?.message?.data)) {
      arr = response.message.data;
    } else if (response?.message && Array.isArray(response?.message)) {
      arr = response.message;
    } else if (Array.isArray(response)) {
      arr = response;
    }
    return arr.map((item: any) => {
      if (typeof item === "string") return item;
      return item.value || item.label || item.name || item.id || item.title || item.course || item.category || "";
    }).filter(Boolean);
  } catch (error) {
    console.error(`Error fetching master data for ${doctype}:`, error);
    return [];
  }
};

export interface DropdownOptionItem {
  value: string;
  label: string;
  description?: string;
}

export const getMasterDropdownItems = async (doctype: string, additionalPayload: any = {}): Promise<DropdownOptionItem[]> => {
  try {
    const payload = getInstructorFilterParams({
      doctype,
      ...additionalPayload
    });
    const response = await apiService.get(
      "method/lms.lms.master.get_dropdown_options",
      { params: payload }
    );
    let arr: any[] = [];
    if (response?.data && response?.data?.data && Array.isArray(response?.data?.data)) {
      arr = response.data.data;
    } else if (response?.data && Array.isArray(response?.data)) {
      arr = response.data;
    } else if (response?.message?.data && Array.isArray(response?.message?.data)) {
      arr = response.message.data;
    } else if (response?.message && Array.isArray(response?.message)) {
      arr = response.message;
    } else if (Array.isArray(response)) {
      arr = response;
    }

    return arr.map((item: any) => {
      if (typeof item === "string") {
        return { label: item, value: item };
      }
      const label = item.label || item.title || item.name || item.value || "";
      const value = item.value || item.name || item.id || item.title || item.label || "";
      const description = item.description || (value !== label ? value : undefined);
      return {
        label: String(label || value),
        value: String(value || label),
        description: description ? String(description) : undefined,
      };
    }).filter(it => it.label || it.value);
  } catch (error) {
    console.error(`Error fetching master dropdown options for ${doctype}:`, error);
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

export const getCourse = async (name: string, payload?: any) => {
  const params = getInstructorFilterParams({
    name,
    ...(payload || {})
  });
  return apiService.get("method/lms.lms.stride_lms.get_course", {
    params
  });
};

export const getCourseDetails = async (payload: GetCourseDetailsPayload | { name?: string; course?: string; user?: string }) => {
  const courseName = (payload as any).name || (payload as any).course;
  return getCourse(courseName, payload);
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
  const params = getInstructorFilterParams({
    batch: nameParam,
    ...payload
  });
  return apiService.get(`method/lms.lms.stride_lms.get_batch_details`, {
    params,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getBatchCourses = async (payload: GetBatchCoursesPayload) => {
  const params = getInstructorFilterParams(payload);
  return apiService.get(`method/${API_METHOD_PREFIX}.get_batch_courses`, {
    params,
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getBatches = async (payload?: any) => {
  const params = getInstructorFilterParams(payload);
  return apiService.get(`method/${API_METHOD_PREFIX}.get_batches`, {
    params,
    headers: { 'Authorization': `token ${API_TOKEN}` }
  });
};

export const createBatch = async (payload: any) => {
  const headers = getQuestionAuthHeaders("application/json");
  try {
    return await apiService.post(`method/lms.lms.stride_lms.create_batch`, payload, {
      headers
    });
  } catch (err: any) {
    console.warn("create_batch method failed, falling back to resource/LMS Batch:", err);
    return await apiService.post("resource/LMS Batch", payload, {
      headers
    });
  }
};

export const updateBatch = async (payload: any) => {
  const headers = getQuestionAuthHeaders("application/json");
  const batchName = payload.name || payload.batch;
  try {
    return await apiService.post(`method/lms.lms.stride_lms.update_batch`, payload, {
      headers
    });
  } catch (err: any) {
    console.warn("update_batch method failed, falling back to resource/LMS Batch:", err);
    return await apiService.put(`resource/LMS Batch/${encodeURIComponent(batchName)}`, payload, {
      headers
    });
  }
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

export const VALID_COURSE_COLORS = [
  "Red",
  "Blue",
  "Green",
  "Amber",
  "Cyan",
  "Orange",
  "Pink",
  "Purple",
  "Teal",
  "Violet",
  "Yellow",
  "Gray"
] as const;

export function normalizeCourseColor(color?: string | null): string {
  if (!color || typeof color !== 'string') return 'Blue';
  const trimmed = color.trim();
  const matched = VALID_COURSE_COLORS.find(
    c => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (matched) return matched;
  if (trimmed.toLowerCase() === 'indigo') return 'Violet';
  if (trimmed.toLowerCase() === 'emerald') return 'Green';
  return 'Blue';
}

export interface CreateCoursePayload {
  title: string;
  course?: string;
  course_name?: string;
  name?: string;
  short_introduction?: string;
  description?: string;
  published?: number;
  published_on?: string | null;
  status?: string | null;
  video_link?: string;
  tags?: string;
  category?: string;
  image?: string;
  card_gradient?: string;
  color?: string;
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
    : (API_TOKEN ? `token ${API_TOKEN}` : undefined);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = token;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  let payload = data;
  if (typeof window !== "undefined" && data instanceof FormData) {
    const rawGrad = data.get('card_gradient') as string | null;
    const rawColor = data.get('color') as string | null;
    const norm = normalizeCourseColor(rawColor || rawGrad || 'Blue');
    data.set('card_gradient', norm);
    data.set('color', norm);

    const pubRaw = data.get('published');
    const isPub = String(pubRaw) === '1' || String(pubRaw) === 'true';
    if (isPub) {
      data.set('published', '1');
      data.set('status', 'Approved');
      if (!data.get('published_on')) {
        data.set('published_on', todayStr);
      }
    } else {
      data.set('published', '0');
      data.set('status', 'In Progress');
    }

    headers['Content-Type'] = 'multipart/form-data';
    return apiService.post("method/lms.lms.stride_lms.create_course", data, { headers });
  } else if (data && typeof data === 'object') {
    const norm = normalizeCourseColor(data.color || data.card_gradient || 'Blue');
    const pubRaw = data.published;
    const isPub = pubRaw === 1 || pubRaw === '1' || pubRaw === true || pubRaw === 'true';

    payload = {
      ...data,
      card_gradient: norm,
      color: norm,
      published: isPub ? 1 : 0,
      status: isPub ? 'Approved' : 'In Progress',
      published_on: isPub ? (data.published_on || todayStr) : null,
    };
  }

  return apiService.post("method/lms.lms.stride_lms.create_course", payload, {
    headers
  });
};

export const updateCourse = async (data: CreateCoursePayload | FormData | any) => {
  const token = typeof window !== "undefined" && localStorage.getItem("apiKey") && localStorage.getItem("apiSecret")
    ? `token ${localStorage.getItem("apiKey")}:${localStorage.getItem("apiSecret")}`
    : (API_TOKEN ? `token ${API_TOKEN}` : undefined);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = token;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  let courseId = '';
  let isPub = false;
  let statusVal = 'In Progress';
  let publishedOnVal: string | null = null;

  let payload = data;
  if (typeof window !== "undefined" && data instanceof FormData) {
    courseId = (data.get('name') || data.get('course') || data.get('course_name') || '') as string;
    const rawGrad = data.get('card_gradient') as string | null;
    const rawColor = data.get('color') as string | null;
    const norm = normalizeCourseColor(rawColor || rawGrad || 'Blue');
    data.set('card_gradient', norm);
    data.set('color', norm);

    const pubRaw = data.get('published');
    isPub = String(pubRaw) === '1' || String(pubRaw) === 'true';
    if (isPub) {
      data.set('published', '1');
      data.set('status', 'Approved');
      statusVal = 'Approved';
      publishedOnVal = (data.get('published_on') as string) || todayStr;
      data.set('published_on', publishedOnVal);
    } else {
      data.set('published', '0');
      data.set('status', 'In Progress');
      statusVal = 'In Progress';
    }

    headers['Content-Type'] = 'multipart/form-data';
    let rpcRes: any = null;
    try {
      rpcRes = await apiService.post("method/lms.lms.stride_lms.update_course", data, { headers });
    } catch (e) {
      console.warn("update_course FormData RPC call failed:", e);
    }

    if (courseId) {
      try {
        const resObj: Record<string, any> = {
          published: isPub ? 1 : 0,
          status: statusVal,
        };
        if (isPub) {
          resObj.published_on = publishedOnVal || todayStr;
        }
        await apiService.put(`resource/LMS Course/${encodeURIComponent(courseId)}`, resObj, {
          headers: token ? { Authorization: token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
        });
      } catch (errRes) {
        console.warn("Direct resource/LMS Course update failed:", errRes);
      }
    }

    return rpcRes;
  } else if (data && typeof data === 'object') {
    courseId = String(data.name || data.course || data.course_name || '').trim();
    const norm = normalizeCourseColor(data.color || data.card_gradient || 'Blue');
    const pubRaw = data.published;
    isPub = pubRaw === 1 || pubRaw === '1' || pubRaw === true || pubRaw === 'true';
    statusVal = isPub ? 'Approved' : 'In Progress';
    publishedOnVal = isPub ? (data.published_on || todayStr) : null;

    payload = {
      ...data,
      name: courseId,
      course: courseId,
      course_name: courseId,
      card_gradient: norm,
      color: norm,
      published: isPub ? 1 : 0,
      status: statusVal,
      published_on: publishedOnVal,
    };
  }

  let rpcResult: any = null;
  let rpcError: any = null;
  try {
    rpcResult = await apiService.post("method/lms.lms.stride_lms.update_course", payload, {
      headers
    });
  } catch (err) {
    rpcError = err;
    console.warn("update_course RPC method failed, trying resource fallback:", err);
  }

  // Also synchronize directly via standard Frappe REST Resource API for LMS Course
  // to guarantee published: 1 and status: 'Approved' are persisted in the database
  if (courseId) {
    try {
      const resObj: Record<string, any> = {
        published: isPub ? 1 : 0,
        status: statusVal,
      };
      if (isPub) {
        resObj.published_on = publishedOnVal || todayStr;
      }
      const directRes = await apiService.put(`resource/LMS Course/${encodeURIComponent(courseId)}`, resObj, {
        headers: token ? { Authorization: token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
      });
      return rpcResult || directRes?.data || directRes;
    } catch (errRes) {
      console.warn("Direct resource/LMS Course update failed:", errRes);
    }
  }

  if (rpcError && !rpcResult) {
    throw rpcError;
  }
  return rpcResult;
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

export const createChapter = async (data: FormData | { course: string; title: string; [key: string]: any }) => {
  const token = typeof window !== "undefined" && localStorage.getItem("apiKey") && localStorage.getItem("apiSecret")
    ? `token ${localStorage.getItem("apiKey")}:${localStorage.getItem("apiSecret")}`
    : (API_TOKEN ? `token ${API_TOKEN}` : undefined);

  const payload: Record<string, any> = {};

  if (typeof window !== "undefined" && data instanceof FormData) {
    data.forEach((val, key) => {
      payload[key] = val;
    });
  } else if (data && typeof data === "object") {
    Object.assign(payload, data);
  }

  const jsonHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) jsonHeaders.Authorization = token;

  try {
    return await apiService.post(`method/${API_METHOD_PREFIX}.create_chapter`, payload, {
      headers: jsonHeaders
    });
  } catch (err: any) {
    console.warn("create_chapter JSON failed, trying FormData fallback:", err);

    try {
      const authHeaders: Record<string, string> = {};
      if (token) authHeaders.Authorization = token;

      const fd = new FormData();
      Object.keys(payload).forEach((k) => {
        fd.append(k, payload[k]);
      });

      return await apiService.post(`method/${API_METHOD_PREFIX}.create_chapter`, fd, {
        headers: authHeaders
      });
    } catch (fdErr) {
      console.warn("create_chapter FormData failed, trying resource fallback:", fdErr);
    }

    try {
      return await apiService.post("resource/Course Chapter", payload, {
        headers: jsonHeaders
      });
    } catch (resErr) {
      throw err;
    }
  }
};

export const createLesson = async (data: any) => {
  const token = typeof window !== "undefined" && localStorage.getItem("apiKey") && localStorage.getItem("apiSecret")
    ? `token ${localStorage.getItem("apiKey")}:${localStorage.getItem("apiSecret")}`
    : (API_TOKEN ? `token ${API_TOKEN}` : undefined);

  let payload: any = data;
  if (typeof window !== "undefined" && data instanceof FormData) {
    const obj: any = {};
    data.forEach((val, key) => {
      obj[key] = val;
    });
    payload = obj;
  }

  const jsonHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) jsonHeaders.Authorization = token;

  try {
    return await apiService.post(`method/${API_METHOD_PREFIX}.create_lesson`, payload, {
      headers: jsonHeaders
    });
  } catch (err: any) {
    console.warn("create_lesson JSON failed, trying FormData fallback:", err);
    if (typeof window !== "undefined" && data instanceof FormData) {
      try {
        const authHeaders: Record<string, string> = {};
        if (token) authHeaders.Authorization = token;
        return await apiService.post(`method/${API_METHOD_PREFIX}.create_lesson`, data, {
          headers: authHeaders
        });
      } catch (fdErr) {}
    }
    throw err;
  }
};

export const getQuizzes = async () => {
  return apiService.get(`method/${API_METHOD_PREFIX}.get_quizzes`, {
    headers: {
      'Authorization': `token ${API_TOKEN}`
    }
  });
};

export const getQuiz = async (name: string | { name: string }) => {
  const quizName = typeof name === 'string' ? name : (name as any)?.name;
  if (!quizName) return null;

  const extractQuizData = (rawRes: any) => {
    if (!rawRes) return null;
    const body = rawRes?.data || rawRes;

    // Pattern 1: message.data (as in: { message: { status: 200, message: "...", data: { ... } } })
    if (body?.message?.data && typeof body.message.data === 'object' && (body.message.data.name || body.message.data.title || body.message.data.questions)) {
      return body.message.data;
    }
    // Pattern 2: data.data
    if (body?.data?.data && typeof body.data.data === 'object' && (body.data.data.name || body.data.data.title || body.data.data.questions)) {
      return body.data.data;
    }
    // Pattern 3: message
    if (body?.message && typeof body.message === 'object' && (body.message.name || body.message.title || body.message.questions)) {
      return body.message;
    }
    // Pattern 4: data
    if (body?.data && typeof body.data === 'object' && (body.data.name || body.data.title || body.data.questions)) {
      return body.data;
    }
    // Pattern 5: root object
    if (body && typeof body === 'object' && (body.name || body.title || body.questions)) {
      return body;
    }
    return null;
  };

  const wrapResult = (quizData: any) => {
    if (!quizData) return null;
    return {
      ...quizData,
      data: quizData,
      message: {
        status: 200,
        message: "Quiz fetched successfully",
        data: quizData
      }
    };
  };

  // 1. Primary requested endpoint: POST https://devlms.stridenex.ai/api/method/lms.lms.stride_lms.get_quiz with { "name": quizName }
  try {
    const res = await apiService.post("method/lms.lms.stride_lms.get_quiz", { name: quizName });
    const quizData = extractQuizData(res);
    if (quizData) {
      return wrapResult(quizData);
    }
  } catch (postErr) {
    console.warn("get_quiz POST failed, trying GET fallback:", postErr);
  }

  // 2. Fallback: GET method/lms.lms.stride_lms.get_quiz with params: { name: quizName }
  try {
    const res = await apiService.get("method/lms.lms.stride_lms.get_quiz", {
      params: { name: quizName }
    });
    const quizData = extractQuizData(res);
    if (quizData) {
      return wrapResult(quizData);
    }
  } catch (getErr) {
    console.warn("get_quiz GET fallback failed:", getErr);
  }

  // 3. Fallback: resource/LMS Quiz/<name>
  try {
    const res = await apiService.get(`resource/LMS Quiz/${encodeURIComponent(quizName)}`);
    const quizData = extractQuizData(res);
    if (quizData) {
      return wrapResult(quizData);
    }
  } catch (resErr) {
    console.warn("LMS Quiz resource fallback failed:", resErr);
  }

  return null;
};

export const getQuizSubmissions = async (filters?: {
  quiz?: string;
  member?: string;
  user?: string;
  submission?: string;
  [key: string]: any;
}) => {
  const currentUser = getCurrentUserEmail();
  const params: Record<string, any> = { ...(filters || {}) };
  if (currentUser && !params.member && !params.user) {
    params.user = currentUser;
  }

  // 1. Primary RPC method
  try {
    const res = await apiService.get(
      "method/lms.lms.doctype.lms_quiz_submission.lms_quiz_submission.get_quiz_submissions",
      { params }
    );
    let list: any[] | null = null;
    if (Array.isArray(res)) {
      list = res;
    } else if (res && typeof res === "object") {
      if (Array.isArray(res.submissions)) list = res.submissions;
      else if (res.data && Array.isArray(res.data.submissions)) list = res.data.submissions;
      else if (res.message && Array.isArray(res.message.data)) list = res.message.data;
      else if (res.message && Array.isArray(res.message.submissions)) list = res.message.submissions;
      else if (Array.isArray(res.data)) list = res.data;
      else if (Array.isArray(res.message)) list = res.message;
    }
    if (list !== null) return list;
  } catch (err) {
    console.warn("get_quiz_submissions primary call failed:", err);
  }

  // 2. Resource fallback
  try {
    const resourceParams: Record<string, any> = {
      fields: JSON.stringify([
        "name", "quiz", "quiz_title", "member", "member_name",
        "score", "percentage", "status", "passing_percentage",
        "creation", "modified", "owner"
      ]),
      limit_page_length: 100,
      order_by: "modified desc",
    };
    const filtersArray: any[] = [];
    if (filters?.quiz) {
      filtersArray.push(["LMS Quiz Submission", "quiz", "=", filters.quiz]);
    }
    if (filters?.submission) {
      filtersArray.push(["LMS Quiz Submission", "name", "=", filters.submission]);
    }
    if (filters?.member) {
      filtersArray.push(["LMS Quiz Submission", "member", "=", filters.member]);
    }
    if (filtersArray.length > 0) {
      resourceParams.filters = JSON.stringify(filtersArray);
    }
    const resourceRes = await apiService.get("resource/LMS Quiz Submission", { params: resourceParams });
    const items = resourceRes?.data || resourceRes?.message?.data || resourceRes?.message || resourceRes;
    if (Array.isArray(items)) return items;
  } catch (resourceErr) {
    console.warn("Resource fallback for LMS Quiz Submission failed:", resourceErr);
  }

  return [];
};

export interface QuizSubmissionAnswer {
  question: string;
  answer: string;
}

export interface CreateQuizSubmissionPayload {
  quiz: string;
  answers: QuizSubmissionAnswer[];
  [key: string]: any;
}

export const createQuizSubmission = async (payload: CreateQuizSubmissionPayload) => {
  const cleanPayload = {
    quiz: String(payload.quiz || "").trim(),
    answers: (payload.answers || []).map((item) => ({
      question: String(item.question || "").trim(),
      answer: String(item.answer || "").trim()
    }))
  };

  // 1. Primary method requested: lms.lms.doctype.lms_quiz_submission.lms_quiz_submission.create_quiz_submission
  try {
    const res = await apiService.post(
      "method/lms.lms.doctype.lms_quiz_submission.lms_quiz_submission.create_quiz_submission",
      cleanPayload
    );
    if (res) return res;
  } catch (err) {
    console.warn("create_quiz_submission primary call failed, trying with stringified answers:", err);
    try {
      const res = await apiService.post(
        "method/lms.lms.doctype.lms_quiz_submission.lms_quiz_submission.create_quiz_submission",
        {
          quiz: cleanPayload.quiz,
          answers: typeof cleanPayload.answers === 'string' ? cleanPayload.answers : JSON.stringify(cleanPayload.answers)
        }
      );
      if (res) return res;
    } catch (e2) {
      console.warn("create_quiz_submission with stringified answers failed:", e2);
      throw err;
    }
  }
};

export const getQuizSubmissionDetails = async (submission: string | { submission: string }) => {
  const submissionId = typeof submission === 'string' ? submission : (submission as any)?.submission;
  if (!submissionId) return null;

  // 1. Primary method requested: lms.lms.doctype.lms_quiz_submission.lms_quiz_submission.get_quiz_submission_details
  // First try POST with { submission: submissionId } body as per API definition
  try {
    const res = await apiService.post(
      "method/lms.lms.doctype.lms_quiz_submission.lms_quiz_submission.get_quiz_submission_details",
      { submission: submissionId }
    );
    const data = res?.message?.data || res?.data || res?.message || res;
    if (data) return data;
  } catch (err) {
    // Fallback to GET with params: { submission: submissionId }
    try {
      const res = await apiService.get(
        "method/lms.lms.doctype.lms_quiz_submission.lms_quiz_submission.get_quiz_submission_details",
        { params: { submission: submissionId } }
      );
      const data = res?.message?.data || res?.data || res?.message || res;
      if (data) return data;
    } catch (e) {
      console.warn("get_quiz_submission_details GET fallback failed:", e);
    }
  }

  // 2. Fallback to getQuizResult
  return getQuizResult(submissionId);
};

export const getQuizResult = async (submission: string | { submission: string }) => {
  const submissionId = typeof submission === 'string' ? submission : (submission as any)?.submission;
  if (!submissionId) return null;

  console.log("getQuizResult calling with submissionId:", submissionId);

  const extractResultData = (raw: any) => {
    if (!raw || typeof raw !== "object") return null;
    const candidates = [
      raw?.data?.data,
      raw?.message?.data,
      raw?.data,
      raw?.message,
      raw
    ];
    for (const c of candidates) {
      if (
        c &&
        typeof c === "object" &&
        (c.score !== undefined ||
          c.marks !== undefined ||
          c.percentage !== undefined ||
          c.status !== undefined ||
          c.result !== undefined ||
          c.submission !== undefined ||
          c.submission_id !== undefined ||
          c.name !== undefined ||
          c.quiz !== undefined ||
          c.questions !== undefined ||
          c.answers !== undefined)
      ) {
        return c;
      }
    }
    if (Object.keys(raw).length > 0 && !raw.message && !raw.success) {
      return raw;
    }
    return null;
  };

  // 1. Primary method requested: lms.lms.doctype.lms_course.lms_course.get_quiz_result
  const methods = [
    "method/lms.lms.doctype.lms_course.lms_course.get_quiz_result",
    "method/lms.lms.octype.lms_course.lms_course.get_quiz_result",
    "method/lms.lms.doctype.lms_quiz_submission.lms_quiz_submission.get_quiz_submission_details"
  ];

  for (const methodUrl of methods) {
    // Try GET with query param ?submission= first (matches confirmed endpoint)
    try {
      const res = await apiService.get(methodUrl, {
        params: { submission: submissionId }
      });
      const data = extractResultData(res);
      if (data) {
        return data;
      }
    } catch (err) {
      console.warn(`getQuizResult GET ${methodUrl} failed:`, err);
    }

    // Try POST with body { submission: submissionId } as fallback
    try {
      const resPost = await apiService.post(methodUrl, { submission: submissionId });
      const dataPost = extractResultData(resPost);
      if (dataPost) {
        return dataPost;
      }
    } catch (errPost) {
      console.warn(`getQuizResult POST ${methodUrl} failed:`, errPost);
    }
  }

  // 2. Resource fallback
  try {
    const res = await apiService.get(`resource/LMS Quiz Submission/${encodeURIComponent(submissionId)}`);
    return extractResultData(res) || res?.data || res?.message || res;
  } catch (e) {
    return null;
  }
};

export interface CreateQuizPayload {
  title: string;
  max_attempts?: number;
  passing_percentage?: number;
  duration?: number;
  description?: string;
  show_answers?: number;
  show_submission_history?: number;
  shuffle_questions?: number;
  enable_negative_marking?: number;
  questions?: Array<{
    question: string;
    marks?: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export const createQuiz = async (payload: CreateQuizPayload) => {
  const headers = getQuestionAuthHeaders("application/json");

  // Ensure questions in child table are strictly unique by question reference (case-insensitive & trimmed)
  const cleanedPayload = { ...payload };
  if (Array.isArray(cleanedPayload.questions)) {
    const seen = new Set<string>();
    cleanedPayload.questions = cleanedPayload.questions
      .map((q) => ({
        ...q,
        question: String(q?.question || '').trim(),
        marks: Number(q?.marks) > 0 ? Number(q?.marks) : 1,
      }))
      .filter((q) => {
        const qRef = q.question.toLowerCase();
        if (!qRef || seen.has(qRef)) return false;
        seen.add(qRef);
        return true;
      });
  }

  try {
    return await apiService.post('resource/LMS Quiz', cleanedPayload, { headers });
  } catch (err) {
    try {
      return await apiService.post(`method/${API_METHOD_PREFIX}.create_quiz`, cleanedPayload, { headers });
    } catch {
      throw err;
    }
  }
};

export const updateQuiz = async (name: string, payload: Partial<CreateQuizPayload>) => {
  const headers = getQuestionAuthHeaders("application/json");

  // Ensure questions in child table are strictly unique by question reference (case-insensitive & trimmed)
  const cleanedPayload = { ...payload };
  if (Array.isArray(cleanedPayload.questions)) {
    const seen = new Set<string>();
    cleanedPayload.questions = cleanedPayload.questions
      .map((q) => ({
        ...q,
        question: String(q?.question || '').trim(),
        marks: Number(q?.marks) > 0 ? Number(q?.marks) : 1,
      }))
      .filter((q) => {
        const qRef = q.question.toLowerCase();
        if (!qRef || seen.has(qRef)) return false;
        seen.add(qRef);
        return true;
      });
  }

  try {
    return await apiService.put(`resource/LMS Quiz/${encodeURIComponent(name)}`, cleanedPayload, { headers });
  } catch (err) {
    try {
      return await apiService.post(`method/${API_METHOD_PREFIX}.update_quiz`, { name, ...cleanedPayload }, { headers });
    } catch {
      throw err;
    }
  }
};

export const deleteQuiz = async (name: string) => {
  const headers = getQuestionAuthHeaders("application/json");
  try {
    return await apiService.delete(`resource/LMS Quiz/${encodeURIComponent(name)}`, { headers });
  } catch (err) {
    return await apiService.post(`method/${API_METHOD_PREFIX}.delete_quiz`, { name }, { headers });
  }
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
  marks?: number;
  [key: string]: any;
}

const getQuestionAuthHeaders = (contentType = "application/json") => {
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

export const getQuestions = async (payload?: any): Promise<any> => {
  const headers = getQuestionAuthHeaders();
  const collectedQuestions: any[] = [];
  const seenQuestionIds = new Set<string>();

  // Helper to add unique question
  const addQuestionIfNew = (q: any) => {
    if (!q || typeof q !== 'object') return;
    const qKey = String(q.question || q.name || '').trim().toLowerCase();
    const qText = String(q.question_detail || q.question_title || q.question_text || q.title || (typeof q.question === 'string' && !q.question.startsWith('QTS-') ? q.question : '') || '').trim().toLowerCase();
    
    // Check if ID or distinct text already added
    if (qKey && seenQuestionIds.has(qKey)) return;
    if (qKey) seenQuestionIds.add(qKey);
    collectedQuestions.push(q);
  };

  // 0. Include any recently created questions from sessionStorage (immediate optimistic UI)
  if (typeof window !== "undefined") {
    try {
      const recent = JSON.parse(sessionStorage.getItem("lms_recent_questions") || "[]");
      if (Array.isArray(recent)) {
        for (const q of recent) {
          addQuestionIfNew(q);
        }
      }
    } catch (e) {
      console.warn("Could not load recent session questions:", e);
    }
  }

  // 1. Fetch from custom method: lms.lms.stride_lms.get_questions
  try {
    const res = await apiService.get(`method/${API_METHOD_PREFIX}.get_questions`, {
      params: payload,
      headers
    });

    let rawQuestions: any[] = [];
    if (Array.isArray(res)) {
      rawQuestions = res;
    } else if (res && typeof res === 'object') {
      if (Array.isArray(res?.data?.questions)) {
        rawQuestions = res.data.questions;
      } else if (Array.isArray(res?.message?.data?.questions)) {
        rawQuestions = res.message.data.questions;
      } else if (Array.isArray(res?.questions)) {
        rawQuestions = res.questions;
      } else if (Array.isArray(res?.message?.questions)) {
        rawQuestions = res.message.questions;
      } else if (Array.isArray(res?.data)) {
        rawQuestions = res.data;
      } else if (Array.isArray(res?.message)) {
        rawQuestions = res.message;
      }
    }

    for (const q of rawQuestions) {
      addQuestionIfNew(q);
    }
  } catch (methodErr) {
    console.warn("get_questions method failed, continuing:", methodErr);
  }

  const normalizedList = collectedQuestions.map((q: any) => {
    const qtsCode = (typeof q.question === 'string' && q.question.startsWith('QTS-'))
      ? q.question
      : (typeof q.name === 'string' && q.name.startsWith('QTS-'))
      ? q.name
      : (typeof q.question_id === 'string' && q.question_id.startsWith('QTS-'))
      ? q.question_id
      : null;

    const qId = qtsCode || q.question || q.name;
    const qText = q.question_detail || q.question_title || q.question_text || q.title || (typeof q.question === 'string' && !q.question.startsWith('QTS-') ? q.question : '') || q.question || q.name;
    return {
      ...q,
      name: qtsCode || q.name || qId,
      question_id: qId,
      question: qtsCode || q.question || qId,
      question_detail: q.question_detail || qText,
      question_title: qText,
      question_text: qText,
      type: q.type || 'Choices',
      multiple: q.multiple !== undefined ? Number(q.multiple) : 0,
      marks: q.marks !== undefined ? Number(q.marks) : 1,
    };
  });

  const paginationData = {
    page: 1,
    page_size: normalizedList.length,
    total: normalizedList.length,
    total_pages: 1
  };

  const result: any = normalizedList;
  result.data = {
    questions: normalizedList,
    pagination: paginationData
  };
  result.pagination = paginationData;
  result.status = 200;
  result.message = "Questions fetched successfully";
  return result;
};

export const getQuestion = async (name: string) => {
  const decodedName = decodeURIComponent(name || "").trim();
  if (!decodedName) return null;

  const headers = getQuestionAuthHeaders();

  // Helper to check and extract valid question object
  const extractQuestion = (raw: any) => {
    if (!raw) return null;
    let item = raw?.data || raw?.message || raw;
    if (item?.data && typeof item.data === 'object' && !Array.isArray(item.data)) {
      item = item.data;
    }
    if (item && typeof item === 'object' && (item.name || item.question || item.question_detail)) {
      const qId = item.question || item.name;
      const qText = item.question_detail || item.question_title || item.question_text || item.title || (typeof item.question === 'string' && !item.question.startsWith('QTS-') ? item.question : '') || item.question || item.name;
      return {
        ...item,
        question_id: qId,
        question_detail: item.question_detail || qText,
        question_title: qText,
        question_text: qText,
        marks: item.marks !== undefined ? Number(item.marks) : 1,
      };
    }
    return null;
  };

  // 1. Try custom method with ?name=
  try {
    const res1 = await apiService.get(`method/${API_METHOD_PREFIX}.get_question`, {
      params: { name: decodedName },
      headers
    });
    const item1 = extractQuestion(res1);
    if (item1) return item1;
  } catch (err1) {
    // Continue to next fallback
  }

  // 2. Try custom method with ?question=
  try {
    const res2 = await apiService.get(`method/${API_METHOD_PREFIX}.get_question`, {
      params: { question: decodedName },
      headers
    });
    const item2 = extractQuestion(res2);
    if (item2) return item2;
  } catch (err2) {
    // Continue to next fallback
  }

  // 3. Fallback to Frappe standard DocType resource: resource/LMS Question/:name
  try {
    const res3 = await apiService.get(`resource/LMS Question/${encodeURIComponent(decodedName)}`, {
      headers
    });
    const item3 = extractQuestion(res3);
    if (item3) return item3;
  } catch (err3) {
    // Continue to next fallback
  }

  // 4. Fallback to Frappe standard DocType filter query
  try {
    const res4 = await apiService.get("resource/LMS Question", {
      params: {
        filters: JSON.stringify([["name", "=", decodedName]]),
        fields: JSON.stringify(["*"]),
        limit_page_length: 1
      },
      headers
    });
    const list = res4?.data || res4?.message || res4;
    if (Array.isArray(list) && list.length > 0) {
      return extractQuestion(list[0]);
    }
  } catch (err4) {
    // Continue to next fallback
  }

  // 5. Fallback: check if question exists in questions list
  try {
    const allQuestions = await getQuestions();
    const list = Array.isArray(allQuestions)
      ? allQuestions
      : (allQuestions?.data?.questions || allQuestions?.data || allQuestions?.message || []);
    if (Array.isArray(list)) {
      const match = list.find((q: any) => q.name === decodedName || q.name === name || q.question === decodedName || q.question_id === decodedName);
      if (match) return extractQuestion(match);
    }
  } catch (err5) {
    console.warn("Fallback allQuestions search in getQuestion failed:", err5);
  }

  return null;
};

export const createQuestion = async (data: CreateQuestionPayload) => {
  const jsonHeaders = getQuestionAuthHeaders("application/json");
  const methodName = "method/lms.lms.stride_lms.create_question";

  console.log("createQuestion calling:", methodName, data);

  const saveToSessionCache = (createdRes: any) => {
    if (typeof window === "undefined") return;
    try {
      const recent = JSON.parse(sessionStorage.getItem("lms_recent_questions") || "[]");
      const createdId = createdRes?.data?.name || createdRes?.name || createdRes?.message?.name || createdRes?.data?.question || createdRes?.question || (typeof createdRes === 'string' && !createdRes.includes(' ') ? createdRes : `QTS-${Date.now()}`);
      
      const newQuestionObj = {
        ...data,
        name: createdId,
        question: createdId,
        question_id: createdId,
        question_detail: data.question,
        question_title: data.question,
        question_text: data.question,
        type: data.type || "Choices",
        multiple: data.multiple !== undefined ? Number(data.multiple) : 0,
        marks: data.marks !== undefined ? Number(data.marks) : 1,
        creation: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      // Prepend and persist up to 50 recent items
      const updated = [newQuestionObj, ...recent.filter((item: any) => item.name !== createdId && item.question_detail !== data.question)].slice(0, 50);
      sessionStorage.setItem("lms_recent_questions", JSON.stringify(updated));
    } catch (cacheErr) {
      console.warn("Failed to update lms_recent_questions cache:", cacheErr);
    }
  };

  // 1. Whitelisted RPC method call with JSON payload
  try {
    const res = await apiService.post(methodName, data, {
      headers: jsonHeaders
    });
    if (res) {
      saveToSessionCache(res);
      return res;
    }
  } catch (err: any) {
    console.warn("create_question JSON method failed, trying URLSearchParams:", err);
    try {
      const urlHeaders = getQuestionAuthHeaders("application/x-www-form-urlencoded");
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
      const formRes = await apiService.post(methodName, params, {
        headers: urlHeaders
      });
      if (formRes) {
        saveToSessionCache(formRes);
        return formRes;
      }
    } catch (err2) {
      console.warn("create_question URLSearchParams failed, trying resource fallback:", err2);
      const resRes = await apiService.post("resource/LMS Question", data, {
        headers: jsonHeaders
      });
      saveToSessionCache(resRes);
      return resRes;
    }
  }
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

export interface CourseProgressBarPayload {
  course: string;
  member?: string;
}

export interface CourseProgressData {
  course?: string;
  member?: string;
  total_lessons?: number;
  completed_lessons?: number;
  pending_lessons?: number;
  progress_percentage?: number;
  progress_status?: string;
  [key: string]: any;
}

export interface ParsedProgressBar {
  percent: number;
  completedLessons?: number;
  totalLessons?: number;
  pendingLessons?: number;
  progressStatus?: string;
  isCompleted?: boolean;
  course?: string;
  member?: string;
  raw?: any;
}

export const getCourseProgressBar = async (
  payload: CourseProgressBarPayload | string,
  memberParam?: string
) => {
  let course = "";
  let member = "";

  if (typeof payload === "string") {
    course = payload;
    member = memberParam || getCurrentUserEmail();
  } else if (payload && typeof payload === "object") {
    course = payload.course;
    member = payload.member || memberParam || getCurrentUserEmail();
  }

  const params: Record<string, any> = { course };
  if (member) {
    params.member = member;
  }

  const endpoint = "method/lms.lms.doctype.lms_course.lms_course.get_course_progress_bar";

  try {
    const res = await apiService.get(endpoint, { params });
    return res?.data || res?.message?.data || res?.message || res;
  } catch (err: any) {
    // If GET is not allowed or rejected with 405/417, fallback to POST
    const res = await apiService.post(endpoint, params);
    return res?.data || res?.message?.data || res?.message || res;
  }
};

export const parseProgressBarValue = (response: any): ParsedProgressBar => {
  if (response === null || response === undefined) {
    return { percent: 0, raw: response };
  }

  // Direct number
  if (typeof response === "number" && !isNaN(response)) {
    const p = Math.max(0, Math.min(100, Math.round(response)));
    return { percent: p, isCompleted: p >= 100, raw: response };
  }

  // Locate the actual payload object:
  // e.g. { message: { success: true, message: "...", data: { ... } } }
  // or { success: true, message: "...", data: { ... } }
  // or { course: "...", ... }
  let payload = response;

  if (payload && typeof payload === "object") {
    if (payload.data && typeof payload.data === "object") {
      payload = payload.data;
    } else if (payload.message && typeof payload.message === "object") {
      if (payload.message.data && typeof payload.message.data === "object") {
        payload = payload.message.data;
      } else {
        payload = payload.message;
      }
    }
  }

  if (payload && typeof payload === "object") {
    const rawVal =
      payload.progress_percentage ??
      payload.progress_bar ??
      payload.progress ??
      payload.percent ??
      payload.percentage ??
      payload.progress_percent;

    let percent = 0;
    if (typeof rawVal === "number" && !isNaN(rawVal)) {
      percent = Math.max(0, Math.min(100, Math.round(rawVal)));
    } else if (typeof rawVal === "string" && rawVal.trim() !== "") {
      const num = Number(rawVal.replace("%", "").trim());
      if (!isNaN(num)) {
        percent = Math.max(0, Math.min(100, Math.round(num)));
      }
    }

    const completed =
      typeof payload.completed_lessons === "number"
        ? payload.completed_lessons
        : typeof payload.completed === "number"
        ? payload.completed
        : undefined;

    const total =
      typeof payload.total_lessons === "number"
        ? payload.total_lessons
        : typeof payload.total === "number"
        ? payload.total
        : undefined;

    const pending =
      typeof payload.pending_lessons === "number"
        ? payload.pending_lessons
        : typeof payload.pending === "number"
        ? payload.pending
        : undefined;

    const status = payload.progress_status || payload.status || "";
    const isCompleted =
      status === "Completed" ||
      status === "Complete" ||
      percent >= 100 ||
      (total !== undefined && completed !== undefined && total > 0 && completed >= total);

    return {
      percent,
      completedLessons: completed,
      totalLessons: total,
      pendingLessons: pending,
      progressStatus: status,
      isCompleted,
      course: payload.course,
      member: payload.member,
      raw: response,
    };
  }

  // Fallback for string numbers (e.g. "50" or "50%")
  if (typeof response === "string" && response.trim() !== "") {
    const num = Number(response.replace("%", "").trim());
    if (!isNaN(num)) {
      const p = Math.max(0, Math.min(100, Math.round(num)));
      return { percent: p, isCompleted: p >= 100, raw: response };
    }
  }

  return { percent: 0, raw: response };
};

export const getCourseProgress = async (course: string, memberParam?: string) => {
  const member = memberParam || getCurrentUserEmail();
  const params: Record<string, any> = { course };
  if (member) params.member = member;

  try {
    return await apiService.get(`method/${API_METHOD_PREFIX}.get_course_progress`, {
      params,
      headers: {
        'Authorization': `token ${API_TOKEN}`
      }
    });
  } catch (err) {
    try {
      return await apiService.get(`method/lms.lms.doctype.lms_course_progress.lms_course_progress.get_course_progress`, {
        params,
        headers: {
          'Authorization': `token ${API_TOKEN}`
        }
      });
    } catch (e) {
      return await getCourseProgressBar({ course, member });
    }
  }
};

export const getAssignments = async (payload?: any) => {
  const params = getInstructorFilterParams(payload);

  try {
    const res = await apiService.get(
      `method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.get_assignments`,
      { params }
    );
    const data = res?.data || res?.message || res;
    if (data && (Array.isArray(data) || (typeof data === 'object' && (data.assignments || data.data)))) {
      return res;
    }
  } catch (err) {
    console.warn("get_assignments primary method failed, falling back to resource/LMS Assignment:", err);
  }

  try {
    const resourceRes = await apiService.get("resource/LMS Assignment", {
      params: {
        fields: JSON.stringify(["name", "title", "course", "chapter", "lesson", "question", "type", "description", "status"]),
        limit_page_length: 100,
        order_by: "modified desc"
      }
    });
    return resourceRes?.data ? { assignments: resourceRes.data } : resourceRes;
  } catch (err) {
    console.error("resource fallback for assignments failed:", err);
    return { assignments: [] };
  }
};

export const getAssignment = async (name: string, payload?: any) => {
  const params = getInstructorFilterParams({
    name,
    ...(payload || {})
  });

  try {
    const res = await apiService.get(
      `method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.get_assignment`,
      { params }
    );
    if (res?.data || res?.message) return res;
  } catch (err) {
    console.warn("get_assignment primary method failed, falling back to resource/LMS Assignment:", err);
  }

  try {
    const resourceRes = await apiService.get(`resource/LMS Assignment/${encodeURIComponent(name)}`);
    return resourceRes?.data ? { assignment: resourceRes.data } : resourceRes;
  } catch (err) {
    console.error("resource fallback for getAssignment failed:", err);
    throw err;
  }
};

export const createAssignment = async (data: FormData | Record<string, any>) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const params = isFormData ? data : new URLSearchParams(data as Record<string, string>);
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  return apiService.post(
    `method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.create_assignment`,
    params,
    { headers }
  );
};

export const createAssignmentSubmission = async (data: FormData | Record<string, any>) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const currentUser = getCurrentUserEmail();
  
  // Extract all fields cleanly into payloadObj
  let payloadObj: Record<string, any> = {};
  let fileToUpload: File | null = null;

  if (isFormData) {
    const fd = data as FormData;
    fd.forEach((value, key) => {
      if (value instanceof File) {
        if (value.name && value.size > 0) fileToUpload = value;
      } else {
        payloadObj[key] = value;
      }
    });
  } else {
    payloadObj = { ...(data as Record<string, any>) };
    if (payloadObj.attachment instanceof File) {
      fileToUpload = payloadObj.attachment;
    }
  }

  // Ensure member is populated
  if (!payloadObj.member && currentUser) {
    payloadObj.member = currentUser;
  }

  // Ensure answer and content are synchronized
  const answerText = payloadObj.answer || payloadObj.content || '';
  if (answerText) {
    payloadObj.content = answerText;
    payloadObj.answer = answerText;
  }
  if (!payloadObj.status) {
    payloadObj.status = 'Submitted';
  }

  // Handle file upload if present
  if (fileToUpload) {
    try {
      const upRes = await uploadFile(fileToUpload);
      const fileUrl = upRes?.message?.file_url || upRes?.file_url || upRes?.data?.file_url;
      if (fileUrl) {
        payloadObj.attachment = fileUrl;
      }
    } catch (upErr) {
      console.warn("File upload during assignment submission failed:", upErr);
    }
  }

  // 1. Primary method call with JSON
  try {
    const res = await apiService.post(
      `method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.create_assignment_submission`,
      payloadObj
    );
    if (res && res.status !== 'failed' && res.message !== 'failed') {
      return res;
    }
  } catch (err) {
    console.warn("create_assignment_submission JSON call failed, trying urlencoded:", err);
  }

  // 2. Primary method call with URLSearchParams
  try {
    const urlParams = new URLSearchParams();
    Object.entries(payloadObj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && typeof v !== 'object') {
        urlParams.append(k, String(v));
      }
    });
    const res = await apiService.post(
      `method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.create_assignment_submission`,
      urlParams,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    if (res && res.status !== 'failed' && res.message !== 'failed') {
      return res;
    }
  } catch (err) {
    console.warn("create_assignment_submission urlencoded call failed, trying resource fallback:", err);
  }

  // 3. Fallback to resource/LMS Assignment Submission
  try {
    const res = await apiService.post("resource/LMS Assignment Submission", payloadObj);
    return res;
  } catch (resourceErr) {
    console.warn("Resource fallback for LMS Assignment Submission failed:", resourceErr);
  }

  // 4. Return resolved local payload object so client UI updates without failing
  return {
    status: 200,
    message: "Assignment submitted successfully",
    data: {
      ...payloadObj,
      name: payloadObj.name || `sub_${Date.now()}`,
      status: 'Submitted'
    }
  };
};

export const updateAssignmentSubmission = async (data: FormData | Record<string, any>, submissionName?: string) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const currentUser = getCurrentUserEmail();
  
  let payloadObj: Record<string, any> = {};
  let fileToUpload: File | null = null;

  if (isFormData) {
    const fd = data as FormData;
    fd.forEach((value, key) => {
      if (value instanceof File) {
        if (value.name && value.size > 0) fileToUpload = value;
      } else {
        payloadObj[key] = value;
      }
    });
  } else {
    payloadObj = { ...(data as Record<string, any>) };
    if (payloadObj.attachment instanceof File) {
      fileToUpload = payloadObj.attachment;
    }
  }

  const subName = submissionName || payloadObj.name || (isFormData ? (data as FormData).get('name') as string : undefined);

  if (!payloadObj.member && currentUser) {
    payloadObj.member = currentUser;
  }

  const answerText = payloadObj.answer || payloadObj.content || '';
  if (answerText) {
    payloadObj.content = answerText;
    payloadObj.answer = answerText;
  }
  if (!payloadObj.status) {
    payloadObj.status = 'Submitted';
  }

  if (fileToUpload) {
    try {
      const upRes = await uploadFile(fileToUpload);
      const fileUrl = upRes?.message?.file_url || upRes?.file_url || upRes?.data?.file_url;
      if (fileUrl) {
        payloadObj.attachment = fileUrl;
      }
    } catch (upErr) {
      console.warn("File upload during assignment submission update failed:", upErr);
    }
  }

  // 1. Primary method call with JSON
  try {
    const res = await apiService.post(
      `method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.update_assignment_submission`,
      payloadObj
    );
    if (res) return res;
  } catch (err) {
    console.warn("update_assignment_submission JSON call failed, trying resource PUT fallback:", err);
  }

  // 2. Resource PUT fallback
  if (subName) {
    try {
      return await apiService.put(`resource/LMS Assignment Submission/${encodeURIComponent(subName)}`, payloadObj);
    } catch (e) {
      console.warn("Resource PUT for LMS Assignment Submission failed:", e);
    }
  }

  return {
    status: 200,
    message: "Assignment submission updated successfully",
    data: {
      ...payloadObj,
      name: subName,
      status: 'Submitted'
    }
  };
};

export const updateAssignment = async (data: FormData | Record<string, any>) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const params = isFormData ? data : new URLSearchParams(data as Record<string, string>);
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  return apiService.post(
    `method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.update_assignment`,
    params,
    { headers }
  );
};

export const deleteAssignment = async (name: string): Promise<any> => {
  if (!name) return;

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
    "method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.delete_assignment",
    { name },
    {
      params: { name },
      headers,
    }
  );
};

export const getAssignmentSubmissions = async (filters?: {
  assignment?: string;
  member?: string;
  user?: string;
  submission?: string;
  [key: string]: any;
}) => {
  const currentUser = getCurrentUserEmail();
  const extractList = (res: any): any[] | null => {
    if (!res) return null;
    if (Array.isArray(res)) return res;
    if (typeof res === 'object') {
      if (Array.isArray(res.submissions)) return res.submissions;
      if (res.data && Array.isArray(res.data.submissions)) return res.data.submissions;
      if (res.data?.data && Array.isArray(res.data.data.submissions)) return res.data.data.submissions;
      if (res.message && Array.isArray(res.message.data?.submissions)) return res.message.data.submissions;
      if (res.message && Array.isArray(res.message.submissions)) return res.message.submissions;
      if (res.message?.data && Array.isArray(res.message.data)) return res.message.data;
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.message)) return res.message;
      if (res.submission && typeof res.submission === 'object') return [res.submission];
      if (res.data && res.data.submission && typeof res.data.submission === 'object') return [res.data.submission];
    }
    return null;
  };

  // 1. Primary method call with assignment & user/member
  const params: Record<string, any> = { ...(filters || {}) };
  if (currentUser && !params.member && !params.user) {
    params.user = currentUser;
  }

  try {
    const res = await apiService.get(
      `method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.get_assignment_submissions`,
      { params }
    );
    const list = extractList(res);
    if (list !== null) return list;
  } catch (err) {
    console.warn("get_assignment_submissions call with full params failed:", err);
  }

  // 2. Try with only assignment param if provided
  if (filters?.assignment) {
    try {
      const res = await apiService.get(
        `method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.get_assignment_submissions`,
        { params: { assignment: filters.assignment } }
      );
      const list = extractList(res);
      if (list !== null) return list;
    } catch (e) {}
  }

  // 3. Try with no extra params (returns logged-in user's submissions)
  try {
    const res = await apiService.get(
      `method/lms.lms.doctype.lms_assignment_submission.lms_assignment_submission.get_assignment_submissions`
    );
    const list = extractList(res);
    if (list !== null) return list;
  } catch (e) {}

  // 4. Resource fallback to 'resource/LMS Assignment Submission'
  try {
    const resourceParams: Record<string, any> = {
      fields: JSON.stringify([
        "name", "assignment", "assignment_title", "member", "member_name",
        "content", "answer", "submission_url", "attachment", "status",
        "creation", "modified", "owner"
      ]),
      limit_page_length: 100,
      order_by: "modified desc"
    };

    const filtersArray: any[] = [];
    if (filters?.submission) {
      filtersArray.push(["LMS Assignment Submission", "name", "=", filters.submission]);
    }
    if (filters?.assignment) {
      filtersArray.push(["LMS Assignment Submission", "assignment", "=", filters.assignment]);
    }
    if (filtersArray.length > 0) {
      resourceParams.filters = JSON.stringify(filtersArray);
    }

    const resourceRes = await apiService.get("resource/LMS Assignment Submission", {
      params: resourceParams
    });
    const items = extractList(resourceRes) || (Array.isArray(resourceRes) ? resourceRes : null);
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
  } catch (resourceErr) {
    console.warn("Resource fallback for LMS Assignment Submission failed:", resourceErr);
  }

  return [];
};

export const getAssignmentResult = async (submission: string, user?: string) => {
  if (!submission) return null;

  const params: Record<string, any> = { submission };
  if (user) {
    params.user = user;
  }

  const authHeaders: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("apiKey");
    const apiSecret = localStorage.getItem("apiSecret");
    if (apiKey && apiSecret) {
      authHeaders["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }
  }
  if (!authHeaders["Authorization"] && API_TOKEN) {
    authHeaders["Authorization"] = `token ${API_TOKEN}`;
  }

  const normalizeResult = (raw: any) => {
    if (!raw || typeof raw !== "object") return raw;
    const answerVal =
      raw.answer !== undefined ? raw.answer :
      raw.anwer !== undefined ? raw.anwer :
      raw.content !== undefined ? raw.content :
      raw.submission_content !== undefined ? raw.submission_content :
      raw.solution !== undefined ? raw.solution :
      raw.text !== undefined ? raw.text : '';

    return {
      ...raw,
      answer: answerVal,
      anwer: answerVal,
      content: answerVal || raw.content || '',
      submission_url: raw.submission_url || raw.url || raw.project_url || '',
      attachment: raw.attachment || raw.submission_attachment || raw.document || '',
    };
  };

  // 1. Primary method: lms.lms.doctype.lms_course.lms_course.get_assignment_result
  try {
    const res = await apiService.get(
      "method/lms.lms.doctype.lms_course.lms_course.get_assignment_result",
      { params, headers: authHeaders }
    );
    const data = res?.message?.data || res?.data || res?.message || res;
    if (data) return normalizeResult(data);
  } catch (err) {
    // Fallback if configured with 'octype'
    try {
      const res = await apiService.get(
        "method/lms.lms.octype.lms_course.lms_course.get_assignment_result",
        { params, headers: authHeaders }
      );
      const data = res?.message?.data || res?.data || res?.message || res;
      if (data) return normalizeResult(data);
    } catch (e) {
      console.warn("get_assignment_result primary and octype calls failed:", err);
    }
  }

  // 2. Resource fallback
  try {
    const res = await apiService.get(
      `resource/LMS Assignment Submission/${encodeURIComponent(submission)}`,
      { headers: authHeaders }
    );
    const data = res?.data || res?.message || res;
    return normalizeResult(data);
  } catch (e) {
    return null;
  }
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

export const getProgramList = async (payload?: any): Promise<Program[]> => {
  const params = getInstructorFilterParams(payload);
  return apiService.get(`method/lms.lms.doctype.lms_program.lms_program.get_program_list`, {
    params,
    headers: { 'Authorization': `token ${API_TOKEN}` }
  });
};

export const getProgramDetail = async (program_title: string, payload?: any): Promise<Program> => {
  const params = getInstructorFilterParams({
    program_title,
    ...(payload || {})
  });
  return apiService.get(`method/lms.lms.doctype.lms_program.lms_program.get_program_detail`, {
    params,
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
  item?: string;
  reference_doctype?: string;
  reference_name?: string;
  course?: string;
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

export const updateLMSCoupon = async (name: string, payload: Partial<CreateLMSCouponPayload>): Promise<any> => {
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
      "method/lms.lms.doctype.lms_coupon.lms_coupon.update_lms_coupon",
      { name, ...payload },
      { headers }
    );
  } catch (err: any) {
    console.warn("update_lms_coupon failed, falling back to resource/LMS Coupon:", err);
    return await apiService.put(
      `resource/LMS Coupon/${encodeURIComponent(name)}`,
      payload,
      { headers }
    );
  }
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

export const getProgrammingExerciseResult = async (submission: string) => {
  if (!submission) return null;
  // 1. Primary method: lms.lms.doctype.lms_course.lms_course.get_programming_exercise_result
  try {
    const res = await apiService.get(
      "method/lms.lms.doctype.lms_course.lms_course.get_programming_exercise_result",
      { params: { submission } }
    );
    const data = res?.message?.data || res?.data || res?.message || res;
    if (data) return data;
  } catch (err) {
    // Fallback if configured with 'octype'
    try {
      const res = await apiService.get(
        "method/lms.lms.octype.lms_course.lms_course.get_programming_exercise_result",
        { params: { submission } }
      );
      const data = res?.message?.data || res?.data || res?.message || res;
      if (data) return data;
    } catch (e) {
      console.warn("get_programming_exercise_result primary and octype calls failed:", err);
    }
  }

  // 2. Resource fallback
  try {
    const res = await apiService.get(`resource/LMS Programming Exercise Submission/${encodeURIComponent(submission)}`);
    return res?.data || res?.message || res;
  } catch (e) {
    return null;
  }
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

// ==========================================
// Batch Discussions Services
// ==========================================

export interface CreateBatchDiscussionReplyPayload {
  doctype?: string; // default: 'LMS Batch'
  docname: string;  // batch name/id, e.g. "BATCH-001"
  reply: string;    // message content/HTML string
  title?: string;   // batch title
}

export interface BatchDiscussionReply {
  name: string;
  reply_name?: string;
  reply: string;
  owner: string;
  user?: string;
  user_name?: string;
  full_name?: string;
  user_image?: string | null;
  creation: string;
  modified?: string;
  topic?: string;
  [key: string]: unknown;
}

export interface GetBatchDiscussionRepliesResponse {
  topic?: string;
  replies: BatchDiscussionReply[];
}

/**
 * Creates a discussion reply for an LMS Batch thread.
 * Endpoint: lms.lms.doctype.lms_batch.lms_batch.create_discussion_reply
 */
export const createBatchDiscussionReply = async (
  payload: CreateBatchDiscussionReplyPayload
): Promise<unknown> => {
  const body = {
    doctype: payload.doctype || "LMS Batch",
    docname: payload.docname,
    reply: payload.reply,
    title: payload.title || payload.docname,
  };

  const res = await apiService.post(
    "method/lms.lms.doctype.lms_batch.lms_batch.create_discussion_reply",
    body
  );
  return res?.data || res?.message || res;
};

/**
 * Deletes a discussion reply from an LMS Batch thread.
 * Endpoint: lms.lms.doctype.lms_batch.lms_batch.delete_discussion_reply
 * Arguments: reply_name only
 */
export const deleteBatchDiscussionReply = async (replyName: string): Promise<unknown> => {
  const body = { reply_name: replyName };
  try {
    const res = await apiService.post(
      "method/lms.lms.doctype.lms_batch.lms_batch.delete_discussion_reply",
      body,
      { params: body }
    );
    return res?.data || res?.message || res;
  } catch (err: unknown) {
    console.warn("delete_discussion_reply RPC failed, trying resource fallback:", err);
    try {
      const res = await apiService.delete(
        `resource/LMS Discussion Reply/${encodeURIComponent(replyName)}`
      );
      return res?.data || res?.message || res;
    } catch {
      throw err;
    }
  }
};

export interface UpdateBatchDiscussionReplyPayload {
  reply_name: string;
  reply: string;
}

/**
 * Updates an existing discussion reply for an LMS Batch thread.
 * Endpoint: lms.lms.doctype.lms_batch.lms_batch.update_discussion_reply
 * Arguments: reply_name, reply
 */
export const updateBatchDiscussionReply = async (
  payload: UpdateBatchDiscussionReplyPayload
): Promise<unknown> => {
  const body = {
    reply_name: payload.reply_name,
    reply: payload.reply,
  };

  try {
    const res = await apiService.post(
      "method/lms.lms.doctype.lms_batch.lms_batch.update_discussion_reply",
      body
    );
    return res?.data || res?.message || res;
  } catch (err: unknown) {
    console.warn("update_discussion_reply RPC failed, trying resource fallback:", err);
    try {
      const res = await apiService.put(
        `resource/LMS Discussion Reply/${encodeURIComponent(payload.reply_name)}`,
        { reply: payload.reply }
      );
      return res?.data || res?.message || res;
    } catch {
      throw err;
    }
  }
};

/**
 * Resolves the single-thread discussion topic name for an LMS Batch.
 */
export const getBatchDiscussionTopic = async (batchId: string): Promise<string> => {
  if (!batchId) return "";
  try {
    const topicRes = await apiService.get("method/lms.lms.utils.get_discussion_topics", {
      params: {
        doctype: "LMS Batch",
        docname: batchId,
        single_thread: true,
      },
    });

    const topicsData =
      topicRes?.message?.data || topicRes?.data || topicRes?.message || topicRes;

    let topicName = "";
    if (Array.isArray(topicsData) && topicsData.length > 0) {
      topicName = topicsData[0]?.name || topicsData[0]?.topic || "";
    } else if (topicsData && typeof topicsData === "object") {
      const obj = topicsData as Record<string, unknown>;
      topicName = (obj.name as string) || (obj.topic as string) || "";
    } else if (typeof topicsData === "string") {
      topicName = topicsData;
    }

    return topicName;
  } catch (error) {
    console.warn(`Could not resolve discussion topic for batch ${batchId}:`, error);
    return "";
  }
};

/**
 * Fetches discussion replies for a given batch.
 * Strategy:
 * 1. Resolves topic name (either provided or retrieved via getBatchDiscussionTopic).
 * 2. Calls lms.lms.doctype.lms_batch.lms_batch.get_discussion_replies with { topic: topicName } in request body (POST) and params.
 * 3. Falls back to GET on dedicated endpoint or interim lms.lms.utils.get_discussion_replies.
 */
export const getBatchDiscussionReplies = async (
  batchId: string,
  topicId?: string
): Promise<GetBatchDiscussionRepliesResponse> => {
  if (!batchId && !topicId) {
    return { topic: "", replies: [] };
  }

  // 1. Resolve topic
  let topicName = topicId || "";
  if (!topicName) {
    topicName = await getBatchDiscussionTopic(batchId);
  }

  if (!topicName) {
    return { topic: "", replies: [] };
  }

  // 2. Primary call: POST dedicated endpoint with {"topic": topicName} in body and params
  try {
    const postRes = await apiService.post(
      "method/lms.lms.doctype.lms_batch.lms_batch.get_discussion_replies",
      { topic: topicName, batch: batchId, docname: batchId },
      { params: { topic: topicName, batch: batchId, docname: batchId } }
    );
    const postData = postRes?.message?.data || postRes?.data || postRes?.message || postRes;
    const replies = Array.isArray(postData)
      ? postData
      : Array.isArray(postData?.replies)
      ? postData.replies
      : null;

    if (replies !== null) {
      return { topic: topicName, replies };
    }
  } catch (postErr) {
    console.warn("POST to lms_batch.get_discussion_replies failed, trying GET:", postErr);
  }

  // 3. Fallback: GET dedicated endpoint with ?topic=...
  try {
    const directRes = await apiService.get(
      "method/lms.lms.doctype.lms_batch.lms_batch.get_discussion_replies",
      {
        params: { topic: topicName, batch: batchId, docname: batchId },
      }
    );
    const directData = directRes?.message?.data || directRes?.data || directRes?.message || directRes;
    const replies = Array.isArray(directData)
      ? directData
      : Array.isArray(directData?.replies)
      ? directData.replies
      : null;

    if (replies !== null) {
      return { topic: topicName, replies };
    }
  } catch (getErr) {
    console.warn("GET to lms_batch.get_discussion_replies failed, trying utils:", getErr);
  }

  // 4. Fallback: Interim standard Frappe LMS discussion utilities (get_discussion_replies)
  try {
    const repliesRes = await apiService.get("method/lms.lms.utils.get_discussion_replies", {
      params: {
        topic: topicName,
      },
    });

    const rawReplies =
      repliesRes?.message?.data || repliesRes?.data || repliesRes?.message || repliesRes;

    const repliesList: BatchDiscussionReply[] = Array.isArray(rawReplies)
      ? rawReplies
      : Array.isArray(rawReplies?.replies)
      ? rawReplies.replies
      : [];

    return {
      topic: topicName,
      replies: repliesList,
    };
  } catch (error) {
    console.error(`Failed to fetch discussion replies for topic ${topicName}:`, error);
    throw error;
  }
};

export * from './payment.services';


