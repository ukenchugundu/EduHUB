import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

export interface FacultyClassAllocationOption {
  className: string;
  batchId: number | null;
  department: string;
  academicYear: string;
  section: string;
  studentCount: number;
}

interface FacultyClassAllocationsResponse {
  classAllocations?: FacultyClassAllocationOption[];
}

const normalizeClassName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

export const getFacultyClassOptionKey = (
  option: Pick<FacultyClassAllocationOption, "className" | "batchId">,
): string =>
  option.batchId && option.batchId > 0
    ? `batch:${option.batchId}`
    : `class:${normalizeClassName(option.className)}`;

export const mergeFacultyClassAllocationOptions = (
  options: FacultyClassAllocationOption[],
): FacultyClassAllocationOption[] => {
  const byKey = new Map<string, FacultyClassAllocationOption>();

  for (const option of options) {
    const className = option.className.trim();
    if (!className) {
      continue;
    }

    const normalizedOption: FacultyClassAllocationOption = {
      className,
      batchId:
        typeof option.batchId === "number" && option.batchId > 0
          ? option.batchId
          : null,
      department: option.department?.trim() ?? "",
      academicYear: option.academicYear?.trim() ?? "",
      section: option.section?.trim() ?? "",
      studentCount:
        typeof option.studentCount === "number" && Number.isFinite(option.studentCount)
          ? Math.max(0, option.studentCount)
          : 0,
    };

    const key = getFacultyClassOptionKey(normalizedOption);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, normalizedOption);
      continue;
    }

    byKey.set(key, {
      ...existing,
      department: existing.department || normalizedOption.department,
      academicYear: existing.academicYear || normalizedOption.academicYear,
      section: existing.section || normalizedOption.section,
      studentCount: Math.max(existing.studentCount, normalizedOption.studentCount),
    });
  }

  return Array.from(byKey.values()).sort((left, right) =>
    left.className.localeCompare(right.className),
  );
};

export const fetchFacultyClassAllocations = async (
  signal?: AbortSignal,
): Promise<FacultyClassAllocationOption[]> => {
  const token = readStoredAuth()?.token?.trim();
  if (!token) {
    return [];
  }

  const response = await fetch(`${API_BASE}/api/faculty/class-allocations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    throw new Error(
      body?.error || body?.message || "Failed to load assigned classes.",
    );
  }

  const body = (await response.json()) as FacultyClassAllocationsResponse;
  const allocations = Array.isArray(body.classAllocations)
    ? body.classAllocations
    : [];
  return mergeFacultyClassAllocationOptions(allocations);
};
