"use client";

import React from "react";
import { useQuestion, useBulkActionQuestions } from "@/lib/hooks/useQuestion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, AlertCircle, Clock, Eye } from "lucide-react";
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

interface QuestionDetailModalProps {
  questionId: string;
  onClose: () => void;
}

export function QuestionDetailModal({
  questionId,
  onClose,
}: QuestionDetailModalProps) {
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
          // After delete, close modal
          if (action === "delete") {
            onClose();
          }
        },
      }
    );
  };

  return (
    <>
      <Dialog open={!!questionId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-7xl sm:max-w-7xl! w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <div className="py-8">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !question ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Question not found</p>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Question ID
                  </label>
                  <p className="font-mono text-xs mt-1">{question.id}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Status
                    </label>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const StatusIcon = statusIcons[question.status];
                        return (
                          <>
                            <StatusIcon className="h-4 w-4" />
                            <Badge
                              className="capitalize"
                              variant={statusColors[question.status]}
                            >
                              {question.status.replace("_", " ")}
                            </Badge>
                            {question.isLockedAfterAdd && (
                              <Badge className="capitalize" variant="secondary">
                                Locked
                              </Badge>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
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
                        className="min-w-8 capitalize"
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
                        className="min-w-8"
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
                        className="min-w-8"
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
                        className="min-w-8"
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
                        size="sm"
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
                      size="sm"
                      onClick={() => setEditingQuestion(true)}
                      disabled={
                        question.isLockedAfterAdd || bulkAction.isPending
                      }
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
                          question.isLockedAfterAdd ||
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
                          question.status === "rejected"
                            ? "destructive"
                            : "outline"
                        }
                        onClick={() => handleAction("reject")}
                        disabled={
                          question.isLockedAfterAdd ||
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
                          question.status === "needs_fix"
                            ? "secondary"
                            : "outline"
                        }
                        onClick={() => handleAction("needs_fix")}
                        disabled={
                          question.isLockedAfterAdd ||
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
                        disabled={
                          question.isLockedAfterAdd || bulkAction.isPending
                        }
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAction("publish")}
                        disabled={
                          question.isLockedAfterAdd ||
                          bulkAction.isPending ||
                          question.status !== "approved"
                        }
                      >
                        Publish to Bank
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-6">
                <h3 className="text-lg font-semibold mb-4">Metadata</h3>

                {/* First row: Class, Subject, Chapter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Class
                    </label>
                    <p className="mt-1">
                      {question.class?.displayName || "N/A"}
                    </p>
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
                </div>

                {/* Second row: Page Number, Line Index, Upload */}
                {question.page && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Upload
                      </label>
                      <p className="mt-1 font-mono text-xs">
                        {question.page.upload?.originalFilename || "N/A"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Third row: Language, Difficulty */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <Badge variant="outline" className="capitalize">
                          {question.difficulty}
                        </Badge>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editingQuestion && question && (
        <QuestionEditor
          questionId={question.id}
          onClose={() => setEditingQuestion(false)}
        />
      )}

      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
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
    </>
  );
}
