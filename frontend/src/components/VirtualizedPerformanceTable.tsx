import React, { useMemo, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { usePerformanceData } from "@/hooks/usePerformanceData";

interface VirtualizedPerformanceTableProps {
  department?: string;
  year?: number;
  section?: string;
  height?: number;
}

const ITEM_HEIGHT = 60;
const HEADER_HEIGHT = 50;

export const VirtualizedPerformanceTable: React.FC<
  VirtualizedPerformanceTableProps
> = ({ department, year, section, height = 600 }) => {
  const {
    students,
    loading,
    error,
    total,
    hasMore,
    stats,
    searchTerm,
    sortBy,
    sortOrder,
    handleSearch,
    handleSort,
    loadMore,
  } = usePerformanceData({ department, year, section, pageSize: 100 });

  // Check if item is loaded
  const isItemLoaded = useCallback(
    (index: number) => {
      return !!students[index];
    },
    [students],
  );

  // Load more items
  const loadMoreItems = useCallback(
    async (startIndex: number, stopIndex: number) => {
      if (hasMore && !loading) {
        await loadMore();
      }
    },
    [hasMore, loading, loadMore],
  );

  // Row renderer
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const student = students[index];

      if (!student) {
        return (
          <div style={style} className="flex items-center justify-center">
            <div className="animate-pulse bg-gray-200 h-8 w-full rounded"></div>
          </div>
        );
      }

      const getLiteracyColor = (level: string) => {
        switch (level) {
          case "High":
            return "text-green-600 bg-green-100";
          case "Medium":
            return "text-yellow-600 bg-yellow-100";
          case "Low":
            return "text-red-600 bg-red-100";
          default:
            return "text-gray-600 bg-gray-100";
        }
      };

      return (
        <div
          style={style}
          className="flex items-center border-b border-gray-200 hover:bg-gray-50 px-4"
        >
          <div className="flex-1 grid grid-cols-8 gap-4 items-center">
            <div className="font-medium text-sm">{student.student_id}</div>
            <div className="text-sm truncate">{student.name}</div>
            <div className="text-sm">
              {student.department}-{student.year}
              {student.section}
            </div>
            <div className="text-sm">{student.attendance}%</div>
            <div className="text-sm">{student.quiz_score}</div>
            <div className="text-sm">{student.assessment_score}</div>
            <div className="text-sm font-medium">
              {student.literacy_percentage}%
            </div>
            <div
              className={`text-xs px-2 py-1 rounded-full text-center ${getLiteracyColor(student.literacy_level)}`}
            >
              {student.literacy_level}
            </div>
          </div>
        </div>
      );
    },
    [students],
  );

  // Header component
  const Header = () => (
    <div
      className="bg-gray-50 border-b border-gray-200 px-4"
      style={{ height: HEADER_HEIGHT }}
    >
      <div className="flex items-center h-full">
        <div className="flex-1 grid grid-cols-8 gap-4 items-center font-semibold text-sm text-gray-700">
          <button
            onClick={() =>
              handleSort("name", sortOrder === "ASC" ? "DESC" : "ASC")
            }
            className="text-left hover:text-blue-600"
          >
            Student ID {sortBy === "name" && (sortOrder === "ASC" ? "↑" : "↓")}
          </button>
          <div>Name</div>
          <div>Section</div>
          <button
            onClick={() =>
              handleSort("attendance", sortOrder === "ASC" ? "DESC" : "ASC")
            }
            className="text-left hover:text-blue-600"
          >
            Attendance{" "}
            {sortBy === "attendance" && (sortOrder === "ASC" ? "↑" : "↓")}
          </button>
          <div>Quiz Score</div>
          <div>Assessment</div>
          <button
            onClick={() =>
              handleSort(
                "literacy_percentage",
                sortOrder === "ASC" ? "DESC" : "ASC",
              )
            }
            className="text-left hover:text-blue-600"
          >
            Literacy{" "}
            {sortBy === "literacy_percentage" &&
              (sortOrder === "ASC" ? "↑" : "↓")}
          </button>
          <div>Level</div>
        </div>
      </div>
    </div>
  );

  // Stats component
  const StatsBar = () => {
    if (!stats) return null;

    return (
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="grid grid-cols-6 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalStudents.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {stats.avgLiteracy.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Avg Literacy</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {stats.avgAttendance.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Avg Attendance</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {stats.highPerformers}
            </div>
            <div className="text-sm text-gray-600">High Performers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.mediumPerformers}
            </div>
            <div className="text-sm text-gray-600">Medium Performers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {stats.lowPerformers}
            </div>
            <div className="text-sm text-gray-600">Low Performers</div>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Error loading student data</div>
        <div className="text-sm text-gray-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search students by name or ID..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Stats */}
      <StatsBar />

      {/* Virtualized Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <Header />
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={hasMore ? students.length + 1 : students.length}
          loadMoreItems={loadMoreItems}
        >
          {({ onItemsRendered, ref }) => (
            <List
              ref={ref}
              height={height - HEADER_HEIGHT}
              itemCount={hasMore ? students.length + 1 : students.length}
              itemSize={ITEM_HEIGHT}
              onItemsRendered={onItemsRendered}
            >
              {Row}
            </List>
          )}
        </InfiniteLoader>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <div className="text-sm text-gray-500 mt-2">Loading students...</div>
        </div>
      )}
    </div>
  );
};
