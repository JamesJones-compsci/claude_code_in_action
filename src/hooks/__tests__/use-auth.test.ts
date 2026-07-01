import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "default-project-id" });
  });

  test("isLoading starts false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("toggles isLoading during the call and resets after", async () => {
      let resolveSignIn: (value: any) => void;
      (signInAction as any).mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("a@b.com", "password123");
      });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      await act(async () => {
        resolveSignIn!({ success: true });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from the sign in action", async () => {
      (signInAction as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn("a@b.com", "password123");
      });

      expect(signInAction).toHaveBeenCalledWith("a@b.com", "password123");
      expect(signInResult).toEqual({ success: true });
    });

    test("propagates failure result without redirecting", async () => {
      (signInAction as any).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn("a@b.com", "wrongpass");
      });

      expect(signInResult).toEqual({
        success: false,
        error: "Invalid credentials",
      });
      expect(mockPush).not.toHaveBeenCalled();
      expect(getAnonWorkData).not.toHaveBeenCalled();
    });

    test("resets isLoading even when the action throws", async () => {
      (signInAction as any).mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.signIn("a@b.com", "password123")
        ).rejects.toThrow("network error");
      });

      expect(result.current.isLoading).toBe(false);
    });

    describe("post sign-in redirect behavior", () => {
      test("creates a project from anonymous work and redirects to it when present", async () => {
        (signInAction as any).mockResolvedValue({ success: true });
        (getAnonWorkData as any).mockReturnValue({
          messages: [{ id: "1", role: "user", content: "hi" }],
          fileSystemData: { "/App.tsx": { type: "file", content: "" } },
        });
        (createProject as any).mockResolvedValue({ id: "new-project-id" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("a@b.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ id: "1", role: "user", content: "hi" }],
            data: { "/App.tsx": { type: "file", content: "" } },
          })
        );
        expect(clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/new-project-id");
        expect(getProjects).not.toHaveBeenCalled();
      });

      test("ignores anonymous work with no messages and falls back to existing projects", async () => {
        (signInAction as any).mockResolvedValue({ success: true });
        (getAnonWorkData as any).mockReturnValue({
          messages: [],
          fileSystemData: {},
        });
        (getProjects as any).mockResolvedValue([{ id: "existing-project" }]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("a@b.com", "password123");
        });

        expect(createProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/existing-project");
      });

      test("redirects to the most recent project when no anonymous work exists", async () => {
        (signInAction as any).mockResolvedValue({ success: true });
        (getAnonWorkData as any).mockReturnValue(null);
        (getProjects as any).mockResolvedValue([
          { id: "recent-project" },
          { id: "older-project" },
        ]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("a@b.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/recent-project");
      });

      test("creates a new project when there is no anonymous work and no existing projects", async () => {
        (signInAction as any).mockResolvedValue({ success: true });
        (getAnonWorkData as any).mockReturnValue(null);
        (getProjects as any).mockResolvedValue([]);
        (createProject as any).mockResolvedValue({ id: "brand-new-project" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("a@b.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({ messages: [], data: {} })
        );
        expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
      });
    });
  });

  describe("signUp", () => {
    test("returns the result from the sign up action", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp("a@b.com", "password123");
      });

      expect(signUpAction).toHaveBeenCalledWith("a@b.com", "password123");
      expect(signUpResult).toEqual({ success: true });
    });

    test("propagates failure result without redirecting", async () => {
      (signUpAction as any).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp("a@b.com", "password123");
      });

      expect(signUpResult).toEqual({
        success: false,
        error: "Email already registered",
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("triggers the post sign-in redirect flow on success", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([{ id: "project-after-signup" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/project-after-signup");
    });

    test("resets isLoading even when the action throws", async () => {
      (signUpAction as any).mockRejectedValue(new Error("server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.signUp("a@b.com", "password123")
        ).rejects.toThrow("server error");
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
