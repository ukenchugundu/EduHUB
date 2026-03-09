import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PostLoginNotifier from "@/components/PostLoginNotifier";
import type { StoredAuthSession } from "@/lib/authSession";
import {
  consumePostLoginNotification,
  queuePostLoginNotification,
} from "@/lib/postLoginNotification";

const { toastSuccessMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
  },
}));

const auth: StoredAuthSession = {
  userId: 1,
  email: "student@eduhub.test",
  fullName: "Student User",
  role: "student",
};

describe("PostLoginNotifier", () => {
  beforeEach(() => {
    sessionStorage.clear();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("queues and consumes the post-login notification once", () => {
    queuePostLoginNotification();

    expect(consumePostLoginNotification()).toBe(true);
    expect(consumePostLoginNotification()).toBe(false);
  });

  it("shows a welcome popup with updates text after login", async () => {
    queuePostLoginNotification();

    render(<PostLoginNotifier auth={auth} />);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "Welcome, Student User!",
        expect.objectContaining({
          description:
            "Check your latest EduHub updates and notifications in the dashboard.",
          duration: 4500,
        }),
      );
    });

    expect(consumePostLoginNotification()).toBe(false);
  });
});