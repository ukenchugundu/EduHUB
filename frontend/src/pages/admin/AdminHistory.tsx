import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Calendar,
  Clock,
  Search,
  Shield,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

type HistoryIconName = "Users" | "Shield" | "AlertCircle" | "Clock";

interface HistoryItem {
  id: string;
  action: string;
  description: string;
  date: string;
  icon: HistoryIconName;
  createdAt: string;
}

const HISTORY_STORAGE_KEY = "admin_history";

const mockHistory: HistoryItem[] = [
  {
    id: "m1",
    action: "User Created",
    description: "Dr. Smith (Faculty) added to CSE department",
    date: "2024-12-15",
    icon: "Users",
    createdAt: "2024-12-15T10:00:00Z",
  },
  {
    id: "m2",
    action: "Settings Updated",
    description: "Changed password policy for all users",
    date: "2024-12-14",
    icon: "Shield",
    createdAt: "2024-12-14T14:00:00Z",
  },
  {
    id: "m3",
    action: "System Backup",
    description: "Completed automated daily backup",
    date: "2024-12-13",
    icon: "AlertCircle",
    createdAt: "2024-12-13T09:00:00Z",
  },
];

const sortHistoryItems = (items: HistoryItem[]) =>
  [...items].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

const normalizeIconName = (icon: unknown): HistoryIconName => {
  switch (icon) {
    case "Users":
    case "Shield":
    case "AlertCircle":
    case "Clock":
      return icon;
    default:
      return "Clock";
  }
};

const normalizeHistoryItem = (
  item: Partial<HistoryItem>,
  index: number,
): HistoryItem => ({
  id: String(item.id ?? `history-${index + 1}`),
  action: String(item.action ?? "Admin Activity"),
  description: String(item.description ?? "No description provided."),
  date: String(item.date ?? item.createdAt ?? new Date().toISOString()),
  icon: normalizeIconName(item.icon),
  createdAt: String(item.createdAt ?? new Date().toISOString()),
});

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

const getAccentStyles = (iconName: HistoryIconName) => {
  switch (iconName) {
    case "Users":
      return {
        container: "bg-primary/10 text-primary",
        badge: "bg-primary/15 text-primary",
        label: "User Action",
      };
    case "Shield":
      return {
        container: "bg-gold/15 text-gold",
        badge: "bg-gold/15 text-gold",
        label: "Security",
      };
    case "AlertCircle":
      return {
        container: "bg-accent/15 text-accent",
        badge: "bg-accent/15 text-accent",
        label: "System",
      };
    default:
      return {
        container: "bg-secondary text-foreground",
        badge: "bg-secondary text-foreground",
        label: "General",
      };
  }
};

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

const AdminHistory = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    try {
      const storedHistory = JSON.parse(
        localStorage.getItem(HISTORY_STORAGE_KEY) || "[]",
      ) as Partial<HistoryItem>[];

      if (!Array.isArray(storedHistory) || storedHistory.length === 0) {
        setHistory(sortHistoryItems(mockHistory));
        return;
      }

      setHistory(
        sortHistoryItems(
          storedHistory.map((item, index) => normalizeHistoryItem(item, index)),
        ),
      );
    } catch {
      setHistory(sortHistoryItems(mockHistory));
    }
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
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Admin History Log
              </h1>
              <p className="text-sm text-muted-foreground">
                Review platform actions, security events, and recent admin activity.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
          ].map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-2xl p-5 border border-border/50"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3`}
              >
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-xl font-heading font-bold text-foreground mt-1 break-words">
                {card.value}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs by action or description"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-border/70 bg-background/60 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-border/50">
            <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-foreground">
              No history entries found
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Try a different search term or wait for new admin activity to be logged.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredHistory.map((item, index) => {
              const Icon = getIcon(item.icon);
              const accent = getAccentStyles(item.icon);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="glass-card rounded-2xl p-5 border border-border/50 group card-hover"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${accent.container}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.action}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${accent.badge}`}
                          >
                            {accent.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(item.date)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="rounded-xl px-3 py-2 text-sm bg-secondary text-foreground hover:bg-secondary/70 transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </motion.div>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg glass-card rounded-2xl p-6 border border-border/50"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Activity Details
                  </p>
                  <h2 className="text-xl font-heading font-bold text-foreground mt-2">
                    {selectedItem.action}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="rounded-xl bg-secondary/40 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Description
                  </p>
                  <p className="text-foreground mt-2">{selectedItem.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-secondary/40 p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Action Date
                    </p>
                    <p className="text-foreground font-medium mt-2">
                      {formatDate(selectedItem.date)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/40 p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Logged At
                    </p>
                    <p className="text-foreground font-medium mt-2">
                      {formatDateTime(selectedItem.createdAt)}
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
