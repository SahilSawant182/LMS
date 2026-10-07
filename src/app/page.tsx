"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import CourseSection from '@/components/CourseSection';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("apiKey");
      if (apiKey) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  if (isChecking) {
    return null; // Don't render until redirected
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <CourseSection />
      </main>
      
      {/* Footer Placeholder */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-center border-t border-slate-800">
        <p className="text-sm">© 2026 Stridenex Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
