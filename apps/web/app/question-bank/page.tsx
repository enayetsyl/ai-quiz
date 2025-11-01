"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QuestionBankList } from "@/components/questionbank/QuestionBankList";

export default function QuestionBankPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground mt-2">
            Published questions ready for use
          </p>
        </div>
        <QuestionBankList />
      </div>
    </ProtectedRoute>
  );
}
