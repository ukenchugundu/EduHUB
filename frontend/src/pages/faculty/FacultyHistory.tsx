import { useEffect, useMemo, useState } from "react";
import { BookOpen, Code2, FileText, Loader2, Search } from "lucide-react";
import FacultyLayout from "@/components/FacultyLayout";
import { requestJson as apiRequestJson } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

interface AssignmentItem {
  assignment_id: number;
  title: string;
  cls: string;
  subject: string;
  due_date: string;
}

interface QuizItem {
  id?: number;
  quiz_id?: number;
  title?: string;
  cls?: string;
  duration?: string;
  status?: string;
}

interface TestItem {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  created_at?: string;
  is_active: boolean;
}

const requestJson = async <T,>(path: string): Promise<T> => {
  const token = readStoredAuth()?.token?.trim();
  return apiRequestJson<T>(
    `${API_BASE}${path}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
    {
      fallbackError: "Failed to load faculty history.",
      retries: 1,
      timeoutMs: 8000,
      includeAuth: false,
    },
  );
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const FacultyHistory = () => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    setLoading(true);
    setError("");

    const [assignmentResult, quizResult, testResult] = await Promise.allSettled([
      requestJson<AssignmentItem[]>("/api/assignments"),
      requestJson<QuizItem[]>("/api/quizzes"),
      requestJson<TestItem[]>("/api/faculty/tests"),
    ]);

    setAssignments(
      assignmentResult.status === "fulfilled" &&
        Array.isArray(assignmentResult.value)
        ? assignmentResult.value
        : [],
    );
    setQuizzes(
      quizResult.status === "fulfilled" && Array.isArray(quizResult.value)
        ? quizResult.value
        : [],
    );
    setTests(
      testResult.status === "fulfilled" && Array.isArray(testResult.value)
        ? testResult.value
        : [],
    );

    const errors = [assignmentResult, quizResult, testResult]
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) =>
        result.reason instanceof Error
          ? result.reason.message
          : "Failed to load faculty history.",
      );

    setError(
      errors.length === 0
        ? ""
        : errors.length === 3
          ? errors[0]
          : "Some items could not be refreshed. Showing available data.",
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredAssignments = useMemo(
    () =>
      assignments.filter((item) => {
        if (!normalizedQuery) {
          return true;
        }
        return [item.title, item.cls, item.subject]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [assignments, normalizedQuery],
  );

  const filteredQuizzes = useMemo(
    () =>
      quizzes.filter((item) => {
        if (!normalizedQuery) {
          return true;
        }
        return [item.title ?? "", item.cls ?? "", item.status ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [quizzes, normalizedQuery],
  );

  const filteredTests = useMemo(
    () =>
      tests.filter((item) => {
        if (!normalizedQuery) {
          return true;
        }
        return [item.title, item.description]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [tests, normalizedQuery],
  );

  return (
    <FacultyLayout title="Creation History">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Faculty History
            </h1>
            <p className="text-sm text-muted-foreground">
              This page now reads assignments, quizzes, and coding tests directly
              from the database.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadHistory()}>
            Refresh
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by title, class, subject, or status"
            className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="glass-card rounded-2xl border border-border/50 p-12 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading history from database-backed content...
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  label: "Assignments",
                  value: filteredAssignments.length,
                  icon: FileText,
                },
                { label: "Quizzes", value: filteredQuizzes.length, icon: BookOpen },
                { label: "Coding Tests", value: filteredTests.length, icon: Code2 },
              ].map((card) => (
                <div
                  key={card.label}
                  className="glass-card rounded-2xl border border-border/50 p-5"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-heading font-bold text-foreground">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="glass-card rounded-2xl border border-border/50 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Assignments
                  </h2>
                </div>
                {filteredAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No assignments found in the database.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredAssignments.map((item) => (
                      <div
                        key={item.assignment_id}
                        className="rounded-2xl border border-border/50 bg-background/60 p-4"
                      >
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.cls} • {item.subject}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Due: {formatDateTime(item.due_date)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl border border-border/50 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Quizzes
                  </h2>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Quiz ordering is based on the stored database rows. Older quiz
                  schemas do not include a dedicated created timestamp.
                </p>
                {filteredQuizzes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No quizzes found in the database.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredQuizzes.map((item, index) => (
                      <div
                        key={String(item.quiz_id ?? item.id ?? index)}
                        className="rounded-2xl border border-border/50 bg-background/60 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-foreground">
                            {item.title || "Untitled Quiz"}
                          </p>
                          <Badge variant="outline">{item.status || "Draft"}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.cls || "No class assigned"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Duration: {item.duration || "Not set"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl border border-border/50 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Coding Tests
                  </h2>
                </div>
                {filteredTests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No coding tests found in the database.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredTests.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-border/50 bg-background/60 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-foreground">{item.title}</p>
                          <Badge variant="outline">
                            {item.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.description || "Coding assessment"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Duration: {item.duration_minutes} mins • Created:{" "}
                          {formatDateTime(item.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyHistory;
