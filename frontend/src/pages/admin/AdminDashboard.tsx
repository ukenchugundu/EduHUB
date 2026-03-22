import AdminLayout from "@/components/AdminLayout";
import { motion } from "framer-motion";
import {
  Activity,
  BookOpen,
  GraduationCap,
  Plus,
  RefreshCw,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { refreshWebsiteData } from "@/lib/appRefresh";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

type MemberRole = "student" | "faculty" | "admin";

interface DashboardMember {
  id: number;
  email: string;
  role: MemberRole;
  fullName: string;
  rollNumber: string;
  createdAt: string;
}

interface AdminDashboardData {
  metrics: {
    totalMembers: number;
    totalStudents: number;
    totalFaculty: number;
    totalAdmins: number;
    quizzesCount: number;
    assignmentsCount: number;
    notesCount: number;
    pendingQuizReviews: number;
    pendingAssignmentReviews: number;
  };
  facultyOverview: {
    total: number;
    pendingQuizReviews: number;
    pendingAssignmentReviews: number;
    recentlyAdded: DashboardMember[];
  };
  studentOverview: {
    total: number;
    recentRegistrations7d: number;
    quizParticipants: number;
    assignmentSubmitters: number;
    recentlyAdded: DashboardMember[];
  };
  recentMembers: DashboardMember[];
}

interface ApiErrorBody {
  error?: string;
}

const fetchDashboardData = async (
  signal?: AbortSignal,
): Promise<AdminDashboardData> => {
  const token = getStoredAuthToken();
  const response = await fetch(`${API_BASE}/api/auth/admin/dashboard`, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await response.json().catch(() => ({}))) as ApiResponse<AdminDashboardData>;
  if (!response.ok) {
    const apiBody = body as ApiErrorBody;
    throw new Error(apiBody.error || "Failed to load admin dashboard data.");
  }
  return body as AdminDashboardData;
};

const fetchBatches = async (signal?: AbortSignal): Promise<Batch[]> => {
  const token = getStoredAuthToken();
  const response = await fetch(`${API_BASE}/api/attendance/batches`, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await response.json().catch(() => ([]))) as ApiResponse<Batch[]>;
  if (!response.ok) {
    const apiBody = body as ApiErrorBody;
    throw new Error(apiBody.error || "Failed to load batches.");
  }
  return body as Batch[];
};

const fetchBatchAllocations = async (
  signal?: AbortSignal,
): Promise<BatchAllocation[]> => {
  const token = getStoredAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/batch-allocations`, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await response.json().catch(() => ([]))) as ApiResponse<BatchAllocation[]>;
  if (!response.ok) {
    const apiBody = body as ApiErrorBody;
    throw new Error(apiBody.error || "Failed to load batch allocations.");
  }
  return body as BatchAllocation[];
};

const saveBatchAllocation = async (allocation: {
  allocationId?: number | null;
  batchId: number;
  allocationType: "classroom" | "lab";
  location: string;
  notes?: string;
}): Promise<BatchAllocation> => {
  const token = getStoredAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/batch-allocations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(allocation),
  });
  const body = (await response.json().catch(() => ({}))) as ApiResponse<BatchAllocation>;
  if (!response.ok) {
    const apiBody = body as ApiErrorBody;
    throw new Error(apiBody.error || "Failed to save batch allocation.");
  }
  return body as BatchAllocation;
};

const deleteBatchAllocation = async (allocationId: number): Promise<void> => {
  const token = getStoredAuthToken();
  const response = await fetch(
    `${API_BASE}/api/admin/batch-allocations/${allocationId}`,
    {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody;
    throw new Error(body.error || "Failed to delete batch allocation.");
  }
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
};

const getStoredAuthToken = (): string => {
  return readStoredAuth()?.token?.trim() ?? "";
};

interface Batch {
  id: number;
  name: string;
  department_name: string;
  department_code: string;
  academic_year: string;
  semester: number;
}

interface BatchAllocation {
  id: number;
  batch_id: number;
  allocation_type: "classroom" | "lab";
  location: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

type ApiResponse<T> = T | ApiErrorBody;

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState("");

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AdminDashboardData, Error>({
    queryKey: ["admin-dashboard-data"],
    queryFn: ({ signal }) => fetchDashboardData(signal),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 1,
  });

  const [allocationFilterBatchId, setAllocationFilterBatchId] = useState<number | null>(null);
  const [allocationFormBatchId, setAllocationFormBatchId] = useState<number | null>(null);
  const [allocationFormType, setAllocationFormType] = useState<"classroom" | "lab">("classroom");
  const [allocationFormLocation, setAllocationFormLocation] = useState("");
  const [allocationFormNotes, setAllocationFormNotes] = useState("");
  const [editingAllocationId, setEditingAllocationId] = useState<number | null>(null);
  const [allocationMessage, setAllocationMessage] = useState<string | null>(null);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  const {
    data: batches,
    isLoading: isBatchesLoading,
    isError: isBatchesError,
    error: batchesError,
  } = useQuery<Batch[], Error>({
    queryKey: ["admin-batches"],
    queryFn: ({ signal }) => fetchBatches(signal),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: allocations,
    isLoading: isAllocationsLoading,
    isError: isAllocationsError,
    error: allocationsError,
    refetch: refetchAllocations,
  } = useQuery<BatchAllocation[], Error>({
    queryKey: ["admin-batch-allocations"],
    queryFn: ({ signal }) => fetchBatchAllocations(signal),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefreshWebsite = async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    try {
      await refreshWebsiteData(queryClient);
      await refetch();
      await refetchAllocations();
      setLastSyncedAt(new Date().toLocaleTimeString());
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetAllocationForm = () => {
    setEditingAllocationId(null);
    setAllocationFormBatchId(null);
    setAllocationFormType("classroom");
    setAllocationFormLocation("");
    setAllocationFormNotes("");
    setAllocationMessage(null);
    setAllocationError(null);
  };

  const loadAllocationIntoForm = (allocation: BatchAllocation) => {
    setEditingAllocationId(allocation.id);
    setAllocationFormBatchId(allocation.batch_id);
    setAllocationFormType(allocation.allocation_type);
    setAllocationFormLocation(allocation.location);
    setAllocationFormNotes(allocation.notes ?? "");
    setAllocationMessage(null);
    setAllocationError(null);
  };

  const handleAllocationSubmit = async () => {
    setAllocationMessage(null);
    setAllocationError(null);

    if (!allocationFormBatchId) {
      setAllocationError("Please select a batch.");
      return;
    }

    if (!allocationFormLocation.trim()) {
      setAllocationError("Please enter a location.");
      return;
    }

    try {
      await saveBatchAllocation({
        allocationId: editingAllocationId,
        batchId: allocationFormBatchId,
        allocationType: allocationFormType,
        location: allocationFormLocation.trim(),
        notes: allocationFormNotes.trim() || undefined,
      });

      resetAllocationForm();
      setAllocationMessage("Allocation saved successfully.");
      await refetchAllocations();
    } catch (error) {
      setAllocationError(
        error instanceof Error
          ? error.message
          : "Failed to save allocation. Please try again.",
      );
    }
  };

  const handleAllocationDelete = async (allocationId: number) => {
    if (!window.confirm("Delete this allocation?")) {
      return;
    }

    try {
      await deleteBatchAllocation(allocationId);
      resetAllocationForm();
      setAllocationMessage("Allocation deleted successfully.");
      await refetchAllocations();
    } catch (error) {
      setAllocationError(
        error instanceof Error
          ? error.message
          : "Failed to delete allocation. Please try again.",
      );
    }
  };

  const filteredAllocations = (allocations ?? []).filter((a) =>
    allocationFilterBatchId ? a.batch_id === allocationFilterBatchId : true,
  );

  const dashboard: AdminDashboardData = dashboardData ?? {
    metrics: {
      totalMembers: 0,
      totalStudents: 0,
      totalFaculty: 0,
      totalAdmins: 0,
      quizzesCount: 0,
      assignmentsCount: 0,
      notesCount: 0,
      pendingQuizReviews: 0,
      pendingAssignmentReviews: 0,
    },
    facultyOverview: {
      total: 0,
      pendingQuizReviews: 0,
      pendingAssignmentReviews: 0,
      recentlyAdded: [],
    },
    studentOverview: {
      total: 0,
      recentRegistrations7d: 0,
      quizParticipants: 0,
      assignmentSubmitters: 0,
      recentlyAdded: [],
    },
    recentMembers: [],
  };

  const statCards = [
    {
      label: "Total Students",
      value: dashboard.metrics.totalStudents,
      icon: GraduationCap,
      gradient: "from-primary to-primary/60",
    },
    {
      label: "Total Faculty",
      value: dashboard.metrics.totalFaculty,
      icon: Users,
      gradient: "from-accent to-accent/60",
    },
    {
      label: "Admins",
      value: dashboard.metrics.totalAdmins,
      icon: Shield,
      gradient: "from-gold to-gold/60",
    },
    {
      label: "Members Total",
      value: dashboard.metrics.totalMembers,
      icon: Activity,
      gradient: "from-destructive to-destructive/60",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshWebsite}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 disabled:opacity-70"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {lastSyncedAt
            ? `Last synced at ${lastSyncedAt}.`
            : "Refresh pulls latest updates across the website."}
        </p>

        {isError ? (
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-destructive">
              {error?.message ?? "Failed to load dashboard data."}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-2xl p-5 card-hover"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-heading font-bold text-foreground">
                {isLoading ? "..." : stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gold" /> Faculty Overview
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Total Faculty Accounts
                </span>
                <span className="font-semibold text-foreground">
                  {dashboard.facultyOverview.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Pending Quiz Reviews
                </span>
                <span className="font-semibold text-foreground">
                  {dashboard.facultyOverview.pendingQuizReviews}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Pending Assignment Reviews
                </span>
                <span className="font-semibold text-foreground">
                  {dashboard.facultyOverview.pendingAssignmentReviews}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" /> Student
              Overview
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Total Student Accounts
                </span>
                <span className="font-semibold text-foreground">
                  {dashboard.studentOverview.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  New Registrations (7 days)
                </span>
                <span className="font-semibold text-foreground">
                  {dashboard.studentOverview.recentRegistrations7d}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quiz Participants</span>
                <span className="font-semibold text-foreground">
                  {dashboard.studentOverview.quizParticipants}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Assignment Submitters
                </span>
                <span className="font-semibold text-foreground">
                  {dashboard.studentOverview.assignmentSubmitters}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" /> Platform Activity
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quizzes</span>
                <span className="font-semibold text-foreground">
                  {dashboard.metrics.quizzesCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assignments</span>
                <span className="font-semibold text-foreground">
                  {dashboard.metrics.assignmentsCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Notes</span>
                <span className="font-semibold text-foreground">
                  {dashboard.metrics.notesCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Pending Quiz Review
                </span>
                <span className="font-semibold text-foreground">
                  {dashboard.metrics.pendingQuizReviews}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Pending Assignment Review
                </span>
                <span className="font-semibold text-foreground">
                  {dashboard.metrics.pendingAssignmentReviews}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" /> Recent Faculty Members
            </h2>
            <div className="space-y-3">
              {dashboard.facultyOverview.recentlyAdded.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No faculty accounts yet.
                </p>
              ) : (
                dashboard.facultyOverview.recentlyAdded.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-xl bg-secondary/40 p-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {member.fullName || member.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Added: {formatDateTime(member.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" /> Recent Student
              Members
            </h2>
            <div className="space-y-3">
              {dashboard.studentOverview.recentlyAdded.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No student accounts yet.
                </p>
              ) : (
                dashboard.studentOverview.recentlyAdded.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-xl bg-secondary/40 p-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {member.fullName || member.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Roll No: {member.rollNumber || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Added: {formatDateTime(member.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" /> Classroom & Lab
            Allocations
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Filter by batch
                </label>
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  value={allocationFilterBatchId ?? ""}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setAllocationFilterBatchId(Number.isFinite(value) ? value : null);
                  }}
                >
                  <option value="">All batches</option>
                  {batches?.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name} ({batch.department_code} | {batch.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Batch
                </label>
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  value={allocationFormBatchId ?? ""}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setAllocationFormBatchId(Number.isFinite(value) ? value : null);
                  }}
                >
                  <option value="">Select batch</option>
                  {batches?.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name} ({batch.department_code} | {batch.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Type
                </label>
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  value={allocationFormType}
                  onChange={(event) =>
                    setAllocationFormType(
                      event.target.value === "lab" ? "lab" : "classroom",
                    )
                  }
                >
                  <option value="classroom">Classroom</option>
                  <option value="lab">Lab</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Location
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  value={allocationFormLocation}
                  onChange={(event) => setAllocationFormLocation(event.target.value)}
                  placeholder="e.g. Room 101, Lab 3"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  value={allocationFormNotes}
                  onChange={(event) => setAllocationFormNotes(event.target.value)}
                  placeholder="Any additional details"
                />
              </div>
            </div>

            {allocationMessage ? (
              <div className="rounded-xl border border-emerald-400 bg-emerald-500/10 p-3 text-sm text-emerald-700">
                {allocationMessage}
              </div>
            ) : null}
            {allocationError ? (
              <div className="rounded-xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {allocationError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAllocationSubmit}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                {editingAllocationId ? "Update Allocation" : "Save Allocation"}
              </button>
              <button
                type="button"
                onClick={resetAllocationForm}
                className="rounded-xl border border-border px-4 py-2 text-sm"
              >
                Reset
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Batch</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Notes</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isAllocationsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-sm text-muted-foreground">
                        Loading allocations...
                      </td>
                    </tr>
                  ) : filteredAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-sm text-muted-foreground">
                        No allocations found.
                      </td>
                    </tr>
                  ) : (
                    filteredAllocations.map((allocation) => {
                      const batch = batches?.find((b) => b.id === allocation.batch_id);
                      return (
                        <tr
                          key={allocation.id}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-3">
                            {batch ? `${batch.name} (${batch.department_code})` : allocation.batch_id}
                          </td>
                          <td className="px-3 py-3">
                            {allocation.allocation_type}
                          </td>
                          <td className="px-3 py-3">{allocation.location}</td>
                          <td className="px-3 py-3">{allocation.notes || "-"}</td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => loadAllocationIntoForm(allocation)}
                              className="mr-2 text-sm font-semibold text-primary"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAllocationDelete(allocation.id)}
                              className="text-sm font-semibold text-destructive"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
