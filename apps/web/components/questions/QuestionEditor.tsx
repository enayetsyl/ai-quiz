"use client";

import { useState, useEffect } from "react";
import { useQuestion, useUpdateQuestion } from "@/lib/hooks/useQuestion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Lock } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const updateQuestionSchema = z.object({
  stem: z.string().min(1, "Stem is required"),
  optionA: z.string().min(1, "Option A is required"),
  optionB: z.string().min(1, "Option B is required"),
  optionC: z.string().min(1, "Option C is required"),
  optionD: z.string().min(1, "Option D is required"),
  correctOption: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().min(1, "Explanation is required"),
  status: z.enum(["not_checked", "approved", "rejected", "needs_fix"]),
});

type UpdateQuestionForm = z.infer<typeof updateQuestionSchema>;

interface QuestionEditorProps {
  questionId: string;
  onClose: () => void;
}

export function QuestionEditor({ questionId, onClose }: QuestionEditorProps) {
  const { data: question, isLoading } = useQuestion(questionId);
  const updateQuestion = useUpdateQuestion();
  const [isOpen, setIsOpen] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<UpdateQuestionForm>({
    resolver: zodResolver(updateQuestionSchema),
    defaultValues: {
      stem: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "a",
      explanation: "",
      status: "not_checked",
    },
  });

  useEffect(() => {
    if (question) {
      reset(
        {
          stem: question.stem,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctOption: question.correctOption,
          explanation: question.explanation,
          status: question.status,
        },
        {
          keepDefaultValues: false,
        }
      );
    }
  }, [question, reset]);

  const onSubmit = (data: UpdateQuestionForm) => {
    updateQuestion.mutate(
      { id: questionId, data },
      {
        onSuccess: () => {
          setIsOpen(false);
          onClose();
        },
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
      onClose();
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <Skeleton className="h-64 w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  if (!question) {
    return null;
  }

  const isLocked = question.isLockedAfterAdd;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Question
            {isLocked && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {question.class?.displayName} / {question.subject?.name} /{" "}
            {question.chapter?.name} - Page {question.page?.pageNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="stem">Stem</Label>
            <Textarea
              id="stem"
              {...register("stem")}
              disabled={isLocked}
              className="mt-1"
              rows={3}
            />
            {errors.stem && (
              <p className="text-sm text-destructive mt-1">
                {errors.stem.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="optionA">Option A</Label>
              <Input
                id="optionA"
                {...register("optionA")}
                disabled={isLocked}
                className="mt-1"
              />
              {errors.optionA && (
                <p className="text-sm text-destructive mt-1">
                  {errors.optionA.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="optionB">Option B</Label>
              <Input
                id="optionB"
                {...register("optionB")}
                disabled={isLocked}
                className="mt-1"
              />
              {errors.optionB && (
                <p className="text-sm text-destructive mt-1">
                  {errors.optionB.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="optionC">Option C</Label>
              <Input
                id="optionC"
                {...register("optionC")}
                disabled={isLocked}
                className="mt-1"
              />
              {errors.optionC && (
                <p className="text-sm text-destructive mt-1">
                  {errors.optionC.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="optionD">Option D</Label>
              <Input
                id="optionD"
                {...register("optionD")}
                disabled={isLocked}
                className="mt-1"
              />
              {errors.optionD && (
                <p className="text-sm text-destructive mt-1">
                  {errors.optionD.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="correctOption">Correct Option</Label>
              <Controller
                name="correctOption"
                control={control}
                defaultValue={question?.correctOption || "a"}
                render={({ field }) => (
                  <Select
                    value={field.value || question?.correctOption || "a"}
                    onValueChange={field.onChange}
                    disabled={isLocked}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select correct option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">A</SelectItem>
                      <SelectItem value="b">B</SelectItem>
                      <SelectItem value="c">C</SelectItem>
                      <SelectItem value="d">D</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.correctOption && (
                <p className="text-sm text-destructive mt-1">
                  {errors.correctOption.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                defaultValue={question?.status || "not_checked"}
                render={({ field }) => (
                  <Select
                    value={field.value || question?.status || "not_checked"}
                    onValueChange={field.onChange}
                    disabled={isLocked}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_checked">Not Checked</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="needs_fix">Needs Fix</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-sm text-destructive mt-1">
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="explanation">Explanation</Label>
            <Textarea
              id="explanation"
              {...register("explanation")}
              disabled={isLocked}
              className="mt-1"
              rows={3}
            />
            {errors.explanation && (
              <p className="text-sm text-destructive mt-1">
                {errors.explanation.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLocked || updateQuestion.isPending}
            >
              {updateQuestion.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
