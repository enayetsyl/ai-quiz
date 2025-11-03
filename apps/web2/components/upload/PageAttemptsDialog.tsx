"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePageAttempts } from "@/lib/hooks/useUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

interface PageAttemptsDialogProps {
  pageId: string | null;
  pageNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PageAttemptsDialog({
  pageId,
  pageNumber,
  open,
  onOpenChange,
}: PageAttemptsDialogProps) {
  const { data: attemptsData, isLoading } = usePageAttempts(
    open ? pageId : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generation Attempts - Page {pageNumber}</DialogTitle>
          <DialogDescription>
            View all generation attempts for this page
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : attemptsData && attemptsData.attempts.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attempt #</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Prompt Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attemptsData.attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">
                      {attempt.attemptNo || "-"}
                    </TableCell>
                    <TableCell>{attempt.model || "-"}</TableCell>
                    <TableCell>{attempt.promptVersion || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={attempt.isSuccess ? "default" : "destructive"}
                      >
                        {attempt.isSuccess ? (
                          <>
                            <CheckCircle2Icon className="mr-1 h-3 w-3" />
                            Success
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="mr-1 h-3 w-3" />
                            Failed
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {attempt.errorMessage ? (
                        <p className="text-sm text-destructive truncate">
                          {attempt.errorMessage}
                        </p>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {attempt.createdAt
                        ? format(
                            new Date(attempt.createdAt),
                            "MMM dd, yyyy HH:mm"
                          )
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No generation attempts found for this page.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
