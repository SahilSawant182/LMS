/**
 * Strips the Next.js basePath ('/lms') from internal application routes
 * so they can be safely passed to Next.js `router.push(...)` or `<Link href={...}>`
 * without triggering double-prefixing (e.g. /lms/lms/... -> 404).
 */
export function stripBasePath(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  let cleaned = trimmed.replace(/^(\/lms)+(\/|$)/, '$2');
  if (!cleaned.startsWith('/') && !cleaned.startsWith('#') && !cleaned.startsWith('?')) {
    cleaned = '/' + cleaned;
  }
  return cleaned || '/';
}

/**
 * Smart back navigation utility for LMS.
 * Ensures users are always returned to the screen from which they came,
 * or safely to the intended section without unintended jumps to dashboard.
 */

export function navigateBack(
  router: any,
  fallbackUrl: string = "/",
  options?: { forceFallback?: boolean }
): void {
  if (typeof window === "undefined") return;

  // 1. Explicit returnUrl or from in query parameters has highest priority
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const rawReturnUrl = urlParams.get("returnUrl") || urlParams.get("from");
    const returnUrl = stripBasePath(rawReturnUrl);
    if (returnUrl) {
      router.push(returnUrl);
      return;
    }

    // Check for composite lesson parameters (e.g. returning from quiz/assignment/exercise to lesson)
    const courseId = urlParams.get("courseId");
    const chapterId = urlParams.get("chapterId");
    const lessonId = urlParams.get("lessonId");
    if (courseId && chapterId && lessonId) {
      router.push(
        `/course/${encodeURIComponent(courseId)}/${encodeURIComponent(chapterId)}/${encodeURIComponent(lessonId)}`
      );
      return;
    }
  } catch (e) {
    console.warn("Could not parse returnUrl:", e);
  }

  // If caller explicitly requested to force fallback URL
  if (options?.forceFallback && fallbackUrl) {
    router.push(stripBasePath(fallbackUrl));
    return;
  }

  const currentPath = window.location.pathname;
  const currentUrl = window.location.pathname + window.location.search;
  const prevUrl = typeof window !== "undefined" ? sessionStorage.getItem("lms_previous_url") : null;

  // Helper to normalize path without trailing slashes or queries
  const normalizePath = (url: string) => url.split("?")[0].split("#")[0].replace(/\/+$/, "");

  // Helper to check if a URL is an internal child/subpath of current page
  // (e.g. while on /course/business, /course/business/Chapter%201/Lesson%201 is a child)
  const isChildOfCurrent = (url: string) => {
    try {
      const urlPath = normalizePath(url);
      const currPath = normalizePath(currentPath);
      return urlPath.startsWith(currPath + "/") && urlPath !== currPath;
    } catch {
      return false;
    }
  };

  // Helper to check if a URL is an auth or transient route that should never be returned to
  const isIgnoredRoute = (url: string) => {
    try {
      const p = normalizePath(url);
      return p === "/login" || p === "/forgot-password" || p === "/reset-password";
    } catch {
      return false;
    }
  };

  // Check if prevUrl is a genuine, valid previous location
  const isValidPrevUrl = Boolean(
    prevUrl &&
    prevUrl !== currentUrl &&
    normalizePath(prevUrl) !== normalizePath(currentPath) &&
    !isChildOfCurrent(prevUrl) &&
    !isIgnoredRoute(prevUrl)
  );

  // Check if prevUrl is the dashboard
  const isPrevDashboard = Boolean(isValidPrevUrl && (prevUrl === "/dashboard" || prevUrl?.startsWith("/dashboard?")));

  // Check if fallbackUrl is a specific destination page (not root "/" and not "/dashboard")
  const hasSpecificFallback = Boolean(fallbackUrl && fallbackUrl !== "/" && fallbackUrl !== "/dashboard");

  // 2. If fallbackUrl is a specific section/catalog/overview (like "Back to Quizzes", "Back to Certificates",
  // "Back to Course Overview", "Back to Evaluations", "Back to Badges", "Back to Coupons", "Back to Programs",
  // or a specific itemLink), and the previous URL was the dashboard or invalid:
  // Directly navigate to fallbackUrl instead of jumping unexpectedly to dashboard!
  if (hasSpecificFallback && (!isValidPrevUrl || isPrevDashboard)) {
    router.push(stripBasePath(fallbackUrl));
    return;
  }

  // 3. If a valid previous in-app route exists (where the user actually came from):
  if (isValidPrevUrl) {
    // If the browser has a history entry, router.back()
    if (typeof window.history !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(stripBasePath(prevUrl));
    return;
  }

  // 4. If internal document referrer exists and is not self, child, or auth
  if (
    typeof document !== "undefined" &&
    document.referrer &&
    document.referrer.includes(window.location.host) &&
    !isChildOfCurrent(document.referrer) &&
    !isIgnoredRoute(document.referrer) &&
    typeof window.history !== "undefined" &&
    window.history.length > 1
  ) {
    router.back();
    return;
  }

  // 5. Default fallback URL
  if (fallbackUrl) {
    router.push(stripBasePath(fallbackUrl));
  } else {
    router.push("/dashboard");
  }
}
