import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Flag,
  Loader2,
  Shield,
  Users,
} from "lucide-react";
import FacultyLayout from "@/components/FacultyLayout";
import { requestJson as apiRequestJson } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

interface QuestionSubmission {
  id?: number;
  status?: string;
  score?: number;
  test_cases_passed?: number;
  total_test_cases?: number;
  execution_time?: number;
}

interface TestAttemptResult {
  attempt_id: number;
  student_id: string;
  student_name: string;
  status: string;
  plagiarism_score: number;
  cheating_flags: unknown[];
  is_flagged: boolean;
  total_events: number;
  suspicious_events: number;
  submissions: QuestionSubmission[];
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
      fallbackError: "Failed to load coding test results.",
      retries: 1,
      timeoutMs: 8000,
      includeAuth: false,
    },
  );
};

const getRiskLabel = (item: TestAttemptResult) => {
  if (item.is_flagged || item.plagiarism_score >= 0.8) {
    return "High";
  }
  if (item.plagiarism_score >= 0.4 || item.suspicious_events >= 3) {
    return "Medium";
  }
  return "Low";
};

const FacultyTestResults = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const [results, setResults] = useState<TestAttemptResult[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<TestAttemptResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const parsedTestId = Number(testId);

  const loadResults = async () => {
    if (!Number.isInteger(parsedTestId) || parsedTestId <= 0) {
      setError("Invalid test id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await requestJson<TestAttemptResult[]>(
        `/api/tests/${parsedTestId}/results`,
      );
      const rows = Array.isArray(data) ? data : [];
      setResults(rows);
      if (rows.length > 0) {
        setSelectedAttempt((current) =>
          current
            ? rows.find((row) => row.attempt_id === current.attempt_id) ?? rows[0]
            : rows[0],
        );
      } else {
        setSelectedAttempt(null);
      }
    } catch (loadError) {
      setResults([]);
      setSelectedAttempt(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load coding test results.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, [parsedTestId]);

  const counts = useMemo(
    () => ({
      total: results.length,
      flagged: results.filter((row) => row.is_flagged).length,
      suspicious: results.filter((row) => row.suspicious_events > 0).length,
      clean: results.filter(
        (row) => !row.is_flagged && row.plagiarism_score < 0.4,
      ).length,
    }),
    [results],
  );

  return (
    <FacultyLayout title="Coding Test Results">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Coding Test Results
              </h1>
              <p className="text-sm text-muted-foreground">
                This page now reads the anti-cheating report directly from the test
                database tables.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadResults()}>
            Refresh
          </Button>
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
              Loading coding test results from the database...
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[
                { label: "Attempts", value: counts.total, icon: Users },
                { label: "Flagged", value: counts.flagged, icon: Flag },
                { label: "Suspicious", value: counts.suspicious, icon: AlertTriangle },
                { label: "Low Risk", value: counts.clean, icon: CheckCircle2 },
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

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="glass-card rounded-2xl border border-border/50 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Student Attempts
                  </h2>
                </div>
                {results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No test attempts were found for this coding assessment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {results.map((item) => {
                      const risk = getRiskLabel(item);
                      return (
                        <button
                          key={item.attempt_id}
                          type="button"
                          onClick={() => setSelectedAttempt(item)}
                          className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                            selectedAttempt?.attempt_id === item.attempt_id
                              ? "border-primary bg-primary/5"
                              : "border-border/50 bg-background/60 hover:bg-background"
                          }`}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-medium text-foreground">
                                {item.student_name || item.student_id}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {item.student_id} • {item.status}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">{risk} Risk</Badge>
                              <Badge variant="outline">
                                Plagiarism: {(item.plagiarism_score * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl border border-border/50 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Attempt Details
                  </h2>
                </div>
                {!selectedAttempt ? (
                  <p className="text-sm text-muted-foreground">
                    Select an attempt to review anti-cheat details and submissions.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                      <p className="font-medium text-foreground">
                        {selectedAttempt.student_name || selectedAttempt.student_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedAttempt.student_id}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="mt-1 font-medium text-foreground">
                          {selectedAttempt.status}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                        <p className="text-xs text-muted-foreground">Risk</p>
                        <p className="mt-1 font-medium text-foreground">
                          {getRiskLabel(selectedAttempt)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                        <p className="text-xs text-muted-foreground">Plagiarism</p>
                        <p className="mt-1 font-medium text-foreground">
                          {(selectedAttempt.plagiarism_score * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                        <p className="text-xs text-muted-foreground">
                          Suspicious Events
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                          {selectedAttempt.suspicious_events}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                      <p className="mb-3 text-sm font-medium text-foreground">
                        Question Submissions
                      </p>
                      {selectedAttempt.submissions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No saved question submissions were returned for this attempt.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {selectedAttempt.submissions.map((submission, index) => (
                            <div
                              key={submission.id ?? index}
                              className="rounded-xl border border-border/50 bg-background p-3"
                            >
                              <p className="font-medium text-foreground">
                                Question {index + 1}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {submission.status || "Unknown"} • Score{" "}
                                {submission.score ?? 0}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Passed {submission.test_cases_passed ?? 0}/
                                {submission.total_test_cases ?? 0} test cases •{" "}
                                {submission.execution_time ?? 0} ms
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

export default FacultyTestResults;
