"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QuestionsReview } from "@/components/questions/QuestionsReview";

export default function QuestionsPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Question Review</h1>
          <p className="text-muted-foreground mt-2">
            Review, edit, and approve generated questions
          </p>
        </div>
        <QuestionsReview />
      </div>
    </ProtectedRoute>
  );
}
