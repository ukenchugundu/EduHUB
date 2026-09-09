import { useEffect, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Upload, X, Loader2, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStudentAIAssistance } from "@/contexts/StudentAIAssistanceContext";

interface ApiErrorResponse {
  error?: string;
}

interface SubmitAssignmentDialogProps {
  assignmentId: number;
  assignmentTitle: string;
  studentId: string;
  triggerLabel: string;
  initialText?: string;
  onSubmitted: () => void;
}

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

const readApiErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
};

const SubmitAssignmentDialog = ({
  assignmentId,
  assignmentTitle,
  studentId,
  triggerLabel,
  initialText = "",
  onSubmitted,
}: SubmitAssignmentDialogProps) => {
  const { setRestriction } = useStudentAIAssistance();
  const [open, setOpen] = useState(false);
  const [submissionText, setSubmissionText] = useState(initialText);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restrictionSource = `assignment-${assignmentId}-${triggerLabel.toLowerCase()}`;

  useEffect(() => {
    if (!open) {
      setSubmissionText(initialText);
      setFile(null);
      setUploading(false);
    }
  }, [initialText, open]);

  const mutation = useMutation({
    mutationFn: async ({
      text,
      fileUrl,
    }: {
      text: string;
      fileUrl?: string | null;
    }) => {
      const response = await fetch(
        `${API_BASE}/api/assignments/${assignmentId}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            submissionText: text,
            fileUrl,
          }),
        },
      );

      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "Failed to submit assignment.",
        );
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Assignment submitted successfully!");
      setOpen(false);
      onSubmitted();
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to submit assignment.";
      toast.error(message);
    },
  });

  useEffect(() => {
    setRestriction(restrictionSource, open || uploading || mutation.isPending);

    return () => {
      setRestriction(restrictionSource, false);
    };
  }, [mutation.isPending, open, restrictionSource, setRestriction, uploading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error("File size must be less than 20MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadFile = async (fileToUpload: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileToUpload);
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const response = await fetch(`${API_BASE}/api/assignments/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: fileToUpload.name,
              mimeType: fileToUpload.type,
              fileBase64: base64,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Upload failed");
          }

          const data = await response.json();
          resolve(data.fileUrl);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File reading failed"));
    });
  };

  const handleSubmit = async () => {
    if (!submissionText.trim() && !file) {
      toast.error("Please provide a submission text or upload a file.");
      return;
    }

    setUploading(true);
    let fileUrl = null;

    try {
      if (file) {
        fileUrl = await uploadFile(file);
      }
      mutation.mutate({
        text: submissionText.trim() || "See attached file",
        fileUrl,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Assignment</DialogTitle>
          <DialogDescription>{assignmentTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Submission Details</label>
            <Textarea
              value={submissionText}
              onChange={(event) => setSubmissionText(event.target.value)}
              placeholder="Add notes about your submission or paste a link..."
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Attach Document</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                file
                  ? "border-primary/50 bg-primary/5"
                  : "border-muted-foreground/20 hover:border-primary/50 hover:bg-secondary/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.zip,.rar,.jpg,.jpeg,.png,.webp"
              />
              {file ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <Paperclip className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, ZIP up to 20MB
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading || mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={uploading || mutation.isPending}
              className="min-w-[100px]"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : mutation.isPending ? (
                "Submitting..."
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitAssignmentDialog;
