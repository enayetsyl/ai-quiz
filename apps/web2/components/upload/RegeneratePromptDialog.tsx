"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RegeneratePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (prompt: string | undefined) => void;
  title: string;
  description: string;
  isLoading?: boolean;
}

export function RegeneratePromptDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  isLoading = false,
}: RegeneratePromptDialogProps) {
  const [prompt, setPrompt] = useState("");

  const handleConfirm = () => {
    const trimmedPrompt = prompt.trim();
    onConfirm(trimmedPrompt.length > 0 ? trimmedPrompt : undefined);
    setPrompt("");
  };

  const handleCancel = () => {
    setPrompt("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Custom Prompt (Optional)
            </Label>
            <Textarea
              id="prompt"
              placeholder="Enter a custom prompt to guide the question generation. Leave empty to use the default prompt..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              className="resize-none"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              If provided, this prompt will be used instead of the default prompt for generating questions.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Regenerating..." : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

