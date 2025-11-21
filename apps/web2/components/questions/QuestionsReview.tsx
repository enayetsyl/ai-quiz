"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  Download,
} from "lucide-react";
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
  const [pageSize, setPageSize] = useState(100);
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
  const shouldAdjustPaginationAfterBulkAction = useRef(false);

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
  const downloadSelected = async (
    variant: "full" | "stem_options" = "full"
  ) => {
    const ids = Array.from(selectedQuestionIds);
    const blob = await (
      await import("@/lib/api/question/question")
    ).questionApi.exportQuestions({
      ids: ids.length > 0 ? ids : undefined,
      filters:
        ids.length === 0
          ? {
              ...filters,
              classId: selectedClassId,
              subjectId: selectedSubjectId,
              chapterId: selectedChapterId,
            }
          : undefined,
      variant,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `questions_${variant === "full" ? "full" : "qo"}_${ts}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Backend now handles filtering, so we can use the data directly
  const questions = questionsResponse?.data || [];
  const pagination = questionsResponse?.pagination;

  // Ensure current page is within available total pages (after bulk actions or filter changes)
  useEffect(() => {
    if (!pagination) return;
    const totalPages = Math.max(1, pagination.totalPages || 1);
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [pagination?.totalPages, page]);

  // If current page is empty after bulk action, navigate to a page with content
  // Only adjust pagination after bulk actions, not on manual page navigation
  useEffect(() => {
    if (
      shouldAdjustPaginationAfterBulkAction.current &&
      !isLoading &&
      questions.length === 0 &&
      pagination
    ) {
      // Only adjust if we just completed a bulk action
      if (page > 1) {
        // Try going to page 1 first to see if there are any unapproved questions there
        setPage(1);
      } else if (page === 1 && pagination.totalPages > 1) {
        // If page 1 is empty but there are more pages, go to the last page
        const totalPages = Math.max(1, pagination.totalPages || 1);
        setPage(totalPages);
      }
      // Reset the flag after adjusting
      shouldAdjustPaginationAfterBulkAction.current = false;
    }
  }, [questions.length, isLoading, pagination, page]);

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
          // Set flag to adjust pagination after bulk action completes
          // This will trigger the useEffect to check if current page is empty
          shouldAdjustPaginationAfterBulkAction.current = true;
        },
      }
    );
  };

  const allSelected =
    questions &&
    questions.length > 0 &&
    selectedQuestionIds.size === questions.length;

  const TableSkeleton = () => (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Stem</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead>Correct</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Taxonomy</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-64" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-12" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-sm font-medium">
                {selectedQuestionIds.size} question(s) selected
              </span>
              <div className="flex flex-wrap gap-2">
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadSelected("full")}
                >
                  <Download className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Word (Full)</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadSelected("stem_options")}
                >
                  <Download className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Word (Q + Options)</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {questions && questions.length > 0 ? (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
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
                        <TableHead className="min-w-[200px]">Stem</TableHead>
                        <TableHead className="min-w-[180px]">Options</TableHead>
                        <TableHead className="min-w-[80px]">Correct</TableHead>
                        <TableHead className="min-w-[120px]">Status</TableHead>
                        <TableHead className="min-w-[150px]">Taxonomy</TableHead>
                        <TableHead className="min-w-[200px]">Actions</TableHead>
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
                              <div className="truncate text-xs sm:text-sm">
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
                                <div className="truncate">A: {question.optionA.slice(0, 60)}</div>
                                <div className="truncate">B: {question.optionB.slice(0, 60)}</div>
                                <div className="truncate">C: {question.optionC.slice(0, 60)}</div>
                                <div className="truncate">D: {question.optionD.slice(0, 60)}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {question.correctOption.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusIcon className="h-4 w-4 flex-shrink-0" />
                                <Badge
                                  className="capitalize text-xs"
                                  variant={statusColors[question.status]}
                                >
                                  {question.status.replace("_", " ")}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[20px] text-xs">
                              <div className="space-y-0.5">
                                <div>{question.class?.displayName}</div>
                                <div>{question.subject?.name}</div>
                                <div>{question.chapter?.name}</div>
                                <div>Page: {question.page?.pageNumber}</div>
                                <div>Line: {question.lineIndex}</div>
                              </div>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1 sm:gap-2 flex-wrap">
                                {question.page?.pngUrl && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setViewingImage(
                                        question.page?.pngUrl || null
                                      )
                                    }
                                    className="h-8 w-8 p-0"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingQuestion(question.id)}
                                  disabled={isLocked}
                                  className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label="Download (Full)"
                                  title="Download (Full)"
                                  onClick={async () => {
                                    const blob = await (
                                      await import("@/lib/api/question/question")
                                    ).questionApi.exportQuestions({
                                      ids: [question.id],
                                      variant: "full",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `question_${question.id}.doc`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label="Download (Q + Options)"
                                  title="Download (Q + Options)"
                                  onClick={async () => {
                                    const blob = await (
                                      await import("@/lib/api/question/question")
                                    ).questionApi.exportQuestions({
                                      ids: [question.id],
                                      variant: "stem_options",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `question_${question.id}_qo.doc`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
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
