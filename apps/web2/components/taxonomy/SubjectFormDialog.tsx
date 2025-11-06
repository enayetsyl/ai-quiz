"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClasses } from "@/lib/hooks/useTaxonomy";
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
  Subject,
  CreateSubjectData,
  UpdateSubjectData,
} from "@/lib/api/taxonomy/taxonomy";

const createSubjectSchema = z.object({
  classId: z.number().int().min(1).max(10),
  name: z.string().min(1, "Subject name is required"),
  code: z
    .string()
    .refine((val) => !val || /^[A-Z]{2}$/.test(val), {
      message: "Subject code must be 2 uppercase ASCII letters",
    })
    .optional(),
});

const updateSubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required").optional(),
  code: z
    .string()
    .refine((val) => !val || /^[A-Z]{2}$/.test(val), {
      message: "Subject code must be 2 uppercase ASCII letters",
    })
    .optional(),
});

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSubjectData | UpdateSubjectData) => void;
  initialData?: Subject;
  mode?: "create" | "edit";
}

export function SubjectFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = "create",
}: SubjectFormDialogProps) {
  const { data: classes } = useClasses();
  const schema = mode === "create" ? createSubjectSchema : updateSubjectSchema;
  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? { name: initialData.name, code: initialData.code || "" }
      : { classId: 1, name: "", code: "" },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      if (mode === "create") {
        form.reset({ classId: 1, name: "", code: "" });
      } else {
        form.reset(
          initialData
            ? { name: initialData.name, code: initialData.code || "" }
            : { name: "", code: "" }
        );
      }
    }
  }, [open, mode, initialData, form]);

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      form.reset({ name: initialData.name, code: initialData.code || "" });
    }
  }, [open, mode, initialData, form]);

  const handleSubmit = (data: FormData) => {
    if (mode === "create") {
      onSubmit({
        ...data,
        code: data.code || null,
      } as CreateSubjectData);
    } else {
      onSubmit({
        name: data.name,
        code: data.code || null,
      } as UpdateSubjectData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Subject" : "Edit Subject"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new subject for a class level"
              : "Update the subject information"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {mode === "create" && (
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Level</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(parseInt(value, 10))
                      }
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a class" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Mathematics" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Code (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="MA"
                      maxLength={2}
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Must be 2 uppercase letters (e.g., MA, EN, SC)
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
