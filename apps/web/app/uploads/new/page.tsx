"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UploadForm } from "@/components/upload/UploadForm";

export default function NewUploadPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Upload PDF</h1>
          <UploadForm />
        </div>
      </div>
    </ProtectedRoute>
  );
}
