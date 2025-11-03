import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taxonomyApi } from "@/lib/api/taxonomy/taxonomy";
import { toast } from "@/lib/toast";
import type {
  CreateClassData,
  UpdateClassData,
  CreateSubjectData,
  UpdateSubjectData,
  CreateChapterData,
  UpdateChapterData,
} from "@/lib/api/taxonomy/taxonomy";

// Classes hooks
export function useClasses() {
  return useQuery({
    queryKey: ["taxonomy", "classes"],
    queryFn: () => taxonomyApi.getClasses(),
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClassData) => taxonomyApi.createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy", "classes"] });
      toast.success(
        "Class created",
        "Class level has been created successfully"
      );
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create class";
      toast.error("Error", errorMessage);
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClassData }) =>
      taxonomyApi.updateClass(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy", "classes"] });
      toast.success(
        "Class updated",
        "Class level has been updated successfully"
      );
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update class";
      toast.error("Error", errorMessage);
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => taxonomyApi.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy", "classes"] });
      toast.success(
        "Class deleted",
        "Class level has been deleted successfully"
      );
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete class";
      toast.error("Error", errorMessage);
    },
  });
}

// Subjects hooks
export function useSubjects(classId?: number) {
  return useQuery({
    queryKey: ["taxonomy", "subjects", classId],
    queryFn: () => taxonomyApi.getSubjects(classId),
    enabled: true, // Always enabled, classId is optional
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubjectData) => taxonomyApi.createSubject(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy", "subjects"] });
      queryClient.invalidateQueries({
        queryKey: ["taxonomy", "subjects", variables.classId],
      });
      toast.success("Subject created", "Subject has been created successfully");
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create subject";
      toast.error("Error", errorMessage);
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubjectData }) =>
      taxonomyApi.updateSubject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy", "subjects"] });
      toast.success("Subject updated", "Subject has been updated successfully");
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update subject";
      toast.error("Error", errorMessage);
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taxonomyApi.deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy", "subjects"] });
      toast.success("Subject deleted", "Subject has been deleted successfully");
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete subject";
      toast.error("Error", errorMessage);
    },
  });
}

// Chapters hooks
export function useChapters(subjectId?: string) {
  return useQuery({
    queryKey: ["taxonomy", "chapters", subjectId],
    queryFn: () => taxonomyApi.getChapters(subjectId),
    enabled: true, // Always enabled, subjectId is optional
  });
}

export function useCreateChapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChapterData) => taxonomyApi.createChapter(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy", "chapters"] });
      queryClient.invalidateQueries({
        queryKey: ["taxonomy", "chapters", variables.subjectId],
      });
      toast.success("Chapter created", "Chapter has been created successfully");
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create chapter";
      toast.error("Error", errorMessage);
    },
  });
}

export function useUpdateChapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChapterData }) =>
      taxonomyApi.updateChapter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy", "chapters"] });
      toast.success("Chapter updated", "Chapter has been updated successfully");
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update chapter";
      toast.error("Error", errorMessage);
    },
  });
}

export function useDeleteChapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taxonomyApi.deleteChapter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy", "chapters"] });
      toast.success("Chapter deleted", "Chapter has been deleted successfully");
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete chapter";
      toast.error("Error", errorMessage);
    },
  });
}
