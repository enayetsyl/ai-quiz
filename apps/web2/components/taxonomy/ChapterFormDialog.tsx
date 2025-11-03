"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClasses, useSubjects } from "@/lib/hooks/useTaxonomy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type {
  Chapter,
  CreateChapterData,
  UpdateChapterData,
} from "@/lib/api/taxonomy/taxonomy";

const createChapterSchema = z.object({
  subjectId: z.string().uuid("Please select a valid subject"),
  name: z.string().min(1, "Chapter name is required"),
  ordinal: z.number().int().min(1, "Ordinal must be at least 1"),
});

const updateChapterSchema = z.object({
  name: z.string().min(1, "Chapter name is required").optional(),
  ordinal: z.number().int().min(1, "Ordinal must be at least 1").optional(),
});

interface ChapterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateChapterData | UpdateChapterData) => void;
  initialData?: Chapter;
  mode?: "create" | "edit";
}

export function ChapterFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = "create",
}: ChapterFormDialogProps) {
  const { data: classes } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(
    undefined
  );
  const { data: subjects } = useSubjects(
    mode === "create" ? selectedClassId : undefined
  );

  const schema = mode === "create" ? createChapterSchema : updateChapterSchema;
  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? { name: initialData.name, ordinal: initialData.ordinal }
      : { subjectId: "", name: "", ordinal: 1 },
  });

  // Handle dialog open/close and reset state
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && mode === "create") {
      // Reset when dialog closes
      setSelectedClassId(undefined);
    }
    onOpenChange(newOpen);
  };

  // Reset form when dialog opens in create mode
  useEffect(() => {
    if (open && mode === "create") {
      form.reset({ subjectId: "", name: "", ordinal: 1 });
    }
  }, [open, mode, form]);

  // Reset form when dialog closes in edit mode
  useEffect(() => {
    if (!open && mode === "edit") {
      form.reset(
        initialData
          ? { name: initialData.name, ordinal: initialData.ordinal }
          : { name: "", ordinal: 1 }
      );
    }
  }, [open, mode, initialData, form]);

  // Reset subjectId when class changes
  useEffect(() => {
    if (mode === "create" && selectedClassId !== undefined) {
      form.setValue("subjectId", "");
    }
  }, [selectedClassId, mode, form]);

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      form.reset({ name: initialData.name, ordinal: initialData.ordinal });
    }
  }, [open, mode, initialData, form]);

  const handleSubmit = (data: FormData) => {
    if (mode === "create") {
      onSubmit(data as CreateChapterData);
    } else {
      onSubmit({
        name: data.name,
        ordinal: data.ordinal,
      } as UpdateChapterData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Chapter" : "Edit Chapter"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new chapter for a subject"
              : "Update the chapter information"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {mode === "create" && (
              <>
                <FormItem>
                  <FormLabel>Class Level</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const classId = parseInt(value, 10);
                      setSelectedClassId(classId);
                      form.setValue("subjectId", ""); // Clear subject when class changes
                    }}
                    value={selectedClassId?.toString() || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class level" />
                    </SelectTrigger>
                    <SelectContent>
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
                </FormItem>
                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={
                          !selectedClassId || !subjects || subjects.length === 0
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !selectedClassId
                                  ? "Select a class level first"
                                  : subjects && subjects.length > 0
                                  ? "Select a subject"
                                  : "No subjects available"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects?.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {selectedClassId &&
                        (!subjects || subjects.length === 0) && (
                          <p className="text-xs text-muted-foreground">
                            No subjects found for this class level
                          </p>
                        )}
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chapter Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Chapter 1: Introduction" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ordinal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordinal</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Chapter order number (must be unique per subject)
                  </p>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {mode === "create" ? "Create" : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
