"use client";

import { useEffect, useState } from "react";
import {
  adminApi,
  type PageGenerationAttempt,
  type AdminFilters,
} from "@/lib/api/admin/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaginationControls } from "@/components/shared/PaginationControls";

export function PageGenerationAttempts() {
  const [attempts, setAttempts] = useState<PageGenerationAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAttempt, setSelectedAttempt] =
    useState<PageGenerationAttempt | null>(null);
  const [filters, setFilters] = useState<AdminFilters>({
    page: 1,
    pageSize: 20,
  });

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        setLoading(true);
        const result = await adminApi.getPageGenerationAttempts(filters);
        setAttempts(result?.data || []);
        setTotalPages(result?.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Failed to fetch attempts:", error);
        setAttempts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, [filters]);

  const handleFilterChange = (
    key: keyof AdminFilters,
    value: AdminFilters[keyof AdminFilters]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex gap-4 mb-4 flex-wrap">
          <Input
            placeholder="Filter by model..."
            value={filters.model || ""}
            onChange={(e) => handleFilterChange("model", e.target.value)}
            className="max-w-xs"
          />
          <select
            value={
              filters.isSuccess === undefined
                ? "all"
                : filters.isSuccess
                ? "success"
                : "failed"
            }
            onChange={(e) => {
              const value =
                e.target.value === "all"
                  ? undefined
                  : e.target.value === "success";
              handleFilterChange("isSuccess", value);
            }}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Attempt #</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Upload</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                  </TableRow>
                ))
              ) : attempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No attempts found
                  </TableCell>
                </TableRow>
              ) : (
                attempts.map((attempt) => (
                  <TableRow
                    key={attempt.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedAttempt(attempt)}
                  >
                    <TableCell>{attempt.attemptNo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{attempt.model}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={attempt.isSuccess ? "default" : "destructive"}
                      >
                        {attempt.isSuccess ? "Success" : "Failed"}
                      </Badge>
                    </TableCell>
                    <TableCell>{attempt.page?.pageNumber || "N/A"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {attempt.page?.upload?.originalFilename || "N/A"}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                      {attempt.errorMessage || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(attempt.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && (
          <div className="p-4 border-t">
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              pageSize={filters.pageSize || 20}
              onPageChange={(newPage) => {
                setPage(newPage);
                setFilters((prev) => ({ ...prev, page: newPage }));
              }}
              onPageSizeChange={(newPageSize) => {
                handleFilterChange("pageSize", newPageSize);
              }}
            />
          </div>
        )}
      </Card>

      <Dialog
        open={!!selectedAttempt}
        onOpenChange={(open) => !open && setSelectedAttempt(null)}
      >
        <DialogContent className="max-w-7xl sm:max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Page Generation Attempt Details</DialogTitle>
            <DialogDescription>
              Detailed information about this generation attempt
            </DialogDescription>
          </DialogHeader>
          {selectedAttempt && (
            <div className="space-y-6 mt-4">
              {/* Basic Information */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Attempt ID
                    </label>
                    <p className="font-mono text-sm">{selectedAttempt.id}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Attempt Number
                    </label>
                    <p className="font-medium">{selectedAttempt.attemptNo}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Status
                    </label>
                    <div>
                      <Badge
                        variant={
                          selectedAttempt.isSuccess ? "default" : "destructive"
                        }
                      >
                        {selectedAttempt.isSuccess ? "Success" : "Failed"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Model
                    </label>
                    <p className="font-medium">{selectedAttempt.model}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Prompt Version
                    </label>
                    <p className="font-medium">
                      {selectedAttempt.promptVersion}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Created At
                    </label>
                    <p className="text-sm">
                      {new Date(selectedAttempt.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Page Information */}
              {selectedAttempt.page && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Page Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Page ID
                      </label>
                      <p className="font-mono text-sm">
                        {selectedAttempt.page.id}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Page Number
                      </label>
                      <p className="font-medium">
                        {selectedAttempt.page.pageNumber}
                      </p>
                    </div>
                    {selectedAttempt.page.upload && (
                      <>
                        <div>
                          <label className="text-sm text-muted-foreground">
                            Upload ID
                          </label>
                          <p className="font-mono text-sm">
                            {selectedAttempt.page.upload.id}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">
                            Original Filename
                          </label>
                          <p className="font-medium">
                            {selectedAttempt.page.upload.originalFilename}
                          </p>
                        </div>
                        {selectedAttempt.page.upload.class && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              Class
                            </label>
                            <p className="font-medium">
                              {selectedAttempt.page.upload.class.displayName}
                            </p>
                          </div>
                        )}
                        {selectedAttempt.page.upload.subject && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              Subject
                            </label>
                            <p className="font-medium">
                              {selectedAttempt.page.upload.subject.name}
                            </p>
                          </div>
                        )}
                        {selectedAttempt.page.upload.chapter && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              Chapter
                            </label>
                            <p className="font-medium">
                              {selectedAttempt.page.upload.chapter.name}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {selectedAttempt.errorMessage && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Error Message</h3>
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">
                      {selectedAttempt.errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Request Excerpt */}
              {selectedAttempt.requestExcerpt && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Request Excerpt</h3>
                  <div className="p-4 bg-muted rounded-md">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                      {(() => {
                        try {
                          const parsed = JSON.parse(
                            selectedAttempt.requestExcerpt || "{}"
                          );
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return selectedAttempt.requestExcerpt;
                        }
                      })()}
                    </pre>
                  </div>
                </div>
              )}

              {/* Response Excerpt */}
              {selectedAttempt.responseExcerpt && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Response Excerpt</h3>
                  <div className="p-4 bg-muted rounded-md">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                      {(() => {
                        try {
                          const parsed = JSON.parse(
                            selectedAttempt.responseExcerpt || "{}"
                          );
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return selectedAttempt.responseExcerpt;
                        }
                      })()}
                    </pre>
                  </div>
                </div>
              )}

              {/* LLM Usage Events */}
              {selectedAttempt.llmUsageEvents &&
                selectedAttempt.llmUsageEvents.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">LLM Usage Events</h3>
                    <div className="space-y-2">
                      {selectedAttempt.llmUsageEvents.map((event, idx) => (
                        <div
                          key={event.id || idx}
                          className="p-4 border rounded-md"
                        >
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <label className="text-muted-foreground">
                                Tokens In:
                              </label>
                              <p className="font-medium">
                                {event.tokensIn ?? "N/A"}
                              </p>
                            </div>
                            <div>
                              <label className="text-muted-foreground">
                                Tokens Out:
                              </label>
                              <p className="font-medium">
                                {event.tokensOut ?? "N/A"}
                              </p>
                            </div>
                            <div>
                              <label className="text-muted-foreground">
                                Estimated Cost:
                              </label>
                              <p className="font-medium">
                                {event.estimatedCostUsd
                                  ? `$${Number(event.estimatedCostUsd).toFixed(
                                      6
                                    )}`
                                  : "N/A"}
                              </p>
                            </div>
                            <div>
                              <label className="text-muted-foreground">
                                Created At:
                              </label>
                              <p className="font-medium">
                                {new Date(event.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
