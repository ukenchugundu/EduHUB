import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Code2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CreateTaskModal from "@/components/CreateTaskModal";
import { requestJson as apiRequestJson } from "@/lib/apiClient";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

type TaskHubMode = "all" | "quiz" | "test";
type CreateTaskType = "quiz" | "test" | "assignment" | null;

interface QuizItem {
  id?: number;
  quiz_id?: number;
  title?: string;
  cls?: string;
  duration?: string;
  status?: string;
  questions?: unknown[];
}

interface AssignmentItem {
  assignment_id: number;
  title: string;
  cls: string;
  subject: string;
  due_date: string;
  max_score: number;
  submission_count: number;
}

interface TestItem {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  question_count?: number | string;
  attempt_count?: number | string;
}

interface HubItem {
  id: string;
  numericId: number;
  type: "quiz" | "assignment" | "test";
  title: string;
  subtitle: string;
  status: string;
  details: string;
  timestamp: string;
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
      fallbackError: "Failed to load faculty content.",
      retries: 1,
      timeoutMs: 8000,
      includeAuth: false,
    },
  );
};

const toDateValue = (value: string): number => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return date.toLocaleString();
};

const getModeCopy = (mode: TaskHubMode) => {
  switch (mode) {
    case "quiz":
      return {
        title: "Quiz Management",
        description: "Published and draft quizzes loaded from the database.",
      };
    case "test":
      return {
        title: "Coding Test Management",
        description: "Coding tests are listed directly from the live test tables.",
      };
    default:
      return {
        title: "Task Management",
        description: "Assignments, quizzes, and coding tests are loaded from the database.",
      };
  }
};

const getStatusBadgeClassName = (status: string) => {
  const normalized = status.trim().toLowerCase();

  if (
    normalized === "published" ||
    normalized === "active" ||
    normalized === "open"
  ) {
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  }

  if (normalized === "draft") {
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  }

  if (normalized === "completed" || normalized === "closed") {
    return "bg-slate-500/10 text-slate-600 border-slate-500/20";
  }

  return "bg-secondary text-secondary-foreground border-border";
};

const getTypeIcon = (type: HubItem["type"]) => {
  switch (type) {
    case "quiz":
      return BookOpen;
    case "test":
      return Code2;
    default:
      return FileText;
  }
};

const buildQuizItems = (quizzes: QuizItem[]): HubItem[] =>
  quizzes.map((quiz) => {
    const numericId = Number(quiz.quiz_id ?? quiz.id ?? 0);
    const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;

    return {
      id: `quiz-${numericId}`,
      numericId,
      type: "quiz",
      title: String(quiz.title ?? "Untitled Quiz"),
      subtitle: String(quiz.cls ?? "No class assigned"),
      status: String(quiz.status ?? "Draft"),
      details: `${questionCount} question${questionCount === 1 ? "" : "s"}${quiz.duration ? ` • ${quiz.duration}` : ""}`,
      timestamp: "",
    };
  });

const buildAssignmentItems = (assignments: AssignmentItem[]): HubItem[] =>
  assignments.map((assignment) => ({
    id: `assignment-${assignment.assignment_id}`,
    numericId: assignment.assignment_id,
    type: "assignment",
    title: assignment.title,
    subtitle: `${assignment.cls} • ${assignment.subject}`,
    status: toDateValue(assignment.due_date) >= Date.now() ? "Open" : "Closed",
    details: `${assignment.submission_count} submission${assignment.submission_count === 1 ? "" : "s"} • Max ${assignment.max_score}`,
    timestamp: assignment.due_date,
  }));

const buildTestItems = (tests: TestItem[]): HubItem[] =>
  tests.map((test) => ({
    id: `test-${test.id}`,
    numericId: test.id,
    type: "test",
    title: test.title,
    subtitle: test.description || "Coding assessment",
    status: test.is_active ? "Active" : "Inactive",
    details: `${Number(test.question_count ?? 0)} question${Number(test.question_count ?? 0) === 1 ? "" : "s"} • ${test.duration_minutes} mins`,
    timestamp: test.start_time || test.end_time,
  }));

const FacultyTaskHub = ({ mode }: { mode: TaskHubMode }) => {
  const navigate = useNavigate();
  const copy = getModeCopy(mode);
  const [items, setItems] = useState<HubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createType, setCreateType] = useState<CreateTaskType>(null);

  const loadItems = async () => {
    setLoading(true);
    setError("");

    const nextItems: HubItem[] = [];
    const nextErrors: string[] = [];
    const requests: Array<Promise<void>> = [];

    if (mode === "all" || mode === "quiz") {
      requests.push(
        requestJson<QuizItem[]>("/api/quizzes")
          .then((quizzes) => {
            nextItems.push(...buildQuizItems(Array.isArray(quizzes) ? quizzes : []));
          })
          .catch((loadError) => {
            nextErrors.push(
              loadError instanceof Error ? loadError.message : "Failed to load quizzes.",
            );
          }),
      );
    }

    if (mode === "all") {
      requests.push(
        requestJson<AssignmentItem[]>("/api/assignments")
          .then((assignments) => {
            nextItems.push(
              ...buildAssignmentItems(
                Array.isArray(assignments) ? assignments : [],
              ),
            );
          })
          .catch((loadError) => {
            nextErrors.push(
              loadError instanceof Error
                ? loadError.message
                : "Failed to load assignments.",
            );
          }),
      );
    }

    if (mode === "all" || mode === "test") {
      requests.push(
        requestJson<TestItem[]>("/api/faculty/tests")
          .then((tests) => {
            nextItems.push(...buildTestItems(Array.isArray(tests) ? tests : []));
          })
          .catch((loadError) => {
            nextErrors.push(
              loadError instanceof Error ? loadError.message : "Failed to load tests.",
            );
          }),
      );
    }

    await Promise.all(requests);

    nextItems.sort((left, right) => {
      const timeDelta = toDateValue(right.timestamp) - toDateValue(left.timestamp);
      if (timeDelta !== 0) {
        return timeDelta;
      }
      return left.title.localeCompare(right.title);
    });

    setItems(nextItems);
    setError(
      nextErrors.length === 0
        ? ""
        : nextErrors.length === requests.length
          ? nextErrors[0]
          : "",
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadItems();
  }, [mode]);

  const counts = useMemo(
    () => ({
      total: items.length,
      quizzes: items.filter((item) => item.type === "quiz").length,
      assignments: items.filter((item) => item.type === "assignment").length,
      tests: items.filter((item) => item.type === "test").length,
    }),
    [items],
  );

  const openCreateModal = (taskType: NonNullable<CreateTaskType>) => {
    setCreateType(taskType);
  };

  const handleOpenItem = (item: HubItem) => {
    if (item.type === "assignment") {
      navigate("/faculty/assignments");
      return;
    }

    if (item.type === "quiz") {
      navigate(`/faculty/quiz-results/${item.numericId}`);
      return;
    }

    navigate(`/faculty/test-results/${item.numericId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {copy.title}
          </h1>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadItems()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {(mode === "all" || mode === "quiz") && (
            <Button onClick={() => openCreateModal("quiz")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Quiz
            </Button>
          )}
          {(mode === "all" || mode === "test") && (
            <Button variant="secondary" onClick={() => openCreateModal("test")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Test
            </Button>
          )}
          {mode === "all" && (
            <Button variant="secondary" onClick={() => openCreateModal("assignment")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: "Total Records", value: counts.total, icon: ClipboardList },
          { label: "Quizzes", value: counts.quizzes, icon: BookOpen },
          { label: "Assignments", value: counts.assignments, icon: FileText },
          { label: "Coding Tests", value: counts.tests, icon: Code2 },
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

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl border border-border/50 p-12 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading live records from the database...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card rounded-2xl border border-border/50 p-12 text-center">
          <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            No records found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This view is now database-only, so nothing will appear here until it is
            created and saved through the backend.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const Icon = getTypeIcon(item.type);

            return (
              <div
                key={item.id}
                className="glass-card rounded-2xl border border-border/50 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-foreground">{item.title}</h2>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClassName(item.status)}
                        >
                          {item.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {item.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.subtitle}
                      </p>
                      <p className="mt-2 text-sm text-foreground/80">{item.details}</p>
                      {item.timestamp ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.type === "assignment" ? "Due" : "Scheduled"}:{" "}
                          {formatDateTime(item.timestamp)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenItem(item)}
                    >
                      {item.type === "assignment" ? "Review" : "View Results"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateTaskModal
        isOpen={createType !== null}
        onClose={() => {
          setCreateType(null);
          void loadItems();
        }}
        taskType={createType}
      />
    </div>
  );
};

export default FacultyTaskHub;
