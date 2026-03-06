// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

// Mock server-only so the import doesn't throw in test environment
vi.mock("server-only", () => ({}));

// Mock next/headers cookies()
const mockSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    set: mockSet,
    get: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock next/server (needed for module resolution)
vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: vi.fn(),
}));

// Import after mocks are set up
const { createSession } = await import("@/lib/auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    mockSet.mockClear();
  });

  it("sets a cookie named auth-token", async () => {
    await createSession("user-1", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [cookieName] = mockSet.mock.calls[0];
    expect(cookieName).toBe("auth-token");
  });

  it("sets the cookie with httpOnly and correct options", async () => {
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("sets a cookie expiry approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockSet.mock.calls[0];
    const expiresAt: Date = options.expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  it("stores a valid JWT containing userId and email", async () => {
    await createSession("user-42", "hello@example.com");

    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  it("produces different tokens for different users", async () => {
    await createSession("user-1", "a@example.com");
    const [, token1] = mockSet.mock.calls[0];

    mockSet.mockClear();
    await createSession("user-2", "b@example.com");
    const [, token2] = mockSet.mock.calls[0];

    expect(token1).not.toBe(token2);
  });
});
