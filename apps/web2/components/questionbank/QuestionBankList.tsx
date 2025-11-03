"use client";

import { useState } from "react";
import { useQuestionBank } from "@/lib/hooks/useQuestionBank";
import { useClasses, useSubjects, useChapters } from "@/lib/hooks/useTaxonomy";
import type { QuestionBankFilters } from "@/lib/api/questionbank/questionbank";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";
import Image from "next/image";
import { PaginationControls } from "@/components/shared/PaginationControls";

export function QuestionBankList() {
  const [filters, setFilters] = useState<QuestionBankFilters>({});
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<
    string | undefined
  >();
  const [selectedChapterId, setSelectedChapterId] = useState<
    string | undefined
  >();
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: classes } = useClasses();
  const { data: subjects } = useSubjects(selectedClassId);
  const { data: chapters } = useChapters(selectedSubjectId);
  const { data: allItems, isLoading } = useQuestionBank({
    ...filters,
    classId: selectedClassId,
    subjectId: selectedSubjectId,
    chapterId: selectedChapterId,
  });

  // Client-side pagination (until backend supports it)
  const totalItems = allItems?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = allItems?.slice(startIndex, endIndex) || [];

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setPage(1);
  };

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
          <div className="grid gap-4 md:grid-cols-3">
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

      <Card>
        <CardHeader>
          <CardTitle>Question Bank Items ({totalItems})</CardTitle>
        </CardHeader>
        <CardContent>
          {items && items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Stem</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead>Correct</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Taxonomy</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">
                          {item.subjShortCode}
                          {item.seqNo
                            ? `-${item.seqNo.toString().padStart(4, "0")}`
                            : ""}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate">{item.stem}</div>
                        </TableCell>
                        <TableCell className="max-w-xs text-xs">
                          <div className="space-y-1">
                            <div>A: {item.optionA.slice(0, 30)}...</div>
                            <div>B: {item.optionB.slice(0, 30)}...</div>
                            <div>C: {item.optionC.slice(0, 30)}...</div>
                            <div>D: {item.optionD.slice(0, 30)}...</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.correctOption.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.difficulty === "easy"
                                ? "default"
                                : item.difficulty === "medium"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {item.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.class?.displayName} / {item.subject?.name} /{" "}
                          {item.chapter?.name}
                        </TableCell>
                        <TableCell>
                          {item.pageImageUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setViewingImage(item.pageImageUrl || null)
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-6">
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
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
              <p className="text-muted-foreground">
                No questions in Question Bank
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
