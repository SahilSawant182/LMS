"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("apiKey");
      const apiSecret = localStorage.getItem("apiSecret");

      const isLoggedIn = Boolean(
        apiKey &&
        apiSecret &&
        apiKey !== "undefined" &&
        apiKey !== "null" &&
        apiSecret !== "undefined" &&
        apiSecret !== "null"
      );

      if (isLoggedIn) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Redirecting...
        </p>
      </div>
    </div>
  );
}
