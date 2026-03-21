import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AdminSchedule from "@/pages/admin/AdminSchedule";

const renderAdminSchedule = () =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/admin/schedule"]}>
        <AdminSchedule />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe("AdminSchedule", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "eduhub_auth",
      JSON.stringify({
        userId: 99,
        email: "admin@eduhub.test",
        fullName: "Schedule Admin",
        role: "admin",
        token: "test-token",
      }),
    );

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/attendance/departments")) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: "Computer Science", code: "CSE" }] });
      }
      if (url.includes("/api/attendance/academic-years")) {
        return Promise.resolve({ ok: true, json: async () => ["2024-2025"] });
      }
      if (url.includes("/api/attendance/subjects")) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: "Database Systems", code: "DBMS" }] });
      }
      if (url.includes("/api/admin/members?role=faculty")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            members: [
              {
                id: 7,
                fullName: "Dr. Ada Lovelace",
                rollNumber: "FAC-0007",
                department: "Computer Science",
                designation: "Professor",
                email: "ada@eduhub.test",
              },
            ],
          }),
        });
      }
      if (url.includes("/api/attendance/batches")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 11,
              name: "III CSE-A",
              semester: 5,
              academic_year: "2024-2025",
              department_name: "Computer Science",
              department_code: "CSE",
            },
          ],
        });
      }
      if (url.includes("/api/timetable/batches/11/entries")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("shows the create schedule navigation and form", async () => {
    renderAdminSchedule();

    expect(screen.getAllByText("Create Schedule").length).toBeGreaterThan(0);
    expect(screen.getByText("Create Timetable")).toBeInTheDocument();
    expect(screen.getByText("Weekly Timetable Preview")).toBeInTheDocument();
    expect(screen.getByText("Selected Slot Editor")).toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(await screen.findByRole("option", { name: /Dr. Ada Lovelace/i })).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: /III CSE-A/i })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader", { name: /Period 1/i }).length).toBeGreaterThan(0);
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Save & send slot/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Generate timetable/i })).toBeInTheDocument();
  });
});