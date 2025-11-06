"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import type {
  ClassLevel,
  CreateClassData,
  UpdateClassData,
} from "@/lib/api/taxonomy/taxonomy";

const createClassSchema = z.object({
  id: z.number().int().min(1).max(10),
  displayName: z.string().min(1, "Display name is required"),
});

const updateClassSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
});

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateClassData | UpdateClassData) => void;
  initialData?: ClassLevel;
  mode?: "create" | "edit";
}

export function ClassFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = "create",
}: ClassFormDialogProps) {
  const createForm = useForm<z.infer<typeof createClassSchema>>({
    resolver: zodResolver(createClassSchema),
    defaultValues: { id: 1, displayName: "" },
  });

  const updateForm = useForm<z.infer<typeof updateClassSchema>>({
    resolver: zodResolver(updateClassSchema),
    defaultValues: initialData
      ? { displayName: initialData.displayName }
      : { displayName: "" },
  });

  // Reset form when dialog closes or initialData changes
  useEffect(() => {
    if (!open) {
      if (mode === "create") {
        createForm.reset({ id: 1, displayName: "" });
      } else {
        updateForm.reset(
          initialData
            ? { displayName: initialData.displayName }
            : { displayName: "" }
        );
      }
    }
  }, [open, mode, initialData, createForm, updateForm]);

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      updateForm.reset({ displayName: initialData.displayName });
    }
  }, [open, mode, initialData, updateForm]);

  const handleCreateSubmit = (data: z.infer<typeof createClassSchema>) => {
    onSubmit(data as CreateClassData);
  };

  const handleUpdateSubmit = (data: z.infer<typeof updateClassSchema>) => {
    onSubmit({ displayName: data.displayName } as UpdateClassData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Class Level" : "Edit Class Level"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new class level (grades 1-10)"
              : "Update the class level information"}
          </DialogDescription>
        </DialogHeader>
        {mode === "create" ? (
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(handleCreateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Must be between 1 and 10
                    </p>
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Class 6" {...field} />
                    </FormControl>
                    <FormMessage />
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
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...updateForm}>
            <form
              onSubmit={updateForm.handleSubmit(handleUpdateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={updateForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Class 6" {...field} />
                    </FormControl>
                    <FormMessage />
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
                <Button type="submit">Update</Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
