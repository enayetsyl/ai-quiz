"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useUploads } from "@/lib/hooks/useUpload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function GenerationPage() {
  const { data: uploads, isLoading } = useUploads();

  if (isLoading) {
    return (
      <ProtectedRoute requireAuth={true}>
        <div className="container mx-auto py-8 px-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </ProtectedRoute>
    );
  }

  // Filter uploads that have pages in generation state
  const uploadsWithGeneration =
    uploads?.filter(
      (upload) =>
        upload.status === "processing" ||
        upload.status === "partial" ||
        upload.processingPages > 0
    ) || [];

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Generation Management</h1>
            <p className="text-muted-foreground">
              Monitor and manage page generation jobs across all uploads
            </p>
          </div>

          {uploadsWithGeneration.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {uploadsWithGeneration.map((upload) => (
                <Card key={upload.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {upload.originalFilename}
                      </CardTitle>
                      <Badge
                        variant={
                          upload.status === "processing"
                            ? "default"
                            : upload.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {upload.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {upload.classLevel && upload.subject && upload.chapter
                        ? `${upload.classLevel} > ${upload.subject} > ${upload.chapter}`
                        : "No taxonomy info"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span>
                          {upload.completedPages}/{upload.pagesCount}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              upload.pagesCount > 0
                                ? (upload.completedPages / upload.pagesCount) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      {upload.processingPages > 0 && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                          <span>{upload.processingPages} processing</span>
                        </div>
                      )}
                      {upload.failedPages > 0 && (
                        <div className="flex items-center gap-2 text-destructive">
                          <span>{upload.failedPages} failed</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {format(new Date(upload.createdAt), "MMM dd, yyyy HH:mm")}
                    </div>

                    <Link href={`/uploads/${upload.id}`}>
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No active generation jobs
                </p>
                <Link href="/uploads">
                  <Button variant="outline">View All Uploads</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
