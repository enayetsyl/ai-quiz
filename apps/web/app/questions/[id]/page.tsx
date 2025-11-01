"use client";

import { use } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QuestionDetail } from "@/components/questions/QuestionDetail";

export default function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <ProtectedRoute>
      <QuestionDetail questionId={id} />
    </ProtectedRoute>
  );
}
