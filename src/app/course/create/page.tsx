import React from 'react';
import Navbar from '@/components/Navbar';
import CourseForm from '@/components/admin/CourseForm';

export default function CreateCoursePage() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      <Navbar />
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <CourseForm />
      </div>
    </div>
  );
}
