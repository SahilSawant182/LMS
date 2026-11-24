// src/utils/environment.ts

export const isStandaloneLms = (): boolean => {
  if (typeof window !== "undefined") {
    const host = (window.location.hostname || "").toLowerCase();
    const port = String(window.location.port || "");

    // 1. Standalone indicators:
    if (
      port === "3000" ||
      port === "3002" ||
      port === "3003" ||
      host === "lms.stridenex.ai" ||
      host.startsWith("devlms") ||
      host.startsWith("lms.stridenex") ||
      host.includes("lms-standalone")
    ) {
      return true;
    }

    // 2. Integrated indicators:
    if (
      port === "3004" ||
      port === "3001" ||
      host.includes("quantcloud") ||
      host.includes("testwebstridenex") ||
      host.includes("devstridenex")
    ) {
      return false;
    }
  }

  if (process.env.NEXT_PUBLIC_IS_STANDALONE === "true") return true;
  if (process.env.NEXT_PUBLIC_IS_STANDALONE === "false") return false;

  // Fallback checks
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").toLowerCase();
  if (apiBase.includes("quantcloud") || apiBase.includes("devstridenex")) {
    return false;
  }
  if (apiBase.includes("devlms") || apiBase.includes("8005") || apiBase.includes("lms.stridenex")) {
    return true;
  }

  return false;
};

export const getStrideNexLoginUrl = (): string => {
  if (typeof window === "undefined") return "/login";
  if (isStandaloneLms()) {
    return "/login";
  }
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:3001/login";
  }
  return "/login";
};

