import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Auth from "@/pages/Auth";

describe("Auth student login", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/login")) {
        const payload = {
          user: {
            id: 1,
            email: "student@eduhub.test",
            role: "student",
            fullName: "Test Student",
            rollNumber: "STU-001",
            studentId: "STU-001",
          },
          token: "fake-jwt-token",
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => payload,
          text: async () => JSON.stringify(payload),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => "{}",
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("completes direct login with credentials without prompting for OTP", async () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Auth />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /login as student/i }));

    fireEvent.change(await screen.findByPlaceholderText(/enter your email/i), {
      target: { value: "student@eduhub.test" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      const auth = localStorage.getItem("eduhub_auth");
      expect(auth).toBeTruthy();
      expect(JSON.parse(auth!).email).toBe("student@eduhub.test");
    });
    expect(screen.queryByText(/otp sent to your email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/enter the 6-digit code/i)).not.toBeInTheDocument();
  });
});