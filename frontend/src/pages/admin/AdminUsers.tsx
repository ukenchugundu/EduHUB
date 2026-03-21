import AdminLayout from "@/components/AdminLayout";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  GraduationCap,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { refreshWebsiteData } from "@/lib/appRefresh";
import { requestJson as apiRequestJson } from "@/lib/apiClient";
import { readStoredAuth } from "@/lib/authSession";
import {
  getFacultyClassOptionKey,
  mergeFacultyClassAllocationOptions,
  type FacultyClassAllocationOption,
} from "@/lib/facultyClassAllocations";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

type ManagedRole = "student" | "faculty" | "admin";
type MemberFilterRole = "all" | ManagedRole;

interface AdminMember {
  id: number;
  email: string;
  role: ManagedRole;
  fullName: string;
  rollNumber: string;
  phone: string;
  department: string;
  year: string;
  section: string;
  designation: string;
  createdAt: string;
  updatedAt: string;
  assignedClasses: FacultyClassAllocationOption[];
}

interface AdminMembersData {
  members: AdminMember[];
  counts: {
    total: number;
    faculty: number;
    students: number;
    admins: number;
  };
}

interface ApiErrorBody {
  error?: string;
}

interface EditFormState {
  fullName: string;
  email: string;
  rollNumber: string;
  password: string;
}

interface FacultyFormState {
  facultyId: string;
  name: string;
  email: string;
  password: string;
  department: string;
  designation: string;
  phone: string;
  role: "faculty";
}

interface StudentFormState {
  studentId: string;
  name: string;
  email: string;
  password: string;
  department: string;
  year: string;
  section: string;
  phone: string;
  role: "student";
}

interface AdminFormState {
  adminId: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "admin";
  createdAt: string;
}

interface CreateMemberPayload {
  role: ManagedRole;
  name: string;
  email: string;
  password: string;
  studentId?: string;
  facultyId?: string;
  adminId?: string;
  department?: string;
  year?: string;
  section?: string;
  phone?: string;
  designation?: string;
  created_at?: string;
}

const ROLE_FILTERS: MemberFilterRole[] = ["all", "faculty", "student", "admin"];

const buildAuthHeaders = (includeJsonContentType = false): HeadersInit => {
  const token = readStoredAuth()?.token?.trim();
  return {
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const fetchJson = async <T,>(
  url: string,
  options?: RequestInit,
  fallbackError = "Request failed.",
): Promise<T> => {
  return apiRequestJson<T>(
    url,
    {
      ...options,
      headers: {
        ...buildAuthHeaders(false),
        ...(options?.headers ?? {}),
      },
    },
    {
      fallbackError,
      retries: 1,
      timeoutMs: 8000,
      includeAuth: false,
    },
  );
};

const fetchAdminMembers = async (
  role: MemberFilterRole,
  search: string,
  signal?: AbortSignal,
): Promise<AdminMembersData> => {
  const params = new URLSearchParams();
  params.set("role", role);
  if (search.trim()) {
    params.set("search", search.trim());
  }

  return fetchJson<AdminMembersData>(
    `${API_BASE}/api/admin/members?${params.toString()}`,
    { signal },
    "Failed to load members.",
  );
};

const createMemberByAdmin = async (payload: CreateMemberPayload) =>
  fetchJson<{ user: unknown }>(
    `${API_BASE}/api/admin/members`,
    {
      method: "POST",
      headers: buildAuthHeaders(true),
      body: JSON.stringify(payload),
    },
    "Failed to create member.",
  );

const updateMemberByAdmin = async (
  memberId: number,
  payload: {
    role: ManagedRole;
    fullName: string;
    email: string;
    rollNumber: string;
    password?: string;
  },
) =>
  fetchJson<{ member: AdminMember }>(
    `${API_BASE}/api/admin/members/${memberId}`,
    {
      method: "PUT",
      headers: buildAuthHeaders(true),
      body: JSON.stringify(payload),
    },
    "Failed to update member.",
  );

const deleteMemberByAdmin = async (memberId: number) =>
  fetchJson<{ deleted: AdminMember }>(
    `${API_BASE}/api/admin/members/${memberId}`,
    { method: "DELETE", headers: buildAuthHeaders(false) },
    "Failed to delete member.",
  );

const fetchAdminClassOptions = async (
  signal?: AbortSignal,
): Promise<FacultyClassAllocationOption[]> => {
  const body = await fetchJson<{ classOptions?: FacultyClassAllocationOption[] }>(
    `${API_BASE}/api/admin/class-options`,
    { signal, headers: buildAuthHeaders(false) },
    "Failed to load class options.",
  );

  return Array.isArray(body.classOptions) ? body.classOptions : [];
};

const updateFacultyClassAllocationsByAdmin = async (
  memberId: number,
  allocations: FacultyClassAllocationOption[],
) =>
  fetchJson<{ assignedClasses: FacultyClassAllocationOption[] }>(
    `${API_BASE}/api/admin/members/${memberId}/class-allocations`,
    {
      method: "PUT",
      headers: buildAuthHeaders(true),
      body: JSON.stringify({
        allocations: allocations.map((allocation) => ({
          className: allocation.className,
          batchId: allocation.batchId,
          department: allocation.department,
          academicYear: allocation.academicYear,
          section: allocation.section,
        })),
      }),
    },
    "Failed to save faculty class allocations.",
  );

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
};

const getCurrentDateTimeLocalValue = (): string => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const getRoleLabel = (role: ManagedRole | MemberFilterRole): string => {
  if (role === "faculty") {
    return "Faculty";
  }
  if (role === "student") {
    return "Student";
  }
  if (role === "admin") {
    return "Admin";
  }
  return "All Members";
};

const getRoleIdLabel = (role: ManagedRole): string => {
  if (role === "faculty") {
    return "Faculty ID";
  }
  if (role === "admin") {
    return "Admin ID";
  }
  return "Student ID";
};

const getRoleBadgeClass = (role: ManagedRole): string => {
  if (role === "faculty") {
    return "bg-accent/15 text-accent";
  }
  if (role === "admin") {
    return "bg-foreground/10 text-foreground";
  }
  return "bg-primary/15 text-primary";
};

const createInitialEditForm = (): EditFormState => ({
  fullName: "",
  email: "",
  rollNumber: "",
  password: "",
});

const createInitialFacultyForm = (): FacultyFormState => ({
  facultyId: "",
  name: "",
  email: "",
  password: "",
  department: "",
  designation: "",
  phone: "",
  role: "faculty",
});

const createInitialStudentForm = (): StudentFormState => ({
  studentId: "",
  name: "",
  email: "",
  password: "",
  department: "",
  year: "",
  section: "",
  phone: "",
  role: "student",
});

const createInitialAdminForm = (): AdminFormState => ({
  adminId: "",
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "admin",
  createdAt: getCurrentDateTimeLocalValue(),
});

const extractStudentSectionOption = (
  option: FacultyClassAllocationOption,
): string => {
  const explicitSection = option.section.trim();
  if (explicitSection) {
    return explicitSection;
  }

  const className = option.className.trim();
  const sectionLabelMatch = className.match(/section\s+([a-z0-9]+)$/i);
  if (sectionLabelMatch?.[1]) {
    return sectionLabelMatch[1].toUpperCase();
  }

  const suffixMatch = className.match(/-([a-z0-9]+)$/i);
  if (suffixMatch?.[1]) {
    return suffixMatch[1].toUpperCase();
  }

  return "";
};

const extractStudentYearOption = (
  option: FacultyClassAllocationOption,
): string => {
  const className = option.className.trim().toUpperCase();
  if (!className) {
    return "";
  }

  const firstToken = className.split(/\s+/)[0] ?? "";
  if (firstToken === "I" || firstToken === "1" || firstToken === "1ST") {
    return "1st yr";
  }
  if (firstToken === "II" || firstToken === "2" || firstToken === "2ND") {
    return "2nd yr";
  }
  if (firstToken === "III" || firstToken === "3" || firstToken === "3RD") {
    return "3rd yr";
  }
  if (firstToken === "IV" || firstToken === "4" || firstToken === "4TH") {
    return "4th yr";
  }

  const yearLabelMatch = className.match(/([1-4])(ST|ND|RD|TH)\s*YR/i);
  if (yearLabelMatch?.[1]) {
    return `${yearLabelMatch[1]}${yearLabelMatch[2].toLowerCase()} yr`;
  }

  return "";
};

const getStudentYearOrder = (value: string): number => {
  if (value.startsWith("1st")) {
    return 1;
  }
  if (value.startsWith("2nd")) {
    return 2;
  }
  if (value.startsWith("3rd")) {
    return 3;
  }
  if (value.startsWith("4th")) {
    return 4;
  }
  return Number.MAX_SAFE_INTEGER;
};

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [facultyForm, setFacultyForm] = useState<FacultyFormState>(
    createInitialFacultyForm,
  );
  const [studentForm, setStudentForm] = useState<StudentFormState>(
    createInitialStudentForm,
  );
  const [adminForm, setAdminForm] = useState<AdminFormState>(
    createInitialAdminForm,
  );

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreatingFaculty, setIsCreatingFaculty] = useState(false);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const [memberFilterRole, setMemberFilterRole] =
    useState<MemberFilterRole>("all");
  const [memberSearch, setMemberSearch] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [processingMemberId, setProcessingMemberId] = useState<number | null>(
    null,
  );
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [selectedAllocationKeys, setSelectedAllocationKeys] = useState<string[]>(
    [],
  );
  const [isSavingAllocations, setIsSavingAllocations] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [editForm, setEditForm] = useState<EditFormState>(createInitialEditForm);

  const {
    data: membersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AdminMembersData, Error>({
    queryKey: ["admin-members-page", memberFilterRole, memberSearch.trim()],
    queryFn: ({ signal }) =>
      fetchAdminMembers(memberFilterRole, memberSearch, signal),
    refetchInterval: 7000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 1,
  });

  const {
    data: facultyMembersData,
  } = useQuery<AdminMembersData, Error>({
    queryKey: ["admin-faculty-members"],
    queryFn: ({ signal }) => fetchAdminMembers("faculty", "", signal),
    refetchInterval: 7000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 1,
  });

  const {
    data: classOptionsData,
    isLoading: isLoadingClassOptions,
    isError: isClassOptionsError,
    error: classOptionsError,
  } = useQuery<FacultyClassAllocationOption[], Error>({
    queryKey: ["admin-class-options"],
    queryFn: ({ signal }) => fetchAdminClassOptions(signal),
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 1,
  });

  const memberRows = membersData?.members ?? [];
  const facultyMembers = facultyMembersData?.members ?? [];
  const selectedFaculty =
    facultyMembers.find((member) => member.id === selectedFacultyId) ?? null;
  const allocationOptions = useMemo(
    () =>
      mergeFacultyClassAllocationOptions([
        ...(classOptionsData ?? []),
        ...(selectedFaculty?.assignedClasses ?? []),
      ]),
    [classOptionsData, selectedFaculty],
  );
  const studentClassOptions = useMemo(
    () => mergeFacultyClassAllocationOptions(classOptionsData ?? []),
    [classOptionsData],
  );
  const studentDepartmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          studentClassOptions
            .map((option) => option.department.trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [studentClassOptions],
  );
  const studentYearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          studentClassOptions
            .filter((option) =>
              studentForm.department
                ? option.department.trim() === studentForm.department.trim()
                : true,
            )
            .map((option) => extractStudentYearOption(option))
            .filter(Boolean),
        ),
      ).sort(
        (left, right) =>
          getStudentYearOrder(left) - getStudentYearOrder(right) ||
          left.localeCompare(right),
      ),
    [studentClassOptions, studentForm.department],
  );
  const studentSectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          studentClassOptions
            .filter((option) =>
              studentForm.department
                ? option.department.trim() === studentForm.department.trim()
                : true,
            )
            .filter((option) =>
              studentForm.year
                ? extractStudentYearOption(option) === studentForm.year.trim()
                : true,
            )
            .map((option) => extractStudentSectionOption(option))
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [studentClassOptions, studentForm.department, studentForm.year],
  );
  const inputClass =
    "w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const readOnlyInputClass = `${inputClass} cursor-not-allowed opacity-80`;

  useEffect(() => {
    if (selectedFacultyId && facultyMembers.some((member) => member.id === selectedFacultyId)) {
      return;
    }

    setSelectedFacultyId(facultyMembers[0]?.id ?? null);
  }, [facultyMembers, selectedFacultyId]);

  useEffect(() => {
    if (!selectedFaculty) {
      setSelectedAllocationKeys([]);
      return;
    }

    setSelectedAllocationKeys(
      (selectedFaculty.assignedClasses ?? []).map((allocation) =>
        getFacultyClassOptionKey(allocation),
      ),
    );
  }, [selectedFaculty]);

  useEffect(() => {
    const nextDepartment = studentDepartmentOptions[0] ?? "";
    if (
      studentForm.department &&
      studentDepartmentOptions.includes(studentForm.department)
    ) {
      return;
    }

    if (studentForm.department === nextDepartment) {
      return;
    }

    setStudentForm((previous) => ({
      ...previous,
      department: nextDepartment,
    }));
  }, [studentDepartmentOptions, studentForm.department]);

  useEffect(() => {
    const nextYear = studentYearOptions[0] ?? "";
    if (studentForm.year && studentYearOptions.includes(studentForm.year)) {
      return;
    }

    if (studentForm.year === nextYear) {
      return;
    }

    setStudentForm((previous) => ({
      ...previous,
      year: nextYear,
    }));
  }, [studentYearOptions, studentForm.year]);

  useEffect(() => {
    const nextSection = studentSectionOptions[0] ?? "";
    if (
      studentForm.section &&
      studentSectionOptions.includes(studentForm.section)
    ) {
      return;
    }

    if (studentForm.section === nextSection) {
      return;
    }

    setStudentForm((previous) => ({
      ...previous,
      section: nextSection,
    }));
  }, [studentSectionOptions, studentForm.section]);

  const resetFeedback = () => {
    setMessage("");
    setErrorMessage("");
  };

  const handleSyncWebsite = async () => {
    if (isSyncing) {
      return;
    }

    resetFeedback();
    setIsSyncing(true);
    try {
      await refreshWebsiteData(queryClient);
      await refetch();
      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch (syncError) {
      setErrorMessage(
        syncError instanceof Error
          ? syncError.message
          : "Failed to sync website data.",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateFaculty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setIsCreatingFaculty(true);
    try {
      await createMemberByAdmin({
        role: facultyForm.role,
        facultyId: facultyForm.facultyId.trim(),
        name: facultyForm.name.trim(),
        email: facultyForm.email.trim(),
        password: facultyForm.password,
        department: facultyForm.department.trim(),
        designation: facultyForm.designation.trim(),
        phone: facultyForm.phone.trim(),
      });
      setMessage("Faculty account created successfully.");
      setFacultyForm(createInitialFacultyForm());
      await refetch();
    } catch (createError) {
      setErrorMessage(
        createError instanceof Error
          ? createError.message
          : "Failed to create faculty.",
      );
    } finally {
      setIsCreatingFaculty(false);
    }
  };

  const handleCreateStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setIsCreatingStudent(true);
    try {
      await createMemberByAdmin({
        role: studentForm.role,
        studentId: studentForm.studentId.trim(),
        name: studentForm.name.trim(),
        email: studentForm.email.trim(),
        password: studentForm.password,
        department: studentForm.department.trim(),
        year: studentForm.year.trim(),
        section: studentForm.section.trim(),
        phone: studentForm.phone.trim(),
      });
      setMessage("Student account created successfully.");
      setStudentForm((previous) => ({
        ...previous,
        studentId: "",
        name: "",
        email: "",
        password: "",
        phone: "",
      }));
      await refetch();
    } catch (createError) {
      setErrorMessage(
        createError instanceof Error
          ? createError.message
          : "Failed to create student.",
      );
    } finally {
      setIsCreatingStudent(false);
    }
  };

  const handleCreateAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setIsCreatingAdmin(true);
    try {
      await createMemberByAdmin({
        role: adminForm.role,
        adminId: adminForm.adminId.trim(),
        name: adminForm.name.trim(),
        email: adminForm.email.trim(),
        password: adminForm.password,
        phone: adminForm.phone.trim(),
        created_at: adminForm.createdAt,
      });
      setMessage("Admin account created successfully.");
      setAdminForm(createInitialAdminForm());
      await refetch();
    } catch (createError) {
      setErrorMessage(
        createError instanceof Error
          ? createError.message
          : "Failed to create admin.",
      );
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const startEdit = (member: AdminMember) => {
    resetFeedback();
    setEditingMemberId(member.id);
    setEditForm({
      fullName: member.fullName,
      email: member.email,
      rollNumber: member.rollNumber,
      password: "",
    });
  };

  const cancelEdit = () => {
    setEditingMemberId(null);
    setEditForm(createInitialEditForm());
  };

  const saveEdit = async (
    event: FormEvent<HTMLFormElement>,
    member: AdminMember,
  ) => {
    event.preventDefault();
    resetFeedback();
    if (!editForm.rollNumber.trim()) {
      setErrorMessage(`${getRoleIdLabel(member.role)} is required.`);
      return;
    }

    setProcessingMemberId(member.id);
    try {
      await updateMemberByAdmin(member.id, {
        role: member.role,
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        rollNumber: editForm.rollNumber.trim(),
        password: editForm.password.trim() ? editForm.password : undefined,
      });
      setMessage("Member updated successfully.");
      setEditingMemberId(null);
      setEditForm(createInitialEditForm());
      await refetch();
    } catch (updateError) {
      setErrorMessage(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update member.",
      );
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleDeleteMember = async (member: AdminMember) => {
    resetFeedback();
    const confirmed = window.confirm(
      `Delete ${getRoleLabel(member.role).toLowerCase()} account "${member.fullName || member.email}"?`,
    );
    if (!confirmed) {
      return;
    }

    setProcessingMemberId(member.id);
    try {
      await deleteMemberByAdmin(member.id);
      setMessage("Member deleted successfully.");
      if (editingMemberId === member.id) {
        setEditingMemberId(null);
        setEditForm(createInitialEditForm());
      }
      await refetch();
    } catch (deleteError) {
      setErrorMessage(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete member.",
      );
    } finally {
      setProcessingMemberId(null);
    }
  };

  const toggleAllocationSelection = (allocation: FacultyClassAllocationOption) => {
    const key = getFacultyClassOptionKey(allocation);
    setSelectedAllocationKeys((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key],
    );
  };

  const handleSaveFacultyAllocations = async () => {
    if (!selectedFaculty) {
      setErrorMessage("Select a faculty member to manage class allocations.");
      return;
    }

    resetFeedback();
    setIsSavingAllocations(true);
    try {
      const selectedAllocations = allocationOptions.filter((allocation) =>
        selectedAllocationKeys.includes(getFacultyClassOptionKey(allocation)),
      );

      await updateFacultyClassAllocationsByAdmin(
        selectedFaculty.id,
        selectedAllocations,
      );
      setMessage("Faculty class allocations saved successfully.");
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["admin-faculty-members"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-members-page"] }),
      ]);
    } catch (allocationError) {
      setErrorMessage(
        allocationError instanceof Error
          ? allocationError.message
          : "Failed to save faculty class allocations.",
      );
    } finally {
      setIsSavingAllocations(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
              <UserCog className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Manage Users
            </h1>
          </div>
          <button
            type="button"
            onClick={handleSyncWebsite}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 disabled:opacity-70"
          >
            <RefreshCw
              className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {lastSyncedAt
            ? `Last synced at ${lastSyncedAt}.`
            : "Sync fetches latest website updates."}
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold" /> Add Faculty
            </h2>
            <form onSubmit={handleCreateFaculty} className="space-y-3">
              <input
                type="text"
                placeholder="Faculty ID"
                className={inputClass}
                value={facultyForm.facultyId}
                onChange={(event) =>
                  setFacultyForm((previous) => ({
                    ...previous,
                    facultyId: event.target.value,
                  }))
                }
                required
              />
              <input
                type="text"
                placeholder="Name"
                className={inputClass}
                value={facultyForm.name}
                onChange={(event) =>
                  setFacultyForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                required
              />
              <input
                type="email"
                placeholder="Email"
                className={inputClass}
                value={facultyForm.email}
                onChange={(event) =>
                  setFacultyForm((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                required
              />
              <input
                type="password"
                placeholder="Password (min 6)"
                className={inputClass}
                value={facultyForm.password}
                onChange={(event) =>
                  setFacultyForm((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                minLength={6}
                required
              />
              <input
                type="text"
                placeholder="Department"
                className={inputClass}
                value={facultyForm.department}
                onChange={(event) =>
                  setFacultyForm((previous) => ({
                    ...previous,
                    department: event.target.value,
                  }))
                }
                required
              />
              <input
                type="text"
                placeholder="Designation"
                className={inputClass}
                value={facultyForm.designation}
                onChange={(event) =>
                  setFacultyForm((previous) => ({
                    ...previous,
                    designation: event.target.value,
                  }))
                }
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                className={inputClass}
                value={facultyForm.phone}
                onChange={(event) =>
                  setFacultyForm((previous) => ({
                    ...previous,
                    phone: event.target.value,
                  }))
                }
                required
              />
              <input type="text" className={readOnlyInputClass} value="faculty" readOnly />
              <button
                type="submit"
                disabled={isCreatingFaculty}
                className="w-full rounded-xl gradient-gold text-white py-2.5 text-sm font-medium disabled:opacity-70"
              >
                {isCreatingFaculty ? "Creating..." : "Create Faculty"}
              </button>
            </form>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" /> Add Student
            </h2>
            <form onSubmit={handleCreateStudent} className="space-y-3">
              <input
                type="text"
                placeholder="Student ID"
                className={inputClass}
                value={studentForm.studentId}
                onChange={(event) =>
                  setStudentForm((previous) => ({
                    ...previous,
                    studentId: event.target.value,
                  }))
                }
                required
              />
              <input
                type="text"
                placeholder="Name"
                className={inputClass}
                value={studentForm.name}
                onChange={(event) =>
                  setStudentForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                required
              />
              <input
                type="email"
                placeholder="Email"
                className={inputClass}
                value={studentForm.email}
                onChange={(event) =>
                  setStudentForm((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                required
              />
              <input
                type="password"
                placeholder="Password (min 6)"
                className={inputClass}
                value={studentForm.password}
                onChange={(event) =>
                  setStudentForm((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                minLength={6}
                required
              />
              <select
                className={inputClass}
                value={studentForm.department}
                onChange={(event) =>
                  setStudentForm((previous) => ({
                    ...previous,
                    department: event.target.value,
                  }))
                }
                disabled={
                  isLoadingClassOptions || studentDepartmentOptions.length === 0
                }
                required
              >
                <option value="">
                  {isLoadingClassOptions
                    ? "Loading departments..."
                    : studentDepartmentOptions.length === 0
                      ? "No departments found in DB"
                      : "Select department"}
                </option>
                {studentDepartmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={studentForm.year}
                onChange={(event) =>
                  setStudentForm((previous) => ({
                    ...previous,
                    year: event.target.value,
                  }))
                }
                disabled={isLoadingClassOptions || studentYearOptions.length === 0}
                required
              >
                <option value="">
                  {isLoadingClassOptions
                    ? "Loading years..."
                    : studentYearOptions.length === 0
                      ? "No years found"
                      : "Select year"}
                </option>
                {studentYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={studentForm.section}
                onChange={(event) =>
                  setStudentForm((previous) => ({
                    ...previous,
                    section: event.target.value,
                  }))
                }
                disabled={
                  isLoadingClassOptions || studentSectionOptions.length === 0
                }
                required
              >
                <option value="">
                  {isLoadingClassOptions
                    ? "Loading sections..."
                    : studentSectionOptions.length === 0
                      ? "No sections found"
                      : "Select section"}
                </option>
                {studentSectionOptions.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="Phone"
                className={inputClass}
                value={studentForm.phone}
                onChange={(event) =>
                  setStudentForm((previous) => ({
                    ...previous,
                    phone: event.target.value,
                  }))
                }
                required
              />
              {isClassOptionsError ? (
                <p className="text-xs text-destructive">
                  {classOptionsError?.message ?? "Failed to load DB options."}
                </p>
              ) : null}
              <input type="text" className={readOnlyInputClass} value="student" readOnly />
              <button
                type="submit"
                disabled={isCreatingStudent}
                className="w-full rounded-xl gradient-primary text-white py-2.5 text-sm font-medium disabled:opacity-70"
              >
                {isCreatingStudent ? "Creating..." : "Create Student"}
              </button>
            </form>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-foreground" /> Add Admin
            </h2>
            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <input
                type="text"
                placeholder="Admin ID"
                className={inputClass}
                value={adminForm.adminId}
                onChange={(event) =>
                  setAdminForm((previous) => ({
                    ...previous,
                    adminId: event.target.value,
                  }))
                }
                required
              />
              <input
                type="text"
                placeholder="Name"
                className={inputClass}
                value={adminForm.name}
                onChange={(event) =>
                  setAdminForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                required
              />
              <input
                type="email"
                placeholder="Email"
                className={inputClass}
                value={adminForm.email}
                onChange={(event) =>
                  setAdminForm((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                required
              />
              <input
                type="password"
                placeholder="Password (min 6)"
                className={inputClass}
                value={adminForm.password}
                onChange={(event) =>
                  setAdminForm((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                minLength={6}
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                className={inputClass}
                value={adminForm.phone}
                onChange={(event) =>
                  setAdminForm((previous) => ({
                    ...previous,
                    phone: event.target.value,
                  }))
                }
                required
              />
              <input
                type="datetime-local"
                className={inputClass}
                value={adminForm.createdAt}
                onChange={(event) =>
                  setAdminForm((previous) => ({
                    ...previous,
                    createdAt: event.target.value,
                  }))
                }
                required
              />
              <input type="text" className={readOnlyInputClass} value="admin" readOnly />
              <button
                type="submit"
                disabled={isCreatingAdmin}
                className="w-full rounded-xl gradient-gold text-white py-2.5 text-sm font-medium disabled:opacity-70"
              >
                {isCreatingAdmin ? "Creating..." : "Create Admin"}
              </button>
            </form>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-heading font-semibold text-foreground">
                Faculty Class Allocation
              </h2>
              <p className="text-sm text-muted-foreground">
                Select a faculty member, then assign the classes they are allowed
                to manage for notes, quizzes, and assignments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSaveFacultyAllocations()}
              disabled={!selectedFaculty || isSavingAllocations}
              className="rounded-xl gradient-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
            >
              {isSavingAllocations ? "Saving..." : "Save Class Allocation"}
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Faculty
              </p>
              {facultyMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No faculty members are available yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {facultyMembers.map((faculty) => {
                    const isSelected = selectedFacultyId === faculty.id;
                    return (
                      <button
                        key={faculty.id}
                        type="button"
                        onClick={() => setSelectedFacultyId(faculty.id)}
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border/70 bg-secondary/20 hover:bg-secondary/40"
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {faculty.fullName || faculty.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {faculty.rollNumber || "Faculty ID not set"} •{" "}
                          {faculty.department || "Department not set"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Allocated classes: {faculty.assignedClasses?.length ?? 0}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-4">
                <p className="text-sm font-semibold text-foreground">
                  {selectedFaculty
                    ? selectedFaculty.fullName || selectedFaculty.email
                    : "Select a faculty member"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedFaculty
                    ? "Only the checked classes below will be available to this faculty in the portal."
                    : "Choose a faculty member from the left to start allocating classes."}
                </p>
                {selectedFaculty?.assignedClasses?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedFaculty.assignedClasses.map((allocation) => (
                      <span
                        key={`${selectedFaculty.id}-${getFacultyClassOptionKey(allocation)}`}
                        className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        {allocation.className}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {isClassOptionsError ? (
                <p className="text-sm text-destructive">
                  {classOptionsError?.message ?? "Failed to load class options."}
                </p>
              ) : null}

              {isLoadingClassOptions ? (
                <p className="text-sm text-muted-foreground">
                  Loading classes from the database...
                </p>
              ) : null}

              {!isLoadingClassOptions && allocationOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No classes were found yet. Add student records or batch data so
                  the system can build class options.
                </p>
              ) : null}

              {allocationOptions.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {allocationOptions.map((allocation) => {
                    const optionKey = getFacultyClassOptionKey(allocation);
                    const isChecked = selectedAllocationKeys.includes(optionKey);
                    const subtitle = [
                      allocation.department,
                      allocation.academicYear,
                      allocation.section
                        ? `Section ${allocation.section}`
                        : "",
                      allocation.studentCount > 0
                        ? `${allocation.studentCount} students`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" • ");

                    return (
                      <button
                        key={optionKey}
                        type="button"
                        onClick={() => toggleAllocationSelection(allocation)}
                        disabled={!selectedFaculty}
                        className={`rounded-xl border p-4 text-left transition-colors disabled:opacity-60 ${
                          isChecked
                            ? "border-primary bg-primary/10"
                            : "border-border/70 bg-background/60 hover:bg-secondary/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {allocation.className}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {subtitle || "Class option from the database"}
                            </p>
                          </div>
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                              isChecked
                                ? "border-primary bg-primary text-white"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {isChecked ? <Check className="h-3.5 w-3.5" /> : null}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {ROLE_FILTERS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setMemberFilterRole(role)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                  memberFilterRole === role
                    ? "bg-primary text-white"
                    : "bg-secondary text-foreground hover:bg-secondary/70"
                }`}
              >
                {getRoleLabel(role)}
              </button>
            ))}
            <div className="relative ml-auto min-w-[220px] flex-1 max-w-xl">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                className="w-full rounded-xl border border-border/70 bg-background/60 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Search by name, email, member ID, phone, department, year, section, or designation"
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Total: {membersData?.counts.total ?? 0}
            </span>
            <span>Faculty: {membersData?.counts.faculty ?? 0}</span>
            <span>Students: {membersData?.counts.students ?? 0}</span>
            <span>Admins: {membersData?.counts.admins ?? 0}</span>
          </div>

          {isError ? (
            <p className="text-sm text-destructive">
              {error?.message ?? "Failed to load members."}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
          {message ? <p className="text-sm text-accent">{message}</p> : null}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading members...</p>
          ) : null}

          {!isLoading && memberRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members found for this filter.
            </p>
          ) : null}

          <div className="space-y-3">
            {memberRows.map((member) => {
              const isEditing = editingMemberId === member.id;
              const isProcessing = processingMemberId === member.id;
              const metaItems = [
                `${getRoleIdLabel(member.role)}: ${member.rollNumber || "-"}`,
                member.phone ? `Phone: ${member.phone}` : null,
                member.department ? `Department: ${member.department}` : null,
                member.year ? `Year: ${member.year}` : null,
                member.section ? `Section: ${member.section}` : null,
                member.designation ? `Designation: ${member.designation}` : null,
                `Created: ${formatDateTime(member.createdAt)}`,
                `Updated: ${formatDateTime(member.updatedAt)}`,
              ].filter((item): item is string => Boolean(item));

              if (isEditing) {
                return (
                  <form
                    key={member.id}
                    onSubmit={(event) => saveEdit(event, member)}
                    className="rounded-xl border border-border/70 bg-secondary/30 p-4 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={editForm.fullName}
                        onChange={(event) =>
                          setEditForm((previous) => ({
                            ...previous,
                            fullName: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="Full name"
                        required
                      />
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(event) =>
                          setEditForm((previous) => ({
                            ...previous,
                            email: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="Email"
                        required
                      />
                      <input
                        type="text"
                        value={editForm.rollNumber}
                        onChange={(event) =>
                          setEditForm((previous) => ({
                            ...previous,
                            rollNumber: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder={getRoleIdLabel(member.role)}
                        required
                      />
                      <input
                        type="password"
                        value={editForm.password}
                        onChange={(event) =>
                          setEditForm((previous) => ({
                            ...previous,
                            password: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="New password (optional)"
                        minLength={6}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-xl px-3 py-2 text-sm bg-secondary text-foreground hover:bg-secondary/70"
                        disabled={isProcessing}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl px-3 py-2 text-sm gradient-primary text-white disabled:opacity-70"
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-border/70 bg-secondary/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {member.fullName || member.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {member.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${getRoleBadgeClass(member.role)}`}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                        {metaItems.map((item) => (
                          <span key={item} className="text-muted-foreground">
                            {item}
                          </span>
                        ))}
                      </div>
                      {member.role === "faculty" &&
                      member.assignedClasses?.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {member.assignedClasses.map((allocation) => (
                            <span
                              key={`${member.id}-${getFacultyClassOptionKey(allocation)}`}
                              className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                            >
                              {allocation.className}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(member)}
                        className="rounded-xl px-3 py-2 text-xs bg-secondary text-foreground hover:bg-secondary/70"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member)}
                        className="rounded-xl px-3 py-2 text-xs bg-destructive/15 text-destructive hover:bg-destructive/25 inline-flex items-center gap-1"
                        disabled={isProcessing}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isProcessing ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
