"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClasses, useSubjects, useChapters } from "@/lib/hooks/useTaxonomy";
import { useUploadPdf } from "@/lib/hooks/useUpload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, FileText, Loader2Icon } from "lucide-react";
import { toast } from "@/lib/toast";

const uploadSchema = z.object({
  classId: z.number().int().min(1).max(10),
  subjectId: z
    .string()
    .min(1, "Please select a valid subject")
    .refine(
      (val) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          val
        ),
      {
        message: "Please select a valid subject",
      }
    ),
  chapterId: z
    .string()
    .min(1, "Please select a valid chapter")
    .refine(
      (val) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          val
        ),
      {
        message: "Please select a valid chapter",
      }
    ),
  file: z.custom<File>((val) => val instanceof File, {
    message: "Please select a PDF file",
  }),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

export function UploadForm() {
  const router = useRouter();
  const { data: classes, isLoading: isLoadingClasses } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(
    undefined
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<
    string | undefined
  >(undefined);

  const { data: subjects, isLoading: isLoadingSubjects } =
    useSubjects(selectedClassId);
  const { data: chapters, isLoading: isLoadingChapters } =
    useChapters(selectedSubjectId);

  const uploadMutation = useUploadPdf();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      classId: 0,
      subjectId: "",
      chapterId: "",
      file: undefined as unknown as File,
    },
  });

  const handleClassChange = (classId: number) => {
    setSelectedClassId(classId);
    setSelectedSubjectId(undefined);
    form.setValue("classId", classId);
    form.setValue("subjectId", "");
    form.setValue("chapterId", "");
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    form.setValue("subjectId", subjectId);
    form.setValue("chapterId", "");
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: { onChange: (value: File | undefined) => void }
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Invalid file type", "Please select a PDF file");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File too large", "File size must be less than 20 MB");
        return;
      }
      field.onChange(file);
      form.setValue("file", file);
    }
  };

  const onSubmit = async (data: UploadFormValues) => {
    try {
      await uploadMutation.mutateAsync({
        file: data.file,
        metadata: {
          classId: data.classId,
          subjectId: data.subjectId,
          chapterId: data.chapterId,
        },
      });
      // Reset form after successful upload
      form.reset();
      setSelectedClassId(undefined);
      setSelectedSubjectId(undefined);
      // Navigate to upload status page using Next.js router (client-side navigation)
      router.push(`/uploads`);
    } catch {
      // Error is handled by the mutation hook
    }
  };

  const selectedFile = useWatch({
    control: form.control,
    name: "file",
  }) as File | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload PDF</CardTitle>
        <CardDescription>
          Upload a PDF file to generate quiz questions. Select class, subject,
          and chapter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Level</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const classId = parseInt(value, 10);
                      handleClassChange(classId);
                      field.onChange(classId);
                    }}
                    value={field.value ? field.value.toString() : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class level" />
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

            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleSubjectChange(value);
                      field.onChange(value);
                    }}
                    value={field.value}
                    disabled={!selectedClassId || isLoadingSubjects}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedClassId
                              ? "Select a class level first"
                              : "Select a subject"
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
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chapterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chapter</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={
                      !selectedSubjectId ||
                      isLoadingChapters ||
                      !chapters?.length
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedSubjectId
                              ? "Select a subject first"
                              : chapters && chapters.length > 0
                              ? "Select a chapter"
                              : "No chapters available"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {chapters?.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PDF File</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handleFileChange(e, field)}
                        className="cursor-pointer"
                      />
                      {selectedFile && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{selectedFile.name}</span>
                          <span className="text-xs">
                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 20 MB. Only PDF files are accepted.
                  </p>
                </FormItem>
              )}
            />

            {/* Upload Progress Bar */}
            {uploadMutation.uploadProgress > 0 && uploadMutation.uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadMutation.uploadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Uploading... {Math.round(uploadMutation.uploadProgress)}%
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={uploadMutation.isPending || isLoadingClasses}
              className="w-full"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {uploadMutation.uploadProgress > 0
                    ? `Uploading... ${Math.round(uploadMutation.uploadProgress)}%`
                    : "Uploading..."}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PDF
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
