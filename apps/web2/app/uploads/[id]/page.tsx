"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  useUploadStatus,
  useRequeueUpload,
  useRegeneratePage,
} from "@/lib/hooks/useUpload";
import {
  useRequeuePageGeneration,
  useRegeneratePageGeneration,
} from "@/lib/hooks/useGeneration";
import { PageAttemptsDialog } from "@/components/upload/PageAttemptsDialog";
import { UploadAttemptsDialog } from "@/components/upload/UploadAttemptsDialog";
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
import {
  RefreshCw,
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  FileText,
} from "lucide-react";

const statusIcons = {
  queued: ClockIcon,
  generating: Loader2Icon,
  complete: CheckCircle2Icon,
  failed: XCircleIcon,
  pending: ClockIcon,
} as const;

export default function UploadStatusPage() {
  const params = useParams();
  const uploadId = params.id as string;
  const { data: uploadStatus, isLoading, error } = useUploadStatus(uploadId);
  const requeueMutation = useRequeueUpload();
  const regenerateMutation = useRegeneratePage();
  const requeuePageGenerationMutation = useRequeuePageGeneration();
  const regeneratePageGenerationMutation = useRegeneratePageGeneration();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPageNumber, setSelectedPageNumber] = useState<number>(0);
  const [showUploadAttempts, setShowUploadAttempts] = useState(false);

  const handleRequeue = async () => {
    try {
      await requeueMutation.mutateAsync(uploadId);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRegeneratePage = async (pageId: string) => {
    try {
      await regenerateMutation.mutateAsync(pageId);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute requireAuth={true}>
        <div className="container mx-auto py-8 px-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !uploadStatus) {
    return (
      <ProtectedRoute requireAuth={true}>
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Not Found</CardTitle>
              <CardDescription>
                The upload you&apos;re looking for doesn&apos;t exist or failed
                to load.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  const completedPages = uploadStatus.pages.filter(
    (page) => page.status === "complete"
  ).length;
  const totalPages = uploadStatus.pagesCount || uploadStatus.pages.length;
  const progress = totalPages > 0 ? (completedPages / totalPages) * 100 : 0;

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Upload Status</h1>
              <p className="text-muted-foreground">
                Upload ID: <code className="text-xs">{uploadId}</code>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadAttempts(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                View Attempts
              </Button>
              <Button
                variant="outline"
                onClick={handleRequeue}
                disabled={requeueMutation.isPending}
              >
                {requeueMutation.isPending ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Requeuing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Requeue Upload
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>
                {completedPages} of {totalPages} pages completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div
                  className="bg-primary h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {progress.toFixed(1)}% complete
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pages</CardTitle>
              <CardDescription>
                {uploadStatus.pages.length} page
                {uploadStatus.pages.length !== 1 ? "s" : ""} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {uploadStatus.pages.map((page) => {
                  const StatusIcon =
                    statusIcons[page.status as keyof typeof statusIcons] ||
                    ClockIcon;
                  const isProcessing =
                    page.status === "queued" || page.status === "generating";

                  return (
                    <div
                      key={page.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon
                            className={`h-4 w-4 ${
                              isProcessing ? "animate-spin" : ""
                            }`}
                          />
                          <span className="font-medium">
                            Page {page.pageNumber}
                          </span>
                        </div>
                        <Badge
                          variant={
                            page.status === "complete"
                              ? "default"
                              : page.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {page.status}
                        </Badge>
                      </div>
                      {page.pngUrl && (
                        <div className="mt-2 relative w-full">
                          <Image
                            src={page.pngUrl}
                            alt={`Page ${page.pageNumber}`}
                            width={800}
                            height={1000}
                            className="w-full h-auto rounded border"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPageId(page.id);
                            setSelectedPageNumber(page.pageNumber);
                          }}
                          className="w-full"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Attempts
                        </Button>
                        <div className="flex gap-2">
                          {page.status === "failed" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRegeneratePage(page.id)}
                                disabled={
                                  regenerateMutation.isPending ||
                                  regeneratePageGenerationMutation.isPending
                                }
                                className="flex-1"
                                title="Regenerate via Upload API"
                              >
                                {regenerateMutation.isPending ? (
                                  <>
                                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                    Regenerating...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Regenerate
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await regeneratePageGenerationMutation.mutateAsync(
                                      { pageId: page.id }
                                    );
                                  } catch {
                                    // Error handled by mutation
                                  }
                                }}
                                disabled={
                                  regenerateMutation.isPending ||
                                  regeneratePageGenerationMutation.isPending
                                }
                                className="flex-1"
                                title="Regenerate via Generation API (hard-replace)"
                              >
                                {regeneratePageGenerationMutation.isPending ? (
                                  <>
                                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                    Regenerating...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Hard Reset
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          {(page.status === "queued" ||
                            page.status === "generating" ||
                            page.status === "pending") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await requeuePageGenerationMutation.mutateAsync(
                                    { pageId: page.id }
                                  );
                                } catch {
                                  // Error handled by mutation
                                }
                              }}
                              disabled={requeuePageGenerationMutation.isPending}
                              className="w-full"
                            >
                              {requeuePageGenerationMutation.isPending ? (
                                <>
                                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                  Requeuing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Requeue Generation
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <PageAttemptsDialog
            pageId={selectedPageId}
            pageNumber={selectedPageNumber}
            open={!!selectedPageId}
            onOpenChange={(open) => !open && setSelectedPageId(null)}
          />

          <UploadAttemptsDialog
            uploadId={uploadId}
            open={showUploadAttempts}
            onOpenChange={setShowUploadAttempts}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
