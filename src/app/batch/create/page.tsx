"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import BatchForm from '@/components/admin/BatchForm';
import { useRouter } from 'next/navigation';

export default function CreateBatchPage() {
  const router = useRouter();
  const [isInstructor, setIsInstructor] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const rolesStr = localStorage.getItem("roles");
      if (rolesStr) {
        const roles = JSON.parse(rolesStr);
        if (roles.includes("Instructor")) {
          setIsInstructor(true);
        } else {
          setIsInstructor(false);
          router.push('/batches');
        }
      } else {
        setIsInstructor(false);
        router.push('/login');
      }
    } catch (e) {
      setIsInstructor(false);
      router.push('/');
    }
  }, [router]);

  if (isInstructor === null) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!isInstructor) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <BatchForm isEdit={false} />
    </div>
  );
}
