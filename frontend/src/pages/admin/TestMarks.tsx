import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Search,
  Trophy,
  UserRound,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { buildApiUrl } from "@/lib/apiUrl";

interface Mark {
  userId: string;
  name: string;
  total_score: number;
}

const formatScore = (score: number) =>
  Number.isFinite(score) ? score.toFixed(score % 1 === 0 ? 0 : 2) : "0";

const TestMarks: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchMarks = async () => {
      if (!testId) {
        if (isMounted) {
          setError("Missing test id.");
          setLoading(false);
        }
        return;
      }

      try {
        setError("");
        const response = await fetch(
          buildApiUrl(`/api/faculty/marks/${testId}`),
        );
        if (!response.ok) {
          throw new Error("Failed to fetch marks");
        }

        const data = (await response.json()) as Mark[];
        if (isMounted) {
          setMarks(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching marks:", error);
        if (isMounted) {
          setError(
            error instanceof Error ? error.message : "Failed to fetch marks",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMarks();

    return () => {
      isMounted = false;
    };
  }, [testId]);

  const filteredMarks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const rankedMarks = [...marks].sort(
      (left, right) => right.total_score - left.total_score,
    );

    if (!normalizedQuery) {
      return rankedMarks;
    }

    return rankedMarks.filter(
      (mark) =>
        mark.name.toLowerCase().includes(normalizedQuery) ||
        mark.userId.toLowerCase().includes(normalizedQuery),
    );
  }, [marks, searchQuery]);

  const averageScore = useMemo(() => {
    if (marks.length === 0) {
      return "0";
    }

    const total = marks.reduce((sum, mark) => sum + mark.total_score, 0);
    return formatScore(total / marks.length);
  }, [marks]);

  const highestScore = useMemo(() => {
    if (marks.length === 0) {
      return "0";
    }

    return formatScore(
      Math.max(...marks.map((mark) => mark.total_score)),
    );
  }, [marks]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Test Marks
              </h1>
              <p className="text-sm text-muted-foreground">
                Review student marks for test {testId ?? "-"}.
              </p>
            </div>
          </div>

          <Link
            to="/admin/marks"
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tests
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { label: "Entries", value: marks.length, icon: UserRound, gradient: "from-primary to-primary/60" },
            { label: "Average Score", value: averageScore, icon: BarChart3, gradient: "from-accent to-accent/60" },
            { label: "Highest Score", value: highestScore, icon: Trophy, gradient: "from-gold to-gold/60" },
          ].map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-2xl p-5 border border-border/50 card-hover"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-heading font-bold text-foreground">
                {loading ? "..." : card.value}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by student name or ID"
              className="w-full rounded-xl border border-border/70 bg-background/60 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {error ? (
          <div className="glass-card rounded-2xl p-4 border border-destructive/30 bg-destructive/10">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="glass-card rounded-2xl p-5 border border-border/50 animate-pulse"
              >
                <div className="h-4 bg-secondary rounded w-1/3 mb-3" />
                <div className="h-6 bg-secondary rounded w-2/3 mb-4" />
                <div className="h-12 bg-secondary rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredMarks.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-border/50">
            <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <UserRound className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-foreground">
              No marks found
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {marks.length === 0
                ? "No mark entries are available for this test yet."
                : "Try a different search term to find a student record."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredMarks.map((mark, index) => (
              <motion.div
                key={mark.userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-2xl p-5 border border-border/50 card-hover"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center shrink-0">
                      <UserRound className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {mark.userId}
                      </p>
                      <h3 className="text-lg font-heading font-semibold text-foreground truncate mt-1">
                        {mark.name}
                      </h3>
                    </div>
                  </div>

                  <span className="inline-flex items-center rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">
                    {formatScore(mark.total_score)}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Rank</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      #{index + 1}
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {formatScore(mark.total_score)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TestMarks;
