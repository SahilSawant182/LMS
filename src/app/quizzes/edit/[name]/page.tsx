"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { CreateQuizContent } from "@/app/quizzes/create/page";
import { Loader2 } from "lucide-react";

function EditQuizWrapper() {
  const params = useParams();
  const quizName = (params?.name as string) || "";

  return <CreateQuizContent initialQuizName={quizName} />;
}

export default function EditQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F172A] flex justify-center items-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs text-slate-400">Loading Quiz Editor...</p>
          </div>
        </div>
      }
    >
      <EditQuizWrapper />
    </Suspense>
  );
}
