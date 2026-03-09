import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Code, Clock, Calendar, CheckCircle, ArrowRight, Play } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// Helper to get auth token
const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem("eduhub_auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.token || null;
    }
    return null;
  } catch {
    return null;
  }
};

interface Test {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  attempt_count: number;
  allow_multiple_attempts: boolean;
}

interface TestAttempt {
  id: number;
  test_id: number;
  test_title: string;
  status: string;
  total_score: number;
  start_time: string;
  end_time: string;
}

export const StudentTests: React.FC = () => {
  const navigate = useNavigate();
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [myAttempts, setMyAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "completed">("available");

  useEffect(() => {
    fetchTests();
    fetchAttempts();
  }, []);

  const fetchTests = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/api/tests/available`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTests(data);
      } else {
        // Fallback mock data
        setAvailableTests([
          {
            id: 1,
            title: "Python Basics Test",
            description: "Test your Python programming skills",
            duration_minutes: 60,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            attempt_count: 0,
            allow_multiple_attempts: false,
          },
          {
            id: 2,
            title: "Data Structures Challenge",
            description: "Advanced data structures and algorithms",
            duration_minutes: 90,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            attempt_count: 0,
            allow_multiple_attempts: false,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch tests:", error);
      // Fallback mock data
      setAvailableTests([
        {
          id: 1,
          title: "Python Basics Test",
          description: "Test your Python programming skills",
          duration_minutes: 60,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          attempt_count: 0,
          allow_multiple_attempts: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/api/tests/my-attempts`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyAttempts(data);
      } else {
        // Fallback mock data
        setMyAttempts([
          {
            id: 1,
            test_id: 1,
            test_title: "JavaScript Fundamentals",
            status: "Submitted",
            total_score: 80,
            start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch attempts:", error);
    }
  };

  const startTest = (testId: number) => {
    // Open test in a new tab for better isolation
    window.open(`/student/test/${testId}`, "_blank");
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      "In Progress": "bg-yellow-500",
      Submitted: "bg-green-500",
      Terminated: "bg-red-500",
      "Time Up": "bg-orange-500",
    };
    return statusColors[status] || "bg-gray-500";
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading available tests...</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Coding Assessments</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-13">
              Challenge yourself with coding tests and improve your skills
            </p>
          </div>
          
          <div className="flex bg-secondary/50 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("available")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "available"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Available
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "completed"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My History
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {activeTab === "available" ? (
              availableTests.length === 0 ? (
                <div className="col-span-full glass-card rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No Available Tests</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                    Check back later for new coding assessments from your faculty.
                  </p>
                </div>
              ) : (
                availableTests.map((test) => (
                  <div
                    key={test.id}
                    className="glass-card rounded-2xl p-6 border border-border/50 flex flex-col hover:bg-secondary/20 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                          {test.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {test.description}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${test.attempt_count > 0 ? 'bg-orange-500/10' : 'bg-primary/10'}`}>
                        <Play className={`w-5 h-5 ${test.attempt_count > 0 ? 'text-orange-500' : 'text-primary'}`} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50 mb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5" /> Duration
                        </div>
                        <p className="text-sm font-semibold">{test.duration_minutes} Minutes</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider justify-end">
                          <Calendar className="w-3.5 h-3.5" /> Deadline
                        </div>
                        <p className="text-sm font-semibold">{new Date(test.end_time).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      {test.attempt_count > 0 ? (
                        <Badge variant="outline" className="bg-orange-500/5 text-orange-500 border-orange-500/20">
                          {test.attempt_count} Attempt{test.attempt_count > 1 ? 's' : ''} Done
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                          Not Attempted
                        </Badge>
                      )}

                      <button
                        onClick={() => startTest(test.id)}
                        disabled={test.attempt_count > 0 && !test.allow_multiple_attempts}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                          test.attempt_count > 0 && !test.allow_multiple_attempts
                            ? "bg-secondary text-muted-foreground cursor-not-allowed"
                            : "gradient-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                        }`}
                      >
                        {test.attempt_count > 0 && !test.allow_multiple_attempts
                          ? "Completed"
                          : test.attempt_count > 0 ? "Retake Test" : "Start Now"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : myAttempts.length === 0 ? (
              <div className="col-span-full glass-card rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No Attempts Yet</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                  Once you complete a test, your results and history will appear here.
                </p>
              </div>
            ) : (
              myAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="glass-card rounded-2xl p-5 border border-border/50 flex items-center justify-between hover:bg-secondary/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                      <Code className="w-6 h-6 text-primary/70" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{attempt.test_title}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {new Date(attempt.start_time).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-foreground">
                          Score: {attempt.total_score || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`${getStatusBadge(attempt.status)} text-white border-0 text-[10px] px-2 py-0.5`}>
                      {attempt.status}
                    </Badge>
                    <button className="text-[10px] font-bold text-primary hover:underline">View Results</button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </StudentLayout>
  );
};

export default StudentTests;

