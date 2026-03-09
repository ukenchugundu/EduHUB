import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import FacultyLayout from "@/components/FacultyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ApiErrorResponse {
  error?: string;
}

interface NoteItem {
  note_id: number;
  cls: string;
  subject: string;
  title: string;
  content: string;
  chapter?: string;
  file_url: string;
  created_at: string;
  updated_at: string;
}

interface NoteUploadResponse {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
}

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const withTimeoutSignal = (
  timeoutMs = 6000,
): {
  signal: AbortSignal;
  clear: () => void;
  abort: () => void;
} => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
    abort: () => controller.abort(),
  };
};

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

const fetchNotes = async (signal?: AbortSignal): Promise<NoteItem[]> => {
  const request = withTimeoutSignal(6000);
  const onAbort = () => request.abort();
  if (signal) {
    signal.addEventListener("abort", onAbort);
  }

  try {
    const response = await fetch(`${API_BASE}/api/notes`, {
      signal: request.signal,
    });
    if (!response.ok) {
      const message = await readApiErrorMessage(
        response,
        "Failed to load notes.",
      );
      throw new Error(message);
    }
    return (await response.json()) as NoteItem[];
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Cannot reach backend API for notes.");
    }
    if (error instanceof TypeError) {
      throw new Error("Cannot reach backend API for notes.");
    }
    throw error;
  } finally {
    if (signal) {
      signal.removeEventListener("abort", onAbort);
    }
    request.clear();
  }
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.replace(/^data:[^;]+;base64,/, ""));
    };
    reader.onerror = () => reject(new Error("Failed to read selected file."));
    reader.readAsDataURL(file);
  });

const FacultyNotes = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    cls: "",
    subject: "",
    title: "",
    content: "",
    chapter: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [subjectsDialogOpen, setSubjectsDialogOpen] = useState(false);
  const [classesDialogOpen, setClassesDialogOpen] = useState(false);
  const [notesSummaryDialogOpen, setNotesSummaryDialogOpen] = useState(false);
  const [selectedSubjectSummary, setSelectedSubjectSummary] = useState<
    string | null
  >(null);
  const [selectedClassSummary, setSelectedClassSummary] = useState<
    string | null
  >(null);
  const [classNotesSummaryDialogOpen, setClassNotesSummaryDialogOpen] =
    useState(false);
  const [showCustomClass, setShowCustomClass] = useState(false);
  const [showCustomSubject, setShowCustomSubject] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<
    string | null
  >(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(
    null,
  );

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [editForm, setEditForm] = useState({
    cls: "",
    subject: "",
    title: "",
    content: "",
    chapter: "",
  });
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editFileInputKey, setEditFileInputKey] = useState(0);

  const notesQuery = useQuery<NoteItem[], Error>({
    queryKey: ["notes"],
    queryFn: ({ signal }) => fetchNotes(signal),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let resolvedFileUrl = "";
      if (selectedFile) {
        const fileBase64 = await fileToBase64(selectedFile);
        const uploadResponse = await fetch(`${API_BASE}/api/notes/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            mimeType: selectedFile.type || "application/octet-stream",
            fileBase64,
          }),
        });
        if (!uploadResponse.ok) {
          const message = await readApiErrorMessage(
            uploadResponse,
            "Failed to upload note file.",
          );
          throw new Error(message);
        }

        const uploadBody = (await uploadResponse.json()) as NoteUploadResponse;
        if (!uploadBody.fileUrl?.trim()) {
          throw new Error(
            "File upload completed but no file URL was returned.",
          );
        }
        resolvedFileUrl = uploadBody.fileUrl.trim();
      }

      const response = await fetch(`${API_BASE}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cls: form.cls,
          subject: form.subject,
          title: form.title,
          content: form.content,
          chapter: form.chapter,
          fileUrl: resolvedFileUrl,
        }),
      });
      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "Failed to create note.",
        );
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Note uploaded successfully.");
      setForm({ cls: "", subject: "", title: "", content: "", chapter: "" });
      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to upload note.";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const response = await fetch(`${API_BASE}/api/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "Failed to delete note.",
        );
        throw new Error(message);
      }
    },
    onSuccess: () => {
      toast.success("Note deleted.");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to delete note.";
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingNote) return;

      let resolvedFileUrl = "";
      if (editSelectedFile) {
        const fileBase64 = await fileToBase64(editSelectedFile);
        const uploadResponse = await fetch(`${API_BASE}/api/notes/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: editSelectedFile.name,
            mimeType: editSelectedFile.type || "application/octet-stream",
            fileBase64,
          }),
        });
        if (!uploadResponse.ok) {
          const message = await readApiErrorMessage(
            uploadResponse,
            "Failed to upload note file.",
          );
          throw new Error(message);
        }

        const uploadBody = (await uploadResponse.json()) as NoteUploadResponse;
        if (!uploadBody.fileUrl?.trim()) {
          throw new Error(
            "File upload completed but no file URL was returned.",
          );
        }
        resolvedFileUrl = uploadBody.fileUrl.trim();
      } else {
        resolvedFileUrl = editingNote.file_url;
      }

      const response = await fetch(
        `${API_BASE}/api/notes/${editingNote.note_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cls: editForm.cls,
            subject: editForm.subject,
            title: editForm.title,
            content: editForm.content,
            chapter: editForm.chapter,
            fileUrl: resolvedFileUrl,
          }),
        },
      );
      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "Failed to update note.",
        );
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Note updated successfully.");
      setEditDialogOpen(false);
      setEditingNote(null);
      setEditForm({
        cls: "",
        subject: "",
        title: "",
        content: "",
        chapter: "",
      });
      setEditSelectedFile(null);
      setEditFileInputKey((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to update note.";
      toast.error(message);
    },
  });

  const handleEditNote = (note: NoteItem) => {
    setEditingNote(note);
    setEditForm({
      cls: note.cls,
      subject: note.subject,
      title: note.title,
      content: note.content,
      chapter: note.chapter || "",
    });
    setEditDialogOpen(true);
  };

  const notes = notesQuery.data || [];
  const totalNotes = notes.length;
  const uniqueSubjects = [...new Set(notes.map((note) => note.subject))];
  const uniqueClasses = [...new Set(notes.map((note) => note.cls))];

  const filteredNotes = useMemo(() => {
    if (selectedSubjectFilter) {
      return notes.filter((note) => note.subject === selectedSubjectFilter);
    }
    if (selectedClassFilter) {
      return notes.filter((note) => note.cls === selectedClassFilter);
    }
    return notes;
  }, [notes, selectedSubjectFilter, selectedClassFilter]);

  return (
    <FacultyLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Notes Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Create and manage study notes for your classes
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() =>
              setFilterType(filterType === "total" ? null : "total")
            }
            className={`glass-card rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer ${
              filterType === "total"
                ? "ring-2 ring-blue-500/30 bg-blue-500/5"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {totalNotes}
                </div>
                <div className="text-xs text-muted-foreground">Total Notes</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSubjectsDialogOpen(true)}
            className="glass-card rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {uniqueSubjects.length}
                </div>
                <div className="text-xs text-muted-foreground">Subjects</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setClassesDialogOpen(true)}
            className="glass-card rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {uniqueClasses.length}
                </div>
                <div className="text-xs text-muted-foreground">Classes</div>
              </div>
            </div>
          </button>
        </div>

        {/* Upload Form */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Upload New Note
            </h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Class
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between rounded-xl"
                    >
                      {form.cls || "Select Class"}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    {uniqueClasses.length > 0 ? (
                      uniqueClasses.map((cls) => (
                        <DropdownMenuItem
                          key={cls}
                          onClick={() => {
                            setForm({ ...form, cls });
                            setShowCustomClass(false);
                          }}
                        >
                          {cls}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        No classes available
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setShowCustomClass(true);
                        setForm({ ...form, cls: "" });
                      }}
                    >
                      Custom Class...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {showCustomClass && (
                  <Input
                    placeholder="Enter custom class"
                    className="mt-2 rounded-xl"
                    value={form.cls}
                    onChange={(e) => setForm({ ...form, cls: e.target.value })}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Subject
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between rounded-xl"
                    >
                      {form.subject || "Select Subject"}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    {uniqueSubjects.length > 0 ? (
                      uniqueSubjects.map((subject) => (
                        <DropdownMenuItem
                          key={subject}
                          onClick={() => {
                            setForm({ ...form, subject });
                            setShowCustomSubject(false);
                          }}
                        >
                          {subject}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        No subjects available
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setShowCustomSubject(true);
                        setForm({ ...form, subject: "" });
                      }}
                    >
                      Custom Subject...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {showCustomSubject && (
                  <Input
                    placeholder="Enter custom subject"
                    className="mt-2 rounded-xl"
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Chapter
                </label>
                <Input
                  placeholder="Enter chapter name"
                  value={form.chapter}
                  onChange={(e) =>
                    setForm({ ...form, chapter: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Topic Name
                </label>
                <Input
                  placeholder="Enter topic name"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <Textarea
                placeholder="Enter note description/content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="rounded-xl min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                File Upload (Optional)
              </label>
              <Input
                key={fileInputKey}
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="rounded-xl"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (
                    !form.cls.trim() ||
                    !form.subject.trim() ||
                    !form.title.trim()
                  ) {
                    toast.error("Class, subject and topic name are required.");
                    return;
                  }
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
                className="px-6 py-2 rounded-xl bg-primary hover:bg-primary/90"
              >
                {createMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Note
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedSubjectFilter
                ? `${selectedSubjectFilter} Notes (${filteredNotes.length})`
                : selectedClassFilter
                  ? `${selectedClassFilter} Notes (${filteredNotes.length})`
                  : `All Notes (${notes.length})`}
            </h2>
            {(selectedSubjectFilter || selectedClassFilter) && (
              <button
                onClick={() => {
                  setSelectedSubjectFilter(null);
                  setSelectedClassFilter(null);
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear Filter
              </button>
            )}
          </div>

          {filteredNotes.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground mb-2">
                No notes found
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload your first note to get started
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.note_id}
                  className="glass-card rounded-xl p-4 hover:shadow-lg transition-all duration-300 border border-border/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                          {note.cls}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {note.subject}
                        </span>
                        {note.chapter && (
                          <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                            {note.chapter}
                          </span>
                        )}
                        <span className="font-semibold text-foreground text-sm ml-1">
                          {note.title}
                        </span>
                      </div>

                      {note.content && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {note.content}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDateTime(note.created_at)}</span>
                        {note.file_url && (
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            • Has Attachment
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-4">
                      {note.file_url && note.subject !== "Data Structures" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(note.file_url, "_blank")}
                          className="h-8 w-8 p-0 hover:bg-green-500/10"
                        >
                          <ExternalLink className="w-3 h-3 text-green-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNote(note)}
                        className="h-8 w-8 p-0 hover:bg-blue-500/10"
                      >
                        <Pencil className="w-3 h-3 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(note.note_id)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 p-0 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subjects Dialog */}
        <Dialog open={subjectsDialogOpen} onOpenChange={setSubjectsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subjects</DialogTitle>
              <DialogDescription>
                Click on a subject to view its notes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {uniqueSubjects.map((subject) => {
                const subjectNotes = notes.filter(
                  (note) => note.subject === subject,
                );
                return (
                  <button
                    key={subject}
                    onClick={() => {
                      setSelectedSubjectSummary(subject);
                      setSubjectsDialogOpen(false);
                      setNotesSummaryDialogOpen(true);
                    }}
                    className="w-full p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        {subject}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {subjectNotes.length} notes
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSubjectSummary(subject);
                                setSubjectsDialogOpen(false);
                                setNotesSummaryDialogOpen(true);
                              }}
                            >
                              View Summary
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSubjectFilter(subject);
                                setSelectedClassFilter(null);
                                setSubjectsDialogOpen(false);
                              }}
                            >
                              Filter Notes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Classes Dialog */}
        <Dialog open={classesDialogOpen} onOpenChange={setClassesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Classes</DialogTitle>
              <DialogDescription>
                Click on a class to view its notes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {uniqueClasses.map((cls) => {
                const classNotes = notes.filter((note) => note.cls === cls);
                return (
                  <button
                    key={cls}
                    onClick={() => {
                      setSelectedClassSummary(cls);
                      setClassesDialogOpen(false);
                      setClassNotesSummaryDialogOpen(true);
                    }}
                    className="w-full p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{cls}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {classNotes.length} notes
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedClassSummary(cls);
                                setClassesDialogOpen(false);
                                setClassNotesSummaryDialogOpen(true);
                              }}
                            >
                              View Summary
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedClassFilter(cls);
                                setSelectedSubjectFilter(null);
                                setClassesDialogOpen(false);
                              }}
                            >
                              Filter Notes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Class Notes Summary Dialog */}
        <Dialog
          open={classNotesSummaryDialogOpen}
          onOpenChange={setClassNotesSummaryDialogOpen}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedClassSummary} - Notes Summary</DialogTitle>
              <DialogDescription>
                Overview of all notes for {selectedClassSummary}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {selectedClassSummary &&
                notes
                  .filter((note) => note.cls === selectedClassSummary)
                  .map((note) => (
                    <div
                      key={note.note_id}
                      className="p-4 rounded-xl border border-border hover:bg-secondary/20 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground">
                          {note.title}
                        </h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {note.subject}
                        </span>
                      </div>
                      {note.content && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {note.content}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(note.created_at)}
                        </p>
                        <div className="flex items-center gap-1">
                          {note.file_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(note.file_url, "_blank")
                              }
                              className="h-7 w-7 p-0 hover:bg-green-500/10"
                            >
                              <ExternalLink className="w-3 h-3 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleEditNote(note);
                              setClassNotesSummaryDialogOpen(false);
                            }}
                            className="h-7 w-7 p-0 hover:bg-blue-500/10"
                          >
                            <Pencil className="w-3 h-3 text-blue-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setClassNotesSummaryDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notes Summary Dialog */}
        <Dialog
          open={notesSummaryDialogOpen}
          onOpenChange={setNotesSummaryDialogOpen}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedSubjectSummary} - Notes Summary
              </DialogTitle>
              <DialogDescription>
                Overview of all notes for {selectedSubjectSummary}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {selectedSubjectSummary &&
                notes
                  .filter((note) => note.subject === selectedSubjectSummary)
                  .map((note) => (
                    <div
                      key={note.note_id}
                      className="p-4 rounded-xl border border-border hover:bg-secondary/20 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground">
                          {note.title}
                        </h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {note.cls}
                        </span>
                      </div>
                      {note.content && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {note.content}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(note.created_at)}
                        </p>
                        <div className="flex items-center gap-1">
                          {note.file_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(note.file_url, "_blank")
                              }
                              className="h-7 w-7 p-0 hover:bg-green-500/10"
                            >
                              <ExternalLink className="w-3 h-3 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleEditNote(note);
                              setNotesSummaryDialogOpen(false);
                            }}
                            className="h-7 w-7 p-0 hover:bg-blue-500/10"
                          >
                            <Pencil className="w-3 h-3 text-blue-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setNotesSummaryDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Note Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>
                Update the note details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Class (e.g., III CSE-A)"
                  value={editForm.cls}
                  onChange={(e) =>
                    setEditForm({ ...editForm, cls: e.target.value })
                  }
                />
                <Input
                  placeholder="Subject"
                  value={editForm.subject}
                  onChange={(e) =>
                    setEditForm({ ...editForm, subject: e.target.value })
                  }
                />
              </div>
              <Input
                placeholder="Chapter"
                value={editForm.chapter}
                onChange={(e) =>
                  setEditForm({ ...editForm, chapter: e.target.value })
                }
              />
              <Input
                placeholder="Topic Name"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
              <Textarea
                placeholder="Description/content"
                value={editForm.content}
                onChange={(e) =>
                  setEditForm({ ...editForm, content: e.target.value })
                }
                rows={4}
              />
              <Input
                key={editFileInputKey}
                type="file"
                onChange={(e) =>
                  setEditSelectedFile(e.target.files?.[0] || null)
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
};

export default FacultyNotes;
