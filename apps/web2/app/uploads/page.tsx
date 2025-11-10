"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useUploads, useDeleteChapter } from "@/lib/hooks/useUpload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2Icon, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import type { UploadListItem } from "@/lib/api/upload/upload";

const statusBadgeVariants = {
  pending: "secondary",
  processing: "default",
  completed: "default",
  failed: "destructive",
  partial: "secondary",
} as const;

export default function UploadsPage() {
  const router = useRouter();
  const { data: uploads, isLoading } = useUploads();
  const deleteChapter = useDeleteChapter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingChapter, setDeletingChapter] = useState<{
    chapterId: string;
    chapterName: string;
  } | null>(null);

  const totalItems = uploads?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (!uploads || uploads.length === 0) {
      setPage(1);
      return;
    }

    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [uploads, page, pageSize, totalPages]);

  const paginatedUploads = useMemo(() => {
    if (!uploads) return [];
    const start = (page - 1) * pageSize;
    return uploads.slice(start, start + pageSize);
  }, [uploads, page, pageSize]);

  const handleRowClick = (uploadId: string) => {
    router.push(`/uploads/${uploadId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, upload: UploadListItem) => {
    e.stopPropagation(); // Prevent row click
    if (upload.chapterId && upload.chapter) {
      setDeletingChapter({
        chapterId: upload.chapterId,
        chapterName: upload.chapter,
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingChapter) {
      deleteChapter.mutate(deletingChapter.chapterId, {
        onSuccess: () => {
          setDeletingChapter(null);
        },
      });
    }
  };

  const TableSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Chapter</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: pageSize }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <ProtectedRoute requireAuth={true}>
        <div className="container mx-auto py-8 px-4">
          <TableSkeleton />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Uploads</h1>
            <Link href="/uploads/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Upload
              </Button>
            </Link>
          </div>

          {uploads && uploads.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Chapter</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUploads.map((upload) => (
                    <TableRow
                      key={upload.id}
                      onClick={() => handleRowClick(upload.id)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        {upload.originalFilename}
                      </TableCell>
                      <TableCell>{upload.classLevel || "-"}</TableCell>
                      <TableCell>{upload.subject || "-"}</TableCell>
                      <TableCell>{upload.chapter || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>
                            {upload.completedPages}/{upload.pagesCount}
                          </span>
                          {upload.processingPages > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Loader2Icon className="h-3 w-3 animate-spin" />
                              <span>{upload.processingPages} processing</span>
                            </div>
                          )}
                          {upload.failedPages > 0 && (
                            <span className="text-xs text-destructive">
                              {upload.failedPages} failed
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            statusBadgeVariants[
                              upload.status as keyof typeof statusBadgeVariants
                            ] || "secondary"
                          }
                          className="capitalize"
                        >
                          {upload.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(upload.createdAt),
                          "MMM dd, yyyy HH:mm"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {upload.chapterId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteClick(e, upload)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border p-12 text-center">
              <p className="text-muted-foreground mb-4">No uploads found</p>
              <Link href="/uploads/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Your First PDF
                </Button>
              </Link>
            </div>
          )}

          {uploads && uploads.length > 0 && (
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}

          <DeleteConfirmationDialog
            open={!!deletingChapter}
            onOpenChange={(open) => !open && setDeletingChapter(null)}
            onConfirm={handleDeleteConfirm}
            title="Delete Chapter"
            description={`Are you sure you want to delete the chapter "${deletingChapter?.chapterName}"? This will permanently delete the chapter, all associated uploads, pages, questions, and S3 files. This action cannot be undone.`}
            isLoading={deleteChapter.isPending}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
