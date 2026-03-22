// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

// Mock next/headers (server-only cookie API)
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: mockSet,
      get: mockGet,
      delete: mockDelete,
    })
  ),
}));

// Mock server-only so the import doesn't throw outside Next.js
vi.mock("server-only", () => ({}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession signs a JWT and sets the auth-token cookie", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  expect(mockSet).toHaveBeenCalledOnce();

  const [cookieName, token, options] = mockSet.mock.calls[0];

  // Correct cookie name
  expect(cookieName).toBe("auth-token");

  // Token is a non-empty string
  expect(typeof token).toBe("string");
  expect(token.length).toBeGreaterThan(0);

  // Cookie options
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
  expect(options.expires).toBeInstanceOf(Date);
});

test("createSession JWT payload contains userId and email", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-abc", "hello@example.com");

  const [, token] = mockSet.mock.calls[0];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-abc");
  expect(payload.email).toBe("hello@example.com");
});

test("createSession sets expiry ~7 days in the future", async () => {
  const { createSession } = await import("@/lib/auth");

  const before = Date.now();
  await createSession("user-xyz", "expire@example.com");
  const after = Date.now();

  const [, , options] = mockSet.mock.calls[0];
  const expiresMs = options.expires.getTime();

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession uses httpOnly and non-secure cookie in non-production", async () => {
  // vitest runs in 'test' env (not production)
  const { createSession } = await import("@/lib/auth");

  await createSession("user-env", "env@example.com");

  const [, , options] = mockSet.mock.calls[0];
  expect(options.httpOnly).toBe(true);
  expect(options.secure).toBe(false);
});
