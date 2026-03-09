import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "@/components/AdminLayout";
import FacultyLayout from "@/components/FacultyLayout";
import StudentLayout from "@/components/StudentLayout";
import SubmitAssignmentDialog from "@/components/SubmitAssignmentDialog";
import {
  EDUHUB_AI_DISABLED_MESSAGE,
} from "@/components/EduHubAIAgent";
import { ThemeProvider } from "@/contexts/ThemeContext";
import StudentQuizAttempt from "@/pages/student/StudentQuizAttempt";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement, route = "/") =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );

describe("EduHub AI agent system", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("shows the admin AI assistant inside the admin portal", () => {
    localStorage.setItem(
      "eduhub_auth",
      JSON.stringify({
        userId: 1,
        email: "admin@eduhub.test",
        fullName: "Admin User",
        role: "admin",
      }),
    );

    renderWithProviders(
      <AdminLayout>
        <div>Admin page content</div>
      </AdminLayout>,
      "/admin",
    );

    fireEvent.click(
      screen.getByRole("button", { name: /open eduhub admin ai agent/i }),
    );

    expect(screen.getByText("EduHub Admin AI Agent")).toBeInTheDocument();
    expect(screen.getByText(/smart eduhub guidance/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create users/i })).toBeInTheDocument();
  });

  it("shows the faculty AI assistant inside the faculty portal", () => {
    localStorage.setItem(
      "eduhub_auth",
      JSON.stringify({
        userId: 2,
        email: "faculty@eduhub.test",
        fullName: "Faculty User",
        role: "faculty",
      }),
    );

    renderWithProviders(
      <FacultyLayout>
        <div>Faculty page content</div>
      </FacultyLayout>,
      "/faculty",
    );

    fireEvent.click(
      screen.getByRole("button", { name: /open eduhub faculty ai agent/i }),
    );

    expect(screen.getByText("EduHub Faculty AI Agent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload notes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage assignments/i })).toBeInTheDocument();
  });

  it("disables the student AI assistant while the assignment dialog is open", async () => {
    localStorage.setItem(
      "eduhub_auth",
      JSON.stringify({
        userId: 3,
        email: "student@eduhub.test",
        fullName: "Student User",
        role: "student",
        studentId: "S-101",
      }),
    );

    renderWithProviders(
      <StudentLayout>
        <SubmitAssignmentDialog
          assignmentId={10}
          assignmentTitle="Operating Systems Assignment"
          studentId="S-101"
          triggerLabel="Submit"
          onSubmitted={() => undefined}
        />
      </StudentLayout>,
      "/student/assignments",
    );

    fireEvent.click(
      screen.getByRole("button", { name: /open eduhub student ai agent/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(
      await screen.findByText(EDUHUB_AI_DISABLED_MESSAGE),
    ).toBeInTheDocument();
  });

  it("shows the disabled student AI assistant during quiz attempts", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/attempts/start")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            attempt_id: 1,
            remaining_seconds: 900,
            answers: {},
            quiz: {
              quiz_id: 1,
              cls: "III CSE-A",
              title: "Networks Quiz",
              duration: "15",
              status: "Published",
              questions: [
                {
                  question_id: 1,
                  question_text: "What is a protocol?",
                  question_type: "mcq",
                  options: [
                    { option_id: 1, option_text: "A set of rules" },
                    { option_id: 2, option_text: "A file type" },
                  ],
                },
              ],
            },
          }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as typeof fetch;

    renderWithProviders(
      <Routes>
        <Route path="/student/quizzes/:quizId" element={<StudentQuizAttempt />} />
      </Routes>,
      "/student/quizzes/1",
    );

    expect(await screen.findByText(EDUHUB_AI_DISABLED_MESSAGE)).toBeInTheDocument();
  });
});