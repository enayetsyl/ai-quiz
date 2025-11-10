"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useSubjects,
  useClasses,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SubjectFormDialog } from "./SubjectFormDialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import type {
  Subject,
  CreateSubjectData,
  UpdateSubjectData,
} from "@/lib/api/taxonomy/taxonomy";
import { Pencil, Trash2, Plus } from "lucide-react";
import { PaginationControls } from "@/components/shared/PaginationControls";

export function SubjectsManager() {
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(
    undefined
  );
  const { data: classes } = useClasses();
  const { data: subjects, isLoading } = useSubjects(selectedClassId);
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [selectedClassId]);

  const totalItems = subjects?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (!subjects || subjects.length === 0) {
      setPage(1);
      return;
    }

    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [subjects, page, pageSize, totalPages]);

  const paginatedSubjects = useMemo(() => {
    if (!subjects) return [] as Subject[];
    const start = (page - 1) * pageSize;
    return subjects.slice(start, start + pageSize);
  }, [subjects, page, pageSize]);

  const handleCreate = (data: CreateSubjectData | UpdateSubjectData) => {
    if ("classId" in data) {
      createSubject.mutate(data as CreateSubjectData, {
        onSuccess: () => {
          setIsCreateOpen(false);
        },
      });
    }
  };

  const handleUpdate = (data: CreateSubjectData | UpdateSubjectData) => {
    if (editingSubject && !("classId" in data)) {
      updateSubject.mutate(
        { id: editingSubject.id, data: data as UpdateSubjectData },
        {
          onSuccess: () => {
            setEditingSubject(null);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (deletingSubject) {
      deleteSubject.mutate(deletingSubject.id, {
        onSuccess: () => {
          setDeletingSubject(null);
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select
            value={selectedClassId?.toString() || "all"}
            onValueChange={(value) =>
              setSelectedClassId(
                value === "all" ? undefined : parseInt(value, 10)
              )
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes?.map((classLevel) => (
                <SelectItem
                  key={classLevel.id}
                  value={classLevel.id.toString()}
                >
                  {classLevel.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Class ID</TableHead>
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
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Class ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects && subjects.length > 0 ? (
              paginatedSubjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell>{subject.name}</TableCell>
                  <TableCell>{subject.code || "-"}</TableCell>
                  <TableCell>{subject.classId}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSubject(subject)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingSubject(subject)}
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
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No subjects found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <SubjectFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
      />

      {editingSubject && (
        <SubjectFormDialog
          open={!!editingSubject}
          onOpenChange={(open) => !open && setEditingSubject(null)}
          onSubmit={handleUpdate}
          initialData={editingSubject}
          mode="edit"
        />
      )}

      <DeleteConfirmationDialog
        open={!!deletingSubject}
        onOpenChange={(open) => !open && setDeletingSubject(null)}
        onConfirm={handleDelete}
        title="Delete Subject"
        description={`Are you sure you want to delete "${deletingSubject?.name}"? This action cannot be undone.`}
        isLoading={deleteSubject.isPending}
      />

      {subjects && subjects.length > 0 && (
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
