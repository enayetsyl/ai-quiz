"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuestion, useBulkActionQuestions } from "@/lib/hooks/useQuestion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  Eye,
} from "lucide-react";
import Image from "next/image";
import { QuestionEditor } from "./QuestionEditor";

const statusIcons = {
  not_checked: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  needs_fix: AlertCircle,
};

const statusColors = {
  not_checked: "secondary",
  approved: "default",
  rejected: "destructive",
  needs_fix: "secondary",
} as const;

interface QuestionDetailProps {
  questionId: string;
}

export function QuestionDetail({ questionId }: QuestionDetailProps) {
  const router = useRouter();
  const { data: question, isLoading } = useQuestion(questionId);
  const bulkAction = useBulkActionQuestions();
  const [editingQuestion, setEditingQuestion] = React.useState(false);
  const [viewingImage, setViewingImage] = React.useState<string | null>(null);

  const handleAction = (
    action: "approve" | "reject" | "needs_fix" | "delete" | "publish"
  ) => {
    if (!question) return;

    bulkAction.mutate(
      {
        questionIds: [question.id],
        action,
      },
      {
        onSuccess: () => {
          // After delete, redirect to questions list
          if (action === "delete") {
            router.push("/questions");
          }
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Question not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/questions")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Questions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusIcons[question.status];
  const isLocked = question.isLockedAfterAdd;

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push("/questions")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Questions
      </Button>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Question Details</CardTitle>
              <div className="flex items-center gap-2">
                <StatusIcon className="h-5 w-5" />
                <Badge variant={statusColors[question.status]}>
                  {question.status.replace("_", " ")}
                </Badge>
                {isLocked && <Badge variant="secondary">Locked</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Question ID
              </label>
              <p className="font-mono text-xs mt-1">{question.id}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Stem
              </label>
              <p className="mt-2">{question.stem}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Options
              </label>
              <div className="mt-2 space-y-2">
                <div className="flex items-start gap-2">
                  <Badge
                    variant={
                      question.correctOption === "a" ? "default" : "outline"
                    }
                    className="min-w-[2rem]"
                  >
                    A
                  </Badge>
                  <p className="flex-1">{question.optionA}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge
                    variant={
                      question.correctOption === "b" ? "default" : "outline"
                    }
                    className="min-w-[2rem]"
                  >
                    B
                  </Badge>
                  <p className="flex-1">{question.optionB}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge
                    variant={
                      question.correctOption === "c" ? "default" : "outline"
                    }
                    className="min-w-[2rem]"
                  >
                    C
                  </Badge>
                  <p className="flex-1">{question.optionC}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge
                    variant={
                      question.correctOption === "d" ? "default" : "outline"
                    }
                    className="min-w-[2rem]"
                  >
                    D
                  </Badge>
                  <p className="flex-1">{question.optionD}</p>
                </div>
              </div>
            </div>

            {question.explanation && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Explanation
                </label>
                <p className="mt-2">{question.explanation}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {question.page?.pngUrl && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setViewingImage(question.page?.pngUrl || null)
                    }
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Page Image
                  </Button>
                )}
                <Button
                  variant="default"
                  onClick={() => setEditingQuestion(true)}
                  disabled={isLocked || bulkAction.isPending}
                >
                  Edit Question
                </Button>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Actions
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={
                      question.status === "approved" ? "default" : "outline"
                    }
                    onClick={() => handleAction("approve")}
                    disabled={
                      isLocked ||
                      bulkAction.isPending ||
                      question.status === "approved"
                    }
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      question.status === "rejected" ? "destructive" : "outline"
                    }
                    onClick={() => handleAction("reject")}
                    disabled={
                      isLocked ||
                      bulkAction.isPending ||
                      question.status === "rejected"
                    }
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      question.status === "needs_fix" ? "secondary" : "outline"
                    }
                    onClick={() => handleAction("needs_fix")}
                    disabled={
                      isLocked ||
                      bulkAction.isPending ||
                      question.status === "needs_fix"
                    }
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Needs Fix
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("delete")}
                    disabled={isLocked || bulkAction.isPending}
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAction("publish")}
                    disabled={
                      isLocked ||
                      bulkAction.isPending ||
                      question.status !== "approved"
                    }
                  >
                    Publish to Bank
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxonomy & Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Class
              </label>
              <p className="mt-1">{question.class?.displayName || "N/A"}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Subject
              </label>
              <p className="mt-1">{question.subject?.name || "N/A"}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Chapter
              </label>
              <p className="mt-1">{question.chapter?.name || "N/A"}</p>
            </div>

            {question.page && (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Page Number
                  </label>
                  <p className="mt-1">{question.page.pageNumber}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Line Index
                  </label>
                  <p className="mt-1">{question.lineIndex}</p>
                </div>

                {question.page.upload && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Upload
                    </label>
                    <p className="mt-1 font-mono text-xs">
                      {question.page.upload.originalFilename}
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Language
              </label>
              <p className="mt-1">
                <Badge variant="outline">
                  {question.language === "bn" ? "Bengali" : "English"}
                </Badge>
              </p>
            </div>

            {question.difficulty && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Difficulty
                </label>
                <p className="mt-1">
                  <Badge variant="outline">{question.difficulty}</Badge>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editingQuestion && (
        <QuestionEditor
          questionId={question.id}
          onClose={() => setEditingQuestion(false)}
        />
      )}

      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="max-w-4xl max-h-full">
            <Image
              src={viewingImage}
              alt="Page"
              width={1200}
              height={1600}
              className="max-w-full max-h-[90vh] object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
