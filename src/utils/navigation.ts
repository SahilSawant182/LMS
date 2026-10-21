/**
 * Smart back navigation utility for LMS.
 * Ensures users are always returned to the screen from which they came.
 */

export function navigateBack(router: any, fallbackUrl: string = "/"): void {
  if (typeof window === "undefined") return;

  // 1. Explicit returnUrl or from in query parameters has highest priority
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get("returnUrl") || urlParams.get("from");
    if (returnUrl) {
      router.push(returnUrl);
      return;
    }
  } catch (e) {
    console.warn("Could not parse returnUrl:", e);
  }

  // 2. Retrieve previous in-app route tracked in sessionStorage
  const prevUrl = typeof window !== "undefined" ? sessionStorage.getItem("lms_previous_url") : null;
  const currentUrl = window.location.pathname + window.location.search;

  // 3. If previous in-app URL exists and is different from current
  if (prevUrl && prevUrl !== currentUrl) {
    if (typeof window.history !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(prevUrl);
    return;
  }

  // 4. If internal document referrer exists
  if (
    typeof document !== "undefined" &&
    document.referrer &&
    document.referrer.includes(window.location.host) &&
    typeof window.history !== "undefined" &&
    window.history.length > 1
  ) {
    router.back();
    return;
  }

  // 5. Default fallback URL
  if (fallbackUrl) {
    router.push(fallbackUrl);
  } else {
    router.push("/");
  }
}
