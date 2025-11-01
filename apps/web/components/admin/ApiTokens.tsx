"use client";

import { useEffect, useState } from "react";
import {
  adminApi,
  type ApiToken,
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
import { Button } from "@/components/ui/button";

export function ApiTokens() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<AdminFilters>({
    page: 1,
    pageSize: 20,
  });

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        const result = await adminApi.getApiTokens(filters);
        setTokens(result?.data || []);
        setTotalPages(result?.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Failed to fetch API tokens:", error);
        setTokens([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [filters]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Token Hash</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                </TableRow>
              ))
            ) : tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No API tokens found
                </TableCell>
              </TableRow>
            ) : (
              tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-medium">{token.name}</TableCell>
                  <TableCell>
                    <Badge variant={token.isActive ? "default" : "secondary"}>
                      {token.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-md truncate">
                    {token.tokenHash}
                  </TableCell>
                  <TableCell>
                    {token.createdByUser?.email || "System"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(token.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex justify-between items-center p-4 border-t">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}
