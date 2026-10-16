"use client";

// Re-export BatchDetailsPage so both `/batches/:batchId` and `/batch/:batchId` work seamlessly
export { default } from "@/app/batch/[batchId]/page";
