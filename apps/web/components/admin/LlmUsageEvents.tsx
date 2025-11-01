"use client";

import { useEffect, useState } from "react";
import {
  adminApi,
  type LlmUsageEvent,
  type AdminFilters,
  type LlmUsageStats,
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
import { PaginationControls } from "@/components/shared/PaginationControls";

export function LlmUsageEvents() {
  const [events, setEvents] = useState<LlmUsageEvent[]>([]);
  const [stats, setStats] = useState<LlmUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<AdminFilters>({
    page: 1,
    pageSize: 20,
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const result = await adminApi.getLlmUsageEvents(filters);
        setEvents(result?.data || []);
        setStats(result?.stats || null);
        setTotalPages(result?.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Failed to fetch LLM events:", error);
        setEvents([]);
        setStats(null);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
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
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Events</div>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Tokens In</div>
            <div className="text-2xl font-bold">
              {stats.totalTokensIn.toLocaleString()}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">
              Total Tokens Out
            </div>
            <div className="text-2xl font-bold">
              {stats.totalTokensOut.toLocaleString()}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Cost</div>
            <div className="text-2xl font-bold">
              ${stats.totalCost.toFixed(4)}
            </div>
          </Card>
        </div>
      )}

      <Card className="p-4">
        <Input
          placeholder="Filter by model..."
          value={filters.model || ""}
          onChange={(e) => handleFilterChange("model", e.target.value)}
          className="max-w-xs"
        />
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Tokens In</TableHead>
                <TableHead>Tokens Out</TableHead>
                <TableHead>Cost (USD)</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
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
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Badge variant="outline">{event.model}</Badge>
                    </TableCell>
                    <TableCell>
                      {event.tokensIn?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell>
                      {event.tokensOut?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell>
                      {event.estimatedCostUsd
                        ? `$${Number(event.estimatedCostUsd).toFixed(6)}`
                        : "-"}
                    </TableCell>
                    <TableCell>{event.page?.pageNumber || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(event.createdAt).toLocaleString()}
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
    </div>
  );
}
