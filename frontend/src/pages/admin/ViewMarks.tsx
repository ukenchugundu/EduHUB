import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface Test {
  id: number;
  title: string;
  created_at: string;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
};

const ViewMarks: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchTests = async () => {
      try {
        setError("");
        const response = await fetch("/api/faculty/tests/marks");
        if (!response.ok) {
          throw new Error("Failed to fetch tests.");
        }

        const data = (await response.json()) as Test[];
        if (isMounted) {
          setTests(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        console.error("Error fetching tests:", fetchError);
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to fetch tests.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTests();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return tests;
    }

    return tests.filter((test) =>
      test.title.toLowerCase().includes(normalizedQuery),
    );
  }, [tests, searchQuery]);

  const latestTest = useMemo(
    () =>
      [...tests].sort(
        (left, right) =>
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime(),
      )[0],
    [tests],
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                View Marks
              </h1>
              <p className="text-sm text-muted-foreground">
                Review test mark sheets and open detailed results for each exam.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            {
              label: "Available Tests",
              value: tests.length,
              icon: BarChart3,
              gradient: "from-primary to-primary/60",
            },
            {
              label: "Filtered Results",
              value: filteredTests.length,
              icon: Search,
              gradient: "from-accent to-accent/60",
            },
            {
              label: "Latest Upload",
              value: latestTest ? formatDate(latestTest.created_at) : "-",
              icon: Calendar,
              gradient: "from-gold to-gold/60",
            },
          ].map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-2xl p-5 card-hover border border-border/50"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3`}
              >
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-heading font-bold text-foreground mt-1 break-words">
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
              className="w-full rounded-xl border border-border/70 bg-background/60 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Search tests by title"
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
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="glass-card rounded-2xl p-5 border border-border/50 animate-pulse"
              >
                <div className="h-4 bg-secondary rounded w-1/4 mb-3" />
                <div className="h-6 bg-secondary rounded w-3/4 mb-4" />
                <div className="h-10 bg-secondary rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-border/50">
            <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-foreground">
              No tests found
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {tests.length === 0
                ? "Marks will appear here once tests with uploaded scores are available."
                : "Try a different search term to find the required test."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredTests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="glass-card rounded-2xl p-5 border border-border/50 card-hover"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Test #{test.id}
                      </p>
                      <h3 className="text-lg font-heading font-semibold text-foreground truncate mt-1">
                        {test.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Uploaded on {formatDateTime(test.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold">
                    Marks Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Created Date</p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {formatDate(test.created_at)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Portal Route</p>
                    <p className="text-sm font-medium text-foreground mt-1 truncate">
                      /admin/marks/{test.id}
                    </p>
                  </div>
                </div>

                <Link
                  to={`/admin/marks/${test.id}`}
                  className="mt-5 inline-flex w-full items-center justify-between rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-gold/15"
                >
                  <span className="inline-flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gold" />
                    Open Mark Sheet
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ViewMarks;
