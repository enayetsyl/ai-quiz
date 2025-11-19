"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QuestionsReview } from "@/components/questions/QuestionsReview";

export default function QuestionsPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-4 sm:py-8 px-4">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Question Review</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Review, edit, and approve generated questions
          </p>
        </div>
        <QuestionsReview />
      </div>
    </ProtectedRoute>
  );
}
