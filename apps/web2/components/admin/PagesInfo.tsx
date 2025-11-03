"use client";

import { useEffect, useState } from "react";
import {
  adminApi,
  type PageInfo,
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
import { PaginationControls } from "@/components/shared/PaginationControls";

export function PagesInfo() {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<AdminFilters>({
    page: 1,
    pageSize: 20,
  });

  useEffect(() => {
    const fetchPages = async () => {
      try {
        setLoading(true);
        const result = await adminApi.getPages(filters);
        setPages(result?.data || []);
        setTotalPages(result?.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Failed to fetch pages:", error);
        setPages([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [filters]);


  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Upload</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Chapter</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Last Generated</TableHead>
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
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                </TableRow>
              ))
            ) : pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  No pages found
                </TableCell>
              </TableRow>
            ) : (
              pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell>{page.pageNumber}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        page.status === "complete"
                          ? "default"
                          : page.status === "failed"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {page.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {page.upload?.originalFilename || "N/A"}
                  </TableCell>
                  <TableCell>
                    {page.upload?.class?.displayName || "N/A"}
                  </TableCell>
                  <TableCell>{page.upload?.subject?.name || "N/A"}</TableCell>
                  <TableCell>{page.upload?.chapter?.name || "N/A"}</TableCell>
                  <TableCell>
                    {page.questions
                      ? page.questions.length
                      : page._count?.questions || 0}
                  </TableCell>
                  <TableCell>
                    {page.pageGenerationAttempts
                      ? page.pageGenerationAttempts.length
                      : page._count?.pageGenerationAttempts || 0}
                  </TableCell>
                  <TableCell className="text-sm">
                    {page.lastGeneratedAt
                      ? new Date(page.lastGeneratedAt).toLocaleString()
                      : "-"}
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
              setFilters((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }));
              setPage(1);
            }}
          />
        </div>
      )}
    </Card>
  );
}
