import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import FacultyLayout from "@/components/FacultyLayout";
import { requestJson as apiRequestJson } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

interface QuizResultRow {
  attempt_id: number;
  quiz_id: number;
  quiz_title: string;
  cls: string;
  student_id: string;
  submitted_at: string | null;
  auto_score: number;
  total_questions: number;
  faculty_score: number | null;
  reviewed_at: string | null;
}

const requestJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const token = readStoredAuth()?.token?.trim();
  return apiRequestJson<T>(
    `${API_BASE}${path}`,
    {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    },
    {
      fallbackError: "Failed to load quiz results.",
      retries: 1,
      timeoutMs: 8000,
      includeAuth: false,
    },
  );
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Not submitted";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const FacultyQuizResults = () => {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentFilter = searchParams.get("student");
  const [results, setResults] = useState<QuizResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingAttemptId, setEditingAttemptId] = useState<number | null>(null);
  const [draftScore, setDraftScore] = useState("");

  const parsedQuizId = Number(quizId);

  const loadResults = async () => {
    if (!Number.isInteger(parsedQuizId) || parsedQuizId <= 0) {
      setError("Invalid quiz id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await requestJson<QuizResultRow[]>(
        `/api/faculty/results?quizId=${parsedQuizId}`,
      );
      setResults(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setResults([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load quiz results.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, [parsedQuizId]);

  const filteredResults = useMemo(
    () =>
      studentFilter
        ? results.filter((row) => row.student_id === studentFilter)
        : results,
    [results, studentFilter],
  );

  const averageScore = useMemo(() => {
    const scoredRows = filteredResults.filter(
      (row) => row.faculty_score !== null || row.auto_score !== null,
    );
    if (scoredRows.length === 0) {
      return 0;
    }

    const total = scoredRows.reduce(
      (sum, row) => sum + Number(row.faculty_score ?? row.auto_score ?? 0),
      0,
    );

    return Math.round((total / scoredRows.length) * 100) / 100;
  }, [filteredResults]);

  const handleSaveScore = async (attemptId: number) => {
    const score = Number(draftScore);
    if (!Number.isFinite(score) || score < 0) {
      setError("Enter a valid non-negative score.");
      return;
    }

    try {
      const updated = await requestJson<QuizResultRow>(
        `/api/faculty/results/${attemptId}/score`,
        {
          method: "PATCH",
          body: JSON.stringify({ score }),
        },
      );

      setResults((current) =>
        current.map((row) =>
          row.attempt_id === attemptId ? updated : row,
        ),
      );
      setEditingAttemptId(null);
      setDraftScore("");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update faculty score.",
      );
    }
  };

  return (
    <FacultyLayout title="Quiz Results">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Quiz Results
              </h1>
              <p className="text-sm text-muted-foreground">
                Quiz attempts and faculty scores are now loaded from the database.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadResults()}>
            Refresh
          </Button>
        </div>

        {studentFilter ? (
          <div className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm">
            Showing only attempts for <strong>{studentFilter}</strong>.
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="ml-3 text-primary underline"
            >
              Clear filter
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="glass-card rounded-2xl border border-border/50 p-12 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading quiz results from the database...
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[
                { label: "Attempts", value: filteredResults.length, icon: Users },
                {
                  label: "Reviewed",
                  value: filteredResults.filter((row) => row.reviewed_at).length,
                  icon: CheckCircle2,
                },
                { label: "Average Score", value: averageScore, icon: TrendingUp },
                {
                  label: "In Review",
                  value: filteredResults.filter((row) => !row.reviewed_at).length,
                  icon: Clock,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="glass-card rounded-2xl border border-border/50 p-5"
                >
                  <div className="mb-3 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-heading font-bold text-foreground">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-2xl border border-border/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Student Quiz Attempts
                </h2>
              </div>
              {filteredResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No quiz attempts were found for this quiz.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredResults.map((row) => (
                    <div
                      key={row.attempt_id}
                      className="rounded-2xl border border-border/50 bg-background/60 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {row.student_id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {row.cls || "Class not set"} • {formatDateTime(row.submitted_at)}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Auto score: {row.auto_score}/{row.total_questions}
                          </p>
                        </div>

                        <div className="flex flex-col items-start gap-3 lg:items-end">
                          <Badge variant="outline">
                            {row.reviewed_at ? "Reviewed" : "Pending Review"}
                          </Badge>
                          {editingAttemptId === row.attempt_id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className="w-28"
                                value={draftScore}
                                onChange={(event) => setDraftScore(event.target.value)}
                              />
                              <Button
                                size="sm"
                                onClick={() => void handleSaveScore(row.attempt_id)}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                Faculty score:{" "}
                                {row.faculty_score ?? row.auto_score}/{row.total_questions}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingAttemptId(row.attempt_id);
                                  setDraftScore(
                                    String(row.faculty_score ?? row.auto_score ?? 0),
                                  );
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyQuizResults;
