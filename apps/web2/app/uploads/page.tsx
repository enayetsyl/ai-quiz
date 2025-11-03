"use client";

import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useUploads } from "@/lib/hooks/useUpload";
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
import { Plus, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

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

  const handleRowClick = (uploadId: string) => {
    router.push(`/uploads/${uploadId}`);
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireAuth={true}>
        <div className="container mx-auto py-8 px-4">
          <div className="space-y-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-64 w-full" />
          </div>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map((upload) => (
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
        </div>
      </div>
    </ProtectedRoute>
  );
}
