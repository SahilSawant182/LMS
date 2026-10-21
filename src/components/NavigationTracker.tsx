"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRef = useRef<string>("");

  useEffect(() => {
    if (!currentRef.current && typeof window !== "undefined") {
      const storedCurrent = sessionStorage.getItem("lms_current_url");
      if (storedCurrent) {
        currentRef.current = storedCurrent;
      }
    }

    const query = searchParams ? searchParams.toString() : "";
    const fullPath = query ? `${pathname}?${query}` : pathname;

    if (currentRef.current && currentRef.current !== fullPath) {
      sessionStorage.setItem("lms_previous_url", currentRef.current);
    }
    currentRef.current = fullPath;
    sessionStorage.setItem("lms_current_url", fullPath);
  }, [pathname, searchParams]);

  return null;
}
