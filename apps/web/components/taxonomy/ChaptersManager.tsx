"use client";

import { useState } from "react";
import {
  useChapters,
  useSubjects,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
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
import { ChapterFormDialog } from "./ChapterFormDialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import type {
  Chapter,
  CreateChapterData,
  UpdateChapterData,
} from "@/lib/api/taxonomy/taxonomy";
import { Pencil, Trash2, Plus } from "lucide-react";

export function ChaptersManager() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<
    string | undefined
  >(undefined);
  const { data: subjects } = useSubjects();
  const { data: chapters, isLoading } = useChapters(selectedSubjectId);
  const createChapter = useCreateChapter();
  const updateChapter = useUpdateChapter();
  const deleteChapter = useDeleteChapter();
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);

  const handleCreate = (data: CreateChapterData | UpdateChapterData) => {
    if ("subjectId" in data) {
      createChapter.mutate(data as CreateChapterData, {
        onSuccess: () => {
          setIsCreateOpen(false);
        },
      });
    }
  };

  const handleUpdate = (data: CreateChapterData | UpdateChapterData) => {
    if (editingChapter && !("subjectId" in data)) {
      updateChapter.mutate(
        { id: editingChapter.id, data: data as UpdateChapterData },
        {
          onSuccess: () => {
            setEditingChapter(null);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (deletingChapter) {
      deleteChapter.mutate(deletingChapter.id, {
        onSuccess: () => {
          setDeletingChapter(null);
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select
            value={selectedSubjectId || "all"}
            onValueChange={(value) =>
              setSelectedSubjectId(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects?.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Chapter
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Ordinal</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chapters && chapters.length > 0 ? (
              chapters.map((chapter) => {
                const subject = subjects?.find(
                  (s) => s.id === chapter.subjectId
                );
                return (
                  <TableRow key={chapter.id}>
                    <TableCell>{chapter.name}</TableCell>
                    <TableCell>{chapter.ordinal}</TableCell>
                    <TableCell>{subject?.name || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingChapter(chapter)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingChapter(chapter)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No chapters found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <ChapterFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
      />

      {editingChapter && (
        <ChapterFormDialog
          open={!!editingChapter}
          onOpenChange={(open) => !open && setEditingChapter(null)}
          onSubmit={handleUpdate}
          initialData={editingChapter}
          mode="edit"
        />
      )}

      <DeleteConfirmationDialog
        open={!!deletingChapter}
        onOpenChange={(open) => !open && setDeletingChapter(null)}
        onConfirm={handleDelete}
        title="Delete Chapter"
        description={`Are you sure you want to delete "${deletingChapter?.name}"? This action cannot be undone.`}
        isLoading={deleteChapter.isPending}
      />
    </div>
  );
}
