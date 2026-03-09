import { useState, useEffect, useCallback, useMemo } from "react";
import { debounce } from "lodash";

interface Student {
  student_id: string;
  name: string;
  department: string;
  year: number;
  section: string;
  attendance: number;
  quiz_score: number;
  assessment_score: number;
  interaction_score: number;
  literacy_percentage: number;
  literacy_level: "Low" | "Medium" | "High";
}

interface UsePerformanceDataProps {
  pageSize?: number;
  department?: string;
  year?: number;
  section?: string;
}

interface PerformanceDataState {
  students: Student[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export const usePerformanceData = ({
  pageSize = 50,
  department,
  year,
  section,
}: UsePerformanceDataProps = {}) => {
  const [state, setState] = useState<PerformanceDataState>({
    students: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    totalPages: 0,
    hasMore: false,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "literacy_percentage" | "attendance" | "name"
  >("literacy_percentage");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  // Debounced search to avoid excessive API calls
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setState((prev) => ({ ...prev, page: 1 }));
      fetchData(1, term);
    }, 300),
    [department, year, section, sortBy, sortOrder],
  );

  const fetchData = useCallback(
    async (
      page: number = 1,
      search: string = searchTerm,
      append: boolean = false,
    ) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString(),
          sortBy,
          sortOrder,
          ...(department && { department }),
          ...(year && { year: year.toString() }),
          ...(section && { section }),
          ...(search && { search }),
        });

        const response = await fetch(`/api/students/performance?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch student data");
        }

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          students: append
            ? [...prev.students, ...data.students]
            : data.students,
          total: data.total,
          page: data.page,
          totalPages: data.totalPages,
          hasMore: data.page < data.totalPages,
          loading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Unknown error",
          loading: false,
        }));
      }
    },
    [pageSize, department, year, section, sortBy, sortOrder, searchTerm],
  );

  // Load more data for infinite scroll
  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchData(state.page + 1, searchTerm, true);
    }
  }, [state.hasMore, state.loading, state.page, searchTerm, fetchData]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchData(1);
  }, [fetchData]);

  // Handle search
  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      debouncedSearch(term);
    },
    [debouncedSearch],
  );

  // Handle sorting
  const handleSort = useCallback(
    (field: typeof sortBy, order: typeof sortOrder) => {
      setSortBy(field);
      setSortOrder(order);
      setState((prev) => ({ ...prev, page: 1 }));
      fetchData(1);
    },
    [fetchData],
  );

  // Filtered and sorted data for client-side operations
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return state.students;

    return state.students.filter(
      (student) =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [state.students, searchTerm]);

  // Performance statistics
  const stats = useMemo(() => {
    const students = filteredStudents;
    if (students.length === 0) return null;

    return {
      totalStudents: state.total,
      avgLiteracy:
        students.reduce((sum, s) => sum + s.literacy_percentage, 0) /
        students.length,
      avgAttendance:
        students.reduce((sum, s) => sum + s.attendance, 0) / students.length,
      highPerformers: students.filter((s) => s.literacy_level === "High")
        .length,
      mediumPerformers: students.filter((s) => s.literacy_level === "Medium")
        .length,
      lowPerformers: students.filter((s) => s.literacy_level === "Low").length,
    };
  }, [filteredStudents, state.total]);

  // Initial load
  useEffect(() => {
    fetchData(1);
  }, [department, year, section, sortBy, sortOrder]);

  return {
    students: filteredStudents,
    loading: state.loading,
    error: state.error,
    total: state.total,
    page: state.page,
    totalPages: state.totalPages,
    hasMore: state.hasMore,
    stats,
    searchTerm,
    sortBy,
    sortOrder,
    handleSearch,
    handleSort,
    loadMore,
    refresh,
  };
};
