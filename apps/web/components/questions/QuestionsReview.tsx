"use client";

import { useState } from "react";
import { useQuestions, useBulkActionQuestions } from "@/lib/hooks/useQuestion";
import { useClasses, useSubjects, useChapters } from "@/lib/hooks/useTaxonomy";
import type { QuestionFilters } from "@/lib/api/question/question";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { CheckCircle2, XCircle, AlertCircle, Clock, Eye } from "lucide-react";
import { QuestionEditor } from "./QuestionEditor";
import { QuestionDetailModal } from "./QuestionDetailModal";
import Image from "next/image";

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

export function QuestionsReview() {
  const [filters, setFilters] = useState<QuestionFilters>({
    status: undefined,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<
    string | undefined
  >();
  const [selectedChapterId, setSelectedChapterId] = useState<
    string | undefined
  >();
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const { data: classes } = useClasses();
  const { data: subjects } = useSubjects(selectedClassId);
  const { data: chapters } = useChapters(selectedSubjectId);
  const { data: questionsResponse, isLoading } = useQuestions({
    ...filters,
    classId: selectedClassId,
    subjectId: selectedSubjectId,
    chapterId: selectedChapterId,
    page,
    pageSize,
  });
  const bulkAction = useBulkActionQuestions();

  const questions = questionsResponse?.data || [];
  const pagination = questionsResponse?.pagination;

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setPage(1);
    setSelectedQuestionIds(new Set());
  };

  const handleStatusFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status:
        value === "all" ? undefined : (value as QuestionFilters["status"]),
    }));
    handleFilterChange();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && questions) {
      setSelectedQuestionIds(new Set(questions.map((q) => q.id)));
    } else {
      setSelectedQuestionIds(new Set());
    }
  };

  const handleSelectQuestion = (questionId: string, checked: boolean) => {
    const newSet = new Set(selectedQuestionIds);
    if (checked) {
      newSet.add(questionId);
    } else {
      newSet.delete(questionId);
    }
    setSelectedQuestionIds(newSet);
  };

  const handleBulkAction = (
    action: "approve" | "reject" | "needs_fix" | "delete" | "publish"
  ) => {
    if (selectedQuestionIds.size === 0) {
      return;
    }
    bulkAction.mutate(
      {
        questionIds: Array.from(selectedQuestionIds),
        action,
      },
      {
        onSuccess: () => {
          setSelectedQuestionIds(new Set());
        },
      }
    );
  };

  const allSelected =
    questions &&
    questions.length > 0 &&
    selectedQuestionIds.size === questions.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.status || "all"}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_checked">Not Checked</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="needs_fix">Needs Fix</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Class</label>
              <Select
                value={selectedClassId?.toString() || "all"}
                onValueChange={(value) => {
                  setSelectedClassId(
                    value === "all" ? undefined : parseInt(value, 10)
                  );
                  setSelectedSubjectId(undefined);
                  setSelectedChapterId(undefined);
                  handleFilterChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Select
                value={selectedSubjectId || "all"}
                onValueChange={(value) => {
                  setSelectedSubjectId(value === "all" ? undefined : value);
                  setSelectedChapterId(undefined);
                  handleFilterChange();
                }}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Chapter</label>
              <Select
                value={selectedChapterId || "all"}
                onValueChange={(value) => {
                  setSelectedChapterId(value === "all" ? undefined : value);
                  handleFilterChange();
                }}
                disabled={!selectedSubjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chapters</SelectItem>
                  {chapters?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedQuestionIds.size > 0 && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedQuestionIds.size} question(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("approve")}
                  disabled={bulkAction.isPending}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("reject")}
                  disabled={bulkAction.isPending}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("needs_fix")}
                  disabled={bulkAction.isPending}
                >
                  Needs Fix
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("delete")}
                  disabled={bulkAction.isPending}
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBulkAction("publish")}
                  disabled={bulkAction.isPending}
                >
                  Publish to Bank
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Questions ({pagination?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {questions && questions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      {/* <TableHead>ID</TableHead> */}
                      <TableHead>Stem</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead>Correct</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Taxonomy</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question) => {
                      const StatusIcon = statusIcons[question.status];
                      const isLocked = question.isLockedAfterAdd;
                      const isSelected = selectedQuestionIds.has(question.id);

                      return (
                        <TableRow
                          key={question.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={(e) => {
                            // Don't open modal if clicking checkbox or buttons
                            if (
                              (e.target as HTMLElement).closest(
                                'input[type="checkbox"], button'
                              )
                            ) {
                              return;
                            }
                            setViewingQuestion(question.id);
                          }}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleSelectQuestion(
                                  question.id,
                                  checked as boolean
                                )
                              }
                              aria-label={`Select ${question.id}`}
                            />
                          </TableCell>
                          {/* <TableCell className="font-mono text-xs">
                            {question.id.slice(0, 8)}...
                          </TableCell> */}
                          <TableCell className="max-w-lg">
                            <div className="truncate text-xs">
                              {question.stem}
                            </div>
                            {isLocked && (
                              <Badge
                                variant="secondary"
                                className="mt-1 text-xs"
                              >
                                Locked
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-md text-xs">
                            <div className="space-y-1">
                              <div>A: {question.optionA.slice(0, 60)}</div>
                              <div>B: {question.optionB.slice(0, 60)}</div>
                              <div>C: {question.optionC.slice(0, 60)}</div>
                              <div>D: {question.optionD.slice(0, 60)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {question.correctOption.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusIcon className="h-4 w-4" />
                              <Badge
                                className="capitalize"
                                variant={statusColors[question.status]}
                              >
                                {question.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[20px] text-xs">
                            {question.class?.displayName} <br />{" "}
                            {question.subject?.name} <br />{" "}
                            {question.chapter?.name}
                            <br />
                            Page: {question.page?.pageNumber}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              {question.page?.pngUrl && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setViewingImage(
                                      question.page?.pngUrl || null
                                    )
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingQuestion(question.id)}
                                disabled={isLocked}
                              >
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {pagination && (
                <div className="mt-6">
                  <PaginationControls
                    currentPage={page}
                    totalPages={pagination.totalPages}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(newPageSize) => {
                      setPageSize(newPageSize);
                      setPage(1);
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No questions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {editingQuestion && (
        <QuestionEditor
          questionId={editingQuestion}
          onClose={() => setEditingQuestion(null)}
        />
      )}

      {viewingQuestion && (
        <QuestionDetailModal
          questionId={viewingQuestion}
          onClose={() => setViewingQuestion(null)}
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
    </>
  );
}
