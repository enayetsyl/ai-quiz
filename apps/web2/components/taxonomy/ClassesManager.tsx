"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useClasses,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
} from "@/lib/hooks/useTaxonomy";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ClassFormDialog } from "./ClassFormDialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import type {
  ClassLevel,
  CreateClassData,
  UpdateClassData,
} from "@/lib/api/taxonomy/taxonomy";
import { Pencil, Trash2, Plus } from "lucide-react";
import { PaginationControls } from "@/components/shared/PaginationControls";

export function ClassesManager() {
  const { data: classes, isLoading } = useClasses();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();
  const [editingClass, setEditingClass] = useState<ClassLevel | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingClass, setDeletingClass] = useState<ClassLevel | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = classes?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (!classes || classes.length === 0) {
      setPage(1);
      return;
    }

    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [classes, page, pageSize, totalPages]);

  const paginatedClasses = useMemo(() => {
    if (!classes) return [] as ClassLevel[];
    const start = (page - 1) * pageSize;
    return classes.slice(start, start + pageSize);
  }, [classes, page, pageSize]);

  const handleCreate = (data: CreateClassData | UpdateClassData) => {
    if ("id" in data) {
      createClass.mutate(data as CreateClassData, {
        onSuccess: () => {
          setIsCreateOpen(false);
        },
      });
    }
  };

  const handleUpdate = (data: CreateClassData | UpdateClassData) => {
    if (editingClass && !("id" in data)) {
      updateClass.mutate(
        { id: editingClass.id, data: data as UpdateClassData },
        {
          onSuccess: () => {
            setEditingClass(null);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (deletingClass) {
      deleteClass.mutate(deletingClass.id, {
        onSuccess: () => {
          setDeletingClass(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Class Level
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes && classes.length > 0 ? (
            paginatedClasses.map((classLevel) => (
              <TableRow key={classLevel.id}>
                <TableCell>{classLevel.id}</TableCell>
                <TableCell>{classLevel.displayName}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingClass(classLevel)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingClass(classLevel)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-center text-muted-foreground"
              >
                No class levels found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ClassFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
      />

      {editingClass && (
        <ClassFormDialog
          open={!!editingClass}
          onOpenChange={(open) => !open && setEditingClass(null)}
          onSubmit={handleUpdate}
          initialData={editingClass}
          mode="edit"
        />
      )}

      <DeleteConfirmationDialog
        open={!!deletingClass}
        onOpenChange={(open) => !open && setDeletingClass(null)}
        onConfirm={handleDelete}
        title="Delete Class Level"
        description={`Are you sure you want to delete "${deletingClass?.displayName}"? This action cannot be undone.`}
        isLoading={deleteClass.isPending}
      />

      {classes && classes.length > 0 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
