import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Clock,
  Loader2,
  Search,
  Shield,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

type HistoryIconName = "Users" | "Shield" | "AlertCircle" | "Clock";

interface HistoryItem {
  id: number;
  actorUserId: number | null;
  action: string;
  description: string;
  icon: HistoryIconName;
  createdAt: string;
}

const requestHistory = async (): Promise<HistoryItem[]> => {
  const token = readStoredAuth()?.token?.trim();
  const response = await fetch(`${API_BASE}/api/admin/history`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    throw new Error(body?.error || body?.message || "Failed to load admin history.");
  }

  const payload = (await response.json()) as { history?: HistoryItem[] };
  return Array.isArray(payload.history) ? payload.history : [];
};

const getIcon = (iconName: HistoryIconName) => {
  switch (iconName) {
    case "Users":
      return Users;
    case "Shield":
      return Shield;
    case "AlertCircle":
      return AlertCircle;
    default:
      return Clock;
  }
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString();
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
};

const AdminHistory = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const rows = await requestHistory();
      setHistory(
        rows
          .slice()
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime(),
          ),
      );
    } catch (loadError) {
      setHistory([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load admin history.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return history;
    }

    return history.filter(
      (item) =>
        item.action.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery),
    );
  }, [history, searchQuery]);

  const latestItem = history[0] ?? null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-gold">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Admin History Log
              </h1>
              <p className="text-sm text-muted-foreground">
                Recent admin activity pulled from the database-backed activity log.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="rounded-xl bg-secondary px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary/80"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Entries",
              value: history.length,
              icon: Activity,
              gradient: "from-primary to-primary/60",
            },
            {
              label: "Matching Results",
              value: filteredHistory.length,
              icon: Search,
              gradient: "from-accent to-accent/60",
            },
            {
              label: "Latest Activity",
              value: latestItem ? formatDate(latestItem.createdAt) : "-",
              icon: Clock,
              gradient: "from-gold to-gold/60",
            },
            {
              label: "Top Event",
              value: latestItem?.action ?? "No activity",
              icon: Shield,
              gradient: "from-destructive to-destructive/60",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="glass-card rounded-2xl border border-border/50 p-5"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient}`}
              >
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-1 break-words text-xl font-heading font-bold text-foreground">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl border border-border/50 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs by action or description"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-border/70 bg-background/60 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
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
              Loading admin activity from the database...
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="glass-card rounded-2xl border border-border/50 p-12 text-center">
            <Clock className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
            <h3 className="text-lg font-heading font-semibold text-foreground">
              No history entries found
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This page no longer uses local mock history, so only real logged admin
              actions will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredHistory.map((item) => {
              const Icon = getIcon(item.icon);
              return (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl border border-border/50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-foreground">
                          {item.action}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="rounded-xl bg-secondary px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/70"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={(event) => event.stopPropagation()}
              className="glass-card w-full max-w-lg rounded-2xl border border-border/50 p-6"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Activity Details
                  </p>
                  <h2 className="mt-2 text-xl font-heading font-bold text-foreground">
                    {selectedItem.action}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="rounded-xl bg-secondary/40 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-2 text-foreground">{selectedItem.description}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-secondary/40 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Logged At
                    </p>
                    <p className="mt-2 font-medium text-foreground">
                      {formatDateTime(selectedItem.createdAt)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/40 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Actor User ID
                    </p>
                    <p className="mt-2 font-medium text-foreground">
                      {selectedItem.actorUserId ?? "System"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminHistory;
