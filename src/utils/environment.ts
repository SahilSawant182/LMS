// src/utils/environment.ts

export const isStandaloneLms = (): boolean => {
  if (process.env.NEXT_PUBLIC_IS_STANDALONE === "true") return true;

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    const port = window.location.port;
    if (
      host.includes("devlms") ||
      host.includes("lms.stridenex.ai") ||
      port === "3003"
    ) {
      return true;
    }
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").toLowerCase();
  if (
    apiBase.includes("devlms") ||
    apiBase.includes("8005") ||
    (!apiBase.includes("quantcloud") && !apiBase.includes("devstridenex"))
  ) {
    return true;
  }

  return false;
};

export const getStrideNexLoginUrl = (): string => {
  if (typeof window === "undefined") return "/login";
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:3001/login";
  }
  return "/login";
};

