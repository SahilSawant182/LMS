"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import BatchForm from '@/components/admin/BatchForm';
import { useRouter, useParams } from 'next/navigation';
import { getBatchDetails } from '@/services/lms.services';

export default function EditBatchPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params?.batchId as string;
  
  const [isInstructor, setIsInstructor] = useState<boolean | null>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (isInstructor && batchId) {
      const fetchBatch = async () => {
        try {
          const res = await getBatchDetails({ batch: batchId });
          const rawData = res;
          const extracted = rawData?.message?.data || rawData?.data?.message || rawData?.data || rawData?.message || rawData;
          
          if (!extracted) throw new Error('Batch not found');
          
          setInitialData(extracted);
        } catch (err: any) {
          setError(err.message || 'Failed to load batch data');
        } finally {
          setLoading(false);
        }
      };
      
      fetchBatch();
    }
  }, [isInstructor, batchId]);

  if (isInstructor === null || (isInstructor && loading)) {
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

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex flex-col justify-center items-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-slate-600">{error}</p>
          <button onClick={() => router.push('/batches')} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full">
            Back to Batches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <BatchForm isEdit={true} initialData={initialData} />
    </div>
  );
}
