import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Auth from "@/pages/Auth";

describe("Auth OTP copy", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/login")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            otpRequired: true,
            challengeId: "challenge-123",
            maskedEmail: "te***@mail.com",
            expiresInSeconds: 300,
            message: "OTP sent to your email. Enter it to complete login.",
          }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("shows a generic OTP prompt without email wording", async () => {
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

    expect(await screen.findByText("Enter the 6-digit code")).toBeInTheDocument();
    expect(screen.queryByText(/otp sent to your email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/gmail/i)).not.toBeInTheDocument();
    expect(screen.queryByText("te***@mail.com")).not.toBeInTheDocument();
  });
});