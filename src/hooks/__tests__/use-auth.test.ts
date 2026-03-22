import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// --- mocks ---

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

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignInAction = vi.mocked(signInAction);
const mockSignUpAction = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

// --- helpers ---

function renderUseAuth() {
  return renderHook(() => useAuth());
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no anon work, no projects
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" } as any);
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("initial state", () => {
  it("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderUseAuth();
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(result.current.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

describe("signIn", () => {
  it("sets isLoading to true while pending and false after resolution", async () => {
    let resolveAction!: (v: any) => void;
    mockSignInAction.mockReturnValue(
      new Promise((res) => {
        resolveAction = res;
      })
    );

    const { result } = renderUseAuth();

    let promise: Promise<any>;
    act(() => {
      promise = result.current.signIn("user@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveAction({ success: false, error: "Invalid credentials" });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("returns the result from the action", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderUseAuth();

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  it("does NOT navigate when sign-in fails", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.signIn("user@example.com", "wrong");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to existing project after successful sign-in (no anon work)", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "existing-project" } as any]);

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/existing-project");
  });

  it("creates a new project and navigates to it when there are no existing projects", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new-project" } as any);

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
  });

  it("migrates anon work into a project and navigates to it after sign-in", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "make a button" }],
      fileSystemData: { "/": null, "/App.tsx": "export default () => <button />" },
    };
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ id: "anon-project-id" } as any);

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      })
    );
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    // Should NOT check existing projects when anon work is present
    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  it("ignores anon work when messages array is empty", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([{ id: "existing-project" } as any]);

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).not.toHaveBeenCalledWith(
      expect.objectContaining({ messages: [] })
    );
    expect(mockPush).toHaveBeenCalledWith("/existing-project");
  });

  it("resets isLoading to false even when action throws", async () => {
    mockSignInAction.mockRejectedValue(new Error("Network error"));

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.signIn("user@example.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------

describe("signUp", () => {
  it("sets isLoading to true while pending and false after resolution", async () => {
    let resolveAction!: (v: any) => void;
    mockSignUpAction.mockReturnValue(
      new Promise((res) => {
        resolveAction = res;
      })
    );

    const { result } = renderUseAuth();

    let promise: Promise<any>;
    act(() => {
      promise = result.current.signUp("new@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveAction({ success: false, error: "Email already registered" });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("returns the result from the action", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderUseAuth();

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("existing@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
  });

  it("does NOT navigate when sign-up fails", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.signUp("existing@example.com", "password123");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to a new project after successful sign-up (no existing projects)", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "signup-project" } as any);

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/signup-project");
  });

  it("migrates anon work after successful sign-up", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "make a navbar" }],
      fileSystemData: { "/": null },
    };
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ id: "signup-anon-project" } as any);

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: anonWork.messages })
    );
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/signup-anon-project");
  });

  it("resets isLoading to false even when action throws", async () => {
    mockSignUpAction.mockRejectedValue(new Error("Network error"));

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.signUp("new@example.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});
